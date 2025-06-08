import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

const profile = () => {
  return (
    <View style={styles.container}>
      <Text>profile</Text>
    </View>
  )
}

export default profile

const styles = StyleSheet.create({
    container:{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    }
})