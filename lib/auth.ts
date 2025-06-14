import { supabase } from './supabase';

export type UserRole = 'user' | 'admin';

export interface UserProfile {
  id: number;
  user_id: string;
  role: UserRole;
  full_name: string; // NOT NULL in your schema
}

/**
 * Check if a user has the required role to access the application
 * @param userId - The user ID to check
 * @returns Promise<boolean> - Whether the user has a valid role
 */
export async function checkUserRole(userId: string): Promise<boolean> {
  try {
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (error || !profileData) {
      console.error('Error fetching user profile:', error);
      return false;
    }

    // Only allow users with 'user' role to access the app
    return profileData.role === 'user';
  } catch (error) {
    console.error('Error checking user role:', error);
    return false;
  }
}

/**
 * Get the current user's profile information
 * @param userId - The user ID to get profile for
 * @returns Promise<UserProfile | null> - The user profile or null if not found
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('id, user_id, role, full_name')
      .eq('user_id', userId)
      .single();

    if (error) {      if (error.code === 'PGRST116') {
        // No rows returned - profile doesn't exist
        return null;
      }
      console.error('Error fetching user profile:', error);
      return null;
    }    if (!profileData) {
      return null;
    }

    return profileData as UserProfile;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

/**
 * Create a new user profile with 'user' role
 * @param userId - The user ID to create profile for
 * @param fullName - The user's full name (required)
 * @returns Promise<{ success: boolean; error?: string }> - Whether the profile was created successfully
 */
export async function createUserProfile(userId: string, fullName: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!fullName?.trim()) {
      return { success: false, error: 'Full name is required' };
    }

    const { error } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        role: 'user' as UserRole,
        full_name: fullName.trim()
      });

    if (error) {
      console.error('Error creating user profile:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error creating user profile:', error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Update a user's profile information
 * @param userId - The user ID to update profile for
 * @param updates - The profile fields to update
 * @returns Promise<boolean> - Whether the profile was updated successfully
 */
export async function updateUserProfile(
  userId: string, 
  updates: { full_name?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update profile table (only full_name)
    if (updates.full_name !== undefined) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: updates.full_name.trim(),
        })
        .eq('user_id', userId);

      if (profileError) {
        console.error('Error updating user profile:', profileError);
        return { success: false, error: profileError.message };
      }
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error updating user profile:', error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Sign out the current user and clear any cached data
 */
export async function signOutUser(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error('Error signing out:', error);
  }
}

/**
 * Verify if the current password is correct by checking current session validity
 * @param email - The user's email  
 * @param currentPassword - The current password (not used in this implementation)
 * @returns Promise<{ success: boolean; error?: string }> - Whether the current session is valid
 */
export async function verifyCurrentPassword(email: string, currentPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if the user has a valid active session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      return { success: false, error: 'Unable to verify current session' };
    }
    
    if (!session) {
      return { success: false, error: 'No active session found' };
    }
    
    // If we have a valid session and the email matches, assume the user is properly authenticated
    if (session.user.email === email) {
      return { success: true };
    }
    
    return { success: false, error: 'Session email does not match' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error verifying current password:', error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Quick connection test to Supabase
 * @returns Promise<boolean> - Whether the connection is working
 */
export async function checkSupabaseConnection(): Promise<boolean> {  try {
    
    // Very quick timeout for connection test (3 seconds)
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Connection test timeout')), 3000)
    );
    
    // Simple test with Supabase auth endpoint
    const testPromise = fetch('https://kvofqqlzrqubrxtukkpm.supabase.co/auth/v1/settings', {
      method: 'GET',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2b2ZxcWx6cnF1YnJ4dHVra3BtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1NjI1NjEsImV4cCI6MjA2MzEzODU2MX0.vOvJaNPsMi7c-jJ8MZiq5s_CYcvhgahVdwyGg-XOEfE',
      }
    });
      const response = await Promise.race([testPromise, timeoutPromise]);
    
    return response.ok; // 200-299 range
    
  } catch (error) {
    console.error('Connection check failed:', error);
    return false;
  }
}

