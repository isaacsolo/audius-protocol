import { USDC } from '@audius/fixed-decimal'
import snakecaseKeys from 'snakecase-keys'

import type {
  EntityManagerService,
  AuthService,
  ClaimableTokensClient,
  PaymentRouterClient,
  SolanaRelayService
} from '../../services'
import type { DiscoveryNodeSelectorService } from '../../services/DiscoveryNodeSelector'
import {
  Action,
  EntityType,
  AdvancedOptions
} from '../../services/EntityManager/types'
import type { LoggerService } from '../../services/Logger'
import type { StorageService } from '../../services/Storage'
import { encodeHashId } from '../../utils/hashId'
import { parseParams } from '../../utils/parseParams'
import { prepareSplits } from '../../utils/preparePaymentSplits'
import { retry3 } from '../../utils/retry'
import {
  Configuration,
  StreamTrackRequest,
  TracksApi as GeneratedTracksApi,
  ExtendedPaymentSplit,
  instanceOfExtendedPurchaseGate
} from '../generated/default'
import { BASE_PATH, RequiredError } from '../generated/default/runtime'

import { TrackUploadHelper } from './TrackUploadHelper'
import {
  createUpdateTrackSchema,
  createUploadTrackSchema,
  DeleteTrackRequest,
  DeleteTrackSchema,
  RepostTrackRequest,
  RepostTrackSchema,
  FavoriteTrackRequest,
  FavoriteTrackSchema,
  UnrepostTrackRequest,
  UnrepostTrackSchema,
  UnfavoriteTrackRequest,
  UnfavoriteTrackSchema,
  UpdateTrackRequest,
  UploadTrackRequest,
  PurchaseTrackRequest,
  PurchaseTrackSchema,
  GetPurchaseTrackTransactionRequest,
  GetPurchaseTrackTransactionSchema
} from './types'

// Extend that new class
export class TracksApi extends GeneratedTracksApi {
  private readonly trackUploadHelper: TrackUploadHelper

  constructor(
    configuration: Configuration,
    private readonly discoveryNodeSelectorService: DiscoveryNodeSelectorService,
    private readonly storage: StorageService,
    private readonly entityManager: EntityManagerService,
    private readonly auth: AuthService,
    private readonly logger: LoggerService,
    private readonly claimableTokensClient: ClaimableTokensClient,
    private readonly paymentRouterClient: PaymentRouterClient,
    private readonly solanaRelay: SolanaRelayService
  ) {
    super(configuration)
    this.trackUploadHelper = new TrackUploadHelper(configuration)
    this.logger = logger.createPrefixedLogger('[tracks-api]')
  }

  /**
   * Get the url of the track's streamable mp3 file
   */
  // @ts-expect-error
  override async streamTrack(params: StreamTrackRequest): Promise<string> {
    if (params.trackId === null || params.trackId === undefined) {
      throw new RequiredError(
        'trackId',
        'Required parameter params.trackId was null or undefined when calling getTrack.'
      )
    }

    const path = `/tracks/{track_id}/stream`.replace(
      `{${'track_id'}}`,
      encodeURIComponent(String(params.trackId))
    )
    const host = await this.discoveryNodeSelectorService.getSelectedEndpoint()
    return `${host}${BASE_PATH}${path}`
  }

