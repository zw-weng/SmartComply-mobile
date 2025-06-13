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
  };  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarItemStyle: {
          height: '100%',
          justifyContent: 'center',
          alignItems: 'center',
          paddingTop: 8,
          paddingBottom: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
          letterSpacing: 0.3,
        },
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderRadius: 25,
          marginHorizontal: 16,
          marginBottom: 34,
          height: 70,
          position: 'absolute',
          borderWidth: 0.5,
          borderColor: '#e5e7eb',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
          elevation: 12,
          paddingBottom: 0,
        }
      }}
    >      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialIcons 
              name="home" 
              color={focused ? '#3b82f6' : color} 
              size={focused ? 26 : 24} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="audit"
        options={{
          title: 'Audit',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialIcons 
              name="assignment" 
              color={focused ? '#3b82f6' : color} 
              size={focused ? 26 : 24} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialIcons 
              name="account-circle" 
              color={focused ? '#3b82f6' : color} 
              size={focused ? 26 : 24} 
            />
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