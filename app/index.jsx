import { View, Text, Button } from 'react-native'
import React from 'react'
import { useRouter } from 'expo-router'
import ScreenWrapper from '../components/ScreenWrapper'

const index = () => {
  return (
    <ScreenWrapper>
      <Text>index</Text>
      <Button title='Login' onPress={()=> router.push('login')} />
    </ScreenWrapper>
  )
}

export default index