import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signUpWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert(
        'Success',
        'Check your email for the confirmation link!',
        [{ text: 'OK', onPress: () => router.replace('/auth/login') }]
      );
    }
    setLoading(false);
  }

  return (
    <View className="flex-1 justify-center px-6 bg-white">
      <Text className="text-3xl font-bold text-primary-600 mb-8">Create Account</Text>
      
      <TextInput
        className="w-full bg-gray-100 rounded-lg px-4 py-3 mb-4"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
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
        onPress={signUpWithEmail}
        disabled={loading}
      >
        <Text className="text-white text-center font-semibold">
          {loading ? 'Creating account...' : 'Sign Up'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push('/auth/login')}
        className="mt-4"
      >
        <Text className="text-primary-500 text-center">
          Already have an account? Sign in
        </Text>
      </TouchableOpacity>
    </View>
  );
} 