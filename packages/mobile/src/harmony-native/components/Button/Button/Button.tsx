import { useState } from 'react'

import type { ReactNativeStyle } from '@emotion/native'
import Color from 'color'
import type { TextStyle, ViewStyle } from 'react-native'
import {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue
} from 'react-native-reanimated'

import type { IconColors } from '@audius/harmony-native'
import type { IconProps } from 'app/harmony-native/icons'

import { useTheme } from '../../../foundations/theme'
import { BaseButton } from '../BaseButton/BaseButton'

import type { ButtonProps } from './types'

export const Button = (props: ButtonProps) => {
  const {
    color,
    hexColor,
    variant = 'primary',
    size = 'default',
    disabled,
    style,
    ...baseProps
  } = props
  const { isLoading, children } = baseProps
  const pressed = useSharedValue(0)

  const isDisabled = disabled || isLoading
  const {
    type,
    color: themeColors,
    cornerRadius,
    spacing,
    typography
  } = useTheme()

  const smallHeight = size === 'xs' ? spacing.unit7 : spacing.unit8
  // - Size Styles -
  const smallStyles: ReactNativeStyle = {
    gap: spacing.xs,
    height: smallHeight,
    paddingHorizontal: spacing.m
  }

  if (!children) {
    smallStyles.width = smallHeight
  }

  // title-s-default
  const smallTextStyles: TextStyle = {
    fontFamily: typography.fontByWeight.bold,
    fontSize: typography.size.s,
    lineHeight: typography.lineHeight.s
  }

  const defaultStyles: ReactNativeStyle = {
    gap: spacing.s,
    height: spacing.unit12,
    paddingHorizontal: spacing.xl
  }

  if (!children) {
    defaultStyles.width = spacing.unit12
  }

  // title-l-default
  const defaultTextStyles: TextStyle = {
    fontFamily: typography.fontByWeight.bold,
    fontSize: typography.size.l,
    lineHeight: typography.lineHeight.l
  }

  // - Variant Styles -
  const primaryOverrideColor =
    hexColor ?? (color ? themeColors.special[color] : null)

  const primaryStyles: ReactNativeStyle = {
    backgroundColor: isDisabled
      ? themeColors.neutral.n150
      : themeColors.primary.primary
  }

  const primaryDynamicStyles = {
    default: {
      background: primaryOverrideColor ?? themeColors.primary.primary,
      text: themeColors.text.staticWhite,
      icon: 'staticWhite',
      border: primaryOverrideColor ?? themeColors.primary.primary
    },
    press: {
      background: new Color(primaryOverrideColor ?? themeColors.primary.primary)
        .darken(0.2)
        .hex(),
      text: themeColors.text.staticWhite,
      icon: 'staticWhite',
      border: new Color(primaryOverrideColor ?? themeColors.primary.primary)
        .darken(0.2)
        .hex()
    }
  }

  const secondaryStyles: ReactNativeStyle = {
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: themeColors.border.strong,

    ...(isDisabled && {
      backgroundColor: themeColors.neutral.n150
    })
  }
  const secondaryDynamicStyles = {
    default: {
      background: 'transparent',
      text: themeColors.text.default,
      icon: 'default',
      border: themeColors.border.strong
    },
    press: {
      background: new Color(primaryOverrideColor ?? themeColors.primary.primary)
        .darken(0.2)
        .hex(),
      text: themeColors.text.staticWhite,
      icon: 'staticWhite',
      border: new Color(primaryOverrideColor ?? themeColors.primary.primary)
        .darken(0.2)
        .hex()
    }
  }

  const tertiaryStyles: ReactNativeStyle = {
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: themeColors.border.default,

    // TODO: Need to add blur
    // Could use BlurView or try something native
    // backdropFilter: 'blur(6px)',

    ...(isDisabled && {
      opacity: 0.45
    })
  }
  const tertiaryDynamicStyles = {
    default: {
      background: type === 'dark' ? '#32334d99' : '#ffffffd9',
      text: themeColors.text.default,
      icon: 'default',
      border: themeColors.border.default
    },
    press: {
      background: themeColors.background.surface2,
      text: themeColors.text.default,
      icon: 'default',
      border: themeColors.border.strong
    }
  }

  const destructiveStyles: ReactNativeStyle = {
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: themeColors.special.red,

    ...(isDisabled && {
      opacity: 0.45
    })
  }
  const destructiveDynamicStyles = {
    default: {
      background: 'transparent',
      text: themeColors.text.danger,
      icon: 'danger',
      border: themeColors.special.red
    },
    press: {
      background: themeColors.special.red,
      text: themeColors.text.staticWhite,
      icon: 'staticWhite',
      border: themeColors.special.red
    }
  }

  const dynamicStyles =
    variant === 'secondary'
      ? secondaryDynamicStyles
      : variant === 'tertiary'
      ? tertiaryDynamicStyles
      : variant === 'destructive'
      ? destructiveDynamicStyles
      : primaryDynamicStyles

  const buttonStyles: ViewStyle = {
    borderWidth: 0,
    borderRadius: cornerRadius.s,
    alignItems: 'center',
    justifyContent: 'center',
    // TODO bring this back properly
    // ...shadows.near,
    ...(variant === 'secondary'
      ? secondaryStyles
      : variant === 'tertiary'
      ? tertiaryStyles
      : variant === 'destructive'
      ? destructiveStyles
      : primaryStyles),

    ...(size === 'small' || size === 'xs' ? smallStyles : defaultStyles),

    ...(isDisabled && { shadowColor: 'transparent' })
  }

  const animatedButtonStyles = useAnimatedStyle(() => {
    return {
      borderColor: isDisabled
        ? buttonStyles.borderColor
        : interpolateColor(
            pressed.value,
            [0, 1],
            [dynamicStyles.default.border, dynamicStyles.press.border]
          ),
      backgroundColor: isDisabled
        ? buttonStyles.backgroundColor
        : interpolateColor(
            pressed.value,
            [0, 1],
            [dynamicStyles.default.background, dynamicStyles.press.background]
          )
    }
  }, [isDisabled, variant, color])

  const textStyles = size === 'small' ? smallTextStyles : defaultTextStyles

  const animatedTextStyles = useAnimatedStyle(() => {
    return {
      color: interpolateColor(
        pressed.value,
        [0, 1],
        [dynamicStyles.default.text, dynamicStyles.press.text]
      )
    }
  }, [variant])

  const textColor =
    (variant === 'secondary' && !isDisabled) || variant === 'tertiary'
      ? 'default'
      : variant === 'destructive'
      ? 'danger'
      : 'staticWhite'

  const iconSize: IconProps['size'] = size === 'small' ? 's' : 'm'

  const loaderSize = size === 'small' ? 16 : 20

  const [isPressing, setIsPressing] = useState(false)

  const handlePressIn = () => {
    setIsPressing(true)
  }
  const handlePressOut = () => {
    setIsPressing(false)
  }

  const iconColor =
    isDisabled && variant === 'secondary'
      ? 'staticWhite'
      : isPressing && !isDisabled
      ? dynamicStyles.press.icon
      : dynamicStyles.default.icon

  return (
    <BaseButton
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={handlePressOut}
      disabled={isDisabled}
      style={[animatedButtonStyles, buttonStyles, style]}
      sharedValue={pressed}
      styles={{
        text: [textStyles, animatedTextStyles]
      }}
      innerProps={{
        text: {
          color: textColor
        },
        icon: {
          color: iconColor as IconColors,
          size: iconSize
        },
        loader: {
          style: {
            height: loaderSize,
            width: loaderSize
          },
          fill: themeColors.text[textColor]
        }
      }}
      {...baseProps}
    />
  )
}
