import { ID } from '@audius/common/models'
import { cacheUsersSelectors } from '@audius/common/store'
import { IconSize, Text, useTheme } from '@audius/harmony'

import { ArtistPopover } from 'components/artist/ArtistPopover'
import { MountPlacement } from 'components/types'
import UserBadges from 'components/user-badges/UserBadges'
import { useSelector } from 'utils/reducer'
import { profilePage } from 'utils/route'

import { TextLink, TextLinkProps } from './TextLink'

const { getUser } = cacheUsersSelectors

type UserLinkProps = Omit<TextLinkProps, 'to'> & {
  userId: ID
  badgeSize?: IconSize
  popover?: boolean
  popoverMount?: MountPlacement
}

export const UserLink = (props: UserLinkProps) => {
  const {
    userId,
    badgeSize = 's',
    popover,
    popoverMount,
    children,
    ...other
  } = props
  const { iconSizes, spacing } = useTheme()

  const url = useSelector((state) => {
    const handle = getUser(state, { id: userId })?.handle
    return handle ? profilePage(handle) : ''
  })

  const handle = useSelector((state) => getUser(state, { id: userId })?.handle)
  const userName = useSelector((state) => getUser(state, { id: userId })?.name)

  const linkElement = (
    <TextLink
      to={url}
      css={{
        columnGap: spacing.xs,
        alignItems: 'center',
        lineHeight: 'normal'
      }}
      ellipses={popover}
      {...other}
    >
      <Text ellipses>{userName}</Text>
      <UserBadges
        badgeSize={iconSizes[badgeSize]}
        userId={userId}
        css={{ marginTop: spacing['2xs'] }}
      />
      {children}
    </TextLink>
  )

  return popover && handle ? (
    <ArtistPopover
      css={{ display: 'inline-flex', overflow: 'hidden' }}
      handle={handle}
      component='span'
      mount={popoverMount}
    >
      {linkElement}
    </ArtistPopover>
  ) : (
    linkElement
  )
}
