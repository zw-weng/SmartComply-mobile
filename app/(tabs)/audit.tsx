import { router } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import Card from '../../components/Card'
import ListItem from '../../components/ListItem'
import Screen from '../../components/Screen'
import StatusBadge from '../../components/StatusBadge'
import { supabase } from '../../lib/supabase'

interface ComplianceRecord {
  id: number
  name: string
  status: string // Can be 'active', 'inactive', 'pending', 'archived', etc.
  description?: string
}

const Audit = () => {
  const [compliances, setCompliances] = useState<ComplianceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchCompliances = async () => {
    try {
      // Check if user is authenticated before fetching data
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        return;
      }
      
      if (!session) {
        console.error('No active session - user not authenticated');
        return;
      }
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );
      
      const supabasePromise = supabase
        .from('compliance')
        .select('*')
        .eq('status', 'active')
        .order('name', { ascending: true });
      
      const { data, error } = await Promise.race([supabasePromise, timeoutPromise]) as any;
      
      if (error) {
        console.error('Error fetching compliance records:', error);
        return;
      }
      
      if (data) {
        console.log('Fetched active compliance records:', data.length)
        console.log('Active compliance records:', data.map((record: ComplianceRecord) => ({ 
          id: record.id, 
          name: record.name, 
          status: record.status 
        })))
        setCompliances(data as ComplianceRecord[])
      } else {
        console.log('No active compliance records found')
        setCompliances([])
      }
    } catch (error) {
      console.error('Error fetching compliances:', error)
      if (error instanceof Error && error.message === 'Request timeout') {
        console.error('Request timed out - possible network or database issue');
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchCompliances();
  }, [])

  const onRefresh = () => {
    setRefreshing(true)
    fetchCompliances()
  }

  const renderComplianceItem = ({ item }: { item: ComplianceRecord }) => (
    <ListItem
      title={item.name}
      subtitle={item.description || `Compliance ID: ${item.id}`}
      rightElement={<StatusBadge status={item.status} />}
      leftIcon="assignment"
      onPress={() => router.push({ pathname: '/audit/[id]', params: { id: item.id } })}
    />
  )

  const renderEmptyState = () => (
    <Card style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>No Active Compliance Records</Text>
      <Text style={styles.emptyDescription}>
        There are no active compliance records available at the moment. Contact your administrator to activate compliance forms.
      </Text>
    </Card>
  )

  if (loading) {
    return (
      <Screen style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading active compliance forms...</Text>
        </View>
      </Screen>
    )
  }

  return (
    <Screen style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Compliance Audit</Text>
        <Text style={styles.subtitle}>Active compliance forms available for audit</Text>
      </View>

      <FlatList
        data={compliances}
        keyExtractor={item => item.id.toString()}
        renderItem={renderComplianceItem}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </Screen>
  )
}

export default Audit

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 120, // Account for redesigned tab bar
  },
  emptyCard: {
    margin: 16,
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
})
