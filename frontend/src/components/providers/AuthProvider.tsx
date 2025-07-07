'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, userProfiles } from '@/lib/supabase/client';
import { UserProfile } from '@/lib/supabase/types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  error: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }

        if (session?.user) {
          setUser(session.user);
          setSession(session);
          
          // Get user profile
          const { data: profile } = await userProfiles.get(session.user.id);
          setProfile(profile || null);
        }
        
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        setLoading(true);
        
        try {
          if (session?.user) {
            setUser(session.user);
            setSession(session);
            
            // Get or create user profile
            let { data: profile, error } = await userProfiles.get(session.user.id);
            
            if (error && error.code === 'PGRST116') {
              // Profile doesn't exist, create one
              const { data: newProfile, error: createError } = await supabase
                .from('user_profiles')
                .insert({
                  id: session.user.id,
                  username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'user',
                  display_name: session.user.user_metadata?.display_name || null,
                  role: 'user',
                  preferences: {},
                  is_active: true,
                })
                .select()
                .single();
              
              if (!createError) {
                profile = newProfile;
              }
            }
            
            setProfile(profile || null);
            setError(null);
          } else {
            setUser(null);
            setProfile(null);
            setSession(null);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};