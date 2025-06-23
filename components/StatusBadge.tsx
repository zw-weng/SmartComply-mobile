import React from 'react'
import { StyleSheet, Text, View, ViewStyle } from 'react-native'

interface StatusBadgeProps {
  status: string
  style?: ViewStyle
}

const StatusBadge = ({ status, style }: StatusBadgeProps) => {  const getStatusStyle = (status: string) => {
    const normalizedStatus = status.toLowerCase()
    
    if (normalizedStatus.includes('completed') || normalizedStatus.includes('done') || normalizedStatus.includes('complete')) {
      return styles.success
    } else if (normalizedStatus.includes('in_progress') || normalizedStatus.includes('progress')) {
      return styles.warning
    } else if (normalizedStatus.includes('pending') || normalizedStatus.includes('draft')) {
      return styles.info
    } else if (normalizedStatus.includes('failed') || normalizedStatus.includes('error')) {
      return styles.danger
    }
    return styles.default
  }
  const getStatusTextStyle = (status: string) => {
    const normalizedStatus = status.toLowerCase()
    
    if (normalizedStatus.includes('completed') || normalizedStatus.includes('done') || normalizedStatus.includes('complete')) {
      return styles.successText
    } else if (normalizedStatus.includes('in_progress') || normalizedStatus.includes('progress')) {
      return styles.warningText
    } else if (normalizedStatus.includes('pending') || normalizedStatus.includes('draft')) {
      return styles.infoText
    } else if (normalizedStatus.includes('failed') || normalizedStatus.includes('error')) {
      return styles.dangerText
    }
    return styles.defaultText
  }

  return (
    <View style={[styles.badge, getStatusStyle(status), style]}>
      <Text style={[styles.text, getStatusTextStyle(status)]}>
        {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Background colors
  success: {
    backgroundColor: '#dcfce7',
  },
  warning: {
    backgroundColor: '#fef3c7',
  },
  info: {
    backgroundColor: '#dbeafe',
  },
  danger: {
    backgroundColor: '#fee2e2',
  },
  default: {
    backgroundColor: '#f3f4f6',
  },
  // Text colors
  successText: {
    color: '#166534',
  },
  warningText: {
    color: '#92400e',
  },
  infoText: {
    color: '#1e40af',
  },
  dangerText: {
    color: '#dc2626',
  },
  defaultText: {
    color: '#374151',
  },
})

export default StatusBadge
