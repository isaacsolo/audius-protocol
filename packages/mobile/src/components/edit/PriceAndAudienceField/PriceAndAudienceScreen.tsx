import { useCallback, useEffect, useMemo, useState } from 'react'

import { useFeatureFlag, useAccessAndRemixSettings } from '@audius/common/hooks'
import { priceAndAudienceMessages as messages } from '@audius/common/messages'
import {
  isContentCollectibleGated,
  isContentFollowGated,
  isContentTipGated,
  isContentUSDCPurchaseGated,
  StreamTrackAvailabilityType
} from '@audius/common/models'
import type { AccessConditions } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import { modalsActions } from '@audius/common/store'
import { getUsersMayLoseAccess, type Nullable } from '@audius/common/utils'
import { useField, useFormikContext } from 'formik'
import { useDispatch } from 'react-redux'

import { Hint, IconCart } from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'
import { useSetEntityAvailabilityFields } from 'app/hooks/useSetTrackAvailabilityFields'
import { FormScreen } from 'app/screens/form-screen'

import { EditPriceAndAudienceConfirmationDrawer } from '../../../screens/edit-track-screen/components/EditPriceAndAudienceConfirmationDrawer'
import type {
  FormValues,
  RemixOfField
} from '../../../screens/edit-track-screen/types'
import { ExpandableRadio } from '../ExpandableRadio'
import { ExpandableRadioGroup } from '../ExpandableRadioGroup'

import { CollectibleGatedRadioField } from './GollectibleGatedRadioField'
import { PremiumRadioField } from './PremiumRadioField/PremiumRadioField'
import { TRACK_PREVIEW } from './PremiumRadioField/TrackPreviewField'
import { TRACK_PRICE } from './PremiumRadioField/TrackPriceField'
import { SpecialAccessRadioField } from './SpecialAccessRadioField'

const publicAvailability = StreamTrackAvailabilityType.PUBLIC

