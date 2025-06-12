import { MaterialIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import Button from '../../components/Button'
import Card from '../../components/Card'
import Screen from '../../components/Screen'
import StatusBadge from '../../components/StatusBadge'
import { supabase } from '../../lib/supabase'

interface DashboardStats {
  totalCompliance: number
  pendingAudits: number
  completedForms: number
  failedItems: number
}

interface RecentActivity {
  id: string
  title: string
  type: 'audit' | 'form' | 'compliance'
  status: string
  date: string
}

export default function Index() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCompliance: 0,
    pendingAudits: 0,
    completedForms: 0,
    failedItems: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch compliance records count
      const { count: totalCompliance } = await supabase
        .from('compliance')
        .select('*', { count: 'exact', head: true })

      // Fetch pending audits (you can adjust the status condition)
      const { count: pendingAudits } = await supabase
        .from('compliance')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      // Mock data for completed forms and failed items
      // You'll need to adjust these queries based on your actual schema
      const completedForms = 25
      const failedItems = 3

      setStats({
        totalCompliance: totalCompliance || 0,
        pendingAudits: pendingAudits || 0,
        completedForms,
        failedItems
      })

      // Fetch recent activity (mock data - adjust based on your schema)
      const mockActivity: RecentActivity[] = [
        {
          id: '1',
          title: 'KFC Franchise Audit',
          type: 'audit',
          status: 'completed',
          date: '2 hours ago'
        },
        {
          id: '2', 
          title: 'Refrigerator Condition Form',
          type: 'form',
          status: 'pending',
          date: '1 day ago'
        },
        {
          id: '3',
          title: 'Food Safety Compliance',
          type: 'compliance',
          status: 'in_progress',
          date: '2 days ago'
        }
      ]
      
      setRecentActivity(mockActivity)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ title, value, icon, color }: {
    title: string
    value: number
    icon: string
    color: string
  }) => (
    <Card variant="default" style={styles.statCard}>
      <View style={styles.statContent}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <MaterialIcons name={icon as any} size={24} color={color} />
        </View>
        <View style={styles.statText}>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statTitle}>{title}</Text>
        </View>
      </View>
    </Card>
  )

  const ActivityItem = ({ item }: { item: RecentActivity }) => (
    <View style={styles.activityItem}>
      <View style={styles.activityContent}>
        <MaterialIcons 
          name={item.type === 'audit' ? 'assignment' : item.type === 'form' ? 'description' : 'verified-user'} 
          size={20} 
          color="#6b7280" 
        />
        <View style={styles.activityText}>
          <Text style={styles.activityTitle}>{item.title}</Text>
          <Text style={styles.activityDate}>{item.date}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>
    </View>
  )

  return (
    <Screen style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back!</Text>
        <Text style={styles.subtitle}>Here's your compliance overview</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard 
          title="Total Records" 
          value={stats.totalCompliance} 
          icon="folder" 
          color="#3b82f6" 
        />
        <StatCard 
          title="Pending Audits" 
          value={stats.pendingAudits} 
          icon="pending-actions" 
          color="#f59e0b" 
        />
        <StatCard 
          title="Completed Forms" 
          value={stats.completedForms} 
          icon="check-circle" 
          color="#10b981" 
        />
        <StatCard 
          title="Failed Items" 
          value={stats.failedItems} 
          icon="error" 
          color="#ef4444" 
        />
      </View>

      {/* Quick Actions */}
      <Card variant="default" style={styles.actionsCard}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <Button
            title="Start New Audit"
            onPress={() => router.push('/audit')}
            variant="primary"
            size="medium"
            style={styles.actionButton}
          />
          <Button
            title="View Reports"
            onPress={() => router.push('/audit')}
            variant="secondary"
            size="medium"
            style={styles.actionButton}
          />
        </View>
      </Card>

      {/* Recent Activity */}
      <Card variant="default" style={styles.activityCard}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <FlatList
          data={recentActivity}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ActivityItem item={item} />}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        />
        <Button
          title="View All Activity"
          onPress={() => router.push('/audit')}
          variant="ghost"
          size="small"
          style={styles.viewAllButton}
        />
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    marginBottom: 12,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statText: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionsCard: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  activityCard: {
    flex: 1,
  },
  activityItem: {
    marginBottom: 12,
  },
  activityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  activityText: {
    flex: 1,
    marginLeft: 12,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  activityDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  viewAllButton: {
    marginTop: 12,
  },
})
