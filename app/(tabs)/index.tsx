import React from 'react'
import { Text, StyleSheet } from 'react-native'
import { Link } from 'expo-router'
import Screen from '../../components/Screen'

export default function Index() {
  return (
    <Screen style={styles.container}>
      <Text style={styles.title}>Welcome</Text>

      <Link href="/audit">
        <Text style={styles.link}>Audit</Text>
      </Link>

      <Link href="/profile">
        <Text style={styles.link}>Profile</Text>
      </Link>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#3b82f6', // blue-500
    marginBottom: 24,
  },
  link: {
    fontSize: 18,
    color: '#0ea5e9', // sky-500
    marginVertical: 8,
  },
})
