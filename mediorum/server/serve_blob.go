package server

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/rand"
	"mime"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/AudiusProject/audius-protocol/mediorum/server/signature"
	"gorm.io/gorm"

	"github.com/AudiusProject/audius-protocol/mediorum/cidutil"

	"github.com/erni27/imcache"
	"github.com/labstack/echo/v4"
	"gocloud.dev/blob"
	"gocloud.dev/gcerrors"
	"golang.org/x/exp/slices"
)

func (ss *MediorumServer) serveBlobLocation(c echo.Context) error {
	cid := c.Param("cid")
	preferred, _ := ss.rendezvousAllHosts(cid)

	// if ?sniff=1 to actually find the hosts that have it

	type HostAttr struct {
		Host           string
		Attr           *blob.Attributes
		RendezvousRank int
	}
	var attrs []HostAttr

	if sniff, _ := strconv.ParseBool(c.QueryParam("sniff")); sniff {
		mu := sync.Mutex{}
		wg := sync.WaitGroup{}
		wg.Add(len(preferred))

		for idx, host := range preferred {
			idx := idx
			host := host
			go func() {
				if attr, err := ss.hostGetBlobInfo(host, cid); err == nil {
					mu.Lock()
					attrs = append(attrs, HostAttr{
						Host:           host,
						Attr:           attr,
						RendezvousRank: idx + 1,
					})
					mu.Unlock()
				}
				wg.Done()
			}()
		}
		wg.Wait()

		slices.SortFunc(attrs, func(a, b HostAttr) int {
			// prefer larger size
			if a.Attr.Size > b.Attr.Size {
				return -1
			} else if a.Attr.Size < b.Attr.Size {
				return 1
			}

			// equal size? prefer lower RendezvousRank
			if a.RendezvousRank < b.RendezvousRank {
				return -1
			}
			return 1
		})

		if fix, _ := strconv.ParseBool(c.QueryParam("fix")); fix {
			if len(attrs) > 0 {
				best := attrs[0]
				if err := ss.pullFileFromHost(best.Host, cid); err != nil {
					return err
				}
			}
		}
	}

	return c.JSON(200, map[string]any{
		"cid":       cid,
		"preferred": preferred,
		"sniff":     attrs,
	})
}

func (ss *MediorumServer) serveBlobInfo(c echo.Context) error {
	ctx := c.Request().Context()
	cid := c.Param("cid")
	key := cidutil.ShardCID(cid)
	attr, err := ss.bucket.Attributes(ctx, key)
	if err != nil {
		if gcerrors.Code(err) == gcerrors.NotFound {
			return c.String(404, "blob not found")
		}
		ss.logger.Warn("error getting blob attributes", "error", err)
		return err
	}

	// since this is called before redirecting, make sure this node can actually serve the blob (it needs to check db for delisted status)
	dbHealthy := ss.databaseSize > 0 && ss.dbSizeErr == "" && ss.uploadsCountErr == ""
	if !dbHealthy {
		return c.String(500, "database connection issue")
	}

	return c.JSON(200, attr)
}

func (ss *MediorumServer) ensureNotDelisted(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		ctx := c.Request().Context()
		key := c.Param("cid")

		if ss.isCidBlacklisted(ctx, key) {
			ss.logger.Debug("cid is blacklisted", "cid", key)
			return c.String(403, "cid is blacklisted by this node")
		}

		c.Set("checkedDelistStatus", true)
		return next(c)
	}
}

func (ss *MediorumServer) serveBlob(c echo.Context) error {
	ctx := c.Request().Context()
	cid := c.Param("cid")

	// the only keys we store with ".jpg" suffixes are of the format "<cid>/<size>.jpg", so remove the ".jpg" if it's just like "<cid>.jpg"
	// this is to support clients that forget to leave off the .jpg for this legacy format
	if strings.HasSuffix(cid, ".jpg") && !strings.Contains(cid, "/") {
		cid = cid[:len(cid)-4]

		// find and replace cid parameter for future calls
		names := c.ParamNames()
		values := c.ParamValues()
		for i, name := range names {
			if name == "cid" {
				values[i] = cid
			}
		}

		// set parameters back to the context
		c.SetParamNames(names...)
		c.SetParamValues(values...)
	}

	key := cidutil.ShardCID(cid)

	// if the client provided a filename, set it in the header to be auto-populated in download prompt
	filenameForDownload := c.QueryParam("filename")
	if filenameForDownload != "" {
		contentDisposition := mime.QEncoding.Encode("utf-8", filenameForDownload)
		c.Response().Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, contentDisposition))
	}

	blob, err := ss.bucket.NewReader(ctx, key, nil)

	// If our bucket doesn't have the file, find a different node
	if err != nil {
		if gcerrors.Code(err) == gcerrors.NotFound {
			// don't redirect if the client only wants to know if we have it (ie localOnly query param is true)
			if localOnly, _ := strconv.ParseBool(c.QueryParam("localOnly")); localOnly {
				return c.String(404, "blob not found")
			}

			// redirect to it
			host := ss.findNodeToServeBlob(ctx, cid)
			if host == "" {
				return c.String(404, "blob not found")
			}

			dest := ss.replaceHost(c, host)
			query := dest.Query()
			query.Add("allow_unhealthy", "true") // we confirmed the node has it, so allow it to serve it even if unhealthy
			dest.RawQuery = query.Encode()
			return c.Redirect(302, dest.String())
		}
		return err
	}

	defer func() {
		if blob != nil {
			blob.Close()
		}
	}()

	if c.Request().Method == "HEAD" {
		return c.NoContent(200)
	}

	isAudioFile := strings.HasPrefix(blob.ContentType(), "audio")

	if isAudioFile {
		// detect mime type and block mp3 streaming outside of the /tracks/cidstream route
		if !strings.Contains(c.Path(), "cidstream") {
			return c.String(401, "mp3 streaming is blocked. Please use Discovery /v1/tracks/:encodedId/stream")
		}
		// track metrics in separate threads
		go ss.logTrackListen(c)
		setTimingHeader(c)
		go ss.recordMetric(StreamTrack)

		// stream audio
		http.ServeContent(c.Response(), c.Request(), cid, blob.ModTime(), blob)
		return nil
	} else {
		// non audio (images)
		// images: cache 30 days
		c.Response().Header().Set(echo.HeaderCacheControl, "public, max-age=2592000, immutable")
		blobData, err := io.ReadAll(blob)
		if err != nil {
			return err
		}
		go ss.recordMetric(ServeImage)
		return c.Blob(200, blob.ContentType(), blobData)
	}

}

