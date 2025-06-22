import { router } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import Button from '../../components/Button'
import Card from '../../components/Card'
import DashboardHeader from '../../components/DashboardHeader'
import Screen from '../../components/Screen'
import StatsGrid, { StatData } from '../../components/StatsGrid'
import StatusBadge from '../../components/StatusBadge'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/useAuth'

interface DashboardStats {
  totalAudits: number
  pendingAudits: number
  completedAudits: number
  draftAudits: number
  failedAudits: number
  averageScore: number
  totalForms: number
}

interface RecentActivity {
  id: string
  title: string
  type: 'audit' | 'form' | 'compliance'
  status: string
  date: string
  percentage?: number
  result?: string
}

export default function Index() {
  const { user, profile } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalAudits: 0,
    pendingAudits: 0,
    completedAudits: 0,
    draftAudits: 0,
    failedAudits: 0,
    averageScore: 0,
    totalForms: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (user?.id && profile?.tenant_id) {
      fetchDashboardData()
    }
  }, [user?.id, profile?.tenant_id])

  const fetchDashboardData = async () => {
    if (!user?.id || !profile?.tenant_id) {
      setLoading(false)
      setRefreshing(false)
      return
    }

    try {
      if (!refreshing) {
        setLoading(true)
      }
      
      // Fetch all audits for the current user and tenant
      const { data: auditsData, error: auditsError } = await supabase
        .from('audit')
        .select(`
          *,
          form:form_id (
            form_schema
          )
        `)
        .eq('user_id', user.id)
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false })

      if (auditsError) {
        console.error('Error fetching audits:', auditsError)
        setLoading(false)
        return
      }

      console.log('Dashboard audits with tenant filter:', auditsData)

      let finalAudits = auditsData || []

      // If no audits found with tenant filter, try without tenant filter as fallback
      if (finalAudits.length === 0) {
        console.log('No audits found with tenant filter, trying without tenant filter for dashboard...')
        const { data: fallbackAudits, error: fallbackError } = await supabase
          .from('audit')
          .select(`
            *,
            form:form_id (
              form_schema
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        
        if (!fallbackError && fallbackAudits) {
          console.log('Found audits without tenant filter for dashboard:', fallbackAudits)
          finalAudits = fallbackAudits
        }
      }

      const audits = finalAudits

      // Debug: Log audit status and result values
      console.log('Audit data for statistics:', audits.map(audit => ({
        id: audit.id,
        status: audit.status,
        result: audit.result,
        percentage: audit.percentage
      })))

      // Calculate statistics
      const totalAudits = audits.length
      const pendingAudits = audits.filter(audit => audit.status === 'pending').length
      const completedAudits = audits.filter(audit => audit.status === 'completed').length
      const draftAudits = audits.filter(audit => audit.status === 'draft').length
      const failedAudits = audits.filter(audit => audit.result === 'failed').length
      
      // Calculate average score
      const auditScores = audits.filter(audit => audit.percentage != null).map(audit => audit.percentage)
      const averageScore = auditScores.length > 0 ? Math.round(auditScores.reduce((sum, score) => sum + score, 0) / auditScores.length) : 0

      // Get total number of unique forms
      const { count: totalForms } = await supabase
        .from('form')
        .select('*', { count: 'exact', head: true })

      setStats({
        totalAudits,
        pendingAudits,
        completedAudits,
        draftAudits,
        failedAudits,
        averageScore,
        totalForms: totalForms || 0
      })

      console.log('Calculated statistics:', {
        totalAudits,
        pendingAudits,
        completedAudits,
        draftAudits,
        failedAudits,
        averageScore,
        totalForms: totalForms || 0
      })

      // Create recent activity from audits
      const recentAudits: RecentActivity[] = audits.slice(0, 5).map((audit) => {
        const formTitle = audit.form?.form_schema?.title || 'Unknown Form'
        const auditTitle = audit.title || formTitle
        
        // Calculate relative time
        const auditDate = new Date(audit.created_at)
        const now = new Date()
        const diffInHours = Math.floor((now.getTime() - auditDate.getTime()) / (1000 * 60 * 60))
        
        let timeString = ''
        if (diffInHours < 1) {
          timeString = 'Just now'
        } else if (diffInHours < 24) {
          timeString = `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
        } else {
          const diffInDays = Math.floor(diffInHours / 24)
          timeString = `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
        }

        return {
          id: audit.id.toString(),
          title: auditTitle,
          type: 'audit' as const,
          status: audit.status,
          date: timeString,
          percentage: audit.percentage,
          result: audit.result
        }
      })
      
      setRecentActivity(recentAudits)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    fetchDashboardData()
  }

  const statsData: StatData[] = [
    {
      title: 'Total Audits',
      value: stats.totalAudits,
      icon: 'assignment',
      color: '#3b82f6'
    },
    {
      title: 'Average Score',
      value: `${stats.averageScore}%`,
      icon: 'trending-up',
      color: '#8b5cf6'
    },
    {
      title: 'Completed',
      value: stats.completedAudits,
      icon: 'check-circle',
      color: '#10b981'
    },
    {
      title: 'Pending',
      value: stats.pendingAudits,
      icon: 'pending-actions',
      color: '#f59e0b'
    },
    {
      title: 'Drafts',
      value: stats.draftAudits,
      icon: 'edit',
      color: '#8b5cf6'
    },
    {
      title: 'Failed',
      value: stats.failedAudits,
      icon: 'error',
      color: '#ef4444'
    },
    {
      title: 'Forms Available',
      value: stats.totalForms,
      icon: 'description',
      color: '#06b6d4'
    }
  ]

  const ActivityItem = ({ item }: { item: RecentActivity }) => (
    <View style={styles.activityItem}>
      <View style={styles.activityContent}>
        <View style={styles.activityText}>
          <Text style={styles.activityTitle}>{item.title}</Text>
          <View style={styles.activityMeta}>
            <Text style={styles.activityDate}>{item.date}</Text>
            {item.percentage !== undefined && (
              <Text style={styles.activityScore}>
                <Text style={styles.activityScoreLabel}>Score: </Text>
                <Text style={[
                  styles.activityScoreValue,
                  { color: item.percentage >= 80 ? '#10b981' : item.percentage >= 60 ? '#f59e0b' : '#ef4444' }
                ]}>
                  {item.percentage}%
                </Text>
              </Text>
            )}
          </View>
        </View>
        <View style={styles.activityBadges}>
          <StatusBadge status={item.status} />
          {item.result && (
            <View style={styles.resultBadgeContainer}>
              <View style={[
                styles.resultBadge,
                { backgroundColor: item.result === 'pass' ? '#dcfce7' : '#fee2e2' }
              ]}>
                <Text style={[
                  styles.resultBadgeText,
                  { color: item.result === 'pass' ? '#16a34a' : '#dc2626' }
                ]}>
                  {item.result.toUpperCase()}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  )

  return (
    <Screen style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3b82f6']}
            tintColor="#3b82f6"
          />
        }
      >
        <DashboardHeader 
          title="Welcome back!"
          subtitle={loading ? "Loading your audit overview..." : "Here's your audit overview"}
        />

        <StatsGrid stats={statsData} columns={3} />

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
              title="View History"
              onPress={() => router.push('/(tabs)/history')}
              variant="secondary"
              size="medium"
              style={styles.actionButton}
            />
          </View>
        </Card>

        {/* Recent Activity */}
        <Card variant="default" style={styles.activityCard}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading recent audits...</Text>
            </View>
          ) : recentActivity.length > 0 ? (
            <>
              {recentActivity.map((item) => (
                <ActivityItem key={item.id} item={item} />
              ))}
              <Button
                title="View All Activity"
                onPress={() => router.push('/(tabs)/history')}
                variant="ghost"
                size="small"
                style={styles.viewAllButton}
              />
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No audits completed yet</Text>
              <Text style={styles.emptySubtext}>Start your first audit to see it here</Text>
            </View>
          )}
        </Card>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100, // Extra padding for custom tab bar
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
    marginBottom: 24,
  },
  activityItem: {
    marginBottom: 12,
  },
  activityContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  activityText: {
    flex: 1,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
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
  activityScore: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityScoreLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  activityScoreValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  activityBadges: {
    flexDirection: 'column',
    gap: 8,
    alignItems: 'flex-end',
  },
  resultBadgeContainer: {
    marginTop: 4,
  },
  resultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  resultBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  viewAllButton: {
    marginTop: 12,
  },
})
