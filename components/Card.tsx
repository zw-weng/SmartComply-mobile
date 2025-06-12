import React from 'react'
import { StyleSheet, View, ViewStyle } from 'react-native'

interface CardProps {
  children: React.ReactNode
  style?: ViewStyle | ViewStyle[]
  variant?: 'default' | 'elevated' | 'outlined'
}

const Card = ({ children, style, variant = 'default' }: CardProps) => {
  return (
    <View style={[styles.card, styles[variant], style]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
  },
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  outlined: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
})

export default Card
