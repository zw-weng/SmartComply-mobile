import { MaterialIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import React, { useCallback, useEffect, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native'
import Screen from '../../components/Screen'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/useAuth'

interface AuditRecord {
  id: number
  form_id: number
  status: string
  result: string
  marks: number
  percentage: number
  comments: string
  created_at: string
  last_edit_at?: string
  form?: {
    form_schema: {
      title: string
      description?: string
    }
  }
  profiles?: {
    full_name: string
  }
}

const { width } = Dimensions.get('window')

export default function HistoryScreen() {
  const { user } = useAuth()
  const [audits, setAudits] = useState<AuditRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedAudit, setSelectedAudit] = useState<AuditRecord | null>(null)
  const [showOptionsModal, setShowOptionsModal] = useState(false)
    const fetchAudits = async () => {
    if (!user?.id) return

    try {
      // First, fetch audits with form information
      const { data: auditsData, error: auditsError } = await supabase
        .from('audit')
        .select(`
          *,
          form:form_id (
            form_schema
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (auditsError) throw auditsError
      
      if (!auditsData || auditsData.length === 0) {
        setAudits([])
        return
      }      // Get unique user IDs from audits to fetch profiles
      const userIds = [...new Set(auditsData.map(audit => audit.user_id))]
      console.log('Fetching profiles for user IDs:', userIds)
      
      // Fetch profiles for all users who have audits
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds)

      console.log('Profiles query result:', { profilesData, profilesError })

      // If profiles query fails, try to get current user info as fallback
      let fallbackUserName = 'Unknown User'
      if (profilesError && user) {
        // Try to get user info from auth metadata
        fallbackUserName = user.user_metadata?.full_name || 
                          user.user_metadata?.name || 
                          user.email?.split('@')[0] || 
                          'Current User'
        console.log('Using fallback user name:', fallbackUserName)
      }

      if (profilesError) {
        console.warn('Warning: Could not fetch profiles:', profilesError)
        // Continue without profile data, use fallback
      }      // Merge audit data with profile data
      const auditsWithProfiles = auditsData.map(audit => ({
        ...audit,
        profiles: profilesData?.find(profile => profile.user_id === audit.user_id) || { 
          full_name: profilesError ? fallbackUserName : 'Unknown User' 
        }
      }))
      
      console.log('Final merged audits:', auditsWithProfiles.length, 'audits with profiles')
      setAudits(auditsWithProfiles)
    } catch (error) {
      console.error('Error fetching audits:', error)
      Alert.alert('Error', 'Failed to load audit history')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAudits()
  }, [user?.id])
  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchAudits()
  }, [])
  const getResultColor = (result: string) => {
    switch (result.toLowerCase()) {
      case 'pass':
      case 'passed': return '#10b981'
      case 'fail':
      case 'failed': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const getResultBackgroundColor = (result: string) => {
    switch (result.toLowerCase()) {
      case 'pass':
      case 'passed': return '#d1fae5'
      case 'fail':
      case 'failed': return '#fee2e2'
      default: return '#f3f4f6'
    }
  }

  const getResultIcon = (result: string) => {
    switch (result.toLowerCase()) {
      case 'pass':
      case 'passed': return 'check-circle'
      case 'fail':
      case 'failed': return 'cancel'
      default: return 'help'
    }
  }

  const getScoreGradient = (percentage: number) => {
    if (percentage >= 80) return ['#10b981', '#059669'] // Green
    if (percentage >= 60) return ['#f59e0b', '#d97706'] // Orange
    return ['#ef4444', '#dc2626'] // Red
  }
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 30) return `${diffDays}d ago`
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }
  
  const generateAuditReference = (auditId: number) => {
    return `AR-${auditId.toString().padStart(4, '0')}`
  }
  const getLastActivityDate = (audit: AuditRecord) => {
    // Always return last_edit_at if it exists, otherwise return created_at
    return audit.last_edit_at || audit.created_at
  }
  
  const getEditStatus = (audit: AuditRecord) => {
    if (audit.last_edit_at && audit.last_edit_at !== audit.created_at) {
      return {
        isEdited: true,
        editedBy: audit.profiles?.full_name || 'Unknown User',
        editDate: formatDate(audit.last_edit_at)
      }
    }
    return { isEdited: false }
  }
  
  const handleAuditPress = (audit: AuditRecord) => {
    setSelectedAudit(audit)
    setShowOptionsModal(true)
  }

  const handleEditAudit = () => {
    if (selectedAudit) {
      setShowOptionsModal(false)
      router.push(`/audit/form/${selectedAudit.form_id}?auditId=${selectedAudit.id}`)
    }
  }

  const handleViewDetails = () => {
    if (selectedAudit) {
      setShowOptionsModal(false)
      showAuditDetails(selectedAudit)
    }
  }
  const handleCloseModal = () => {
    setShowOptionsModal(false)
    setSelectedAudit(null)
  }
  
  const showAuditDetails = (audit: AuditRecord) => {
    const lastActivityDate = getLastActivityDate(audit)
    const timeInfo = audit.last_edit_at 
      ? `\nLast Edit: ${formatFullDate(lastActivityDate)}\nOriginal Creation: ${formatFullDate(audit.created_at)}`
      : `\nCreated: ${formatFullDate(audit.created_at)}`
    
    Alert.alert(
      'Audit Details',
      `Form: ${audit.form?.form_schema?.title || 'Unknown Form'}\nAuditor: ${audit.profiles?.full_name || 'Unknown User'}\nResult: ${audit.result.toUpperCase()}\nScore: ${audit.marks} (${audit.percentage.toFixed(1)}%)\nStatus: ${audit.status.toUpperCase()}${timeInfo}${audit.comments ? `\nComments: ${audit.comments}` : ''}`,
      [{ text: 'Close', style: 'cancel' }]
    )
  }
  
  const renderAuditItem = ({ item }: { item: AuditRecord }) => {
    const editStatus = getEditStatus(item)
    const resultColor = getResultColor(item.result)
    const resultBgColor = getResultBackgroundColor(item.result)
    const auditRef = generateAuditReference(item.id)
    
    return (
      <Pressable 
        style={styles.auditCard}
        onPress={() => handleAuditPress(item)}
      >
        {/* Audit Reference Header */}        <View style={styles.auditRefHeader}>
          <View style={styles.refLeftSection}>
            <Text style={styles.auditRefNumber}>{auditRef}</Text>
          </View>
          <View style={[styles.resultBadge, { backgroundColor: resultBgColor }]}>
            <MaterialIcons 
              name={getResultIcon(item.result) as any}
              size={18}
              color={resultColor}
            />
            <Text style={[styles.resultText, { color: resultColor }]}>
              {item.result.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Form Information */}
        <View style={styles.cardHeader}>
          <View style={styles.formInfo}>
            <Text style={styles.formTitle} numberOfLines={2}>
              {item.form?.form_schema?.title || 'Unknown Form'}
            </Text>
            {item.form?.form_schema?.description && (
              <Text style={styles.formDescription} numberOfLines={1}>
                {item.form.form_schema.description}
              </Text>
            )}
          </View>
        </View>

        {/* Score section with visual progress */}
        <View style={styles.scoreSection}>
          <View style={styles.scoreDetails}>
            <Text style={styles.scoreLabel}>Score</Text>
            <Text style={styles.scoreValue}>
              {item.marks} ({item.percentage.toFixed(1)}%)
            </Text>
          </View>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${Math.min(item.percentage, 100)}%`,
                    backgroundColor: resultColor 
                  }
                ]} 
              />
            </View>
            <Text style={[styles.percentageText, { color: resultColor }]}>
              {item.percentage.toFixed(0)}%
            </Text>
          </View>
        </View>

        {/* Comments section */}
        {item.comments && (
          <View style={styles.commentsSection}>
            <MaterialIcons name="comment" size={16} color="#6b7280" />
            <Text style={styles.commentsText} numberOfLines={2}>
              {item.comments}
            </Text>
          </View>
        )}

        {/* Enhanced Footer with more details */}
        <View style={styles.cardFooter}>
          <View style={styles.footerContent}>
            {/* Auditor Information */}
            <View style={styles.auditorSection}>
              <MaterialIcons name="person" size={16} color="#3b82f6" />
              <Text style={styles.auditorText}>
                {item.profiles?.full_name || 'Unknown User'}
              </Text>
            </View>
              {/* Enhanced Timestamp */}
            <View style={styles.timestampSection}>
              <MaterialIcons name="schedule" size={14} color="#9ca3af" />
              <View style={styles.timestampDetails}>
                <Text style={styles.timestampText}>
                  {formatDate(getLastActivityDate(item))}
                </Text>
                <Text style={styles.fullTimestampText}>
                  {formatFullDate(getLastActivityDate(item))}
                </Text>
              </View>
            </View>
              {/* Creation Information - show only if audit was edited */}
            {editStatus.isEdited && (
              <View style={styles.editSection}>
                <MaterialIcons name="add" size={14} color="#6b7280" />                <Text style={[styles.editText, { color: '#6b7280' }]}>
                  Originally created {formatDate(item.created_at)}
                </Text>
              </View>
            )}
          </View>
          
          <MaterialIcons name="chevron-right" size={20} color="#d1d5db" />
        </View>
      </Pressable>
    )
  }

  if (loading) {
    return (
      <Screen style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Audit History</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading audits...</Text>
        </View>
      </Screen>
    )
  }
  return (
    <Screen style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Audit History</Text>
        <Text style={styles.subtitle}>
          {audits.length} audit{audits.length !== 1 ? 's' : ''} completed
        </Text>
        
        {/* Summary Stats */}
        {audits.length > 0 && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {audits.filter(a => a.result.toLowerCase().includes('pass')).length}
              </Text>
              <Text style={[styles.statLabel, { color: '#10b981' }]}>Passed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {audits.filter(a => a.result.toLowerCase().includes('fail')).length}
              </Text>
              <Text style={[styles.statLabel, { color: '#ef4444' }]}>Failed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {audits.length > 0 ? 
                  Math.round(audits.reduce((sum, a) => sum + a.percentage, 0) / audits.length) : 0}%
              </Text>
              <Text style={styles.statLabel}>Avg Score</Text>
            </View>
          </View>
        )}
      </View>

      {audits.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="assignment" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No Audits Yet</Text>
          <Text style={styles.emptyText}>
            Complete your first audit to see it here
          </Text>
          <Pressable 
            style={styles.auditButton}
            onPress={() => router.push('/audit')}
          >
            <Text style={styles.auditButtonText}>Start Audit</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={audits}
          renderItem={renderAuditItem}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}        />
      )}

      {/* Custom Options Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showOptionsModal}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedAudit && (
              <>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderContent}>
                    <MaterialIcons 
                      name="assignment" 
                      size={24} 
                      color="#3b82f6" 
                    />
                    <Text style={styles.modalTitle}>Audit Options</Text>
                  </View>
                  <Pressable 
                    onPress={handleCloseModal}
                    style={styles.closeButton}
                  >
                    <MaterialIcons name="close" size={24} color="#6b7280" />
                  </Pressable>
                </View>                {/* Audit Summary */}
                <View style={styles.auditSummary}>
                  {/* Audit Reference */}                  <View style={styles.summaryRow}>
                    <Text style={styles.auditRefNumber}>
                      {generateAuditReference(selectedAudit.id)}
                    </Text>
                  </View>
                  
                  <Text style={styles.summaryTitle}>
                    {selectedAudit.form?.form_schema?.title || 'Unknown Form'}
                  </Text>
                    <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                      <MaterialIcons name="person" size={16} color="#6b7280" />
                      <Text style={styles.summaryText}>
                        {selectedAudit.profiles?.full_name || 'Unknown User'}
                      </Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <MaterialIcons name="schedule" size={16} color="#6b7280" />                      <Text style={styles.summaryText}>
                        {selectedAudit.last_edit_at 
                          ? `Last Edit: ${formatFullDate(selectedAudit.last_edit_at)}`
                          : `Created: ${formatFullDate(selectedAudit.created_at)}`
                        }
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.scoreRow}>
                    <View style={[
                      styles.resultChip, 
                      { backgroundColor: getResultBackgroundColor(selectedAudit.result) }
                    ]}>
                      <MaterialIcons 
                        name={getResultIcon(selectedAudit.result) as any}
                        size={16}
                        color={getResultColor(selectedAudit.result)}
                      />
                      <Text style={[
                        styles.resultChipText, 
                        { color: getResultColor(selectedAudit.result) }
                      ]}>
                        {selectedAudit.result.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.scoreText}>
                      {selectedAudit.marks} ({selectedAudit.percentage.toFixed(1)}%)
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <Pressable 
                    style={[styles.actionButton, styles.viewButton]}
                    onPress={handleViewDetails}
                  >
                    <MaterialIcons name="visibility" size={20} color="#3b82f6" />
                    <Text style={[styles.actionButtonText, styles.viewButtonText]}>
                      View Details
                    </Text>
                  </Pressable>

                  <Pressable 
                    style={[styles.actionButton, styles.editButton]}
                    onPress={handleEditAudit}
                  >
                    <MaterialIcons name="edit" size={20} color="#ffffff" />
                    <Text style={[styles.actionButtonText, styles.editButtonText]}>
                      Edit
                    </Text>
                  </Pressable>
                </View>

                {/* Cancel Button */}
                <Pressable 
                  style={styles.cancelButton}
                  onPress={handleCloseModal}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 20,
  },
  
  // Stats section
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
  },
  
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  statDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 16,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  auditButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  auditButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  
  // New colorful audit card design
  auditCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 16,
  },
  
  formInfo: {
    flex: 1,
    marginRight: 16,
  },
  
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
    lineHeight: 22,
  },
  
  formDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 18,
  },
  
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    justifyContent: 'center',
  },
  
  resultText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  
  scoreSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  
  scoreDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  
  scoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  
  scoreValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  
  percentageText: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'right',
  },
  
  commentsSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  
  commentsText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    fontStyle: 'italic',
  },
    cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
  },
  
  footerContent: {
    flex: 1,
    gap: 8,
  },
  
  auditorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  
  auditorText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '600',
  },
  
  timestampSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  
  timestampText: {
    fontSize: 12,
    color: '#64748b',
  },
  
  editSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },    editText: {
    fontSize: 12,
    color: '#d97706',
    fontWeight: '500',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },

  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },

  closeButton: {
    padding: 4,
    borderRadius: 8,
  },

  auditSummary: {
    padding: 20,
    gap: 16,
  },

  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },

  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },

  summaryText: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
  },

  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },

  resultChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },

  resultChipText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  scoreText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },

  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },

  viewButton: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },

  editButton: {
    backgroundColor: '#3b82f6',
  },

  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  viewButtonText: {
    color: '#3b82f6',
  },

  editButtonText: {
    color: '#ffffff',
  },

  cancelButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748b',
  },

  // Enhanced audit identification styles
  auditRefHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },

  refLeftSection: {
    flex: 1,
  },

  auditRefNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: 0.5,
  },

  instanceInfo: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },

  timestampDetails: {
    flex: 1,
  },

  fullTimestampText: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 1,
  },
})
