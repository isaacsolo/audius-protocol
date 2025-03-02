import { useMemo } from 'react'

import { useUSDCPurchaseConfig } from '@audius/common/hooks'
import {
  StreamTrackAvailabilityType,
  isContentCollectibleGated,
  isContentFollowGated,
  isContentTipGated,
  isContentUSDCPurchaseGated,
  CollectibleGatedConditions,
  FollowGatedConditions,
  TipGatedConditions,
  USDCPurchaseConditions,
  AccessConditions,
  Track
} from '@audius/common/models'
import { accountSelectors } from '@audius/common/store'
import { Nullable } from '@audius/common/utils'
import {
  IconCollectible,
  IconVisibilityHidden,
  IconSpecialAccess,
  IconVisibilityPublic,
  IconCart,
  Button
} from '@audius/harmony'
import { set, get } from 'lodash'
import { useSelector } from 'react-redux'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import { getCombinedDefaultGatedConditionValues } from 'components/edit/fields/helpers'
import { PriceAndAudienceMenuFields } from 'components/edit/fields/price-and-audience/PriceAndAudienceMenuFields'
import { priceAndAudienceSchema } from 'components/edit/fields/price-and-audience/priceAndAudienceSchema'
import {
  AccessAndSaleFormValues,
  DOWNLOAD_CONDITIONS,
  FIELD_VISIBILITY,
  GateKeeper,
  IS_DOWNLOADABLE,
  IS_DOWNLOAD_GATED,
  IS_STREAM_GATED,
  IS_UNLISTED,
  LAST_GATE_KEEPER,
  PREVIEW,
  PRICE_HUMANIZED,
  SPECIAL_ACCESS_TYPE,
  STREAM_AVAILABILITY_TYPE,
  STREAM_CONDITIONS,
  SpecialAccessType
} from 'components/edit/fields/types'
import { defaultFieldVisibility } from 'pages/track-page/utils'

import { ContextualMenu } from './ContextualMenu'

const { getUserId } = accountSelectors

const messages = {
  title: 'Access & Sale',
  description:
    "Customize your music's availability for different audiences, and create personalized gated experiences for your fans.",
  public: 'Public (Default)',
  premium: 'Premium',
  specialAccess: 'Special Access',
  collectibleGated: 'Collectible Gated',
  hidden: 'Hidden'
}

enum GatedTrackMetadataField {
  IS_STREAM_GATED = 'is_stream_gated',
  STREAM_CONDITIONS = 'stream_conditions',
  PREVIEW = 'preview_start_seconds',
  IS_DOWNLOAD_GATED = 'is_download_gated',
  DOWNLOAD_CONDITIONS = 'download_conditions',
  IS_DOWNLOADABLE = 'is_downloadable'
}

enum UnlistedTrackMetadataField {
  SCHEDULED_RELEASE = 'scheduled_release',
  UNLISTED = 'unlisted',
  GENRE = 'genre',
  MOOD = 'mood',
  TAGS = 'tags',
  SHARE = 'share',
  PLAYS = 'plays'
}

type TrackMetadataState = {
  [GatedTrackMetadataField.IS_STREAM_GATED]: boolean
  [GatedTrackMetadataField.STREAM_CONDITIONS]: Nullable<AccessConditions>
  [GatedTrackMetadataField.PREVIEW]: Nullable<number>
  [GatedTrackMetadataField.IS_DOWNLOAD_GATED]: boolean
  [GatedTrackMetadataField.DOWNLOAD_CONDITIONS]: Nullable<AccessConditions>
  [GatedTrackMetadataField.IS_DOWNLOADABLE]: boolean
  [UnlistedTrackMetadataField.SCHEDULED_RELEASE]: boolean
  [UnlistedTrackMetadataField.UNLISTED]: boolean
  [UnlistedTrackMetadataField.GENRE]: boolean
  [UnlistedTrackMetadataField.MOOD]: boolean
  [UnlistedTrackMetadataField.TAGS]: boolean
  [UnlistedTrackMetadataField.SHARE]: boolean
  [UnlistedTrackMetadataField.PLAYS]: boolean
}

type AccessAndSaleTriggerLegacyProps = {
  isRemix: boolean
  isUpload: boolean
  initialForm: Track
  metadataState: TrackMetadataState
  trackLength: number
  didUpdateState: (newState: TrackMetadataState) => void
  lastGateKeeper: GateKeeper
  setLastGateKeeper: (value: GateKeeper) => void
  forceOpen?: boolean
  setForceOpen?: (value: boolean) => void
}

