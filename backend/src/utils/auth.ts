import { createClient } from '@supabase/supabase-js';
import { Request } from 'express';
import { JWTPayload, UserProfile, AuthContext, AuthenticationError } from '../types/auth.js';

// Lazy initialization of Supabase client
let supabaseClient: any = null;

const getSupabase = () => {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !key) {
      throw new Error(`Supabase configuration missing: URL=${!!url}, KEY=${!!key}`);
    }
    
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
};

/**
 * Extract Bearer token from Authorization header
 */
export const extractBearerToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }
  
  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
};

/**
 * Verify JWT token using Supabase
 */
export const verifyToken = async (token: string): Promise<JWTPayload | null> => {
  try {
    const { data, error } = await getSupabase().auth.getUser(token);
    
    if (error || !data.user) {
      console.error('Token verification failed:', error);
      return null;
    }
    
    // Extract JWT payload information
    const payload: JWTPayload = {
      sub: data.user.id,
      email: data.user.email!,
      role: data.user.user_metadata?.role || 'user',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour default
      aud: data.user.aud,
      iss: 'supabase'
    };
    
    return payload;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
};

/**
 * Get user profile from Supabase
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await getSupabase()
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error || !data) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    
    return data as UserProfile;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

/**
 * Check if user has specific role
 */
export const hasRole = (authContext: AuthContext, role: string): boolean => {
  const userRole = authContext.user.role;
  
  // Admin has access to everything
  if (userRole === 'admin') {
    return true;
  }
  
  // Moderator has access to user-level content
  if (userRole === 'moderator' && (role === 'user' || role === 'moderator')) {
    return true;
  }
  
  // Exact role match
  return userRole === role;
};

/**
 * Check if user has specific permission
 */
export const hasPermission = (authContext: AuthContext, permission: string): boolean => {
  return authContext.permissions.includes(permission);
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    // Basic JWT structure check
    const parts = token.split('.');
    if (parts.length !== 3) {
      return true;
    }
    
    // Decode payload
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    if (!payload.exp) {
      return true;
    }
    
    // Check if token is expired (with 30 second buffer)
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < (now + 30);
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
};

/**
 * Refresh user session
 */
export const refreshUserSession = async (refreshToken: string) => {
  try {
    const { data, error } = await getSupabase().auth.refreshSession({
      refresh_token: refreshToken
    });
    
    if (error || !data.session) {
      throw new AuthenticationError('Failed to refresh session');
    }
    
    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in || 3600,
      user: data.user
    };
  } catch (error) {
    console.error('Error refreshing session:', error);
    throw new AuthenticationError('Session refresh failed');
  }
};

/**
 * Create new user session
 */
export const createUserSession = async (email: string, password: string) => {
  try {
    const { data, error } = await getSupabase().auth.signInWithPassword({
      email,
      password
    });
    
    if (error || !data.session || !data.user) {
      throw new AuthenticationError('Invalid credentials');
    }
    
    // Update last login timestamp
    await getSupabase()
      .from('user_profiles')
      .update({ 
        last_login_at: new Date().toISOString() 
      })
      .eq('id', data.user.id);
    
    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in || 3600,
      user: data.user
    };
  } catch (error) {
    console.error('Error creating user session:', error);
    throw new AuthenticationError('Login failed');
  }
};

/**
 * Register new user
 */
export const registerUser = async (
  email: string, 
  password: string, 
  username: string, 
  displayName: string
) => {
  try {
    // Check if username is already taken
    const { data: existingUser } = await getSupabase()
      .from('user_profiles')
      .select('username')
      .eq('username', username)
      .single();
    
    if (existingUser) {
      throw new AuthenticationError('Username already taken');
    }
    
    // Create auth user
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: displayName
        }
      }
    });
    
    if (error || !data.user) {
      throw new AuthenticationError(error?.message || 'Registration failed');
    }
    
    // Create user profile
    const { error: profileError } = await getSupabase()
      .from('user_profiles')
      .insert({
        id: data.user.id,
        email: data.user.email!,
        username,
        display_name: displayName,
        role: 'user',
        is_active: true,
        email_verified: data.user.email_confirmed_at ? true : false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (profileError) {
      console.error('Error creating user profile:', profileError);
      // Clean up auth user if profile creation fails
      await getSupabase().auth.admin.deleteUser(data.user.id);
      throw new AuthenticationError('Failed to create user profile');
    }
    
    return {
      user: data.user,
      session: data.session
    };
  } catch (error) {
    console.error('Error registering user:', error);
    
    if (error instanceof AuthenticationError) {
      throw error;
    }
    
    throw new AuthenticationError('Registration failed');
  }
};

/**
 * Sign out user
 */
export const signOutUser = async (token: string) => {
  try {
    await getSupabase().auth.signOut();
    return { success: true };
  } catch (error) {
    console.error('Error signing out user:', error);
    throw new AuthenticationError('Sign out failed');
  }
};

/**
 * Send password reset email
 */
export const sendPasswordReset = async (email: string) => {
  try {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/auth/reset-password`
    });
    
    if (error) {
      throw new AuthenticationError(error.message);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error sending password reset:', error);
    
    if (error instanceof AuthenticationError) {
      throw error;
    }
    
    throw new AuthenticationError('Failed to send password reset email');
  }
};

/**
 * Update user password
 */
export const updateUserPassword = async (token: string, newPassword: string) => {
  try {
    const { error } = await getSupabase().auth.updateUser({
      password: newPassword
    });
    
    if (error) {
      throw new AuthenticationError(error.message);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating password:', error);
    
    if (error instanceof AuthenticationError) {
      throw error;
    }
    
    throw new AuthenticationError('Failed to update password');
  }
};