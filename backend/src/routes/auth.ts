import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticate } from '../middleware/auth.js';
import { AuthenticatedRequest } from '../types/auth.js';

const router = Router();

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
 * POST /auth/register
 * Register new user (public)
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, username, display_name } = req.body;
    
    if (!email || !password || !username) {
      res.status(400).json({
        error: 'Missing required fields',
        message: 'Email, password, and username are required'
      });
      return;
    }
    
    // Check if username already exists
    const { data: existingUser } = await getSupabase()
      .from('user_profiles')
      .select('username')
      .eq('username', username)
      .single();
    
    if (existingUser) {
      res.status(409).json({
        error: 'Username already exists',
        message: 'This username is already taken'
      });
      return;
    }
    
    // Register with Supabase Auth
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: display_name || username
        }
      }
    });
    
    if (error) {
      res.status(400).json({
        error: 'Registration failed',
        message: error.message
      });
      return;
    }
    
    // Create user profile
    if (data.user) {
      const { error: profileError } = await getSupabase()
        .from('user_profiles')
        .insert({
          id: data.user.id,
          email: data.user.email,
          username,
          display_name: display_name || username,
          role: 'user',
          is_active: true,
          email_verified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (profileError) {
        console.error('Error creating user profile:', profileError);
      }
    }
    
    res.status(201).json({
      user: {
        id: data.user?.id,
        email: data.user?.email,
        username,
        display_name: display_name || username,
        role: 'user',
        email_verified: false
      },
      message: 'User registered successfully'
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to register user'
    });
  }
});

/**
 * POST /auth/login
 * Login user (public)
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      res.status(400).json({
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
      return;
    }
    
    // Sign in with Supabase Auth
    const { data, error } = await getSupabase().auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      res.status(401).json({
        error: 'Authentication failed',
        message: error.message
      });
      return;
    }
    
    if (!data.user || !data.session) {
      res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid credentials'
      });
      return;
    }
    
    // Get user profile
    const { data: profile } = await getSupabase()
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    // Update last login time
    if (profile) {
      await getSupabase()
        .from('user_profiles')
        .update({
          last_login_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', data.user.id);
    }
    
    res.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        username: profile?.username,
        display_name: profile?.display_name,
        role: profile?.role || 'user',
        email_verified: data.user.email_confirmed_at ? true : false,
        avatar_url: profile?.avatar_url
      },
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in || 3600,
      token_type: 'Bearer'
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to authenticate user'
    });
  }
});

/**
 * POST /auth/logout
 * Logout user (protected)
 */
router.post('/logout', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { error } = await getSupabase().auth.signOut();
    
    if (error) {
      res.status(500).json({
        error: 'Logout failed',
        message: error.message
      });
      return;
    }
    
    res.json({
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to logout'
    });
  }
});

/**
 * POST /auth/refresh
 * Refresh authentication token (public)
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      res.status(400).json({
        error: 'Missing refresh token',
        message: 'Refresh token is required'
      });
      return;
    }
    
    const { data, error } = await getSupabase().auth.refreshSession({
      refresh_token
    });
    
    if (error) {
      res.status(401).json({
        error: 'Token refresh failed',
        message: error.message
      });
      return;
    }
    
    if (!data.session) {
      res.status(401).json({
        error: 'Token refresh failed',
        message: 'Invalid refresh token'
      });
      return;
    }
    
    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in || 3600,
      token_type: 'Bearer'
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to refresh token'
    });
  }
});

/**
 * POST /auth/forgot-password
 * Send password reset email (public)
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      res.status(400).json({
        error: 'Missing email',
        message: 'Email is required'
      });
      return;
    }
    
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`
    });
    
    if (error) {
      console.error('Error sending password reset email:', error);
      res.status(500).json({
        error: 'Failed to send reset email',
        message: 'Unable to send password reset email'
      });
      return;
    }
    
    res.json({
      message: 'Password reset email sent successfully'
    });
  } catch (error) {
    console.error('Error in forgot password:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process password reset request'
    });
  }
});

/**
 * GET /auth/me
 * Get current user info (protected)
 */
router.get('/me', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.auth?.user.id;
    
    // Get fresh user data
    const { data: profile } = await getSupabase()
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    res.json({
      user: {
        ...req.auth?.user,
        ...profile
      }
    });
  } catch (error) {
    console.error('Error fetching user info:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch user information'
    });
  }
});

export default router;