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
 * GET /users/profile
 * Get current user's profile (protected)
 */
router.get('/profile', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.auth?.user.id;
    
    // Get user profile with stats
    const [profileResult, statsResult] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single(),
      // Get user statistics
      Promise.all([
        supabase.from('watch_sessions').select('id', { count: 'exact' }).eq('user_id', userId),
        supabase.from('user_bookmarks').select('id', { count: 'exact' }).eq('user_id', userId),
        supabase.from('watch_sessions').select('watched_duration').eq('user_id', userId)
      ])
    ]);
    
    if (profileResult.error) {
      res.status(500).json({ error: profileResult.error.message });
      return;
    }
    
    const [totalEpisodes, totalBookmarks, watchTimeData] = statsResult;
    
    const totalWatchTime = watchTimeData.data?.reduce((sum, entry) => {
      return sum + (entry.watched_duration || 0);
    }, 0) || 0;
    
    const stats = {
      total_episodes_watched: totalEpisodes.count || 0,
      total_bookmarks: totalBookmarks.count || 0,
      total_watch_time: Math.floor(totalWatchTime / 60) // Convert to minutes
    };
    
    res.json({
      user: {
        ...req.auth?.user,
        ...profileResult.data
      },
      stats
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch user profile'
    });
  }
});

/**
 * PUT /users/profile
 * Update current user's profile (protected)
 */
router.put('/profile', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.auth?.user.id;
    const updateData = req.body;
    
    // Remove fields that shouldn't be updated directly
    const allowedFields = ['display_name', 'bio', 'avatar_url', 'preferences'];
    const filteredData = Object.keys(updateData)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updateData[key];
        return obj;
      }, {} as any);
    
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...filteredData,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    
    res.json({
      data,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to update profile'
    });
  }
});

/**
 * GET /users/bookmarks
 * Get user's bookmarked anime (protected)
 */
router.get('/bookmarks', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.auth?.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = (page - 1) * limit;
    
    const { data, error, count } = await supabase
      .from('user_bookmarks')
      .select(`
        *,
        anime_cache (
          id, title, poster_url, status, year, genres, rating, type
        )
      `, { count: 'exact' })
      .eq('user_id', userId)
      .range(offset, offset + limit - 1)
      .order('added_at', { ascending: false });
    
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    
    const totalPages = Math.ceil((count || 0) / limit);
    
    res.json({
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch bookmarks'
    });
  }
});

/**
 * POST /users/bookmarks
 * Add anime to bookmarks (protected)
 */
router.post('/bookmarks', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.auth?.user.id;
    const { anime_id } = req.body;
    
    if (!anime_id) {
      res.status(400).json({
        error: 'Missing anime_id',
        message: 'anime_id is required'
      });
      return;
    }
    
    // Check if already bookmarked
    const { data: existing } = await supabase
      .from('user_bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('anime_id', anime_id)
      .single();
    
    if (existing) {
      res.status(409).json({
        error: 'Already bookmarked',
        message: 'This anime is already in your bookmarks'
      });
      return;
    }
    
    const { data, error } = await supabase
      .from('user_bookmarks')
      .insert({
        user_id: userId,
        anime_id,
        added_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    
    res.status(201).json({
      data,
      message: 'Anime added to bookmarks'
    });
  } catch (error) {
    console.error('Error adding bookmark:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to add bookmark'
    });
  }
});

/**
 * DELETE /users/bookmarks/:animeId
 * Remove anime from bookmarks (protected)
 */
router.delete('/bookmarks/:animeId', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { animeId } = req.params;
    const userId = req.auth?.user.id;
    
    const { error } = await supabase
      .from('user_bookmarks')
      .delete()
      .eq('user_id', userId)
      .eq('anime_id', animeId);
    
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    
    res.json({ 
      message: 'Bookmark removed successfully'
    });
  } catch (error) {
    console.error('Error removing bookmark:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to remove bookmark'
    });
  }
});

/**
 * GET /users/watch-history
 * Get user's watch history (protected)
 */
router.get('/watch-history', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.auth?.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = (page - 1) * limit;
    
    const { data, error, count } = await supabase
      .from('watch_sessions')
      .select(`
        *,
        episodes (
          id, title, episode_number, anime_id
        )
      `, { count: 'exact' })
      .eq('user_id', userId)
      .range(offset, offset + limit - 1)
      .order('session_start', { ascending: false });
    
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    
    const totalPages = Math.ceil((count || 0) / limit);
    
    res.json({
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching watch history:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch watch history'
    });
  }
});

/**
 * GET /users/stats
 * Get user's viewing statistics (protected)
 */
router.get('/stats', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.auth?.user.id;
    
    // Get comprehensive user statistics
    const [episodeStats, bookmarkStats, watchTimeData] = await Promise.all([
      // Total episodes watched
      supabase
        .from('watch_sessions')
        .select('id', { count: 'exact' })
        .eq('user_id', userId),
      
      // Total bookmarks
      supabase
        .from('user_bookmarks')
        .select('id', { count: 'exact' })
        .eq('user_id', userId),
      
      // Watch time data
      supabase
        .from('watch_sessions')
        .select('watched_duration')
        .eq('user_id', userId)
    ]);
    
    // Calculate total watch time
    const totalWatchTime = watchTimeData.data?.reduce((sum, entry) => {
      return sum + (entry.watched_duration || 0);
    }, 0) || 0;
    
    const stats = {
      total_episodes_watched: episodeStats.count || 0,
      total_bookmarks: bookmarkStats.count || 0,
      total_watch_time: Math.floor(totalWatchTime / 60) // Convert to minutes
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch user statistics'
    });
  }
});

/**
 * GET /users/:userId/profile
 * Get public profile of another user (public)
 */
router.get('/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, username, display_name, bio, avatar_url, created_at')
      .eq('id', userId)
      .eq('is_active', true)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ 
          error: 'User not found',
          message: 'The requested user does not exist or is not active'
        });
        return;
      }
      res.status(500).json({ error: error.message });
      return;
    }
    
    // Get public stats
    const [episodeCount, bookmarkCount] = await Promise.all([
      supabase.from('watch_sessions').select('id', { count: 'exact' }).eq('user_id', userId),
      supabase.from('user_bookmarks').select('id', { count: 'exact' }).eq('user_id', userId)
    ]);
    
    res.json({
      ...data,
      stats: {
        total_episodes_watched: episodeCount.count || 0,
        total_bookmarks: bookmarkCount.count || 0
      }
    });
  } catch (error) {
    console.error('Error fetching public profile:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch user profile'
    });
  }
});

export default router;