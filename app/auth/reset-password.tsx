import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const params = useLocalSearchParams();

  const showAlert = (title: string, message: string, onPress?: () => void) => {
    if (Platform.OS === 'web') {
      alert(`${title}\n${message}`);
      if (onPress) onPress();
    } else {
      Alert.alert(
        title,
        message,
        onPress ? [{ text: 'OK', onPress }] : undefined
      );
    }
  };  useEffect(() => {
    // Handle auth callback from email link
    const handleAuthCallback = async () => {
      try {
        // Check if we have auth tokens in the URL (from email link)
        const { data, error } = await supabase.auth.getSession();
        
        if (data.session && !error) {
          setValidSession(true);
        } else {
          // For web, try to exchange auth code if present
          if (typeof window !== 'undefined' && window.location.href.includes('access_token=')) {
            try {
              const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href);
              
              if (!exchangeError) {
                setValidSession(true);
                return;
              }
            } catch (exchangeError) {
              console.error('Code exchange error:', exchangeError);
            }
          }
          
          // If still no valid session, show error
          showAlert(
            'Invalid Reset Link',
            'This password reset link is invalid or has expired. Please request a new password reset.',
            () => router.replace('/auth/forgot-password')
          );
        }
      } catch (error) {
        console.error('Session check error:', error);
        showAlert(
          'Error',
          'Unable to validate reset link. Please request a new password reset.',
          () => router.replace('/auth/forgot-password')
        );
      }
    };

    handleAuthCallback();
  }, []);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/(?=.*\d)/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  async function updatePassword() {
    if (!password || !confirmPassword) {
      showAlert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      showAlert('Error', 'Passwords do not match');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      showAlert('Error', passwordError);
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        showAlert('Error', error.message);
      } else {
        showAlert(
          'Password Updated',
          'Your password has been successfully updated. You can now sign in with your new password.',
          () => router.replace('/auth/login')
        );
      }
    } catch (error) {
      console.error('Password update error:', error);
      showAlert('Error', 'An unexpected error occurred. Please try again.');
    }
    
    setLoading(false);
  }

  if (!validSession) {
    return (
      <View className="flex-1 justify-center px-6 bg-white">
        <Text className="text-center text-gray-600">Validating reset link...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center px-6 bg-white">
      <Text className="text-3xl font-bold text-primary-600 mb-4">Reset Your Password</Text>
      
      <Text className="text-gray-600 mb-8">Enter your new password below. Make sure it's strong and secure.</Text>
      
      <TextInput
        className="w-full bg-gray-100 rounded-lg px-4 py-3 mb-4"
        placeholder="New Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoFocus
      />

      <TextInput
        className="w-full bg-gray-100 rounded-lg px-4 py-3 mb-6"
        placeholder="Confirm New Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />

      <View className="mb-6">
        <Text className="text-sm text-gray-600 mb-2">Password must:</Text>
        <Text className="text-sm text-gray-500">• Be at least 8 characters long</Text>
        <Text className="text-sm text-gray-500">• Contain uppercase and lowercase letters</Text>
        <Text className="text-sm text-gray-500">• Contain at least one number</Text>
      </View>

      <TouchableOpacity
        className="w-full bg-primary-500 rounded-lg py-3 mb-4"
        onPress={updatePassword}
        disabled={loading}
      >
        <Text className="text-white text-center font-semibold">
          {loading ? 'Updating...' : 'Update Password'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.replace('/auth/login')}
        className="mt-4"
      >
        <Text className="text-center text-gray-600">
          Back to <Text className="text-primary-500">Login</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}