export const AccessAndSaleTriggerLegacy = (
  props: AccessAndSaleTriggerLegacyProps
) => {
  const {
    isUpload,
    isRemix,
    initialForm,
    metadataState,
    trackLength,
    didUpdateState,
    lastGateKeeper,
    setLastGateKeeper,
    forceOpen,
    setForceOpen
  } = props
  const initialStreamConditions = initialForm[STREAM_CONDITIONS]
  const {
    stream_conditions: savedStreamConditions,
    unlisted: isUnlisted,
    scheduled_release: isScheduledRelease,
    is_stream_gated: isStreamGated,
    preview_start_seconds: preview,
    is_download_gated: isDownloadGated,
    download_conditions: downloadConditions,
    is_downloadable: isDownloadable,
    ...fieldVisibility
  } = metadataState

  /**
   * Stream conditions from inside the modal.
   * Upon submit, these values along with the selected access option will
   * determine the final stream conditions that get saved to the track.
   */
  const accountUserId = useSelector(getUserId)
  const tempStreamConditions = useMemo(
    () => ({
      ...getCombinedDefaultGatedConditionValues(accountUserId),
      ...savedStreamConditions
    }),
    [accountUserId, savedStreamConditions]
  )

  const usdcPurchaseConfig = useUSDCPurchaseConfig()

  const initialValues: AccessAndSaleFormValues = useMemo(() => {
    const isUsdcGated = isContentUSDCPurchaseGated(savedStreamConditions)
    const isTipGated = isContentTipGated(savedStreamConditions)
    const isFollowGated = isContentFollowGated(savedStreamConditions)
    const isCollectibleGated = isContentCollectibleGated(savedStreamConditions)

    const initialValues = {}
    set(initialValues, IS_UNLISTED, isUnlisted)
    set(initialValues, IS_STREAM_GATED, isStreamGated)
    set(initialValues, STREAM_CONDITIONS, tempStreamConditions)
    set(initialValues, IS_DOWNLOAD_GATED, isDownloadGated)
    set(initialValues, DOWNLOAD_CONDITIONS, downloadConditions)
    set(initialValues, IS_DOWNLOADABLE, isDownloadable)
    set(initialValues, LAST_GATE_KEEPER, lastGateKeeper ?? {})

    let availabilityType = StreamTrackAvailabilityType.PUBLIC
    if (isUsdcGated) {
      availabilityType = StreamTrackAvailabilityType.USDC_PURCHASE
      set(
        initialValues,
        PRICE_HUMANIZED,
        tempStreamConditions.usdc_purchase.price
          ? (Number(tempStreamConditions.usdc_purchase.price) / 100).toFixed(2)
          : undefined
      )
    }
    if (isFollowGated || isTipGated) {
      availabilityType = StreamTrackAvailabilityType.SPECIAL_ACCESS
    }
    if (isCollectibleGated) {
      availabilityType = StreamTrackAvailabilityType.COLLECTIBLE_GATED
    }
    if (isUnlisted && !isScheduledRelease) {
      availabilityType = StreamTrackAvailabilityType.HIDDEN
    }
    set(initialValues, STREAM_AVAILABILITY_TYPE, availabilityType)
    set(initialValues, FIELD_VISIBILITY, fieldVisibility)
    set(initialValues, PREVIEW, preview)
    set(
      initialValues,
      SPECIAL_ACCESS_TYPE,
      // Since we're in edit mode, we check if the track was initially tip gated
      isTipGated || isContentTipGated(initialStreamConditions)
        ? SpecialAccessType.TIP
        : SpecialAccessType.FOLLOW
    )
    return initialValues as AccessAndSaleFormValues
  }, [
    savedStreamConditions,
    isUnlisted,
    isStreamGated,
    tempStreamConditions,
    isDownloadGated,
    downloadConditions,
    isDownloadable,
    lastGateKeeper,
    isScheduledRelease,
    fieldVisibility,
    preview,
    initialStreamConditions
  ])

  const onSubmit = (values: AccessAndSaleFormValues) => {
    const availabilityType = get(values, STREAM_AVAILABILITY_TYPE)
    const preview = get(values, PREVIEW)
    const specialAccessType = get(values, SPECIAL_ACCESS_TYPE)
    const fieldVisibility = get(values, FIELD_VISIBILITY)
    const streamConditions = get(values, STREAM_CONDITIONS)
    const lastGateKeeper = get(values, LAST_GATE_KEEPER)

    let newState = {
      ...metadataState,
      ...defaultFieldVisibility,
      remixes: fieldVisibility?.remixes ?? defaultFieldVisibility.remixes
    }
    newState.unlisted = isScheduledRelease ? isUnlisted : false
    newState.is_stream_gated = false
    newState.stream_conditions = null
    newState.preview_start_seconds = null

    // For gated options, extract the correct stream conditions based on the selected availability type
    switch (availabilityType) {
      case StreamTrackAvailabilityType.USDC_PURCHASE: {
        const conditions = {
          // @ts-ignore splits get added in saga
          usdc_purchase: {
            price: Math.round(
              (streamConditions as USDCPurchaseConditions).usdc_purchase.price
            )
          }
        } as USDCPurchaseConditions
        newState.is_stream_gated = true
        newState.stream_conditions = conditions
        newState.preview_start_seconds = preview ?? 0
        newState.is_download_gated = true
        newState.download_conditions = conditions
        newState.is_downloadable = true
        const downloadableGateKeeper =
          isDownloadable && lastGateKeeper.downloadable === 'stemsAndDownloads'
            ? 'stemsAndDownloads'
            : 'accessAndSale'
        setLastGateKeeper({
          ...lastGateKeeper,
          access: 'accessAndSale',
          downloadable: downloadableGateKeeper
        })
        break
      }
      case StreamTrackAvailabilityType.SPECIAL_ACCESS: {
        if (specialAccessType === SpecialAccessType.FOLLOW) {
          const { follow_user_id } = streamConditions as FollowGatedConditions
          newState.stream_conditions = { follow_user_id }
          newState.download_conditions = { follow_user_id }
        } else {
          const { tip_user_id } = streamConditions as TipGatedConditions
          newState.stream_conditions = { tip_user_id }
          newState.download_conditions = { tip_user_id }
        }
        newState.is_stream_gated = true
        newState.is_download_gated = true
        setLastGateKeeper({
          ...lastGateKeeper,
          access: 'accessAndSale'
        })
        break
      }
      case StreamTrackAvailabilityType.COLLECTIBLE_GATED: {
        const { nft_collection } =
          streamConditions as CollectibleGatedConditions
        newState.is_stream_gated = true
        newState.stream_conditions = { nft_collection }
        newState.is_download_gated = true
        newState.download_conditions = { nft_collection }
        setLastGateKeeper({
          ...lastGateKeeper,
          access: 'accessAndSale'
        })
        break
      }
      case StreamTrackAvailabilityType.HIDDEN: {
        newState = {
          ...newState,
          ...(fieldVisibility ?? undefined),
          remixes: fieldVisibility?.remixes ?? defaultFieldVisibility.remixes,
          unlisted: true
        }
        if (lastGateKeeper.access === 'accessAndSale') {
          newState.is_download_gated = false
          newState.download_conditions = null
        }
        if (lastGateKeeper.downloadable === 'accessAndSale') {
          newState.is_downloadable = false
        }
        break
      }
      case StreamTrackAvailabilityType.PUBLIC: {
        if (lastGateKeeper.access === 'accessAndSale') {
          newState.is_download_gated = false
          newState.download_conditions = null
        }
        if (lastGateKeeper.downloadable === 'accessAndSale') {
          newState.is_downloadable = false
        }
        break
      }
    }

    didUpdateState(newState)
  }

  let availabilityButtonTitle = messages.public
  let AvailabilityIcon = IconVisibilityPublic
  if (isUnlisted && !isScheduledRelease) {
    availabilityButtonTitle = messages.hidden
    AvailabilityIcon = IconVisibilityHidden
  } else if (isStreamGated) {
    if (isContentUSDCPurchaseGated(savedStreamConditions)) {
      availabilityButtonTitle = messages.premium
      AvailabilityIcon = IconCart
    } else if (isContentCollectibleGated(savedStreamConditions)) {
      availabilityButtonTitle = messages.collectibleGated
      AvailabilityIcon = IconCollectible
    } else {
      availabilityButtonTitle = messages.specialAccess
      AvailabilityIcon = IconSpecialAccess
    }
  }

  return (
    <ContextualMenu
      label={messages.title}
      description={messages.description}
      icon={<IconVisibilityHidden />}
      initialValues={initialValues}
      onSubmit={onSubmit}
      validationSchema={toFormikValidationSchema(
        priceAndAudienceSchema(trackLength, usdcPurchaseConfig)
      )}
      menuFields={
        <PriceAndAudienceMenuFields
          isRemix={isRemix}
          isUpload={isUpload}
          isInitiallyUnlisted={initialForm[IS_UNLISTED]}
          initialStreamConditions={initialStreamConditions ?? undefined}
          streamConditions={tempStreamConditions}
          isScheduledRelease={isScheduledRelease}
        />
      }
      forceOpen={forceOpen}
      setForceOpen={setForceOpen}
      renderValue={() => null}
      previewOverride={(toggleMenu) => (
        <Button
          variant='secondary'
          size='small'
          css={(theme) => ({ marginTop: theme.spacing.l })}
          name='availabilityModal'
          onClick={toggleMenu}
          iconLeft={AvailabilityIcon}
        >
          {availabilityButtonTitle}
        </Button>
      )}
    />
  )
}
