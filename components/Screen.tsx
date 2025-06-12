import React from 'react'
import { ViewStyle } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

interface ScreenProps {
  children: React.ReactNode
  style?: ViewStyle | ViewStyle[]
}

const Screen = ({ children, style }: ScreenProps) => {
  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: '#fff' }, style]}>
      {children}
    </SafeAreaView>
  )
}

export default Screen 