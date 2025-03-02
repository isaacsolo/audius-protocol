import { useState, useContext, useCallback, useEffect } from 'react'

import { useFeatureFlag } from '@audius/common/hooks'
import { Status } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import { formatCount } from '@audius/common/utils'
import {
  IconAudiusLogoHorizontal,
  IconSettings,
  IconCrown,
  IconCaretLeft,
  IconClose,
  IconNotificationOn,
  IconButton
} from '@audius/harmony'
import cn from 'classnames'
import { History } from 'history'
import { Link } from 'react-router-dom'
// eslint-disable-next-line no-restricted-imports -- TODO: migrate to @react-spring/web
import { useTransition, animated } from 'react-spring'

import { useHistoryContext } from 'app/HistoryProvider'
import {
  RouterContext,
  SlideDirection
} from 'components/animated-switch/RouterContextProvider'
import NavContext, {
  LeftPreset,
  CenterPreset,
  RightPreset
} from 'components/nav/mobile/NavContext'
import SearchBar from 'components/search-bar/SearchBar'
import { useFlag } from 'hooks/useRemoteConfig'
import { getIsIOS } from 'utils/browser'
import { SIGN_UP_PAGE, TRENDING_PAGE } from 'utils/route'
import { isMatrix } from 'utils/theme/theme'

import styles from './NavBar.module.css'

interface NavBarProps {
  isLoading: boolean
  isSignedIn: boolean
  searchStatus: Status
  notificationCount: number
  signUp: () => void
  goToNotificationPage: () => void
  goToSettingsPage: () => void
  goToAudioPage: () => void
  search: (term: string) => void
  goBack: () => void
  history: History<any>
}

const messages = {
  signUp: 'Sign Up',
  searchPlaceholder: 'Search Audius',
  searchPlaceholderV2: 'What do you want to listen to?',
  earlyAccess: 'Early Access'
}

