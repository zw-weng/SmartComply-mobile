import React, { useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native'
import { supabase } from '../../lib/supabase'
import Screen from '../../components/Screen'

const Audit = () => {
  const [compliances, setCompliances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCompliances = async () => {
      setLoading(true)
      const { data, error } = await supabase.from('compliance').select('*')
      if (!error && data) {
        setCompliances(data)
      }
      setLoading(false)
    }
    fetchCompliances()
  }, [])

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.row}>
      <Text style={styles.cell}>{item.id}</Text>
      <Text style={styles.cell}>{item.name}</Text>
      <Text style={styles.cell}>{item.status}</Text>
    </View>
  )

  return (
    <Screen style={styles.container}>
      <Text style={styles.title}>Compliance List</Text>

      <View style={styles.headerRow}>
        <Text style={[styles.cell, styles.headerCell]}>ID</Text>
        <Text style={[styles.cell, styles.headerCell]}>Name</Text>
        <Text style={[styles.cell, styles.headerCell]}>Status</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0ea5e9" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={compliances}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
        />
      )}
    </Screen>
  )
}

export default Audit

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#0ea5e9',
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#0ea5e9',
    paddingBottom: 8,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 8,
  },
  cell: {
    flex: 1,
    fontSize: 16,
    textAlign: 'center',
  },
  headerCell: {
    fontWeight: 'bold',
    color: '#0284c7',
  },
})
