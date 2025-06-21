import { MaterialIcons } from '@expo/vector-icons'
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface ListItemProps {
  title: string
  subtitle?: string
  rightElement?: React.ReactNode
  leftIcon?: keyof typeof MaterialIcons.glyphMap
  onPress?: () => void
  showChevron?: boolean
}

const ListItem = ({ 
  title, 
  subtitle, 
  rightElement, 
  leftIcon, 
  onPress, 
  showChevron = true 
}: ListItemProps) => {
  const Component = onPress ? TouchableOpacity : View

  return (
    <Component
      style={[styles.container, onPress && styles.pressable]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {leftIcon && (
        <View style={styles.leftIconContainer}>
          <MaterialIcons name={leftIcon} size={24} color="#6b7280" />
        </View>
      )}
        <View style={styles.content}>
        <Text style={styles.title}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle}>
            {subtitle}
          </Text>
        )}
      </View>

      <View style={styles.rightContent}>
        {rightElement}
        {onPress && showChevron && (
          <MaterialIcons 
            name="chevron-right" 
            size={20} 
            color="#9ca3af" 
            style={styles.chevron}
          />
        )}
      </View>
    </Component>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Changed from 'center' to accommodate multi-line text
    paddingVertical: 16, // Increased padding for better spacing
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    minHeight: 60, // Ensure minimum height for consistency
  },
  pressable: {
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  leftIconContainer: {
    marginRight: 12,
    marginTop: 2, // Small offset to align with text baseline
  },
  content: {
    flex: 1,
    minWidth: 0, // Ensure text can wrap properly
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4, // Increased margin for better spacing
    lineHeight: 22, // Better line height for readability
    flexWrap: 'wrap', // Allow text to wrap
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20, // Better line height for readability
    flexWrap: 'wrap', // Allow text to wrap
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8, // Add some spacing from content
    paddingTop: 2, // Small offset to align with text baseline
  },
  chevron: {
    marginLeft: 8,
  },
})

export default ListItem
