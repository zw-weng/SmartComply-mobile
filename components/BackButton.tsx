import { MaterialIcons } from '@expo/vector-icons'
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native'

interface BackButtonProps {
  onPress: () => void
  title?: string
  style?: ViewStyle
}

const BackButton = ({ onPress, title = 'Back', style }: BackButtonProps) => {
  return (
    <TouchableOpacity 
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <MaterialIcons name="arrow-back" size={20} color="#3b82f6" />
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '500',
    marginLeft: 8,
  },
})

export default BackButton
