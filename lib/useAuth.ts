import { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { checkUserRole, getUserProfile, UserProfile } from './auth';
import { supabase } from './supabase';

interface UseAuthReturn {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasValidRole: boolean;
  signOut: () => Promise<void>;
}

/**
 * Custom hook to manage authentication state and user role validation
 * @returns UseAuthReturn object with auth state and methods
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasValidRole, setHasValidRole] = useState(false);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setIsAuthenticated(false);
      setHasValidRole(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const checkAndSetUserRole = async (currentUser: User | null) => {
    if (!currentUser) {
      setHasValidRole(false);
      setProfile(null);
      return;
    }

    const validRole = await checkUserRole(currentUser.id);
    setHasValidRole(validRole);

    if (validRole) {
      const userProfile = await getUserProfile(currentUser.id);
      setProfile(userProfile);
    } else {
      setProfile(null);
      // Auto sign out users without valid role
      await signOut();
    }
  };

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user || null;
        
        setUser(currentUser);
        setIsAuthenticated(!!currentUser);
        
        await checkAndSetUserRole(currentUser);
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user || null;
        
        setUser(currentUser);
        setIsAuthenticated(!!currentUser);
        
        await checkAndSetUserRole(currentUser);
        
        if (!isLoading) {
          setIsLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    profile,
    isLoading,
    isAuthenticated,
    hasValidRole,
    signOut
  };
}
