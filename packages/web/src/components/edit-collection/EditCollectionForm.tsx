import { useCallback, useState } from 'react'

import { useFeatureFlag } from '@audius/common/hooks'
import {
  AlbumSchema,
  CollectionValues,
  PlaylistSchema
} from '@audius/common/schemas'
import { FeatureFlags } from '@audius/common/services'
import { Nullable } from '@audius/common/utils'
import { Button, Flex, IconTrash, Text } from '@audius/harmony'
import { Form, Formik } from 'formik'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import { AnchoredSubmitRow } from 'components/edit/AnchoredSubmitRow'
import { AnchoredSubmitRowEdit } from 'components/edit/AnchoredSubmitRowEdit'
import { AdvancedAlbumField } from 'components/edit/fields/AdvancedAlbumField'
import { CollectionTrackFieldArray } from 'components/edit/fields/CollectionTrackFieldArray'
import { ReleaseDateFieldLegacy } from 'components/edit/fields/ReleaseDateFieldLegacy'
import { SelectGenreField } from 'components/edit/fields/SelectGenreField'
import { SelectMoodField } from 'components/edit/fields/SelectMoodField'
import { StemsAndDownloadsCollectionField } from 'components/edit/fields/StemsAndDownloadsCollectionsField'
import { PriceAndAudienceField } from 'components/edit/fields/price-and-audience'
import { VisibilityField } from 'components/edit/fields/visibility/VisibilityField'
import {
  ArtworkField,
  TagField,
  TextAreaField,
  TextField
} from 'components/form-fields'
import { Tile } from 'components/tile'

import { CollectionNavigationPrompt } from './CollectionNavigationPrompt'
import { DeleteCollectionConfirmationModal } from './DeleteCollectionConfirmationModal'
import styles from './EditCollectionForm.module.css'
import { ReleaseCollectionConfirmationModal } from './ReleaseCollectionConfirmationModal'

const messages = {
  name: 'Name',
  description: 'Description',
  trackDetails: {
    title: 'Track Details',
    description:
      'Set defaults for all tracks in this collection. You can edit your track details after upload.'
  },
  completeButton: 'Complete Upload',
  deleteCollection: (collectionName: string) => `Delete ${collectionName}`
}

const formId = 'edit-collection-form'

type EditCollectionFormProps = {
  initialValues: CollectionValues
  onSubmit: (values: CollectionValues) => void
  isAlbum: boolean
  isUpload: boolean
  focus?: Nullable<string>
}

