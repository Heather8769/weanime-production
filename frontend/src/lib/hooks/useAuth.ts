'use client';

import { useState } from 'react';
import { auth, userProfiles } from '../supabase/client';
import { UserProfile } from '../supabase/types';
import { useAuthContext } from '@/components/providers/AuthProvider';

export function useAuth() {
  const { user, profile, session, loading, error: contextError } = useAuthContext();
  const [error, setError] = useState<string | null>(null);

  const signIn = async (email: string, password: string) => {
    setError(null);
    
    try {
      const { data, error } = await auth.signIn(email, password);
      
      if (error) {
        setError(error.message);
        return { error };
      }

      return { data };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setError(errorMessage);
      return { error: { message: errorMessage } };
    }
  };

  const signUp = async (email: string, password: string, username: string, displayName?: string) => {
    setError(null);
    
    try {
      const { data, error } = await auth.signUp(email, password, {
        username,
        display_name: displayName,
      });
      
      if (error) {
        setError(error.message);
        return { error };
      }

      return { data };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setError(errorMessage);
      return { error: { message: errorMessage } };
    }
  };

  const signOut = async () => {
    setError(null);
    
    try {
      const { error } = await auth.signOut();
      
      if (error) {
        setError(error.message);
        return { error };
      }

      return { data: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setError(errorMessage);
      return { error: { message: errorMessage } };
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: { message: 'No user logged in' } };

    try {
      const { data, error } = await userProfiles.update(user.id, updates);
      
      if (error) {
        return { error };
      }

      return { data };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      return { error: { message: errorMessage } };
    }
  };

  return {
    user,
    profile,
    session,
    loading,
    error: error || contextError,
    signIn,
    signUp,
    signOut,
    updateProfile,
    isAuthenticated: !!user,
  };
}