import React from 'react'
import { StyleSheet, Text, View, ViewStyle } from 'react-native'

interface DashboardHeaderProps {
  title: string
  subtitle?: string
  style?: ViewStyle
}

const DashboardHeader = ({ title, subtitle, style }: DashboardHeaderProps) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 22,
  },
})

export default DashboardHeader
