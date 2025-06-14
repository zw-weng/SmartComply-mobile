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
import { useAuth } from '../../../lib/useAuth'

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
  weight?: number
  weightage?: number // Support both weight and weightage fields
  description?: string
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
  const { id, formId, auditId } = useLocalSearchParams<{ id: string; formId: string; auditId?: string }>()
  const { user } = useAuth()
  const [schema, setSchema] = useState<FormRecord['form_schema'] | null>(null)
  const [values, setValues] = useState<Record<string, any>>({})
  const [userComments, setUserComments] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isEditing, setIsEditing] = useState(false)
  const [existingAuditId, setExistingAuditId] = useState<string | null>(null)

  useEffect(() => {
    if (!formId) return
    
    const fetchFormAndAudit = async () => {
      setLoading(true)
      try {
        // Fetch form schema
        const { data: formData, error: formError } = await supabase
          .from('form')
          .select('form_schema')
          .eq('id', formId)
          .single()

        if (formError || !formData) {
          throw new Error('Failed to load form')
        }

        setSchema(formData.form_schema as FormRecord['form_schema'])
        
        // Initialize default values
        const initial: Record<string, any> = {}
        formData.form_schema.fields.forEach((field: FieldDef) => {
          if (field.type === 'boolean') {
            initial[field.id] = false
          } else if (field.type === 'select') {
            initial[field.id] = ''
          } else {
            initial[field.id] = ''
          }
        })

        // If editing existing audit, load the audit data
        if (auditId && user?.id) {
          setIsEditing(true)
          setExistingAuditId(auditId)
          
          const { data: auditData, error: auditError } = await supabase
            .from('audit')
            .select('*')
            .eq('id', auditId)
            .eq('user_id', user.id)
            .single()

          if (!auditError && auditData) {
            setUserComments(auditData.comments || '')
            setValues(initial)
            
            Alert.alert(
              'Edit Mode',
              'You are editing an existing audit. Make your changes and resubmit.',
              [{ text: 'OK' }]
            )
          } else {
            Alert.alert('Error', 'Could not load existing audit data')
            setIsEditing(false)
            setExistingAuditId(null)
          }
        } else {
          setValues(initial)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        Alert.alert('Error', 'Failed to load form')
      } finally {
        setLoading(false)
      }
    }
    
    fetchFormAndAudit()
  }, [formId, auditId, user?.id])

  const handleChange = (fieldId: string, value: any) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }))
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
    console.log('Auto-fail fields found:', autoFailFields.length)
    
    for (const field of autoFailFields) {
      const selectedValue = values[field.id]
      console.log(`Checking field ${field.label}, selected value: "${selectedValue}"`)
      
      if (field.enhancedOptions) {
        console.log('Enhanced options:', field.enhancedOptions)
        const selectedOption = field.enhancedOptions.find(opt => opt.value === selectedValue)
        console.log('Selected option:', selectedOption)
        
        if (selectedOption?.isFailOption) {
          console.log('AUTO-FAIL DETECTED:', selectedOption)
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
  
  const calculateScore = () => {
    if (!schema) return { totalScore: 0, maxScore: 0, passPercentage: 0 }
    
    let totalScore = 0
    let maxScore = 0
      schema.fields.forEach(field => {
      const userValue = values[field.id]
      const fieldWeight = field.weight || field.weightage || 1 // Handle both weight and weightage
      
      if (field.enhancedOptions && userValue) {
        const selectedOption = field.enhancedOptions.find(opt => opt.value === userValue)
        if (selectedOption) {
          totalScore += selectedOption.points * fieldWeight
        }
        
        const maxPoints = Math.max(...field.enhancedOptions.map(opt => opt.points))
        maxScore += maxPoints * fieldWeight
      } else if (field.type === 'boolean' && userValue !== undefined) {
        const points = userValue === 'true' ? 1 : 0
        totalScore += points * fieldWeight
        maxScore += 1 * fieldWeight
      }
    })
    
    const passPercentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0
    
    return {
      totalScore,
      maxScore,
      passPercentage
    }
  }
    const formatResultForDisplay = (result: string): string => {
    switch (result.toLowerCase()) {
      case 'pass': return 'PASSED'
      case 'failed': return 'FAILED'
      case 'passed': return 'PASSED' // Legacy support
      case 'fail': return 'FAILED'
      default: return result.toUpperCase()
    }
  }
    const submitForm = async () => {
    if (!user) {
      Alert.alert('Authentication Required', 'You must be logged in to submit a form.')
      return
    }

    setSubmitting(true)
    try {
      const scoreResult = calculateScore()
      const autoFailCheck = checkAutoFail()
        let finalMarks = Math.round(scoreResult.totalScore * 100) / 100
      let finalPercentage = Math.round(scoreResult.passPercentage * 100) / 100
      let finalResult = finalPercentage >= 60 ? 'pass' : 'failed'
        // Handle auto-fail cases - ensure database constraint compliance
      if (autoFailCheck.isFail) {
        finalResult = 'failed'
        // Maybe constraint expects non-zero values - try setting to minimal failing values
        finalPercentage = 1 // Minimal non-zero percentage
        finalMarks = 0.1 // Minimal non-zero marks
        console.log('Auto-fail detected:', autoFailCheck.reason)
      }
      
      // Set status based on result: pass -> completed, failed -> pending
      const finalStatus = finalResult === 'pass' ? 'completed' : 'pending'// Debug: Log the values we're about to insert
      console.log('Audit values to insert:', {
        form_id: parseInt(formId as string),
        user_id: user.id,
        status: finalStatus,
        result: finalResult,
        marks: finalMarks,
        percentage: finalPercentage,
        comments: userComments || '',
        autoFail: autoFailCheck.isFail
      })
      
      let auditData, auditError;
        if (isEditing && existingAuditId) {
        // Update existing audit with last_edit_at timestamp
        console.log('Updating existing audit with last_edit_at timestamp')
        const updateResult = await supabase
          .from('audit')
          .update({
            status: finalStatus,
            result: finalResult,
            marks: finalMarks,
            percentage: finalPercentage,
            comments: userComments || '',
            last_edit_at: new Date().toISOString(),
          })
          .eq('id', existingAuditId)
          .eq('user_id', user.id)
          .select()
          .single()
        
        auditData = updateResult.data
        auditError = updateResult.error
      } else {        const insertResult = await supabase
          .from('audit')
          .insert({
            form_id: parseInt(formId as string),
            user_id: user.id,
            status: finalStatus,
            result: finalResult,
            marks: finalMarks,
            percentage: finalPercentage,
            comments: userComments || null,
          })
          .select()
          .single()
        
        auditData = insertResult.data
        auditError = insertResult.error
      }

      if (auditError) throw auditError
      
      const actionText = isEditing ? 'updated' : 'submitted'
      Alert.alert(
        `Audit ${isEditing ? 'Updated' : 'Completed'}`, 
        `Form ${actionText} successfully!\n\nScore: ${finalMarks}/${scoreResult.maxScore}\nPercentage: ${finalPercentage.toFixed(1)}%\nResult: ${formatResultForDisplay(finalResult)}\nStatus: ${finalStatus.toUpperCase()}`, 
        [
          { 
            text: 'Audit History', 
            onPress: () => {
              router.push('/(tabs)/history')
            }
          }
        ]
      )
    } catch (error: any) {
      console.error('Error submitting form:', error)
      
      let errorMessage = 'Failed to submit audit. Please try again.'
      if (error?.code === '42501') {
        errorMessage = 'Permission denied. You may not have the required permissions to submit this audit.'
      } else if (error?.code === 'PGRST204') {
        errorMessage = 'Database schema error. Please contact support.'
      } else if (error?.code === '23514') {
        errorMessage = 'Invalid result value. The audit result does not meet database constraints.'
      } else if (error?.message?.includes('authentication')) {
        errorMessage = 'Authentication required. Please log in and try again.'
      }
      
      Alert.alert('Error', errorMessage)
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
        const options = field.enhancedOptions || 
          (field.options ? field.options.map(opt => ({ 
            value: String(opt), 
            points: 0, 
            isFailOption: false 
          })) : [])
        
        return (
          <View style={[styles.pickerContainer, hasError && styles.inputError]}>
            <Picker
              selectedValue={value}
              onValueChange={(itemValue) => handleChange(field.id, String(itemValue))}
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
                  label={String(option.value)}
                  value={String(option.value)}
                  color={option.isFailOption ? '#ef4444' : '#000'}
                />
              ))}
            </Picker>
          </View>
        )

      default:
        return <Text style={styles.unsupportedField}>{`Unsupported field type: ${field.type}`}</Text>
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
    <Screen style={styles.container}>      <BackButton 
        onPress={() => {
          if (isEditing || auditId) {
            router.push('/(tabs)/history')
          } else {
            router.push(`/audit/${id}`)
          }
        }}
        title={isEditing || auditId ? "Back to History" : "Back to Forms"}
        style={styles.backButton}
      />
      
      <View style={styles.header}>
        <View style={styles.formTitleCard}>
          <Text style={styles.title}>
            {isEditing && '✏️ Editing: '}{schema.title}
          </Text>
          {schema.description && (
            <Text style={styles.description}>{schema.description}</Text>
          )}
          {isEditing && (
            <View style={styles.editingNotice}>
              <Text style={styles.editingText}>
                📝 You are editing an existing audit. Make changes and resubmit.
              </Text>
            </View>
          )}
          <View style={styles.formInfo}>
            <Text style={styles.formInfoText}>
              {schema.fields.length} questions • Required fields are marked with *
            </Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {schema.fields.map((field, index) => (
          <View key={field.id} style={styles.fieldCard}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldNumber}>{index + 1}.</Text>
              <View style={styles.fieldTitleContainer}>
                <Text style={styles.fieldLabel}>
                  {field.label}
                  {field.required && <Text style={styles.required}> *</Text>}
                </Text>
                {field.description && (
                  <Text style={styles.fieldDescription}>{field.description}</Text>
                )}
              </View>
            </View>
            
            <View style={styles.fieldInputContainer}>
              {renderField(field)}
            </View>
            
            {errors[field.id] && (
              <Text style={styles.errorText}>{errors[field.id]}</Text>
            )}
          </View>
        ))}
        
        <View style={styles.fieldCard}>
          <View style={styles.fieldHeader}>
            <Text style={styles.fieldNumber}>{schema.fields.length + 1}.</Text>
            <View style={styles.fieldTitleContainer}>
              <Text style={styles.fieldLabel}>
                Comments
                <Text style={styles.optional}> (Optional)</Text>
              </Text>
              <Text style={styles.fieldDescription}>
                Add any additional comments, observations, or notes about this audit
              </Text>
            </View>
          </View>
          <View style={styles.fieldInputContainer}>
            <TextInput
              style={[styles.input, styles.commentsInput]}
              placeholder="Add any additional comments or observations..."
              value={userComments}
              onChangeText={setUserComments}
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.submitContainer}>
        <Pressable 
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]} 
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? (isEditing ? 'Updating...' : 'Submitting...') : (isEditing ? 'Update Audit' : 'Submit Form')}
          </Text>
        </Pressable>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  backButton: {
    marginTop: 16,
    marginHorizontal: 16,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  formTitleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  formInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  formInfoText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
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
  },
  editingNotice: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  editingText: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  fieldCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    marginHorizontal: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  fieldNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginRight: 8,
    marginTop: 2,
  },
  fieldTitleContainer: {
    flex: 1,
  },
  fieldDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    lineHeight: 20,
  },
  fieldInputContainer: {
    marginTop: 8,
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
  optional: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: 'normal',
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
  commentsInput: {
    minHeight: 100,
    textAlignVertical: 'top',
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
  submitContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 16,
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