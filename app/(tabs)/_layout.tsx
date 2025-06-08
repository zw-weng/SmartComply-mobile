import { MaterialIcons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function TabLayout() {
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error.message);
    } else {
      router.replace('/auth/login');
    }
  };

  return (
    <Tabs
       screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1E3A8A',
        tabBarInactiveTintColor: '#6b7280',
        tabBarItemStyle: {
          height: '100%',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 4
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: 'bold',
          marginTop: 2,
        },
        tabBarStyle: {
          backgroundColor: 'white',
          borderRadius: 50,
          marginHorizontal: 20,
          marginBottom: 36,
          height: 75,
          position: 'absolute',
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: '#D1D5DB',
          shadowColor: 'rgba(0, 0, 0, 0.1)',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 6,
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="audit"
        options={{
          title: 'Audit',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="assignment" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="account-circle" color={color} size={size} />
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSignOut}
              style={{ marginRight: 15 }}
            >
              <Text style={{ color: '#0ea5e9', fontSize: 16 }}>Sign Out</Text>
            </TouchableOpacity>
          ),
        }}
      />
    </Tabs>
  );
}