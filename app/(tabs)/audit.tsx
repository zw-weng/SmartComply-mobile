import { StyleSheet, View, Text } from 'react-native'
import React from 'react'

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