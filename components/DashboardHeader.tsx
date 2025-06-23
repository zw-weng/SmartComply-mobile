import React from 'react'
import { StyleSheet, Text, View, ViewStyle } from 'react-native'
import RejectionNotification from './RejectionNotification'

interface DashboardHeaderProps {
  title: string
  subtitle?: string
  style?: ViewStyle
  showNotifications?: boolean
}

const DashboardHeader = ({ title, subtitle, style, showNotifications = true }: DashboardHeaderProps) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.headerContent}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && (
            <Text style={styles.subtitle}>{subtitle}</Text>
          )}
        </View>
      </View>
      {showNotifications && (
        <RejectionNotification />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  textContainer: {
    flex: 1,
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
