import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { AppState } from 'react-native'
import 'react-native-url-polyfill/auto'

const supabaseUrl = "https://kvofqqlzrqubrxtukkpm.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2b2ZxcWx6cnF1YnJ4dHVra3BtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1NjI1NjEsImV4cCI6MjA2MzEzODU2MX0.vOvJaNPsMi7c-jJ8MZiq5s_CYcvhgahVdwyGg-XOEfE"

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isBrowser ? AsyncStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Only add AppState listener in non-browser environments
if (!isBrowser) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh()
    } else {
      supabase.auth.stopAutoRefresh()
    }
  })
}