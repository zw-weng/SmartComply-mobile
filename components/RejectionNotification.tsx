import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/useAuth';

interface RejectedAudit {
  id: string;
  title: string;
  verification_status: string;
  verified_by: string;
  verified_at: string;
  corrective_action: string;
  verifier_name?: string;
  form_title?: string;
}

const RejectionNotification = () => {
  const { user, profile } = useAuth();
  const [rejectedAudits, setRejectedAudits] = useState<RejectedAudit[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const fetchRejectedAudits = async () => {
    if (!user?.id || !profile?.tenant_id) return;

    setLoading(true);
    try {
      // Get all rejected audits (no acknowledgment filtering)
      const { data: audits, error: auditsError } = await supabase
        .from('audit')
        .select(`
          id,
          title,
          verification_status,
          verified_by,
          verified_at,
          corrective_action,
          form:form_id (
            form_schema
          )
        `)
        .eq('user_id', user.id)
        .eq('tenant_id', profile.tenant_id)
        .eq('verification_status', 'rejected')
        .order('verified_at', { ascending: false });

      if (auditsError) {
        console.error('Error fetching rejected audits:', auditsError);
        return;
      }

      if (!audits || audits.length === 0) {
        setRejectedAudits([]);
        return;
      }

      // Get verifier names for the rejected audits
      const verifierIds = audits.map(audit => audit.verified_by).filter(Boolean);
      let verifierNames: { [key: string]: string } = {};

      if (verifierIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profile')
          .select('id, first_name, last_name')
          .in('id', verifierIds);

        if (!profilesError && profiles) {
          verifierNames = profiles.reduce((acc, profile) => {
            acc[profile.id] = `${profile.first_name} ${profile.last_name}`.trim() || 'Unknown';
            return acc;
          }, {} as { [key: string]: string });
        }      }

      // Format the audits with additional info
      const formattedAudits = audits.map(audit => ({
        ...audit,
        verifier_name: verifierNames[audit.verified_by] || 'Unknown',
        form_title: (audit.form as any)?.form_schema?.title || 'Unknown Form'
      }));

      setRejectedAudits(formattedAudits);
      
      // Animate in when new rejections are found
      if (formattedAudits.length > 0) {
        // Fade in animation
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
        
        // Initial shake to draw attention
        Animated.sequence([
          Animated.timing(shakeAnim, {
            toValue: 10,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: -10,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 10,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } catch (error) {
      console.error('Error fetching rejected audits:', error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchRejectedAudits();
    
    // Set up an interval to refresh every 30 seconds to catch new rejections
    const interval = setInterval(fetchRejectedAudits, 30000);
    
    // Start pulse animation for continuous attention
    const startPulseAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      ).start();
    };
    
    if (rejectedAudits.length > 0) {
      startPulseAnimation();
    }
    
    return () => {
      clearInterval(interval);
      pulseAnim.stopAnimation();
    };
  }, [user?.id, profile?.tenant_id, rejectedAudits.length]);
  const showRejectionDetails = () => {
    if (rejectedAudits.length === 0) return;

    const rejectionInfo = rejectedAudits.map(audit => {
      const verifiedDate = new Date(audit.verified_at).toLocaleDateString();
      const verifiedTime = new Date(audit.verified_at).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      return `📋 ${audit.title}\n   Form: ${audit.form_title}\n   👤 Rejected by: ${audit.verifier_name}\n   📅 Date: ${verifiedDate} at ${verifiedTime}\n   ⚠️ Action Required: ${audit.corrective_action || 'Review and resubmit'}`;
    }).join('\n\n');

    const title = rejectedAudits.length === 1 
      ? '🚨 Audit Rejection Notice' 
      : `🚨 ${rejectedAudits.length} Audit Rejections`;
    
    const message = rejectedAudits.length === 1
      ? 'The following audit has been rejected and requires your immediate attention:'
      : 'The following audits have been rejected and require your immediate attention:';

    Alert.alert(
      title,
      `${message}\n\n${rejectionInfo}\n\n💡 Tip: Review the feedback, make necessary corrections, and resubmit your audit(s).`,
      [
        {
          text: '📊 View History',
          style: 'default',
          onPress: () => {
            router.push('/(tabs)/history');
          }
        },
        {
          text: '✅ Got it',
          style: 'default'
        }
      ]
    );
  };

  // Don't show anything if no rejections
  if (rejectedAudits.length === 0) {
    return null;
  }
  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [
            { scale: pulseAnim },
            { translateX: shakeAnim }
          ]
        }
      ]}
    >
      <Pressable 
        style={styles.notificationWrapper} 
        onPress={showRejectionDetails}
        disabled={loading}
        android_ripple={{ color: 'rgba(239, 68, 68, 0.2)', borderless: false }}
      >
        <View style={styles.iconContainer}>
          <View style={styles.iconBackground}>
            <MaterialIcons name="error" size={24} color="#ffffff" />
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{rejectedAudits.length}</Text>
          </View>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.titleText}>
            {rejectedAudits.length === 1 ? 'Audit Rejected' : `${rejectedAudits.length} Audits Rejected`}
          </Text>
          <Text style={styles.subtitleText}>Tap to view details</Text>
        </View>
        <MaterialIcons name="chevron-right" size={20} color="#ef4444" />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  notificationWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    shadowColor: '#ef4444',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  iconBackground: {
    backgroundColor: '#ef4444',
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ef4444',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  badgeText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 2,
  },
  subtitleText: {
    fontSize: 14,
    color: '#6b7280',
  },
});

export default RejectionNotification;
