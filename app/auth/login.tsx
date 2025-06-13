import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { checkUserRole } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  async function signInWithEmail() {
    if (!email || !password) {
      showAlert('Error', 'Please fill in all fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showAlert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          showAlert('Error', 'Invalid email or password');
        } else if (authError.message.includes('Email not confirmed')) {
          showAlert('Error', 'Please verify your email address first');
        } else {
          showAlert('Error', authError.message);
        }
        setLoading(false);
        return;
      }

      const hasValidRole = await checkUserRole(authData.user.id);
      
      if (!hasValidRole) {
        await supabase.auth.signOut();
        showAlert('Access Denied', 'Only users with user role can access this application.');
        setLoading(false);
        return;
      }

      showAlert('Success', 'Successfully logged in!');
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Login error:', error);
      showAlert('Error', 'An unexpected error occurred. Please try again.');
    }
    
    setLoading(false);
  }

  return (
    <View className="flex-1 justify-center px-6 bg-white">
      <Text className="text-3xl font-bold text-primary-600 mb-8">Welcome Back</Text>
      
      <TextInput
        className="w-full bg-gray-100 rounded-lg px-4 py-3 mb-4"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <TextInput
        className="w-full bg-gray-100 rounded-lg px-4 py-3 mb-6"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity
        className="w-full bg-primary-500 rounded-lg py-3 mb-4"
        onPress={signInWithEmail}
        disabled={loading}
      >
        <Text className="text-white text-center font-semibold">
          {loading ? 'Signing in...' : 'Sign In'}
        </Text>
      </TouchableOpacity>
      
      <View className="mt-4">
        <Text className="text-center text-gray-600">
          Forgot your password?{' '}
          <Text 
            className="text-primary-500"
            onPress={() => router.push('/auth/forgot-password')}
          >
            Reset Password
          </Text>
        </Text>
      </View>
    </View>
  );
}