const NavBar = ({
  isLoading,
  isSignedIn,
  searchStatus,
  notificationCount,
  search,
  signUp,
  goToNotificationPage,
  goToSettingsPage,
  goBack,
  goToAudioPage,
  history: {
    location: { pathname }
  }
}: NavBarProps) => {
  const { history } = useHistoryContext()
  const { leftElement, centerElement, rightElement } = useContext(NavContext)!
  const { isEnabled: isSearchV2Enabled } = useFeatureFlag(
    FeatureFlags.SEARCH_V2
  )

  const [isSearching, setIsSearching] = useState(false)
  const [searchValue, setSearchValue] = useState('')

  const { setStackReset } = useContext(RouterContext)
  const beginSearch = useCallback(() => {
    setStackReset(true)
    setImmediate(() => search(searchValue))
  }, [setStackReset, search, searchValue])

  useEffect(() => {
    const splitPath = pathname.split('/')
    const isSearch = splitPath.length > 1 && splitPath[1] === 'search'
    setIsSearching(isSearch)
  }, [pathname])

  const handleOpenSearch = useCallback(() => {
    if (isSearchV2Enabled) {
      history.push(`/search`)
    } else {
      setIsSearching(true)
    }
  }, [history, isSearchV2Enabled])

  const onCloseSearch = () => {
    setIsSearching(false)
    setSearchValue('')
  }

  const logoTransitions = useTransition(!isSearching, null, {
    from: {
      opacity: 0,
      transform: 'scale(0.9)'
    },
    enter: {
      opacity: 1,
      transform: 'scale(1)'
    },
    leave: {
      opacity: 0,
      transform: 'scale(0.9)'
    },
    config: {
      duration: 150
    }
  })

  const { setSlideDirection } = useContext(RouterContext)

  const goBackAndResetSlide = useCallback(() => {
    goBack()
    setSlideDirection(SlideDirection.FROM_LEFT)
  }, [goBack, setSlideDirection])

  const goBackAndDoNotAnimate = useCallback(() => {
    setStackReset(true)
    setImmediate(goBack)
  }, [setStackReset, goBack])

  let left = null
  if (leftElement === LeftPreset.BACK) {
    left = (
      <IconButton
        aria-label='go back'
        icon={IconCaretLeft}
        color='subdued'
        onClick={goBack}
      />
    )
  } else if (leftElement === LeftPreset.CLOSE) {
    left = (
      <IconButton
        aria-label='close'
        color='subdued'
        icon={IconClose}
        size='m'
        onClick={getIsIOS() ? goBackAndResetSlide : goBackAndDoNotAnimate}
      />
    )
  } else if (leftElement === LeftPreset.CLOSE_NO_ANIMATION) {
    left = (
      <IconButton
        aria-label='close'
        color='subdued'
        icon={IconClose}
        size='m'
        onClick={goBackAndDoNotAnimate}
      />
    )
  } else if (leftElement === LeftPreset.NOTIFICATION && !isSignedIn) {
    left = (
      <Link className={styles.signUpButton} onClick={signUp} to={SIGN_UP_PAGE}>
        {messages.signUp}
      </Link>
    )
  } else if (leftElement === LeftPreset.NOTIFICATION && isSignedIn) {
    left = (
      <>
        <IconButton
          aria-label='notifications'
          color={notificationCount > 0 ? 'warning' : 'subdued'}
          icon={IconNotificationOn}
          onClick={goToNotificationPage}
        />
        {notificationCount > 0 && (
          <div className={styles.iconTag}>{formatCount(notificationCount)}</div>
        )}
      </>
    )
  } else if (leftElement === LeftPreset.SETTINGS && isSignedIn) {
    left = (
      <>
        <IconButton
          aria-label='settings'
          color='subdued'
          icon={IconSettings}
          onClick={goToSettingsPage}
        />
        <IconButton
          aria-label='audio rewards'
          color='warning'
          icon={IconCrown}
          onClick={goToAudioPage}
        />
      </>
    )
  } else {
    left = leftElement
  }

  const matrix = isMatrix()

  const { isEnabled: isEarlyAccess } = useFlag(FeatureFlags.EARLY_ACCESS)

  return (
    <div
      className={cn(styles.container, {
        [styles.containerNoBorder]: isSearchV2Enabled && isSearching
      })}
    >
      <div
        className={cn(styles.leftElement, {
          [styles.isLoading]: isLoading
        })}
      >
        {left}
      </div>
      {centerElement === CenterPreset.LOGO ? (
        <Link
          to={TRENDING_PAGE}
          className={cn(styles.logo, { [styles.matrixLogo]: matrix })}
        >
          {logoTransitions.map(({ item, props, key }) =>
            item ? (
              <animated.div style={props} key={key}>
                <IconAudiusLogoHorizontal
                  sizeH='l'
                  color='subdued'
                  width='auto'
                />
                {isEarlyAccess ? (
                  <div className={styles.earlyAccess}>
                    {messages.earlyAccess}
                  </div>
                ) : null}
              </animated.div>
            ) : null
          )}
        </Link>
      ) : null}
      {typeof centerElement === 'string' &&
        !Object.values(CenterPreset).includes(centerElement as any) && (
          <div className={styles.centerText}> {centerElement} </div>
        )}
      <div
        className={cn(styles.rightElement, {
          [styles.isLoading]: isLoading
        })}
      >
        {rightElement === RightPreset.SEARCH ? (
          <SearchBar
            open={isSearching}
            onOpen={handleOpenSearch}
            onClose={onCloseSearch}
            value={searchValue}
            onSearch={setSearchValue}
            placeholder={
              isSearchV2Enabled
                ? messages.searchPlaceholderV2
                : messages.searchPlaceholder
            }
            showHeader={false}
            className={cn(
              styles.searchBar,
              { [styles.searchBarClosed]: !isSearching },
              { [styles.searchBarClosedSignedOut]: !isSearching && !isSignedIn }
            )}
            iconClassname={styles.searchIcon}
            beginSearch={beginSearch}
            status={searchStatus}
          />
        ) : (
          rightElement
        )}
      </div>
    </div>
  )
}

export default NavBar
