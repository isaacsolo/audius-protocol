import { useCallback, type ReactNode } from 'react'

import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button, Flex, PlainButton } from '@audius/harmony-native'
import type { ScreenProps } from 'app/components/core'
import { Screen } from 'app/components/core'
import { useNavigation } from 'app/hooks/useNavigation'

const messages = {
  done: 'Done',
  clear: 'Clear'
}

export type FormScreenProps = ScreenProps & {
  bottomSection?: ReactNode
  onSubmit?: () => void
  onClear?: () => void
  clearable?: boolean
  stopNavigation?: boolean
  disableSubmit?: boolean
}

export const FormScreen = (props: FormScreenProps) => {
  const {
    children,
    style,
    bottomSection,
    onClear,
    clearable,
    onSubmit,
    stopNavigation,
    disableSubmit,
    ...other
  } = props
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()

  const handleSubmit = useCallback(() => {
    if (!stopNavigation) {
      navigation.pop()
    }
    onSubmit?.()
  }, [stopNavigation, navigation, onSubmit])

  return (
    <Screen
      variant='secondary'
      style={[{ justifyContent: 'space-between' }, style]}
      {...other}
    >
      {children}
      <Flex
        p='l'
        pb={insets.bottom}
        backgroundColor='white'
        borderTop='default'
        gap='m'
      >
        {bottomSection ?? (
          <>
            <Button
              variant='primary'
              fullWidth
              disabled={disableSubmit}
              onPress={handleSubmit}
            >
              {messages.done}
            </Button>
            {onClear ? (
              <PlainButton disabled={!clearable} onPress={onClear}>
                {messages.clear}
              </PlainButton>
            ) : null}
          </>
        )}
      </Flex>
    </Screen>
  )
}
