import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticate, requireAdmin, requireModerator, optionalAuthenticate } from '../middleware/auth.js';
import { AuthenticatedRequest } from '../types/auth.js';
import { 
  validateCreateAnime, 
  validateUpdateAnime, 
  validateAnimeQuery, 
  validateAnimeIdParam 
} from '../validation/middleware/anime.js';

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
 * GET /anime
 * Get all anime with filtering and pagination (public with optional auth)
 */
router.get('/', optionalAuthenticate, validateAnimeQuery, async (req: AuthenticatedRequest, res) => {
  try {
    const { 
      search, 
      genres, 
      type, 
      status, 
      year, 
      season, 
      sort_by, 
      order, 
      page, 
      limit 
    } = req.query as any;
    
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('anime_cache')
      .select('*', { count: 'exact' });
    
    // Apply filters
    if (search) {
      query = query.or(`title.ilike.%${search}%, title_english.ilike.%${search}%, title_japanese.ilike.%${search}%`);
    }
    
    if (genres && genres.length > 0) {
      query = query.contains('genres', genres);
    }
    
    if (type) {
      query = query.eq('type', type);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (year) {
      query = query.eq('year', year);
    }
    
    if (season) {
      query = query.eq('season', season);
    }
    
    // Apply sorting
    query = query.order(sort_by, { ascending: order === 'asc' });
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
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
    console.error('Error fetching anime:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch anime'
    });
  }
});

/**
 * GET /anime/:id
 * Get specific anime by ID (public with optional auth)
 */
router.get('/:id', optionalAuthenticate, validateAnimeIdParam, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('anime_cache')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ 
          error: 'Anime not found',
          message: 'The requested anime does not exist'
        });
        return;
      }
      res.status(500).json({ error: error.message });
      return;
    }
    
    // Get episode count
    const { count: episodeCount } = await supabase
      .from('episodes')
      .select('id', { count: 'exact' })
      .eq('anime_id', id);
    
    res.json({
      ...data,
      episode_count: episodeCount || 0
    });
  } catch (error) {
    console.error('Error fetching anime:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch anime'
    });
  }
});

/**
 * POST /anime
 * Create new anime (Admin only)
 */
router.post('/', authenticate, requireAdmin, validateCreateAnime, async (req: AuthenticatedRequest, res) => {
  try {
    const animeData = req.body;
    
    // Check if anime with same title already exists
    const { data: existing } = await supabase
      .from('anime_cache')
      .select('id')
      .eq('title', animeData.title)
      .single();
    
    if (existing) {
      res.status(409).json({
        error: 'Anime already exists',
        message: 'An anime with this title already exists'
      });
      return;
    }
    
    const { data, error } = await supabase
      .from('anime_cache')
      .insert({
        ...animeData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: req.auth?.user.id
      })
      .select()
      .single();
    
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    
    res.status(201).json({
      data,
      message: 'Anime created successfully'
    });
  } catch (error) {
    console.error('Error creating anime:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to create anime'
    });
  }
});

/**
 * PUT /anime/:id
 * Update anime (Admin only)
 */
router.put('/:id', authenticate, requireAdmin, validateAnimeIdParam, validateUpdateAnime, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const { data, error } = await supabase
      .from('anime_cache')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ 
          error: 'Anime not found',
          message: 'The anime to update does not exist'
        });
        return;
      }
      res.status(500).json({ error: error.message });
      return;
    }
    
    res.json({
      data,
      message: 'Anime updated successfully'
    });
  } catch (error) {
    console.error('Error updating anime:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to update anime'
    });
  }
});

/**
 * DELETE /anime/:id
 * Delete anime (Admin only)
 */
router.delete('/:id', authenticate, requireAdmin, validateAnimeIdParam, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    
    // Check if anime has episodes
    const { count: episodeCount } = await supabase
      .from('episodes')
      .select('id', { count: 'exact' })
      .eq('anime_id', id);
    
    if (episodeCount && episodeCount > 0) {
      res.status(400).json({
        error: 'Cannot delete anime',
        message: 'Anime has associated episodes. Delete episodes first.'
      });
      return;
    }
    
    const { error } = await supabase
      .from('anime_cache')
      .delete()
      .eq('id', id);
    
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    
    res.json({ 
      message: 'Anime deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting anime:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to delete anime'
    });
  }
});

/**
 * GET /anime/:id/episodes
 * Get episodes for specific anime (public with optional auth)
 */
router.get('/:id/episodes', optionalAuthenticate, validateAnimeIdParam, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = (page - 1) * limit;
    
    const { data, error, count } = await supabase
      .from('episodes')
      .select('*', { count: 'exact' })
      .eq('anime_id', id)
      .order('episode_number', { ascending: true })
      .range(offset, offset + limit - 1);
    
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
    console.error('Error fetching anime episodes:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch episodes'
    });
  }
});

/**
 * GET /anime/popular
 * Get popular anime based on views/ratings (public)
 */
router.get('/popular', optionalAuthenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    
    const { data, error } = await supabase
      .from('anime_cache')
      .select('*')
      .order('score', { ascending: false })
      .limit(limit);
    
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    
    res.json({
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching popular anime:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch popular anime'
    });
  }
});

/**
 * GET /anime/trending
 * Get trending anime (public)
 */
router.get('/trending', optionalAuthenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    
    const { data, error } = await supabase
      .from('anime_cache')
      .select('*')
      .eq('status', 'ongoing')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    
    res.json({
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching trending anime:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch trending anime'
    });
  }
});

export default router;