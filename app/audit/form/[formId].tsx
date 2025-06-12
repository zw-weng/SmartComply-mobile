// app/audit/[id]/form/[formId].tsx

import { Link, useLocalSearchParams } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import Screen from '../../../components/Screen'
import { supabase } from '../../../lib/supabase'

type FieldDef = {
  name: string
  label: string
  type: 'text' | 'number' | 'boolean'
  placeholder?: string
}

interface FormRecord {
  form_schema: {
    title: string
    fields: FieldDef[]
  }
}

export default function FormScreen() {
  const { id, formId } = useLocalSearchParams<{ id: string; formId: string }>()
  const [schema, setSchema] = useState<FormRecord['form_schema'] | null>(null)
  const [values, setValues] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!formId) return
    
    const fetchForm = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('form')
        .select('form_schema')
        .eq('id', formId)
        .single()

      if (!error && data) {
        setSchema(data.form_schema as FormRecord['form_schema'])
        // init values
        const initial: Record<string, any> = {}
        data.form_schema.fields.forEach((f: FieldDef) => {
          initial[f.name] = f.type === 'boolean' ? false : ''
        })
        setValues(initial)
      }
      setLoading(false)
    }
    fetchForm()
  }, [formId])

  const handleChange = (name: string, val: any) =>
    setValues((prev) => ({ ...prev, [name]: val }))

  const handleSubmit = async () => {
    // Persist `values` however you need:
    // e.g. supabase.from('responses').insert({ form_id: formId, data: values })
    console.log('submit', values)
  }

  if (loading)
    return (
      <Screen style={styles.container}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </Screen>
    )

  if (!schema)
    return (
      <Screen style={styles.container}>
        <Text style={styles.error}>Form not found.</Text>
      </Screen>
    )

  return (
    <Screen style={styles.container}>
      <Link href={`/audit/${id}`}>
        <Text style={styles.backLink}>← Back to Forms</Text>
      </Link>

      <Text style={styles.title}>{schema.title}</Text>
      <ScrollView>
        {schema.fields.map((field) => (
          <View key={field.name} style={styles.fieldRow}>
            <Text style={styles.label}>{field.label}</Text>

            {field.type === 'text' || field.type === 'number' ? (
              <TextInput
                style={styles.input}
                placeholder={field.placeholder || ''}
                keyboardType={field.type === 'number' ? 'numeric' : 'default'}
                value={String(values[field.name])}
                onChangeText={(txt) =>
                  handleChange(field.name, field.type === 'number' ? Number(txt) : txt)
                }
              />
            ) : (
              <View style={styles.booleanRow}>
                <Text>{values[field.name] ? 'Yes' : 'No'}</Text>
                <Button
                  title={values[field.name] ? 'Off' : 'On'}
                  onPress={() => handleChange(field.name, !values[field.name])}
                />
              </View>
            )}
          </View>
        ))}

        <Button title="Submit" onPress={handleSubmit} />
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff' },
  backLink: { color: '#0284c7', marginBottom: 12 },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0ea5e9',
    marginBottom: 16,
    textAlign: 'center',
  },
  fieldRow: { marginBottom: 16 },
  label: { fontWeight: '600', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 8,
    fontSize: 16,
  },
  booleanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  error: { color: '#ef4444', textAlign: 'center', marginTop: 40 },
})
