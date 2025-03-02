import { useSelector } from 'react-redux'

import { useGetCurrentUserId } from '~/api/account'
import { useGetPlaylistById } from '~/api/collection'
import { ID } from '~/models/Identifiers'
import { getCollectionDuration } from '~/store/cache/collections/selectors'
import { CommonState } from '~/store/commonStore'
import { formatDate, formatSecondsAsText } from '~/utils/timeUtil'

export enum CollectionMetadataType {
  DURATION = 'duration',
  RELEASE_DATE = 'releaseDate',
  UPDATED_AT = 'updatedAt'
}

export type AlbumInfo = {
  playlist_name: string
  permalink: string
}

type CollectionMetadataInfo = {
  id: CollectionMetadataType
  label: string
  value: string
}

type CollectionMetadataProps = {
  collectionId: ID
}

export const useCollectionMetadata = ({
  collectionId
}: CollectionMetadataProps): CollectionMetadataInfo[] => {
  const { data: currentUserId } = useGetCurrentUserId({})
  const { data: collection } = useGetPlaylistById({
    playlistId: collectionId,
    currentUserId
  })
  const duration = useSelector((state: CommonState) =>
    getCollectionDuration(state, { id: collectionId })
  )

  if (!collection) return []

  const {
    is_private: isPrivate,
    updated_at: updatedAt,
    is_scheduled_release: isScheduledRelease,
    release_date: releaseDate
  } = collection
  const numTracks = collection.playlist_contents?.track_ids?.length ?? 0

  const metadataItems = [
    {
      id: CollectionMetadataType.DURATION,
      label: 'Duration',
      value: `${numTracks} tracks${
        duration ? `, ${formatSecondsAsText(duration)}` : ''
      }`,
      isHidden: !numTracks
    },
    {
      id: CollectionMetadataType.RELEASE_DATE,
      value: formatDate(releaseDate ?? ''),
      label: 'Released',
      isHidden: isPrivate || !releaseDate || isScheduledRelease
    },
    {
      id: CollectionMetadataType.UPDATED_AT,
      value: formatDate(updatedAt ?? ''),
      label: 'Updated',
      isHidden: isPrivate || !updatedAt
    }
  ].filter(({ isHidden, value }) => !isHidden && !!value)

  return metadataItems
}