export const EditCollectionForm = (props: EditCollectionFormProps) => {
  const { initialValues, onSubmit, isAlbum, isUpload, focus } = props
  const {
    playlist_id,
    is_private: initiallyHidden,
    is_scheduled_release: isInitiallyScheduled
  } = initialValues

  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] =
    useState(false)
  const [isReleaseConfirmationOpen, setIsReleaseConfirmationOpen] =
    useState(false)
  const [confirmDrawerType, setConfirmDrawerType] =
    useState<Nullable<'release' | 'early_release' | 'hidden'>>(null)
  const { isEnabled: isPremiumAlbumsEnabled } = useFeatureFlag(
    FeatureFlags.PREMIUM_ALBUMS_ENABLED
  )

  const { isEnabled: isHiddenPaidScheduledEnabled } = useFeatureFlag(
    FeatureFlags.HIDDEN_PAID_SCHEDULED
  )

  const collectionTypeName = isAlbum ? 'Album' : 'Playlist'
  const validationSchema = isAlbum ? AlbumSchema : PlaylistSchema

  const handleSubmit = useCallback(
    (values: CollectionValues) => {
      if (isReleaseConfirmationOpen) {
        setIsReleaseConfirmationOpen(false)
        onSubmit(values)
      } else {
        const usersMayLoseAccess =
          isAlbum && !isUpload && !initiallyHidden && values.is_private
        const isToBePublished =
          !isUpload && initiallyHidden && !values.is_private
        const showConfirmDrawer = usersMayLoseAccess || isToBePublished
        if (showConfirmDrawer) {
          if (usersMayLoseAccess) {
            setConfirmDrawerType('hidden')
          } else if (isInitiallyScheduled) {
            setConfirmDrawerType('early_release')
          } else {
            setConfirmDrawerType('release')
          }
          setIsReleaseConfirmationOpen(true)
        } else {
          setIsReleaseConfirmationOpen(false)
          onSubmit(values)
        }
      }
    },
    [
      initiallyHidden,
      isAlbum,
      isInitiallyScheduled,
      isReleaseConfirmationOpen,
      isUpload,
      onSubmit
    ]
  )

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={toFormikValidationSchema(validationSchema)}
    >
      <Form className={styles.root} id={formId}>
        <CollectionNavigationPrompt />
        <Tile className={styles.collectionFields} elevation='mid'>
          <div className={styles.row}>
            <ArtworkField
              name='artwork'
              className={styles.artwork}
              size='small'
              autoFocus={focus === 'artwork'}
            />
            <div className={styles.collectionInfo}>
              <TextField
                name='playlist_name'
                label={`${collectionTypeName} ${messages.name}`}
                maxLength={64}
                required
                autoFocus={focus === 'name'}
              />
              <TextAreaField
                name='description'
                aria-label={`${collectionTypeName} ${messages.description}`}
                placeholder={`${collectionTypeName} ${messages.description}`}
                maxLength={1000}
                showMaxLength
                className={styles.description}
                grows
              />
            </div>
          </div>
          {isHiddenPaidScheduledEnabled ? (
            <VisibilityField
              entityType={isAlbum ? 'album' : 'playlist'}
              isUpload={isUpload}
            />
          ) : (
            <ReleaseDateFieldLegacy />
          )}
          {isAlbum && isPremiumAlbumsEnabled ? (
            <PriceAndAudienceField isAlbum={isAlbum} isUpload={isUpload} />
          ) : null}
          {isAlbum ? <AdvancedAlbumField /> : null}
          {isUpload ? (
            <Flex
              direction='column'
              gap='l'
              ph='xl'
              pv='l'
              alignItems='flex-start'
            >
              <Text variant='title' size='l'>
                {messages.trackDetails.title}
              </Text>
              <Text variant='body'>{messages.trackDetails.description}</Text>
              <Flex w='100%' gap='s'>
                <SelectGenreField name='trackDetails.genre' />
                <SelectMoodField name='trackDetails.mood' />
              </Flex>
              <TagField name='trackDetails.tags' />
              {isAlbum && <StemsAndDownloadsCollectionField />}
            </Flex>
          ) : null}
          {!isUpload ? (
            <Flex>
              <Button
                variant='destructive'
                size='small'
                iconLeft={IconTrash}
                onClick={() => setIsDeleteConfirmationOpen(true)}
              >
                {messages.deleteCollection(collectionTypeName)}
              </Button>
            </Flex>
          ) : null}
        </Tile>
        <CollectionTrackFieldArray />
        {isUpload ? <AnchoredSubmitRow /> : <AnchoredSubmitRowEdit />}
        {playlist_id ? (
          <>
            <DeleteCollectionConfirmationModal
              visible={isDeleteConfirmationOpen}
              collectionId={playlist_id}
              entity={collectionTypeName}
              onCancel={() => setIsDeleteConfirmationOpen(false)}
              onDelete={() => setIsDeleteConfirmationOpen(false)}
            />
            {!isUpload && confirmDrawerType ? (
              <ReleaseCollectionConfirmationModal
                isOpen={isReleaseConfirmationOpen}
                onClose={() => setIsReleaseConfirmationOpen(false)}
                collectionType={isAlbum ? 'album' : 'playlist'}
                releaseType={confirmDrawerType}
                formId={formId}
              />
            ) : null}
          </>
        ) : null}
      </Form>
    </Formik>
  )
}