func (ss *MediorumServer) recordMetric(action string) {
	today := time.Now().UTC().Truncate(24 * time.Hour)
	firstOfMonth := time.Date(today.Year(), today.Month(), 1, 0, 0, 0, 0, time.UTC)

	// Increment daily metric
	err := ss.crud.DB.Transaction(func(tx *gorm.DB) error {
		var metric DailyMetrics
		if err := tx.FirstOrCreate(&metric, DailyMetrics{
			Timestamp: today,
			Action:    action,
		}).Error; err != nil {
			return err
		}
		metric.Count += 1
		if err := tx.Save(&metric).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		ss.logger.Error("unable to increment daily metric", "err", err, "action", action)
	}

	// Increment monthly metric
	err = ss.crud.DB.Transaction(func(tx *gorm.DB) error {
		var metric MonthlyMetrics
		if err := tx.FirstOrCreate(&metric, MonthlyMetrics{
			Timestamp: firstOfMonth,
			Action:    action,
		}).Error; err != nil {
			return err
		}
		metric.Count += 1
		if err := tx.Save(&metric).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		ss.logger.Error("unable to increment monthly metric", "err", err, "action", action)
	}
}

func (ss *MediorumServer) findNodeToServeBlob(_ context.Context, key string) string {

	// use cache if possible
	if host, ok := ss.redirectCache.Get(key); ok {
		// verify host is all good
		if ss.hostHasBlob(host, key) {
			return host
		} else {
			ss.redirectCache.Remove(key)
		}
	}

	// try hosts to find blob
	hosts, _ := ss.rendezvousAllHosts(key)
	for _, h := range hosts {
		if ss.hostHasBlob(h, key) {
			ss.redirectCache.Set(key, h, imcache.WithDefaultExpiration())
			return h
		}
	}

	return ""
}

func (ss *MediorumServer) findAndPullBlob(_ context.Context, key string) (string, error) {
	// start := time.Now()

	hosts, _ := ss.rendezvousAllHosts(key)
	for _, host := range hosts {
		err := ss.pullFileFromHost(host, key)
		if err == nil {
			return host, nil
		}
	}

	return "", errors.New("no host found with " + key)
}

func (ss *MediorumServer) logTrackListen(c echo.Context) {

	skipPlayCount, _ := strconv.ParseBool(c.QueryParam("skip_play_count"))

	if skipPlayCount ||
		os.Getenv("identityService") == "" ||
		!rangeIsFirstByte(c.Request().Header.Get("Range")) ||
		c.Request().Method != "GET" {
		// todo: skip count for trusted notifier requests should be inferred
		// by the requesting entity and not some query param
		return
	}

	httpClient := http.Client{
		Timeout: 1 * time.Minute, // identity svc slow
	}

	sig, err := signature.ParseFromQueryString(c.QueryParam("signature"))
	if err != nil {
		ss.logger.Warn("unable to parse signature for request", "signature", c.QueryParam("signature"), "remote_addr", c.Request().RemoteAddr, "url", c.Request().URL)
		return
	}

	// as per CN `userId: req.userId ?? delegateOwnerWallet`
	userId := ss.Config.Self.Wallet
	if sig.Data.UserID != 0 {
		userId = strconv.Itoa(sig.Data.UserID)
	}

	// default to identity
	solanaRelayService := os.Getenv("identityService")
	if ss.Config.discoveryListensEnabled() {
		// pick random discovery node and append '/solana' for the relay plugin
		endpoint := ss.Config.DiscoveryListensEndpoints[rand.Intn(len(ss.Config.DiscoveryListensEndpoints))]
		solanaRelayService = fmt.Sprintf("%s/solana", endpoint)
	}

	endpoint := fmt.Sprintf("%s/tracks/%d/listen", solanaRelayService, sig.Data.TrackId)

	ss.logger.Debug("logging listen", "endpoint", endpoint)

	signatureData, err := signature.GenerateListenTimestampAndSignature(ss.Config.privateKey)
	if err != nil {
		ss.logger.Error("unable to build request", "err", err)
		return
	}

	body := map[string]interface{}{
		"userId":       userId,
		"solanaListen": false,
		"timestamp":    signatureData.Timestamp,
		"signature":    signatureData.Signature,
	}

	buf, err := json.Marshal(body)
	if err != nil {
		ss.logger.Error("unable to build request", "err", err)
		return
	}

	req, err := signature.SignedPost(endpoint, "application/json", bytes.NewReader(buf), ss.Config.privateKey, ss.Config.Self.Host)
	if err != nil {
		ss.logger.Error("unable to build request", "err", err)
		return
	}
	req.Header.Add("x-forwarded-for", c.RealIP())

	res, err := httpClient.Do(req)
	if err != nil {
		ss.logger.Error("unable to POST to listen service", "err", err)
		return
	}
	defer res.Body.Close()

	if res.StatusCode != 200 {
		resBody, err := io.ReadAll(res.Body)
		if err != nil {
			ss.logger.Warn(fmt.Sprintf("unsuccessful POST [%d] %s", res.StatusCode, resBody))
		}
	}
}

// checks signature from discovery node
// used for cidstream endpoint + gated content and audio analysis post endpoints
// based on: https://github.com/AudiusProject/audius-protocol/blob/main/creator-node/src/middlewares/contentAccess/contentAccessMiddleware.ts
func (s *MediorumServer) requireRegisteredSignature(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		cid := c.Param("cid")
		uploadID := c.Param("id")
		sig, err := signature.ParseFromQueryString(c.QueryParam("signature"))
		if err != nil {
			return c.JSON(401, map[string]string{
				"error":  "invalid signature",
				"detail": err.Error(),
			})
		} else {
			// check it was signed by a registered node
			isRegistered := slices.ContainsFunc(s.Config.Signers, func(peer Peer) bool {
				return strings.EqualFold(peer.Wallet, sig.SignerWallet)
			})
			if !isRegistered {
				s.logger.Debug("sig no match", "signed by", sig.SignerWallet)
				return c.JSON(401, map[string]string{
					"error":  "signer not in list of registered nodes",
					"detail": "signed by: " + sig.SignerWallet,
				})
			}

			// check signature not too old
			age := time.Since(time.Unix(sig.Data.Timestamp/1000, 0))
			if age > (time.Hour * 48) {
				return c.JSON(401, map[string]string{
					"error":  "signature too old",
					"detail": age.String(),
				})
			}

			// check it is for this cid
			if sig.Data.Cid != cid {
				return c.JSON(401, map[string]string{
					"error":  "signature contains incorrect CID",
					"detail": fmt.Sprintf("url: %s, signature %s", cid, sig.Data.Cid),
				})
			}

			// check it is for this upload
			if sig.Data.UploadID != uploadID {
				return c.JSON(401, map[string]string{
					"error":  "signature contains incorrect upload ID",
					"detail": fmt.Sprintf("url: %s, signature %s", uploadID, sig.Data.UploadID),
				})
			}

			// OK
			c.Response().Header().Set("x-signature-debug", sig.String())
		}

		return next(c)
	}
}

func (ss *MediorumServer) serveInternalBlobGET(c echo.Context) error {
	ctx := c.Request().Context()
	cid := c.Param("cid")
	key := cidutil.ShardCID(cid)

	blob, err := ss.bucket.NewReader(ctx, key, nil)
	if err != nil {
		return err
	}
	defer blob.Close()

	return c.Stream(200, blob.ContentType(), blob)
}

func (ss *MediorumServer) serveInternalBlobPOST(c echo.Context) error {
	if !ss.diskHasSpace() {
		return c.String(http.StatusServiceUnavailable, "disk is too full to accept new blobs")
	}

	form, err := c.MultipartForm()
	if err != nil {
		return err
	}
	files := form.File[filesFormFieldName]
	defer form.RemoveAll()

	for _, upload := range files {
		cid := upload.Filename
		logger := ss.logger.With("cid", cid)

		inp, err := upload.Open()
		if err != nil {
			return err
		}
		defer inp.Close()

		err = cidutil.ValidateCID(cid, inp)
		if err != nil {
			logger.Error("postBlob got invalid CID", "err", err)
			return c.JSON(400, map[string]string{
				"error": err.Error(),
			})
		}

		err = ss.replicateToMyBucket(cid, inp)
		if err != nil {
			ss.logger.Error("accept ERR", "err", err)
			return err
		}
	}

	return c.JSON(200, "ok")
}