export const PriceAndAudienceScreen = () => {
  const { initialValues } = useFormikContext<FormValues>()
  const [, , { setValue: setIsStreamGated }] =
    useField<boolean>('is_stream_gated')
  const [{ value: streamConditions }, , { setValue: setStreamConditions }] =
    useField<Nullable<AccessConditions>>('stream_conditions')
  const [{ value: isUnlisted }] = useField<boolean>('is_unlisted')
  const [{ value: isScheduledRelease }] = useField<boolean>(
    'is_scheduled_release'
  )
  const [{ value: remixOf }] = useField<RemixOfField>('remix_of')
  const [{ value: entityType }] = useField<string>('entityType')
  const [{ value: isUpload }] = useField<boolean>('isUpload')
  const isRemix = !!remixOf

  const { isEnabled: isEditableAccessEnabled } = useFeatureFlag(
    FeatureFlags.EDITABLE_ACCESS_ENABLED
  )
  const { isEnabled: isUsdcEnabled } = useFeatureFlag(
    FeatureFlags.USDC_PURCHASES
  )
  const { isEnabled: isUsdcUploadEnabled } = useFeatureFlag(
    FeatureFlags.USDC_PURCHASES_UPLOAD
  )

  const initialStreamConditions = initialValues?.stream_conditions ?? null
  const initialAvailability = useMemo(() => {
    if (isUsdcEnabled && isContentUSDCPurchaseGated(streamConditions)) {
      return StreamTrackAvailabilityType.USDC_PURCHASE
    }
    if (isContentCollectibleGated(streamConditions)) {
      return StreamTrackAvailabilityType.COLLECTIBLE_GATED
    }
    if (
      isContentFollowGated(streamConditions) ||
      isContentTipGated(streamConditions)
    ) {
      return StreamTrackAvailabilityType.SPECIAL_ACCESS
    }
    if (isUnlisted && !isScheduledRelease) {
      return StreamTrackAvailabilityType.HIDDEN
    }
    return StreamTrackAvailabilityType.PUBLIC
    // we only care about what the initial value was here
    // eslint-disable-next-line
  }, [])

  const {
    disableUsdcGate: disableUsdcGateOption,
    disableSpecialAccessGate,
    disableSpecialAccessGateFields,
    disableCollectibleGate,
    disableCollectibleGateFields
  } = useAccessAndRemixSettings({
    isEditableAccessEnabled: !!isEditableAccessEnabled,
    isUpload,
    isRemix,
    initialStreamConditions,
    isInitiallyUnlisted: initialValues.is_unlisted,
    isScheduledRelease
  })

  const disableUsdcGate = disableUsdcGateOption || !isUsdcUploadEnabled

  const [availability, setAvailability] =
    useState<StreamTrackAvailabilityType>(initialAvailability)

  const previousStreamConditions = useMemo(
    () => streamConditions ?? initialStreamConditions,
    // we only care about what the initial value was here
    // eslint-disable-next-line
    []
  )

  const [{ value: price }, { error: priceError }] = useField(TRACK_PRICE)
  const [{ value: preview }, { error: previewError }] = useField(TRACK_PREVIEW)
  const setFields = useSetEntityAvailabilityFields()

  const usdcGateIsInvalid = useMemo(() => {
    // first time user selects usdc purchase option
    const priceNotSet = price === null
    const previewNotSet = preview === null
    return (
      isContentUSDCPurchaseGated(streamConditions) &&
      (!!priceError || priceNotSet || !!previewError || previewNotSet)
    )
  }, [streamConditions, price, priceError, preview, previewError])

  const collectibleGateHasNoSelectedCollection = useMemo(
    () =>
      isContentCollectibleGated(streamConditions) &&
      !streamConditions.nft_collection,
    [streamConditions]
  )

  /**
   * Do not navigate back if:
   * - track is collectible gated and user has not selected an nft collection, or
   * - track is usdc purchase gated and user has not selected a valid price or preview
   */
  const isFormInvalid =
    usdcGateIsInvalid || collectibleGateHasNoSelectedCollection

  const dispatch = useDispatch()
  const navigation = useNavigation()
  const [usersMayLoseAccess, setUsersMayLoseAccess] = useState(false)
  const [specialAccessType, setSpecialAccessType] = useState<
    'follow' | 'tip' | undefined
  >(undefined)

  // We do not know whether or not the special access is of type follow or tip.
  // So we do that check here.
  useEffect(() => {
    if (isContentFollowGated(streamConditions)) {
      setSpecialAccessType('follow')
    } else if (isContentTipGated(streamConditions)) {
      setSpecialAccessType('tip')
    }
  }, [streamConditions])

  // Check if users may lose access based on the new audience.
  useEffect(() => {
    setUsersMayLoseAccess(
      getUsersMayLoseAccess({
        availability,
        initialStreamConditions,
        specialAccessType
      })
    )
  }, [availability, initialStreamConditions, specialAccessType])

  const handleSubmit = useCallback(() => {
    if (!isUpload && isEditableAccessEnabled && usersMayLoseAccess) {
      dispatch(
        modalsActions.setVisibility({
          modal: 'EditPriceAndAudienceConfirmation',
          visible: true
        })
      )
    }
  }, [dispatch, isEditableAccessEnabled, isUpload, usersMayLoseAccess])

  const handleCancel = useCallback(() => {
    dispatch(
      modalsActions.setVisibility({
        modal: 'EditPriceAndAudienceConfirmation',
        visible: false
      })
    )
  }, [dispatch])

  // Listen for `navigation.goBack` events and in the case of going back
  // reset the availability fields.
  // Note that this is a stop gap against a better model which would be to have
  // each radio subgroup manage its own state. That requires a larger refactor.
  useEffect(() => {
    const listener = navigation.addListener('beforeRemove', ({ data }) => {
      if (isFormInvalid && data.action.type === 'GO_BACK') {
        setFields({
          is_stream_gated: initialValues.is_stream_gated,
          stream_conditions: initialValues.stream_conditions,
          is_unlisted: initialValues.is_unlisted,
          preview_start_seconds: initialValues.preview_start_seconds,
          'field_visibility.genre': initialValues.field_visibility?.genre,
          'field_visibility.mood': initialValues.field_visibility?.mood,
          'field_visibility.tags': initialValues.field_visibility?.tags,
          'field_visibility.share': initialValues.field_visibility?.share,
          'field_visibility.play_count':
            initialValues.field_visibility?.play_count,
          'field_visibility.remixes': initialValues.field_visibility?.remixes
        })
      }
    })
    return () => {
      navigation.removeListener('beforeRemove', listener)
    }
  }, [initialValues, navigation, setFields, isFormInvalid])

  return (
    <FormScreen
      title={messages.title}
      icon={IconCart}
      variant='white'
      disableSubmit={isFormInvalid}
      stopNavigation={!isUpload && usersMayLoseAccess}
      onSubmit={handleSubmit}
    >
      {isRemix ? <Hint m='l'>{messages.markedAsRemix}</Hint> : null}
      <ExpandableRadioGroup
        value={availability}
        onValueChange={setAvailability}
      >
        <ExpandableRadio
          value={publicAvailability}
          label={messages.freeRadio.title}
          description={messages.freeRadio.description('track')}
          onValueChange={() => {
            setIsStreamGated(false)
            setStreamConditions(null)
          }}
        />
        <PremiumRadioField
          disabled={disableUsdcGate}
          previousStreamConditions={previousStreamConditions}
        />
        {entityType === 'track' ? (
          <SpecialAccessRadioField
            disabled={
              disableSpecialAccessGate || disableSpecialAccessGateFields
            }
            previousStreamConditions={previousStreamConditions}
          />
        ) : null}
        {entityType === 'track' ? (
          <CollectibleGatedRadioField
            disabled={disableCollectibleGate || disableCollectibleGateFields}
            previousStreamConditions={previousStreamConditions}
          />
        ) : null}
      </ExpandableRadioGroup>
      {!isUpload ? (
        <EditPriceAndAudienceConfirmationDrawer
          onConfirm={navigation.goBack}
          onCancel={handleCancel}
        />
      ) : null}
    </FormScreen>
  )
}
