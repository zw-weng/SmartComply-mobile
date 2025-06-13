import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

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
  };

  async function sendResetEmail() {
    if (!email) {
      showAlert('Error', 'Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showAlert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://yourapp.com/reset-password',
      });

      if (error) {
        showAlert('Error', error.message);
      } else {
        showAlert(
          'Reset Email Sent',
          'Please check your email for password reset instructions. If you don\'t see it, check your spam folder.',
          () => router.replace('/auth/login')
        );
      }
    } catch (error) {
      console.error('Password reset error:', error);
      showAlert('Error', 'An unexpected error occurred. Please try again.');
    }
    
    setLoading(false);
  }

  return (
    <View className="flex-1 justify-center px-6 bg-white">
      <Text className="text-3xl font-bold text-primary-600 mb-4">Reset Password</Text>
      <Text className="text-gray-600 mb-8">
        Enter your email address and we'll send you a link to reset your password.
      </Text>
      
      <TextInput
        className="w-full bg-gray-100 rounded-lg px-4 py-3 mb-6"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoFocus
      />

      <TouchableOpacity
        className="w-full bg-primary-500 rounded-lg py-3 mb-4"
        onPress={sendResetEmail}
        disabled={loading}
      >
        <Text className="text-white text-center font-semibold">
          {loading ? 'Sending...' : 'Send Reset Email'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.back()}
        className="mt-4"
      >
        <Text className="text-center text-gray-600">
          Remember your password? <Text className="text-primary-500">Back to Login</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}
