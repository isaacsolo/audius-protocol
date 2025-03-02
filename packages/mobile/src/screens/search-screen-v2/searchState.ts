import type { Dispatch, SetStateAction } from 'react'
import { createContext, useCallback, useContext } from 'react'

import {
  useGetSearchResults as useGetSearchResultsApi,
  type SearchCategory,
  type SearchFilter,
  type SearchFilters
} from '@audius/common/api'
import { accountSelectors } from '@audius/common/store'
import { isEmpty } from 'lodash'
import { useSelector } from 'react-redux'

const { getUserId } = accountSelectors

export const ALL_RESULTS_LIMIT = 5

type SearchContextType = {
  query: string
  setQuery: Dispatch<SetStateAction<string>>
  category: SearchCategory
  setCategory: Dispatch<SetStateAction<SearchCategory>>
  filters: SearchFilters
  setFilters: Dispatch<SetStateAction<SearchFilters>>
  bpmType: string
  setBpmType: Dispatch<SetStateAction<string>>
  autoFocus: boolean
  setAutoFocus: Dispatch<SetStateAction<boolean>>
}

export const SearchContext = createContext<SearchContextType>({
  query: '',
  setQuery: (_) => {},
  category: 'all',
  setCategory: (_) => {},
  filters: {},
  setFilters: (_) => {},
  // Special state to track how bpm is being set
  bpmType: 'range',
  setBpmType: (_) => {},
  // Special state to determine if the search query input should be focused automatically
  autoFocus: false,
  setAutoFocus: (_) => {}
})

export const useIsEmptySearch = () => {
  const { query, filters } = useContext(SearchContext)
  return !query && isEmpty(filters)
}

export const useSearchQuery = () => {
  const { query, setQuery } = useContext(SearchContext)
  return [query, setQuery] as const
}

export const useSearchAutoFocus = () => {
  const { autoFocus, setAutoFocus } = useContext(SearchContext)
  return [autoFocus, setAutoFocus] as const
}

export const useSearchBpmType = () => {
  const { bpmType, setBpmType } = useContext(SearchContext)
  return [bpmType, setBpmType] as const
}

export const useSearchCategory = () => {
  const { category, setCategory } = useContext(SearchContext)
  return [category, setCategory] as const
}

export const useSearchFilters = () => {
  const { filters, setFilters } = useContext(SearchContext)
  return [filters, setFilters] as const
}

export const useSearchFilter = <F extends SearchFilter>(filterKey: F) => {
  const { filters, setFilters } = useContext(SearchContext)

  const filter = filters[filterKey]

  const setFilter = useCallback(
    (value: SearchFilters[F]) => {
      setFilters((filters) => ({ ...filters, [filterKey]: value }))
    },
    [filterKey, setFilters]
  )

  const clearFilter = useCallback(() => {
    setFilters((filters) => ({ ...filters, [filterKey]: undefined }))
  }, [filterKey, setFilters])

  return [filter, setFilter, clearFilter] as const
}

type SearchResultsApiType = ReturnType<typeof useGetSearchResultsApi>

type SearchResultsType<C extends SearchCategory> = {
  status: SearchResultsApiType['status']
  data: C extends 'all'
    ? SearchResultsApiType['data']
    : SearchResultsApiType['data'][Exclude<C, 'all'>]
}

export const useGetSearchResults = <C extends SearchCategory>(
  category: C
): SearchResultsType<C> => {
  const { filters, query } = useContext(SearchContext)
  const currentUserId = useSelector(getUserId)
  const { data, status } = useGetSearchResultsApi(
    {
      query,
      ...filters,
      category,
      currentUserId,
      limit: category === 'all' ? ALL_RESULTS_LIMIT : undefined,
      offset: 0
    },
    { debounce: 500 }
  )

  if (category === 'all') {
    return { data, status } as SearchResultsType<C>
  } else {
    return {
      data: data?.[category as Exclude<C, 'all'>],
      status
    } as SearchResultsType<C>
  }
}
