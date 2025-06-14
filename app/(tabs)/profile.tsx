import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Button from '../../components/Button';
import Card from '../../components/Card';
import DashboardHeader from '../../components/DashboardHeader';
import ListItem from '../../components/ListItem';
import Screen from '../../components/Screen';
import Toast from '../../components/Toast';
import { createUserProfile, getUserProfile, updateUserProfile, UserProfile } from '../../lib/auth';
import { useAuth } from '../../lib/useAuth';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'info' as 'success' | 'error' | 'info',
  });

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  const loadProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile loading timeout')), 10000)
      );

      const profilePromise = getUserProfile(user.id);
      const userProfile = await Promise.race([profilePromise, timeout]) as UserProfile | null;

      if (userProfile) {
        setProfile(userProfile);
        setFullName(userProfile.full_name || '');
        setEmail(user?.email || '');
      } else {
        setProfile(null);
        setFullName('');
        setEmail(user?.email || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setProfile(null);
      setFullName('');
      setEmail(user?.email || '');

      if (error instanceof Error && error.message === 'Profile loading timeout') {
        showAlert('Error', 'Profile loading is taking too long. Please check your connection and try again.');
      } else {
        showAlert('Error', 'Failed to load profile. You can still create or update your profile.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    if (!fullName.trim()) {
      showToast('Please enter your full name', 'error');
      return;
    }

    try {
      setSaving(true);

      if (!profile) {
        const createResult = await createUserProfile(user.id, fullName.trim());

        if (!createResult.success) {
          showToast(createResult.error || 'Failed to create profile', 'error');
          setSaving(false);
          return;
        }

        const newProfile = await getUserProfile(user.id);
        if (newProfile) {
          setProfile(newProfile);
        }
      } else {
        const result = await updateUserProfile(user.id, {
          full_name: fullName.trim()
        });

        if (!result.success) {
          showToast(result.error || 'Failed to update profile', 'error');
          setSaving(false);
          return;
        }

        setProfile({
          ...profile,
          full_name: fullName.trim()
        });
      }

      showToast('Profile updated successfully!', 'success');

      setTimeout(() => {
        loadProfile();
      }, 500);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      showToast('An unexpected error occurred. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/auth/login');
    } catch (error) {
      console.error('Error signing out:', error);
      showAlert('Error', 'Failed to sign out. Please try again.');
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user?.id]);

  if (loading) {
    return (
      <Screen style={styles.container}>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="account-circle" size={60} color="#e5e7eb" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={styles.container}>
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <DashboardHeader
          title="Profile"
          subtitle="Manage your account settings and information"
        />

        {/* Profile Header */}
        <Card variant="elevated" style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getInitials(fullName)}
                </Text>
              </View>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {fullName || 'User'}
              </Text>
              <Text style={styles.profileEmail}>
                {email || 'No email'}
              </Text>
              {profile?.role ? (
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>
                    {profile.role.toUpperCase()}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </Card>

        {/* Edit Profile Section */}
        {isEditing ? (
          <Card style={styles.editCard}>
            <View style={styles.editHeader}>
              <Text style={styles.cardTitle}>Edit Profile</Text>
              <Button
                title="Cancel"
                variant="ghost"
                size="small"
                onPress={() => {
                  setIsEditing(false);
                  setFullName(profile?.full_name || '');
                }}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                autoCapitalize="words"
              />
            </View>

            <Button
              title={saving ? 'Saving...' : 'Save Changes'}
              onPress={handleUpdateProfile}
              disabled={saving}
              style={styles.saveButton}
            />
          </Card>
        ) : (
          <Card style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Profile Information</Text>
              <Button
                title="Edit"
                variant="ghost"
                size="small"
                onPress={() => setIsEditing(true)}
              />
            </View>

            <ListItem
              title="Full Name"
              subtitle={fullName || 'Not set'}
              leftIcon="person"
              showChevron={false}
            />
            <ListItem
              title="Email Address"
              subtitle={email || 'Not set'}
              leftIcon="email"
              showChevron={false}
            />
          </Card>
        )}

        {/* Sign Out Button */}
        <View style={styles.signOutContainer}>
          <Button
            title="Sign Out"
            variant="danger"
            onPress={handleSignOut}
            style={styles.signOutButton}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
  profileCard: {
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '600',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  editCard: {
    marginBottom: 16,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoCard: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#111827',
  },
  saveButton: {
    marginTop: 8,
  },
  signOutContainer: {
    marginTop: 24,
    paddingHorizontal: 0,
  },
  signOutButton: {
    width: '100%',
  },
});