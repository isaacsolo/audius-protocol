import { useCallback, useMemo } from 'react'

import { Kind, Status } from '@audius/common/models'
import {
  searchActions,
  type SearchItem as SearchItemType
} from '@audius/common/store'
import { range } from 'lodash'
import { Keyboard } from 'react-native'
import { useDispatch } from 'react-redux'

import { Box, Divider, Flex, Text } from '@audius/harmony-native'
import { SectionList } from 'app/components/core'

import { NoResultsTile } from '../NoResultsTile'
import { SearchItem, SearchItemSkeleton } from '../SearchItem'
import { useGetSearchResults } from '../searchState'

const { addItem: addRecentSearch } = searchActions

type SearchSectionHeaderProps = { title: string }

export const SearchSectionHeader = (props: SearchSectionHeaderProps) => {
  const { title } = props

  return (
    <Flex direction='row' w='100%' mb='s' alignItems='center' gap='s'>
      <Text variant='label' size='s' textTransform='uppercase'>
        {title}
      </Text>
      <Flex flex={1}>
        <Divider />
      </Flex>
    </Flex>
  )
}

const AllResultsItem = ({
  item
}: {
  item: SearchItemType & { status?: Status }
}) => {
  const dispatch = useDispatch()

  const handlePress = useCallback(() => {
    dispatch(addRecentSearch({ searchItem: item }))
  }, [item, dispatch])

  return item.status === Status.LOADING ? (
    <Box ph='m'>
      <SearchItemSkeleton />
    </Box>
  ) : (
    <SearchItem searchItem={item} onPress={handlePress} />
  )
}

const skeletonSections = [
  {
    title: 'profiles',
    data: range(5).map((i) => ({
      id: `user_skeleton_${i}`,
      kind: Kind.USERS,
      status: Status.LOADING
    }))
  },
  {
    title: 'tracks',
    data: range(5).map((i) => ({
      id: `track_skeleton_${i}`,
      kind: Kind.TRACKS,
      status: Status.LOADING
    }))
  },
  {
    title: 'playlists',
    data: range(5).map((i) => ({
      id: `playlist_skeleton_${i}`,
      kind: Kind.COLLECTIONS,
      status: Status.LOADING
    }))
  },
  {
    title: 'albums',
    data: range(5).map((i) => ({
      id: `album_skeleton_${i}`,
      kind: Kind.COLLECTIONS,
      status: Status.LOADING
    }))
  }
]

export const AllResults = () => {
  const { data, status } = useGetSearchResults('all')

  const sections = useMemo(
    () =>
      data
        ? [
            {
              title: 'profiles',
              data: data.users.map(({ user_id }) => ({
                id: user_id,
                kind: Kind.USERS
              }))
            },
            {
              title: 'tracks',
              data: data.tracks.map(({ track_id }) => ({
                id: track_id,
                kind: Kind.TRACKS
              }))
            },
            {
              title: 'playlists',
              data: data.playlists.map(({ playlist_id }) => ({
                id: playlist_id,
                kind: Kind.COLLECTIONS
              }))
            },
            {
              title: 'albums',
              data: data.albums.map(({ playlist_id }) => ({
                id: playlist_id,
                kind: Kind.COLLECTIONS
              }))
            }
          ].filter((section) => section.data.length > 0)
        : [],
    [data]
  )

  const isLoading = status === Status.LOADING
  const hasNoResults =
    (!data || sections.length === 0) && status === Status.SUCCESS

  return (
    <Flex onTouchStart={Keyboard.dismiss}>
      {hasNoResults ? (
        <NoResultsTile />
      ) : (
        <SectionList<SearchItemType>
          keyboardShouldPersistTaps='always'
          stickySectionHeadersEnabled={false}
          sections={isLoading ? skeletonSections : sections}
          keyExtractor={({ id, kind }) => `${kind}-${id}`}
          renderItem={({ item }) => <AllResultsItem item={item} />}
          renderSectionHeader={({ section: { title } }) => (
            <Flex ph='l' mt='l'>
              <SearchSectionHeader title={title} />
            </Flex>
          )}
        />
      )}
    </Flex>
  )
}