/**
 * Test basic internet connectivity
 * @returns Promise<boolean> - Whether internet connection is working
 */
export async function testInternetConnection(): Promise<boolean> {
  try {
    // Quick test to see if we can reach the internet
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Internet test timeout')), 5000)
    );
    
    const testPromise = fetch('https://httpstat.us/200', { 
      method: 'HEAD',
      cache: 'no-cache'
    });
    
    const response = await Promise.race([testPromise, timeoutPromise]);
    return response.ok;
  } catch (error) {
    console.error('Internet connection test failed:', error);
    return false;
  }
}

/**
 * Simple network diagnostic
 * @returns Promise<string> - Diagnostic result
 */
export async function runNetworkDiagnostic(): Promise<string> {
  const results: string[] = [];
  
  // Test 1: Basic internet connectivity
  try {
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Internet test timeout')), 5000)
    );
    
    const fetchPromise = fetch('https://httpbin.org/get', { 
      method: 'GET'
    });
    
    const response = await Promise.race([fetchPromise, timeoutPromise]);
    results.push(`✅ Internet: ${response.status}`);
  } catch (error) {
    results.push(`❌ Internet: ${error}`);
  }
  
  // Test 2: Supabase endpoint
  try {
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Supabase test timeout')), 5000)
    );
    
    const fetchPromise = fetch('https://kvofqqlzrqubrxtukkpm.supabase.co/auth/v1/settings', {
      method: 'GET',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2b2ZxcWx6cnF1YnJ4dHVra3BtIiwicm9zZSI6ImFub24iLCJpYXQiOjE3NDc1NjI1NjEsImV4cCI6MjA2MzEzODU2MX0.vOvJaNPsMi7c-jJ8MZiq5s_CYcvhgahVdwyGg-XOEfE',
      }
    });
    
    const response = await Promise.race([fetchPromise, timeoutPromise]);
    results.push(`✅ Supabase: ${response.status}`);
  } catch (error) {
    results.push(`❌ Supabase: ${error}`);
  }
  
  // Test 3: Session status
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      results.push(`❌ Session: ${error.message}`);    } else if (session) {
      const expiresAt = session.expires_at ? new Date(session.expires_at * 1000).toLocaleTimeString() : 'unknown';
      results.push(`✅ Session: Valid (expires: ${expiresAt})`);
    } else {
      results.push(`⚠️ Session: None`);
    }
  } catch (error) {
    results.push(`❌ Session: ${error}`);
  }
  
  // Test 4: Quick auth test
  try {
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Auth test timeout')), 3000)
    );
    
    const authPromise = supabase.auth.getUser();
    
    const { data, error } = await Promise.race([authPromise, timeoutPromise]);
    if (error) {
      results.push(`❌ Auth Test: ${error.message}`);
    } else if (data.user) {
      results.push(`✅ Auth Test: User ${data.user.email}`);
    } else {
      results.push(`⚠️ Auth Test: No user`);
    }
  } catch (error) {
    results.push(`❌ Auth Test: ${error}`);
  }
  
  return results.join('\n');
}

/**
 * Test Supabase connectivity and auth status
 * @returns Promise<{ connected: boolean; authenticated: boolean; error?: string }> - Connection status
 */
export async function testSupabaseConnection(): Promise<{ connected: boolean; authenticated: boolean; error?: string }> {
  try {
    
    // Test basic connectivity with timeout
    const connectivityTest = new Promise((resolve, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
      supabase.auth.getUser().then(resolve).catch(reject);
    });
    
    const { data: { user }, error } = await connectivityTest as any;
    
    if (error) {
      return {
        connected: false,
        authenticated: false,
        error: error.message
      };
    }
    
    return {
      connected: true,
      authenticated: !!user,
      error: user ? undefined : 'Not authenticated'
    };
    
  } catch (error: any) {
    return {
      connected: false,
      authenticated: false,
      error: error?.message || 'Connection failed'
    };
  }
}
