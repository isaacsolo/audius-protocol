import type { ReactElement, ReactNode } from 'react'
import { useCallback } from 'react'

import { View } from 'react-native'

import { Button } from '@audius/harmony-native'
import type { ScreenProps } from 'app/components/core'
import { ScreenContent, Screen } from 'app/components/core'
import { useNavigation } from 'app/hooks/useNavigation'
import { makeStyles } from 'app/styles'

const messages = {
  done: 'Done',
  cancel: 'Cancel',
  submit: 'Submit'
}

type FormScreenProps = Omit<ScreenProps, 'children'> & {
  bottomSection?: ReactNode
  topSection?: ReactNode
  onReset?: () => void
  onSubmit?: () => void
  doneText?: string
  cancelText?: string
  submitText?: string
  goBackOnSubmit?: boolean
  children: ReactElement
}

const useStyles = makeStyles(({ spacing, palette }) => ({
  root: { justifyContent: 'space-between' },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing(4)
  },
  bottomButton: {
    flexGrow: 1
  },
  topSection: {
    padding: spacing(4),
    paddingTop: spacing(12),
    backgroundColor: palette.white,
    borderBottomWidth: 1,
    borderBottomColor: palette.neutralLight6
  },
  bottomSection: {
    padding: spacing(4),
    paddingBottom: spacing(12),
    backgroundColor: palette.white,
    borderTopWidth: 1,
    borderTopColor: palette.neutralLight6
  }
}))

export const FormScreen = (props: FormScreenProps) => {
  const {
    children,
    bottomSection,
    onSubmit,
    onReset,
    cancelText,
    doneText,
    submitText,
    goBackOnSubmit,
    topSection,
    style: styleProp,
    ...other
  } = props
  const styles = useStyles()
  const navigation = useNavigation()

  const handleCancel = useCallback(() => {
    onReset?.()
    navigation.goBack()
  }, [navigation, onReset])

  const handleSubmit = useCallback(() => {
    onSubmit?.()
    if (goBackOnSubmit) {
      navigation.goBack()
    }
  }, [onSubmit, goBackOnSubmit, navigation])

  const defaultBottomSection = (
    <View style={styles.buttonContainer}>
      {onSubmit ? (
        <>
          <Button
            variant='secondary'
            style={styles.bottomButton}
            onPress={handleCancel}
          >
            {cancelText ?? messages.cancel}
          </Button>
          <Button
            variant='primary'
            style={styles.bottomButton}
            onPress={handleSubmit}
          >
            {submitText ?? messages.submit}
          </Button>
        </>
      ) : (
        <Button variant='primary' fullWidth onPress={navigation.goBack}>
          {doneText ?? messages.done}
        </Button>
      )}
    </View>
  )

  return (
    <Screen variant='secondary' style={[styles.root, styleProp]} {...other}>
      <ScreenContent>
        {topSection ? (
          <View style={styles.topSection}>{topSection}</View>
        ) : null}
        {children}
        <View style={styles.bottomSection}>
          {bottomSection ?? defaultBottomSection}
        </View>
      </ScreenContent>
    </Screen>
  )
}
