import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

const audit = () => {
  return (
    <View style={styles.container}>
      <Text>audit</Text>
    </View>
  )
}

export default audit

const styles = StyleSheet.create({
    container:{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    }
})