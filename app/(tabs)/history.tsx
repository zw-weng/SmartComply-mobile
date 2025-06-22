import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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
  TextInput,
  View,
} from 'react-native';
import Screen from '../../components/Screen';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/useAuth';

interface AuditRecord {
  id: number;
  form_id: number;
  title: string | null; // Allow null for safety
  status: string;
  result: string;
  marks: number;
  percentage: number;
  comments: string | null; // Allow null for safety
  created_at: string;
  last_edit_at?: string;
  form?: {
    form_schema: {
      title: string;
      description?: string;
    };
  };
  profiles?: {
    full_name: string;
  };
}

const { width } = Dimensions.get('window');

export default function HistoryScreen() {
  const { user, profile } = useAuth();
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<AuditRecord | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'draft'>('all');  const fetchAudits = async () => {
    if (!user?.id || !profile?.tenant_id) {
      console.warn('No user ID or tenant ID found');
      console.warn('User ID:', user?.id);
      console.warn('Profile:', profile);
      console.warn('Tenant ID:', profile?.tenant_id);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    console.log('Fetching audits for user:', user.id, 'tenant:', profile.tenant_id);    try {
      // First, let's check if there are any audits for this user without tenant filter (for debugging)
      const { data: debugAudits, error: debugError } = await supabase
        .from('audit')
        .select('id, user_id, tenant_id, title, status')
        .eq('user_id', user.id);
      
      console.log('Debug - All audits for user (no tenant filter):', debugAudits);
      console.log('Debug - Error:', debugError);

      // Fetch audits with form information, filtered by user and tenant
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
        .order('created_at', { ascending: false });      if (auditsError) throw auditsError;

      console.log('Audits data with tenant filter:', auditsData);

      // If no audits found with tenant filter, try without tenant filter as fallback
      // This handles the case where existing audits don't have tenant_id yet
      let finalAuditsData = auditsData;
      if (!auditsData || auditsData.length === 0) {
        console.log('No audits found with tenant filter, trying without tenant filter...');
        const { data: fallbackAudits, error: fallbackError } = await supabase
          .from('audit')
          .select(`
            *,
            form:form_id (
              form_schema
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (!fallbackError && fallbackAudits) {
          console.log('Found audits without tenant filter:', fallbackAudits);
          finalAuditsData = fallbackAudits;
        }
      }

      console.log('Final audits data:', finalAuditsData);

      if (!finalAuditsData || finalAuditsData.length === 0) {
        setAudits([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }      // Get unique user IDs from audits to fetch profiles
      const userIds = [...new Set(finalAuditsData.map((audit) => audit.user_id))];
      console.log('Fetching profiles for user IDs:', userIds);

      // Fetch profiles for all users who have audits
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      console.log('Profiles query result:', { profilesData, profilesError });

      // Fallback user name if profiles fetch fails
      let fallbackUserName = 'Unknown User';
      if (profilesError && user) {
        fallbackUserName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          'Current User';
        console.log('Using fallback user name:', fallbackUserName);
      }

      if (profilesError) {
        console.warn('Warning: Could not fetch profiles:', profilesError);
      }      // Validate and merge audit data with profile data
      const auditsWithProfiles = finalAuditsData.map((audit) => {
        // Ensure critical fields are strings
        const validatedAudit = {
          ...audit,
          title: audit.title ?? 'Untitled Audit',
          status: audit.status ?? 'Unknown',
          result: audit.result ?? 'Unknown',
          comments: audit.comments ?? null,
          form: audit.form ?? { form_schema: { title: 'Unknown Form' } },
        };

        if (!audit.result || typeof audit.result !== 'string') {
          console.warn('Invalid audit result:', audit.result);
        }
        if (!audit.status || typeof audit.status !== 'string') {
          console.warn('Invalid audit status:', audit.status);
        }

        return {
          ...validatedAudit,
          profiles: profilesData?.find((profile) => profile.user_id === audit.user_id) || {
            full_name: profilesError ? fallbackUserName : 'Unknown User',
          },
        };
      });

      console.log('Final merged audits:', auditsWithProfiles.length, 'audits');
      setAudits(auditsWithProfiles);
    } catch (error) {
      console.error('Error fetching audits:', error);
      Alert.alert('Error', 'Failed to load audit history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  useEffect(() => {
    if (user?.id && profile?.tenant_id) {
      fetchAudits();
    }
  }, [user?.id, profile?.tenant_id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAudits();
  }, []);
  const getResultColor = (result: string) => {
    switch (result.toLowerCase()) {
      case 'pass':
      case 'passed':
        return '#10b981';
      case 'fail':
      case 'failed':
        return '#ef4444';
      case 'draft':
        return '#8b5cf6';
      default:
        return '#6b7280';
    }
  };

  const getResultBackgroundColor = (result: string) => {
    switch (result.toLowerCase()) {
      case 'pass':
      case 'passed':
        return '#d1fae5';
      case 'fail':
      case 'failed':
        return '#fee2e2';
      case 'draft':
        return '#ede9fe';
      default:
        return '#f3f4f6';
    }
  };
  const getResultIcon = (result: string) => {
    switch (result.toLowerCase()) {
      case 'pass':
      case 'passed':
        return 'check-circle';
      case 'fail':
      case 'failed':
        return 'cancel';
      case 'draft':
        return 'edit';
      default:
        return 'help';
    }
  };
  const getStatusColor = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    if (normalizedStatus.includes('completed') || normalizedStatus.includes('done')) {
      return '#10b981';
    } else if (normalizedStatus.includes('in_progress') || normalizedStatus.includes('progress')) {
      return '#f59e0b';
    } else if (normalizedStatus.includes('pending')) {
      return '#3b82f6';
    } else if (normalizedStatus.includes('draft')) {
      return '#8b5cf6';
    } else if (normalizedStatus.includes('failed') || normalizedStatus.includes('error')) {
      return '#ef4444';
    }
    return '#6b7280';
  };

  const getStatusBackgroundColor = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    if (normalizedStatus.includes('completed') || normalizedStatus.includes('done')) {
      return '#d1fae5';
    } else if (normalizedStatus.includes('in_progress') || normalizedStatus.includes('progress')) {
      return '#fef3c7';
    } else if (normalizedStatus.includes('pending')) {
      return '#dbeafe';
    } else if (normalizedStatus.includes('draft')) {
      return '#ede9fe';
    } else if (normalizedStatus.includes('failed') || normalizedStatus.includes('error')) {
      return '#fee2e2';
    }
    return '#f3f4f6';
  };

  const getScoreGradient = (percentage: number) => {
    if (percentage >= 80) return ['#10b981', '#059669']; // Green
    if (percentage >= 60) return ['#f59e0b', '#d97706']; // Orange
    return ['#ef4444', '#dc2626']; // Red
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const generateAuditReference = (auditId: number) => {
    return `AR-${auditId.toString().padStart(4, '0')}`;
  };

  const getLastActivityDate = (audit: AuditRecord) => {
    return audit.last_edit_at || audit.created_at;
  };

  const getEditStatus = (audit: AuditRecord) => {
    if (audit.last_edit_at && audit.last_edit_at !== audit.created_at) {
      return {
        isEdited: true,
        editedBy: audit.profiles?.full_name || 'Unknown User',
        editDate: formatDate(audit.last_edit_at),
      };
    }
    return { isEdited: false };
  };

  const handleAuditPress = (audit: AuditRecord) => {
    console.log('Selected audit:', audit); // Log selected audit
    setSelectedAudit(audit);
    setShowOptionsModal(true);
  };
  const handleViewDetails = () => {
    if (selectedAudit) {
      setShowOptionsModal(false);
      // If it's a draft, open in edit mode by default
      const mode = selectedAudit.status === 'draft' ? 'edit' : 'view';
      router.push(`/audit/form/${selectedAudit.form_id}?auditId=${selectedAudit.id}&mode=${mode}`);
    }
  };

  const handleEditDraft = () => {
    if (selectedAudit) {
      setShowOptionsModal(false);
      router.push(`/audit/form/${selectedAudit.form_id}?auditId=${selectedAudit.id}&mode=edit`);
    }
  };

  const handleCloseModal = () => {
    setShowOptionsModal(false);
    setSelectedAudit(null);
  };

  const showAuditDetails = (audit: AuditRecord) => {
    const lastActivityDate = getLastActivityDate(audit);
    const timeInfo = audit.last_edit_at
      ? `\nLast Edit: ${formatFullDate(lastActivityDate)}\nOriginal Creation: ${formatFullDate(audit.created_at)}`
      : `\nCreated: ${formatFullDate(audit.created_at)}`;    Alert.alert(
      'Audit Details',
      `Title: ${audit.title || 'Untitled Audit'}\nForm: ${audit.form?.form_schema?.title || 'Unknown Form'}\nAuditor: ${
        audit.profiles?.full_name || 'Unknown User'
      }${audit.result ? `\nResult: ${audit.result.toUpperCase()}` : ''}${audit.marks !== null && audit.percentage !== null ? `\nScore: ${audit.marks} (${audit.percentage.toFixed(1)}%)` : '\nScore: Draft (not calculated)'}\nStatus: ${
        audit.status.toUpperCase()
      }${timeInfo}${audit.comments ? `\nComments: ${audit.comments}` : ''}`,
      [{ text: 'Close', style: 'cancel' }],
    );
  };
  const renderAuditItem = ({ item }: { item: AuditRecord }) => {
    console.log('Rendering audit item:', item); // Log to inspect item
    const editStatus = getEditStatus(item);
    const resultColor = getResultColor(item.result || 'draft');
    const resultBgColor = getResultBackgroundColor(item.result || 'draft');
    const auditRef = generateAuditReference(item.id);

    // Type checks for safety
    if (item.result !== null && typeof item.result !== 'string') {
      console.warn('item.result is not a string:', item.result);
    }
    if (typeof item.status !== 'string') {
      console.warn('item.status is not a string:', item.status);
    }

    return (
      <Pressable style={styles.auditCard} onPress={() => handleAuditPress(item)}>
        {/* Audit Reference Header */}
        <View style={styles.auditRefHeader}>
          <View style={styles.refLeftSection}>
            <Text style={styles.auditRefNumber}>{auditRef}</Text>
          </View>

          <View style={styles.badgesContainer}>
            <View style={[styles.resultBadge, { backgroundColor: resultBgColor }]}>
              <MaterialIcons name={getResultIcon(item.result || 'draft') as any} size={18} color={resultColor} />
              <Text style={[styles.resultText, { color: resultColor }]}>
                {item.result ? item.result.toUpperCase() : 'DRAFT'}
              </Text>
            </View>
            <View style={[styles.resultBadge, { backgroundColor: getStatusBackgroundColor(item.status) }]}>
              <Text style={[styles.resultText, { color: getStatusColor(item.status) }]}>
                {item.status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </Text>
            </View>
          </View>
        </View>

        {/* Audit Information */}
        <View style={styles.cardHeader}>
          <View style={styles.formInfo}>
            <Text style={styles.formTitle} numberOfLines={2}>
              {item.title ?? 'Untitled Audit'}
            </Text>
            <Text style={styles.formDescription} numberOfLines={1}>
              Form: {item.form?.form_schema?.title ?? 'Unknown Form'}
            </Text>
          </View>
        </View>        {/* Score section with visual progress */}
        <View style={styles.scoreSection}>
          <View style={styles.scoreDetails}>
            <Text style={styles.scoreCardLabel}>Score</Text>
            <Text style={styles.scoreValue}>
              {item.percentage !== null && item.marks !== null 
                ? `${item.marks} (${item.percentage.toFixed(1)}%)` 
                : 'Draft'}
            </Text>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { 
                  width: item.percentage !== null ? `${Math.min(item.percentage, 100)}%` : '0%', 
                  backgroundColor: resultColor 
                }]}
              />
            </View>
            <Text style={[styles.percentageText, { color: resultColor }]}>
              {item.percentage !== null ? `${item.percentage.toFixed(0)}%` : 'N/A'}
            </Text>
          </View>
        </View>

        {/* Enhanced Footer with more details */}
        <View style={styles.cardFooter}>
          <View style={styles.footerContent}>
            {/* Auditor Information */}
            <View style={styles.auditorSection}>
              <MaterialIcons name="person" size={16} color="#3b82f6" />
              <Text style={styles.auditorText}>{item.profiles?.full_name ?? 'Unknown User'}</Text>
            </View>

            {/* Enhanced Timestamp */}
            <View style={styles.timestampSection}>
              <MaterialIcons name="schedule" size={14} color="#9ca3af" />
              <View style={styles.timestampDetails}>
                <Text style={styles.timestampText}>{formatDate(getLastActivityDate(item))}</Text>
                <Text style={styles.fullTimestampText}>{formatFullDate(getLastActivityDate(item))}</Text>
              </View>
            </View>

            {/* Creation Information - show only if audit was edited */}
            {editStatus.isEdited && (
              <View style={styles.editSection}>
                <MaterialIcons name="add" size={14} color="#6b7280" />
                <Text style={[styles.editText, { color: '#6b7280' }]}>
                  Originally created {formatDate(item.created_at)}
                </Text>
              </View>
            )}
          </View>

          <MaterialIcons name="chevron-right" size={20} color="#d1d5db" />
        </View>
      </Pressable>
    );
  };

  // Filter audits based on search query and status filter
  const getFilteredAudits = () => {
    let filtered = audits;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((audit) => {
        const auditTitle = audit.title?.toLowerCase() ?? '';
        const formTitle = audit.form?.form_schema?.title?.toLowerCase() ?? '';
        return auditTitle.includes(query) || formTitle.includes(query);
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {      filtered = filtered.filter((audit) => {
        const status = audit.status.toLowerCase();
        if (statusFilter === 'pending') {
          return status.includes('pending') || status.includes('in_progress');
        } else if (statusFilter === 'completed') {
          return status.includes('completed') || status.includes('done');
        } else if (statusFilter === 'draft') {
          return status.includes('draft');
        }
        return true;
      });
    }

    console.log('Filtered audits:', filtered); // Log to inspect filtered data
    return filtered;
  };

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
    );
  }

  return (
    <Screen style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Audit History</Text>
        <Text style={styles.subtitle}>
          {getFilteredAudits().length} of {audits.length} audit{audits.length !== 1 ? 's' : ''}
        </Text>

        {/* Search and Filter Section */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <MaterialIcons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by audit title or form type..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <MaterialIcons name="clear" size={18} color="#9ca3af" />
              </Pressable>
            )}
          </View>

          <View style={styles.filterContainer}>
            <Pressable
              style={[styles.filterButton, statusFilter === 'all' && styles.filterButtonActive]}
              onPress={() => setStatusFilter('all')}
            >
              <Text style={[styles.filterText, statusFilter === 'all' && styles.filterTextActive]}>All</Text>
            </Pressable>            <Pressable
              style={[styles.filterButton, statusFilter === 'pending' && styles.filterButtonActive]}
              onPress={() => setStatusFilter('pending')}
            >
              <Text style={[styles.filterText, statusFilter === 'pending' && styles.filterTextActive]}>Pending</Text>
            </Pressable>

            <Pressable
              style={[styles.filterButton, statusFilter === 'completed' && styles.filterButtonActive]}
              onPress={() => setStatusFilter('completed')}
            >
              <Text style={[styles.filterText, statusFilter === 'completed' && styles.filterTextActive]}>Completed</Text>
            </Pressable>

            <Pressable
              style={[styles.filterButton, statusFilter === 'draft' && styles.filterButtonActive]}
              onPress={() => setStatusFilter('draft')}
            >
              <Text style={[styles.filterText, statusFilter === 'draft' && styles.filterTextActive]}>Draft</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {audits.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="assignment" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No Audits Yet</Text>
          <Text style={styles.emptyText}>Complete your first audit to see it here</Text>
          <Pressable style={styles.auditButton} onPress={() => router.push('/audit')}>
            <Text style={styles.auditButtonText}>Start Audit</Text>
          </Pressable>
        </View>
      ) : getFilteredAudits().length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="filter-list-off" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No Results Found</Text>
          <Text style={styles.emptyText}>Try adjusting your search or filter criteria</Text>
          <Pressable
            style={styles.auditButton}
            onPress={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
          >
            <Text style={styles.auditButtonText}>Clear Filters</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={getFilteredAudits()}
          renderItem={renderAuditItem}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Custom Options Modal */}
      <Modal animationType="fade" transparent={true} visible={showOptionsModal} onRequestClose={handleCloseModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedAudit && (
              <>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{generateAuditReference(selectedAudit.id)}</Text>
                  <Pressable onPress={handleCloseModal} style={styles.closeButton}>
                    <MaterialIcons name="close" size={24} color="#6b7280" />
                  </Pressable>
                </View>

                {/* Main Content */}
                <View style={styles.modalContent}>
                  {/* Title and Status Row */}
                  <View style={styles.titleStatusRow}>
                    <View style={styles.titleContainer}>
                      <Text style={styles.auditTitle} numberOfLines={2}>
                        {selectedAudit.title ?? 'Untitled Audit'}
                      </Text>
                      <Text style={styles.formName}>
                        {selectedAudit.form?.form_schema?.title ?? 'Unknown Form'}
                      </Text>
                    </View>                    <View style={styles.statusGroup}>
                      {/* Result Badge */}
                      <View
                        style={[styles.statusChip, { backgroundColor: getResultBackgroundColor(selectedAudit.result || 'draft') }]}
                      >
                        <MaterialIcons
                          name={getResultIcon(selectedAudit.result || 'draft') as any}
                          size={16}
                          color={getResultColor(selectedAudit.result || 'draft')}
                        />
                        <Text style={[styles.statusText, { color: getResultColor(selectedAudit.result || 'draft') }]}>
                          {selectedAudit.result ? selectedAudit.result.toUpperCase() : 'DRAFT'}
                        </Text>
                      </View>

                      {/* Status Badge */}
                      <View
                        style={[styles.statusChip, { backgroundColor: getStatusBackgroundColor(selectedAudit.status) }]}
                      >
                        <Text style={[styles.statusText, { color: getStatusColor(selectedAudit.status) }]}>
                          {selectedAudit.status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        </Text>
                      </View>
                    </View>
                  </View>                  {/* Score Section */}
                  <View style={styles.scoreCard}>
                    <View style={styles.scoreInfo}>
                      <Text style={styles.scoreNumber}>
                        {selectedAudit.marks !== null ? selectedAudit.marks : '--'}
                      </Text>
                      <Text style={styles.scorePercentage}>
                        {selectedAudit.percentage !== null ? `${selectedAudit.percentage.toFixed(1)}%` : 'Draft'}
                      </Text>
                    </View>
                    <Text style={styles.scoreLabel}>Score</Text>
                  </View>

                  {/* Quick Details */}
                  <View style={styles.quickDetails}>
                    <View style={styles.detailItem}>
                      <MaterialIcons name="person" size={16} color="#6b7280" />
                      <Text style={styles.detailText}>{selectedAudit.profiles?.full_name ?? 'Unknown User'}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <MaterialIcons name="schedule" size={16} color="#6b7280" />
                      <Text style={styles.detailText}>{formatDate(getLastActivityDate(selectedAudit))}</Text>
                    </View>
                  </View>

                  {/* Comments Section (Conditional) */}
                  {selectedAudit.comments && (
                    <View style={styles.commentsSection}>
                      <View style={styles.commentsHeader}>
                        <MaterialIcons name="comment" size={16} color="#6b7280" />
                        <Text style={styles.commentsTitle}>Comments</Text>
                      </View>
                      <Text style={styles.commentsText}>{selectedAudit.comments}</Text>
                    </View>
                  )}
                </View>                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  {selectedAudit.status === 'draft' ? (
                    <>
                      <Pressable style={[styles.actionButton, styles.editButton]} onPress={handleEditDraft}>
                        <MaterialIcons name="edit" size={20} color="#ffffff" />
                        <Text style={[styles.actionButtonText, styles.editButtonText]}>Continue</Text>
                      </Pressable>
                      <Pressable style={[styles.actionButton, styles.viewButton]} onPress={handleViewDetails}>
                        <MaterialIcons name="visibility" size={20} color="#ffffff" />
                        <Text style={[styles.actionButtonText, styles.viewButtonText]}>View Draft</Text>
                      </Pressable>
                    </>
                  ) : (
                    <Pressable style={[styles.actionButton, styles.viewButton]} onPress={handleViewDetails}>
                      <MaterialIcons name="visibility" size={20} color="#ffffff" />
                      <Text style={[styles.actionButtonText, styles.viewButtonText]}>View Audit</Text>
                    </Pressable>
                  )}
                </View>

                {/* Cancel Button */}
                <Pressable style={styles.cancelButton} onPress={handleCloseModal}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
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
  },
  editText: {
    fontSize: 12,
    color: '#d97706',
    fontWeight: '500',
  },
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
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  closeButton: {
    padding: 4,
    borderRadius: 8,
  },
  modalContent: {
    padding: 24,
  },
  titleStatusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 16,
  },
  titleContainer: {
    flex: 1,
  },
  statusGroup: {
    alignItems: 'flex-end',
    gap: 8,
  },
  auditTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
    lineHeight: 24,
  },
  formName: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  scoreCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  scoreInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 4,
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1e293b',
  },
  scorePercentage: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
  },
  scoreCardLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  quickDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  detailText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    flex: 1,
  },
  commentsSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  commentsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  commentsText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },  actionButtons: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },  viewButton: {
    backgroundColor: '#3b82f6',
  },
  editButton: {
    backgroundColor: '#8b5cf6',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  viewButtonText: {
    color: '#ffffff',
  },
  editButtonText: {
    color: '#ffffff',
  },
  cancelButton: {
    marginHorizontal: 24,
    marginBottom: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748b',
  },
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
  badgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  auditRefNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: 0.5,
  },
  timestampDetails: {
    flex: 1,
  },
  fullTimestampText: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 1,
  },
  searchContainer: {
    marginTop: 16,
    gap: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  filterTextActive: {
    color: '#ffffff',
  },
});