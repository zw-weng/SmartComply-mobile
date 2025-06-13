import { supabase } from './supabase';

export type UserRole = 'user' | 'admin';

export interface UserProfile {
  user_id: string;
  role: UserRole;
  full_name: string | null;
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
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !profileData) {
      console.error('Error fetching user profile:', error);
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
 * @param fullName - The user's full name
 * @returns Promise<boolean> - Whether the profile was created successfully
 */
export async function createUserProfile(userId: string, fullName?: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        role: 'user' as UserRole,
        full_name: fullName || null
      });

    if (error) {
      console.error('Error creating user profile:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error creating user profile:', error);
    return false;
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
