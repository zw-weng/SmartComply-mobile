import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="login" 
        options={{
          title: 'Login',
        }}
      />
      <Stack.Screen 
        name="forgot-password" 
        options={{
          title: 'Reset Password',
        }}
      />
    </Stack>
  );
}