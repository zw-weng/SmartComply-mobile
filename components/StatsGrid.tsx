import React from 'react'
import { StyleSheet, View, ViewStyle } from 'react-native'
import StatCard from './StatCard'

export interface StatData {
  title: string
  value: number | string
  icon: string
  color: string
}

interface StatsGridProps {
  stats: StatData[]
  columns?: number
  style?: ViewStyle
}

const StatsGrid = ({ stats, columns = 2, style }: StatsGridProps) => {
  return (
    <View style={[styles.container, style]}>
      {stats.map((stat, index) => (
        <StatCard
          key={index}
          title={stat.title}
          value={stat.value}
          icon={stat.icon as any}
          color={stat.color}
          style={{
            ...styles.statCard,
            width: `${100/columns - 2}%`
          }}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    marginBottom: 12,
  },
})

export default StatsGrid
