import { MaterialIcons } from '@expo/vector-icons'
import { Picker } from '@react-native-picker/picker'
import * as ImagePicker from 'expo-image-picker'
import { router, useLocalSearchParams } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
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
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea' | 'image'
  label: string
  required?: boolean
  placeholder?: string
  autoFail?: boolean
  weight?: number
  weightage?: number
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
  const { id, formId, auditId, mode } = useLocalSearchParams<{
    id: string
    formId: string
    auditId?: string
    mode?: 'view' | 'edit'
  }>()
  const { user } = useAuth()
  const [schema, setSchema] = useState<FormRecord['form_schema'] | null>(null)
  const [values, setValues] = useState<Record<string, any>>({})
  const [auditTitle, setAuditTitle] = useState('')
  const [userComments, setUserComments] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isEditing, setIsEditing] = useState(false)
  const [isViewMode, setIsViewMode] = useState(mode === 'view')
  const [existingAuditId, setExistingAuditId] = useState<string | null>(null)
  const [uploadingImages, setUploadingImages] = useState<Record<string, boolean>>({})

  // Test storage bucket connection with improved diagnostics
  const testStorageBucket = async () => {
    try {
      console.log('=== STORAGE BUCKET TEST START ===')
      console.log('Testing storage bucket connection...')

      console.log('Step 1: Testing direct access to audit-images bucket...')
      const { data: files, error: filesError } = await supabase.storage
        .from('audit-images')
        .list('', { limit: 1 })

      if (filesError) {
        console.error('Step 1 Failed: Direct bucket access failed')
        console.error('Files error details:', filesError)
        console.error('Error message:', filesError.message)

        if (filesError.message.includes('The resource was not found') ||
            filesError.message.includes('Bucket not found')) {
          console.log('DIAGNOSIS: Bucket does not exist')
          Alert.alert(
            'Bucket Not Found',
            'The "audit-images" storage bucket does not exist.\n\nSteps to create:\n\n1. Open Supabase Dashboard\n2. Go to Storage → Buckets\n3. Click "New bucket"\n4. Name: audit-images\n5. Make it Public\n6. Create bucket\n\nThen try uploading again.'
          )
        } else if (filesError.message.includes('access') ||
                   filesError.message.includes('permission') ||
                   filesError.message.includes('policy')) {
          console.log('DIAGNOSIS: Permission/access issue')
          Alert.alert(
            'Bucket Access Denied',
            'Cannot access the "audit-images" bucket.\n\nThis might be due to:\n• Bucket is not public\n• Row Level Security (RLS) policies\n• Storage policies not configured\n\nTo fix:\n1. Go to Supabase Dashboard\n2. Storage → Buckets → audit-images\n3. Settings → Make sure "Public bucket" is enabled\n4. Try again'
          )
        } else {
          console.log('DIAGNOSIS: Unknown error')
          Alert.alert(
            'Storage Connection Error',
            `Unexpected error accessing storage:\n\n${filesError.message}\n\nPlease check:\n• Internet connection\n• Supabase project status\n• Storage service status`
          )
        }
        return false
      }

      console.log('Step 1 Success: audit-images bucket is accessible via direct access!')
      console.log('Files in bucket (first few):', files?.slice(0, 3))
      console.log('=== STORAGE BUCKET TEST COMPLETE - SUCCESS ===')
      return true
    } catch (error) {
      console.error('=== STORAGE BUCKET TEST FAILED ===')
      console.error('Unexpected error during storage test:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      Alert.alert(
        'Storage Test Failed',
        `An unexpected error occurred:\n\n${errorMessage}\n\nPlease check:\n• Internet connection\n• Supabase configuration\n• Project status`
      )
      return false
    }
  }

  // Image upload function
  const uploadImageToSupabase = async (fieldId: string, imageUri: string): Promise<string> => {
    try {
      console.log('=== IMAGE UPLOAD START ===')
      console.log('Starting image upload for field:', fieldId)
      console.log('Image URI:', imageUri)

      console.log('Step 1: Testing storage bucket...')
      const bucketExists = await testStorageBucket()
      if (!bucketExists) {
        throw new Error('Storage bucket not available. Please check Supabase configuration.')
      }
      console.log('Step 1 Success: Storage bucket OK')

      console.log('Step 2: Reading image file...')
      const fileExt = imageUri.split('.').pop() || 'jpg'
      const fileName = `audit_${formId}_${fieldId}_${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      console.log('Step 3: Uploading to Supabase Storage...')
      console.log('Upload path:', filePath)
      console.log('Reading file with fetch (ArrayBuffer)...')
      const response = await fetch(imageUri)
      if (!response.ok) {
        throw new Error(`Failed to read image: ${response.status}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      console.log('Step 2 Success: Image read as ArrayBuffer, size:', arrayBuffer.byteLength, 'bytes')
      console.log('Uploading ArrayBuffer to Supabase...')

      const mimeType = fileExt === 'png' ? 'image/png' : 'image/jpeg'
      const { data, error } = await supabase.storage
        .from('audit-images')
        .upload(filePath, arrayBuffer, {
          contentType: mimeType,
          upsert: false
        })

      if (error) {
        console.error('Step 3 Failed: Storage upload error:', error)
        console.error('Upload error details:', {
          message: error.message,
          error: error
        })
        throw new Error(`Upload failed: ${error.message}`)
      }

      console.log('Step 3 Success: Upload completed:', data?.path)
      console.log('Step 4: Generating public URL...')
      const { data: { publicUrl } } = supabase.storage
        .from('audit-images')
        .getPublicUrl(filePath)

      console.log('Step 4 Success: Public URL generated:', publicUrl)
      console.log('=== IMAGE UPLOAD COMPLETE - SUCCESS ===')
      return publicUrl
    } catch (error) {
      console.error('=== IMAGE UPLOAD FAILED ===')
      console.error('Error uploading image:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      throw new Error(`Upload failed: ${errorMessage}`)
    }
  }

  // Image picker function
  const pickImage = async (fieldId: string) => {
    try {
      Alert.alert(
        'Select Image',
        'Choose an option',
        [
          { text: 'Camera', onPress: () => openCamera(fieldId) },
          { text: 'Gallery', onPress: () => openGallery(fieldId) },
          { text: 'Cancel', style: 'cancel' }
        ]
      )
    } catch (error) {
      Alert.alert('Error', 'Failed to access image picker')
    }
  }

  const openCamera = async (fieldId: string) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is required to take photos.')
        return
      }

      setUploadingImages(prev => ({ ...prev, [fieldId]: true }))
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri
        try {
          const publicUrl = await uploadImageToSupabase(fieldId, imageUri)
          handleChange(fieldId, publicUrl)
          Alert.alert('Success', 'Image uploaded successfully!')
        } catch (uploadError) {
          console.error('Upload error:', uploadError)
          const errorMessage = uploadError instanceof Error ? uploadError.message : 'Failed to upload image'
          Alert.alert('Upload Failed', errorMessage)
        }
      }
    } catch (error) {
      console.error('Camera error:', error)
      Alert.alert('Error', 'Failed to take photo. Please try again.')
    } finally {
      setUploadingImages(prev => ({ ...prev, [fieldId]: false }))
    }
  }

  const openGallery = async (fieldId: string) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Photo library permission is required to select images.')
        return
      }

      setUploadingImages(prev => ({ ...prev, [fieldId]: true }))
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri
        try {
          const publicUrl = await uploadImageToSupabase(fieldId, imageUri)
          handleChange(fieldId, publicUrl)
          Alert.alert('Success', 'Image uploaded successfully!')
        } catch (uploadError) {
          console.error('Upload error:', uploadError)
          const errorMessage = uploadError instanceof Error ? uploadError.message : 'Failed to upload image'
          Alert.alert('Upload Failed', errorMessage)
        }
      }
    } catch (error) {
      console.error('Gallery error:', error)
      Alert.alert('Error', 'Failed to select image. Please try again.')    } finally {
      setUploadingImages(prev => ({ ...prev, [fieldId]: false }))
    }
  }

  useEffect(() => {
    if (!formId) return
    
    // Don't fetch data if user is not authenticated (prevents errors during sign out)
    if (!user?.id) {
      setLoading(false)
      return
    }

    let isMounted = true // Track if component is still mounted

    const fetchFormAndAudit = async () => {
      if (!isMounted) return
      
      setLoading(true)
      try {
        const { data: formData, error: formError } = await supabase
          .from('form')
          .select('form_schema')
          .eq('id', formId)
          .single()

        if (!isMounted) return // Exit if component unmounted
        
        if (formError || !formData) {
          throw new Error('Failed to load form')
        }

        setSchema(formData.form_schema as FormRecord['form_schema'])

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
            setAuditTitle(auditData.title || '')
            const existingResponses = auditData.audit_data || {}
            const loadedValues = { ...initial, ...existingResponses }
            setValues(loadedValues)
          } else {
            Alert.alert('Error', 'Could not load existing audit data')
            setIsEditing(false)
            setExistingAuditId(null)
          }        } else {
          setValues(initial)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        
        // Don't show error alerts if user is being logged out
        if (user?.id) {
          // Check if it's an authentication error
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          if (errorMessage.includes('auth') || errorMessage.includes('JWT')) {
            // Silent fail for auth errors during logout
            console.log('Authentication error during logout, ignoring...')
          } else {
            Alert.alert('Error', 'Failed to load form')
          }
        }
      } finally {
        setLoading(false)
      }    }

    fetchFormAndAudit()
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false
    }
  }, [formId, auditId, user?.id])

  const handleChange = (fieldId: string, value: any) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }))
    if (errors[fieldId]) {
      setErrors((prev) => ({ ...prev, [fieldId]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!auditTitle.trim()) {
      newErrors['auditTitle'] = 'Audit title is required'
    }

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
      const fieldWeight = field.weight || field.weightage || 1

      if (field.enhancedOptions && userValue) {
        const selectedOption = field.enhancedOptions.find(opt => opt.value === userValue)
        if (selectedOption) {
          totalScore += selectedOption.points * fieldWeight
        }
        const maxPoints = Math.max(...field.enhancedOptions.map(opt => opt.points))
        maxScore += maxPoints * fieldWeight
      } else if (field.type === 'boolean' && userValue !== undefined) {
        const points = userValue === true ? 1 : 0
        totalScore += points * fieldWeight
        maxScore += 1 * fieldWeight
      }
    })

    const passPercentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0
    return { totalScore, maxScore, passPercentage }
  }

  const formatResultForDisplay = (result: string): string => {
    switch (result.toLowerCase()) {
      case 'pass': return 'PASSED'
      case 'failed': return 'FAILED'
      case 'passed': return 'PASSED'
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

      if (autoFailCheck.isFail) {
        finalResult = 'failed'
        finalPercentage = 1
        finalMarks = 0.1
        console.log('Auto-fail detected:', autoFailCheck.reason)
      }

      const finalStatus = finalResult === 'pass' ? 'completed' : 'pending'
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

      let auditData, auditError
      if (isEditing && existingAuditId) {
        console.log('Updating existing audit with last_edit_at timestamp')
        const updateResult = await supabase
          .from('audit')
          .update({
            title: auditTitle.trim(),
            status: finalStatus,
            result: finalResult,
            marks: finalMarks,
            percentage: finalPercentage,
            comments: userComments || '',
            audit_data: values,
            last_edit_at: new Date().toISOString(),
          })
          .eq('id', existingAuditId)
          .eq('user_id', user.id)
          .select()
          .single()

        auditData = updateResult.data
        auditError = updateResult.error
      } else {
        const insertResult = await supabase
          .from('audit')
          .insert({
            form_id: parseInt(formId as string),
            user_id: user.id,
            title: auditTitle.trim(),
            status: finalStatus,
            result: finalResult,
            marks: finalMarks,
            percentage: finalPercentage,
            comments: userComments || null,
            audit_data: values,
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
            text: 'View Audit History',
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
    console.log(`Rendering field: ${field.id}, type: ${field.type}, value:`, value) // Log field data

    switch (field.type) {
      case 'text':
      case 'textarea':
        return (
          <TextInput
            style={[
              styles.input,
              hasError && styles.inputError,
              isViewMode && styles.inputReadOnly
            ]}
            placeholder={field.placeholder || ''}
            value={String(value || '')}
            onChangeText={(text) => handleChange(field.id, text)}
            multiline={field.type === 'textarea'}
            numberOfLines={field.type === 'textarea' ? 4 : 1}
            editable={!isViewMode}
          />
        )

      case 'number':
        return (
          <TextInput
            style={[
              styles.input,
              hasError && styles.inputError,
              isViewMode && styles.inputReadOnly
            ]}
            placeholder={field.placeholder || ''}
            keyboardType="numeric"
            value={String(value || '')}
            onChangeText={(text) => handleChange(field.id, Number(text) || 0)}
            editable={!isViewMode}
          />
        )

      case 'boolean':
        return (
          <View style={styles.booleanContainer}>
            <Pressable
              style={[
                styles.booleanOption,
                value === true && styles.booleanSelected,
                isViewMode && styles.booleanDisabled
              ]}
              onPress={() => !isViewMode && handleChange(field.id, true)}
            >
              <Text style={[
                styles.booleanText,
                value === true && styles.booleanTextSelected,
                isViewMode && styles.booleanTextDisabled
              ]}>
                Yes
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.booleanOption,
                value === false && styles.booleanSelected,
                isViewMode && styles.booleanDisabled
              ]}
              onPress={() => !isViewMode && handleChange(field.id, false)}
            >
              <Text style={[
                styles.booleanText,
                value === false && styles.booleanTextSelected,
                isViewMode && styles.booleanTextDisabled
              ]}>
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
        console.log(`Select field options for ${field.id}:`, options) // Log options

        // Validate options to prevent rendering issues
        const validOptions = options.filter(opt => typeof opt.value === 'string' && opt.value.trim() !== '')
        if (validOptions.length === 0) {
          return <Text style={styles.errorText}>No valid options available for this field</Text>
        }

        return (
          <View style={[
            styles.pickerContainer,
            hasError && styles.inputError,
            isViewMode && styles.inputReadOnly
          ]}>
            <Picker
              selectedValue={value || ''}
              onValueChange={(itemValue) => !isViewMode && handleChange(field.id, String(itemValue))}
              style={styles.picker}
              enabled={!isViewMode}
            >
              {/* Placeholder item without enabled prop to avoid rendering issues */}
              <Picker.Item
                label={field.placeholder || 'Select an option...'}
                value=''
                color='#999'
              />
              {validOptions.map((option, index) => (
                <Picker.Item
                  key={`${field.id}-${option.value}-${index}`}
                  label={option.value}
                  value={option.value}
                  color={option.isFailOption ? '#ef4444' : '#000'}
                />
              ))}
            </Picker>
          </View>
        )

      case 'image':
        return (
          <View style={styles.imageContainer}>
            {value ? (
              <View style={styles.imagePreview}>
                <Image source={{ uri: value }} style={styles.previewImage} />
                <View style={styles.imageOverlay}>
                  <View style={styles.imageInfo}>
                    <MaterialIcons name="check-circle" size={20} color="#10b981" />
                    <Text style={styles.imageUploadedText}>Image uploaded</Text>
                  </View>
                </View>
                <View style={styles.imageActions}>
                  {!isViewMode && (
                    <>
                      <Pressable
                        style={styles.changeImageButton}
                        onPress={() => pickImage(field.id)}
                      >
                        <MaterialIcons name="edit" size={16} color="#3b82f6" />
                        <Text style={styles.changeImageText}>Change</Text>
                      </Pressable>
                      <Pressable
                        style={styles.removeImageButton}
                        onPress={() => handleChange(field.id, '')}
                      >
                        <MaterialIcons name="delete" size={16} color="#ef4444" />
                        <Text style={styles.removeImageText}>Remove</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
            ) : (
              <Pressable
                style={[
                  styles.uploadArea,
                  hasError && styles.uploadAreaError,
                  isViewMode && styles.uploadAreaDisabled
                ]}
                onPress={() => !isViewMode && pickImage(field.id)}
                disabled={uploadingImages[field.id] || isViewMode}
              >
                {uploadingImages[field.id] ? (
                  <View style={styles.uploadingContainer}>
                    <View style={styles.uploadingIcon}>
                      <ActivityIndicator size="small" color="#3b82f6" />
                    </View>
                    <View style={styles.uploadingContent}>
                      <Text style={styles.uploadingText}>Uploading image...</Text>
                      <Text style={styles.uploadingSubtext}>Please wait</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.uploadContent}>
                    <View style={styles.uploadIcon}>
                      <MaterialIcons name="cloud-upload" size={32} color="#9ca3af" />
                    </View>
                    <Text style={styles.uploadTitle}>Upload Image</Text>
                    <Text style={styles.uploadSubtitle}>
                      {field.placeholder || 'Tap to select from camera or gallery'}
                    </Text>
                    <View style={styles.uploadHint}>
                      <Text style={styles.uploadHintText}>PNG, JPG, GIF up to 10MB</Text>
                    </View>
                  </View>
                )}
              </Pressable>
            )}
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
    <Screen style={styles.container}>
      <BackButton
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
          {(isViewMode || isEditing) && (
            <View style={styles.modeIndicator}>
              <Text style={[
                styles.modeText,
                isViewMode ? styles.viewModeTag : styles.editModeTag
              ]}>
                {isViewMode ? 'READ ONLY' : 'EDITING'}
              </Text>
            </View>
          )}
          <Text style={styles.title}>
            {schema.title}
          </Text>
          {schema.description && (
            <Text style={styles.description}>{schema.description}</Text>
          )}
          {isEditing && !isViewMode && (
            <View style={styles.editingNotice}>
              <Text style={styles.editingText}>
                You are editing an existing audit. Make changes and resubmit.
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
        {/* Audit Title Field */}
        <View style={styles.fieldCard}>
          <View style={styles.fieldHeader}>
            <Text style={styles.fieldNumber}>1.</Text>
            <View style={styles.fieldTitleContainer}>
              <Text style={styles.fieldLabel}>
                Audit Title
                <Text style={styles.required}> *</Text>
              </Text>
            </View>
          </View>
          <View style={styles.fieldInputContainer}>
            <TextInput
              style={[
                styles.input,
                errors['auditTitle'] && styles.inputError,
                isViewMode && styles.inputReadOnly
              ]}
              placeholder="Enter audit title..."
              value={auditTitle}
              onChangeText={(text) => {
                setAuditTitle(text)
                if (errors['auditTitle']) {
                  setErrors((prev) => ({ ...prev, auditTitle: '' }))
                }
              }}
              editable={!isViewMode}
            />
            {errors['auditTitle'] && (
              <Text style={styles.errorText}>{errors['auditTitle']}</Text>
            )}
          </View>
        </View>

        {/* Form Fields */}
        {schema.fields.map((field, index) => (
          <View key={field.id} style={styles.fieldCard}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldNumber}>{index + 2}.</Text>
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
            <Text style={styles.fieldNumber}>{schema.fields.length + 2}.</Text>
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
              style={[
                styles.input,
                styles.commentsInput,
                isViewMode && styles.inputReadOnly
              ]}
              placeholder="Add any additional comments or observations..."
              value={userComments}
              onChangeText={setUserComments}
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isViewMode}
            />
          </View>
        </View>
      </ScrollView>

      {!isViewMode && (
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
      )}

      {isViewMode && (
        <Pressable
          style={styles.floatingEditButton}
          onPress={() => {
            setIsViewMode(false)
            Alert.alert(
              'Edit Mode',
              'You can now edit this audit. Make your changes and resubmit when ready.',
              [{ text: 'OK' }]
            )
          }}
        >
          <MaterialIcons name="edit" size={24} color="#ffffff" />
        </Pressable>
      )}
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
    shadowOffset: { width: 0, height: 2 },
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
    shadowOffset: { width: 0, height: 2 },
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
  inputReadOnly: {
    backgroundColor: '#f9fafb',
    color: '#6b7280',
    borderColor: '#e5e7eb',
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
  booleanDisabled: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
  },
  booleanTextDisabled: {
    color: '#9ca3af',
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
    shadowOffset: { width: 0, height: 4 },
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
  imageContainer: {
    marginTop: 8,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 16,
    backgroundColor: '#fafafa',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
  },
  uploadAreaError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  uploadAreaDisabled: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
    opacity: 0.6,
  },
  uploadContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 240,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  uploadingText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
  },
  imagePreview: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  previewImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  imageActions: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    justifyContent: 'center',
  },
  changeImageText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
    marginLeft: 6,
  },
  removeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    justifyContent: 'center',
  },
  removeImageText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
    marginLeft: 6,
  },
  imageOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  imageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageUploadedText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
    marginLeft: 4,
  },
  uploadIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  uploadHint: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  uploadHintText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    fontWeight: '500',
  },
  uploadingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  uploadingContent: {
    flex: 1,
  },
  uploadingSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  modeIndicator: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  viewModeTag: {
    backgroundColor: '#eff6ff',
    color: '#1e40af',
  },
  editModeTag: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  floatingEditButton: {
    position: 'absolute',
    right: 24,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
})