  /** @hidden
   * Upload a track
   */
  async uploadTrack(
    params: UploadTrackRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    this.logger.info('Parsing inputs')
    const {
      userId,
      trackFile,
      coverArtFile,
      metadata: parsedMetadata,
      onProgress
    } = await parseParams('uploadTrack', createUploadTrackSchema())(params)

    // Transform metadata
    this.logger.info('Transforming metadata')
    const metadata = this.trackUploadHelper.transformTrackUploadMetadata(
      parsedMetadata,
      userId
    )
    const uploadOptions: { [key: string]: string } = {}
    if (metadata.previewStartSeconds) {
      uploadOptions.previewStartSeconds =
        metadata.previewStartSeconds.toString()
    }

    if (metadata.placementHosts) {
      uploadOptions.placement_hosts = metadata.placementHosts
    }

    // Upload track audio and cover art to storage node
    this.logger.info('Uploading track audio and cover art')
    const [coverArtResponse, audioResponse] = await Promise.all([
      retry3(
        async () =>
          await this.storage.uploadFile({
            file: coverArtFile,
            onProgress,
            template: 'img_square'
          }),
        (e) => {
          this.logger.info('Retrying uploadTrackCoverArt', e)
        }
      ),
      retry3(
        async () =>
          await this.storage.uploadFile({
            file: trackFile,
            onProgress,
            template: 'audio',
            options: uploadOptions
          }),
        (e) => {
          this.logger.info('Retrying uploadTrackAudio', e)
        }
      )
    ])

    // Update metadata to include uploaded CIDs
    const updatedMetadata =
      this.trackUploadHelper.populateTrackMetadataWithUploadResponse(
        metadata,
        audioResponse,
        coverArtResponse
      )

    // Write metadata to chain
    this.logger.info('Writing metadata to chain')
    const trackId = await this.trackUploadHelper.generateId('track')
    const response = await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.TRACK,
      entityId: trackId,
      action: Action.CREATE,
      metadata: JSON.stringify({
        cid: '',
        data: snakecaseKeys(updatedMetadata)
      }),
      auth: this.auth,
      ...advancedOptions
    })

    this.logger.info('Successfully uploaded track')
    return {
      ...response,
      trackId: encodeHashId(trackId)
    }
  }

  /** @hidden
   * Update a track
   */
  async updateTrack(
    params: UpdateTrackRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const {
      userId,
      trackId,
      coverArtFile,
      metadata: parsedMetadata,
      onProgress,
      transcodePreview
    } = await parseParams('updateTrack', createUpdateTrackSchema())(params)

    // Transform metadata
    const metadata = this.trackUploadHelper.transformTrackUploadMetadata(
      parsedMetadata,
      userId
    )

    // Upload track cover art to storage node
    const coverArtResp =
      coverArtFile &&
      (await retry3(
        async () =>
          await this.storage.uploadFile({
            file: coverArtFile,
            onProgress,
            template: 'img_square'
          }),
        (e) => {
          this.logger.info('Retrying uploadTrackCoverArt', e)
        }
      ))

    // Update metadata to include uploaded CIDs
    const updatedMetadata = {
      ...metadata,
      ...(coverArtResp ? { coverArtSizes: coverArtResp.id } : {})
    }

    if (transcodePreview) {
      if (!updatedMetadata.previewStartSeconds) {
        throw new Error('No track preview start time specified')
      }
      if (!updatedMetadata.audioUploadId) {
        throw new Error('Missing required audio_upload_id')
      }

      // Transocde track preview
      const editFileData = {
        previewStartSeconds: updatedMetadata.previewStartSeconds!.toString()
      }
      const updatePreviewResp = await retry3(
        async () =>
          await this.storage.editFile({
            uploadId: updatedMetadata.audioUploadId!,
            data: editFileData,
            auth: this.auth
          }),
        (e) => {
          this.logger.info('Retrying editFileV2', e)
        }
      )

      // Update metadata to include updated preview CID
      const previewKey = `320_preview|${updatedMetadata.previewStartSeconds}`
      updatedMetadata.previewCid = updatePreviewResp.results[previewKey]
    }

    // Write metadata to chain
    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.TRACK,
      entityId: trackId,
      action: Action.UPDATE,
      metadata: JSON.stringify({
        cid: '',
        data: snakecaseKeys(updatedMetadata)
      }),
      auth: this.auth,
      ...advancedOptions
    })
  }

  /** @hidden
   * Delete a track
   */
  async deleteTrack(
    params: DeleteTrackRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, trackId } = await parseParams(
      'deleteTrack',
      DeleteTrackSchema
    )(params)

    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.TRACK,
      entityId: trackId,
      action: Action.DELETE,
      auth: this.auth,
      ...advancedOptions
    })
  }

  /** @hidden
   * Favorite a track
   */
  async favoriteTrack(
    params: FavoriteTrackRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, trackId, metadata } = await parseParams(
      'favoriteTrack',
      FavoriteTrackSchema
    )(params)

    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.TRACK,
      entityId: trackId,
      action: Action.SAVE,
      metadata: metadata && JSON.stringify(snakecaseKeys(metadata)),
      auth: this.auth,
      ...advancedOptions
    })
  }

  /** @hidden
   * Unfavorite a track
   */
  async unfavoriteTrack(
    params: UnfavoriteTrackRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, trackId } = await parseParams(
      'unfavoriteTrack',
      UnfavoriteTrackSchema
    )(params)

    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.TRACK,
      entityId: trackId,
      action: Action.UNSAVE,
      auth: this.auth,
      ...advancedOptions
    })
  }

  /** @hidden
   * Repost a track
   */
  async repostTrack(
    params: RepostTrackRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, trackId, metadata } = await parseParams(
      'respostTrack',
      RepostTrackSchema
    )(params)

    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.TRACK,
      entityId: trackId,
      action: Action.REPOST,
      metadata: metadata && JSON.stringify(snakecaseKeys(metadata)),
      auth: this.auth,
      ...advancedOptions
    })
  }

  /** @hidden
   * Unrepost a track
   */
  async unrepostTrack(
    params: UnrepostTrackRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, trackId } = await parseParams(
      'unrepostTrack',
      UnrepostTrackSchema
    )(params)

    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.TRACK,
      entityId: trackId,
      action: Action.UNREPOST,
      auth: this.auth,
      ...advancedOptions
    })
  }

  /**
   * Gets the Solana transaction that purchases the track
   *
   * @hidden
   */
  public async getPurchaseTrackTransaction(
    params: GetPurchaseTrackTransactionRequest
  ) {
    const {
      userId,
      trackId,
      price: priceNumber,
      extraAmount: extraAmountNumber = 0,
      wallet
    } = await parseParams(
      'getPurchaseTrackTransaction',
      GetPurchaseTrackTransactionSchema
    )(params)

    const contentType = 'track'
    const mint = 'USDC'

    // Fetch track
    this.logger.debug('Fetching track purchase info...', { trackId })
    const { data: track } = await this.getTrackAccessInfo({
      trackId: params.trackId, // use hashed trackId
      userId: params.userId // use hashed userId
    })

    // Validate purchase attempt
    if (!track) {
      throw new Error('Track not found.')
    }

    if (!track.isStreamGated && !track.isDownloadGated) {
      throw new Error('Attempted to purchase free track.')
    }

    if (track.userId === params.userId) {
      throw new Error('Attempted to purchase own track.')
    }

    let numberSplits: ExtendedPaymentSplit[] = []
    let centPrice: number
    let accessType: 'stream' | 'download' = 'stream'

    // Get conditions
    if (
      track.streamConditions &&
      instanceOfExtendedPurchaseGate(track.streamConditions)
    ) {
      centPrice = track.streamConditions.usdcPurchase.price
      numberSplits = track.streamConditions.usdcPurchase.splits
    } else if (
      track.downloadConditions &&
      instanceOfExtendedPurchaseGate(track.downloadConditions)
    ) {
      centPrice = track.downloadConditions.usdcPurchase.price
      numberSplits = track.downloadConditions.usdcPurchase.splits
      accessType = 'download'
    } else {
      throw new Error('Track is not available for purchase.')
    }

    // Check if already purchased
    if (
      (accessType === 'download' && track.access?.download) ||
      (accessType === 'stream' && track.access?.stream)
    ) {
      throw new Error('Track already purchased')
    }

    // Check if price changed
    if (USDC(priceNumber).value < USDC(centPrice / 100).value) {
      throw new Error('Track price increased.')
    }

    const extraAmount = USDC(extraAmountNumber).value
    const total = USDC(centPrice / 100.0).value + extraAmount
    this.logger.debug('Purchase total:', total)

    const splits = await prepareSplits({
      splits: numberSplits,
      extraAmount,
      claimableTokensClient: this.claimableTokensClient,
      logger: this.logger
    })
    this.logger.debug('Calculated splits:', splits)

    const routeInstruction =
      await this.paymentRouterClient.createRouteInstruction({
        splits,
        total,
        mint
      })
    const memoInstruction =
      await this.paymentRouterClient.createPurchaseMemoInstruction({
        contentId: trackId,
        contentType,
        blockNumber: track.blocknumber,
        buyerUserId: userId,
        accessType
      })
    const locationMemoInstruction =
      await this.solanaRelay.getLocationInstruction()

    if (wallet) {
      this.logger.debug('Using provided wallet to purchase...', {
        wallet: wallet.toBase58()
      })
      // Use the specified Solana wallet
      const transferInstruction =
        await this.paymentRouterClient.createTransferInstruction({
          sourceWallet: wallet,
          total,
          mint
        })
      const transaction = await this.paymentRouterClient.buildTransaction({
        feePayer: wallet,
        instructions: [
          transferInstruction,
          routeInstruction,
          memoInstruction,
          locationMemoInstruction
        ]
      })
      return transaction
    } else {
      // Use the authed wallet's userbank and relay
      const ethWallet = await this.auth.getAddress()
      this.logger.debug(
        `Using userBank ${await this.claimableTokensClient.deriveUserBank({
          ethWallet,
          mint: 'USDC'
        })} to purchase...`
      )
      const paymentRouterTokenAccount =
        await this.paymentRouterClient.getOrCreateProgramTokenAccount({
          mint
        })

      const transferSecpInstruction =
        await this.claimableTokensClient.createTransferSecpInstruction({
          ethWallet,
          destination: paymentRouterTokenAccount.address,
          mint,
          amount: total,
          auth: this.auth
        })
      const transferInstruction =
        await this.claimableTokensClient.createTransferInstruction({
          ethWallet,
          destination: paymentRouterTokenAccount.address,
          mint
        })
      const transaction = await this.paymentRouterClient.buildTransaction({
        instructions: [
          transferSecpInstruction,
          transferInstruction,
          routeInstruction,
          memoInstruction,
          locationMemoInstruction
        ]
      })
      return transaction
    }
  }

  /**
   * Purchases stream or download access to a track
   *
   * @hidden
   */
  public async purchaseTrack(params: PurchaseTrackRequest) {
    await parseParams('purchaseTrack', PurchaseTrackSchema)(params)
    const transaction = await this.getPurchaseTrackTransaction(params)
    if (params.walletAdapter) {
      if (!params.walletAdapter.publicKey) {
        throw new Error(
          'Param walletAdapter was specified, but no wallet selected'
        )
      }
      return await params.walletAdapter.sendTransaction(
        transaction,
        this.paymentRouterClient.connection
      )
    }
    return this.paymentRouterClient.sendTransaction(transaction)
  }
}
