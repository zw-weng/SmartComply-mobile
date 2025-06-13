// app/audit/[id]/form/[formId].tsx

import { Picker } from '@react-native-picker/picker'
import { router, useLocalSearchParams } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import BackButton from '../../../components/BackButton'
import Screen from '../../../components/Screen'
import { supabase } from '../../../lib/supabase'

type EnhancedOption = {
  value: string
  points: number
  isFailOption: boolean
}

type FieldDef = {
  id: string
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea'
  label: string
  required?: boolean
  placeholder?: string
  autoFail?: boolean
  options?: string[]
  enhancedOptions?: EnhancedOption[]
}

interface FormRecord {
  form_schema: {
    title: string
    description?: string
    fields: FieldDef[]
  }
}

export default function FormScreen() {
  const { id, formId } = useLocalSearchParams<{ id: string; formId: string }>()
  const [schema, setSchema] = useState<FormRecord['form_schema'] | null>(null)
  const [values, setValues] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

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
        // Initialize values
        const initial: Record<string, any> = {}
        data.form_schema.fields.forEach((field: FieldDef) => {
          if (field.type === 'boolean') {
            initial[field.id] = false
          } else if (field.type === 'select') {
            initial[field.id] = ''
          } else {
            initial[field.id] = ''
          }
        })
        setValues(initial)
      }
      setLoading(false)
    }
    fetchForm()
  }, [formId])

  const handleChange = (fieldId: string, value: any) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }))
    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors((prev) => ({ ...prev, [fieldId]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    schema?.fields.forEach((field) => {
      if (field.required && (!values[field.id] || values[field.id] === '')) {
        newErrors[field.id] = `${field.label} is required`
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const checkAutoFail = () => {
    const autoFailFields = schema?.fields.filter(field => field.autoFail) || []
    
    for (const field of autoFailFields) {
      const selectedValue = values[field.id]
      if (field.enhancedOptions) {
        const selectedOption = field.enhancedOptions.find(opt => opt.value === selectedValue)
        if (selectedOption?.isFailOption) {
          return {
            isFail: true,
            field: field.label,
            reason: `Selected "${selectedValue}" which is a fail condition`
          }
        }
      }
    }
    
    return { isFail: false }
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields')
      return
    }

    const autoFailCheck = checkAutoFail()
    if (autoFailCheck.isFail) {
      Alert.alert(
        'Auto-Fail Condition',
        `Form automatically failed: ${autoFailCheck.reason}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit Anyway', onPress: submitForm }
        ]
      )
      return
    }

    submitForm()
  }

  const submitForm = async () => {
    setSubmitting(true)
    try {
      // Here you would typically save the form response to your database
      // For now, we'll just log it
      console.log('Form submitted:', {
        formId,
        values,
        timestamp: new Date().toISOString()
      })
      
      Alert.alert('Success', 'Form submitted successfully!', [
        { text: 'OK', onPress: () => {
          // Navigate back or to next form
        }}
      ])
    } catch (error) {
      console.error('Error submitting form:', error)
      Alert.alert('Error', 'Failed to submit form. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const renderField = (field: FieldDef) => {
    const value = values[field.id]
    const hasError = !!errors[field.id]

    switch (field.type) {
      case 'text':
      case 'textarea':
        return (
          <TextInput
            style={[styles.input, hasError && styles.inputError]}
            placeholder={field.placeholder || ''}
            value={String(value || '')}
            onChangeText={(text) => handleChange(field.id, text)}
            multiline={field.type === 'textarea'}
            numberOfLines={field.type === 'textarea' ? 4 : 1}
          />
        )

      case 'number':
        return (
          <TextInput
            style={[styles.input, hasError && styles.inputError]}
            placeholder={field.placeholder || ''}
            keyboardType="numeric"
            value={String(value || '')}
            onChangeText={(text) => handleChange(field.id, Number(text) || 0)}
          />
        )

      case 'boolean':
        return (
          <View style={styles.booleanContainer}>
            <Pressable
              style={[styles.booleanOption, value === true && styles.booleanSelected]}
              onPress={() => handleChange(field.id, true)}
            >
              <Text style={[styles.booleanText, value === true && styles.booleanTextSelected]}>
                Yes
              </Text>
            </Pressable>
            <Pressable
              style={[styles.booleanOption, value === false && styles.booleanSelected]}
              onPress={() => handleChange(field.id, false)}
            >
              <Text style={[styles.booleanText, value === false && styles.booleanTextSelected]}>
                No
              </Text>
            </Pressable>
          </View>
        )

      case 'select':
        const options = field.enhancedOptions || field.options?.map(opt => ({ value: opt, points: 0, isFailOption: false })) || []
        
        return (
          <View style={[styles.pickerContainer, hasError && styles.inputError]}>
            <Picker
              selectedValue={value}
              onValueChange={(itemValue) => handleChange(field.id, itemValue)}
              style={styles.picker}
            >
              <Picker.Item 
                label={field.placeholder || "Select an option..."} 
                value="" 
                enabled={false}
                color="#999"
              />
              {options.map((option, index) => (
                <Picker.Item
                  key={index}
                  label={option.value}
                  value={option.value}
                  color={option.isFailOption ? '#ef4444' : '#000'}
                />
              ))}
            </Picker>
          </View>
        )

      default:
        return <Text style={styles.unsupportedField}>Unsupported field type: {field.type}</Text>
    }
  }

  if (loading) {
    return (
      <Screen style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading form...</Text>
      </Screen>
    )
  }

  if (!schema) {
    return (
      <Screen style={styles.container}>
        <Text style={styles.error}>Form not found.</Text>
      </Screen>
    )
  }
  return (
    <Screen style={styles.container}>
      <BackButton 
        onPress={() => router.push(`/audit/${id}`)}
        title="Back to Forms"
        style={styles.backButton}
      />

      <View style={styles.header}>
        <Text style={styles.title}>{schema.title}</Text>
        {schema.description && (
          <Text style={styles.description}>{schema.description}</Text>
        )}
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {schema.fields.map((field) => (
          <View key={field.id} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              {field.label}
              {field.required && <Text style={styles.required}>*</Text>}
              {field.autoFail && <Text style={styles.autoFail}> Auto-fail</Text>}
            </Text>
            
            {renderField(field)}
            
            {errors[field.id] && (
              <Text style={styles.errorText}>{errors[field.id]}</Text>
            )}
          </View>
        ))}

        <Pressable 
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]} 
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Submitting...' : 'Submit Form (Preview Only)'}
          </Text>
        </Pressable>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({  container: { 
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  backButton: {
    marginTop: 16,
    marginHorizontal: 16,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
  },  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 100, // Account for tab bar
  },
  fieldContainer: { 
    marginBottom: 24,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  fieldLabel: { 
    fontSize: 16,
    fontWeight: '600', 
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
  autoFail: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#1f2937',
  },
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  booleanContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  booleanOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  booleanSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  booleanText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  booleanTextSelected: {
    color: '#3b82f6',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginVertical: 32,
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  unsupportedField: {
    color: '#f59e0b',
    fontSize: 14,
    fontStyle: 'italic',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  error: { 
    color: '#ef4444', 
    textAlign: 'center', 
    marginTop: 40,
    fontSize: 16,
  },
})
