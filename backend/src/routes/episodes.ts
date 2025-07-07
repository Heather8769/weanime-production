import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticate, requireAdmin, requireModerator, optionalAuthenticate } from '../middleware/auth.js';
import { AuthenticatedRequest } from '../types/auth.js';
import { 
  validateCreateEpisode, 
  validateUpdateEpisode, 
  validateEpisodeQuery, 
  validateEpisodeIdParam,
  validateUpdateProgress,
  validateCreateVideoSource
} from '../validation/middleware/episode.js';

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
 * GET /episodes
 * Get episodes with filtering and pagination (public with optional auth)
 */
router.get('/', optionalAuthenticate, validateEpisodeQuery, async (req: AuthenticatedRequest, res) => {
  try {
    const { 
      anime_id, 
      season, 
      type, 
      sort_by, 
      order, 
      page, 
      limit 
    } = req.query as any;
    
    const offset = (page - 1) * limit;
    
    let query = getSupabase()
      .from('episodes')
      .select(`
        *,
        anime_cache (
          id, title, poster_url, type, status
        )
      `, { count: 'exact' });
    
    // Apply filters
    if (anime_id) {
      query = query.eq('anime_id', anime_id);
    }
    
    if (season) {
      query = query.eq('season_number', season);
    }
    
    if (type) {
      query = query.eq('type', type);
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
    console.error('Error fetching episodes:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch episodes'
    });
  }
});

/**
 * GET /episodes/:id
 * Get specific episode by ID (public with optional auth)
 */
router.get('/:id', optionalAuthenticate, validateEpisodeIdParam, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth?.user.id;
    
    const { data, error } = await getSupabase()
      .from('episodes')
      .select(`
        *,
        anime_cache (
          id, title, poster_url, type, status, year, genres
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ 
          error: 'Episode not found',
          message: 'The requested episode does not exist'
        });
        return;
      }
      res.status(500).json({ error: error.message });
      return;
    }
    
    // Get video sources
    const { data: videoSources } = await getSupabase()
      .from('video_sources')
      .select('*')
      .eq('episode_id', id)
      .order('quality', { ascending: false });
    
    // Get watch progress if user is authenticated
    let watchProgress = null;
    if (userId) {
      const { data: progress } = await getSupabase()
        .from('watch_sessions')
        .select('*')
        .eq('episode_id', id)
        .eq('user_id', userId)
        .order('session_start', { ascending: false })
        .limit(1)
        .single();
      
      watchProgress = progress;
    }
    
    res.json({
      ...data,
      video_sources: videoSources || [],
      watch_progress: watchProgress
    });
  } catch (error) {
    console.error('Error fetching episode:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch episode'
    });
  }
});

/**
 * POST /episodes
 * Create new episode (Admin/Moderator only)
 */
router.post('/', authenticate, requireModerator, validateCreateEpisode, async (req: AuthenticatedRequest, res) => {
  try {
    const episodeData = req.body;
    
    // Verify anime exists
    const { data: anime } = await getSupabase()
      .from('anime_cache')
      .select('id')
      .eq('id', episodeData.anime_id)
      .single();
    
    if (!anime) {
      res.status(404).json({
        error: 'Anime not found',
        message: 'The specified anime does not exist'
      });
      return;
    }
    
    // Check if episode number already exists for this anime
    const { data: existing } = await getSupabase()
      .from('episodes')
      .select('id')
      .eq('anime_id', episodeData.anime_id)
      .eq('episode_number', episodeData.episode_number)
      .eq('season_number', episodeData.season_number || 1)
      .single();
    
    if (existing) {
      res.status(409).json({
        error: 'Episode already exists',
        message: 'An episode with this number already exists for this anime'
      });
      return;
    }
    
    const { data, error } = await getSupabase()
      .from('episodes')
      .insert({
        ...episodeData,
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
      message: 'Episode created successfully'
    });
  } catch (error) {
    console.error('Error creating episode:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to create episode'
    });
  }
});

/**
 * PUT /episodes/:id
 * Update episode (Admin/Moderator only)
 */
router.put('/:id', authenticate, requireModerator, validateEpisodeIdParam, validateUpdateEpisode, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const { data, error } = await getSupabase()
      .from('episodes')
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
          error: 'Episode not found',
          message: 'The episode to update does not exist'
        });
        return;
      }
      res.status(500).json({ error: error.message });
      return;
    }
    
    res.json({
      data,
      message: 'Episode updated successfully'
    });
  } catch (error) {
    console.error('Error updating episode:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to update episode'
    });
  }
});

/**
 * DELETE /episodes/:id
 * Delete episode (Admin only)
 */
router.delete('/:id', authenticate, requireAdmin, validateEpisodeIdParam, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    
    // Delete associated video sources first
    await getSupabase()
      .from('video_sources')
      .delete()
      .eq('episode_id', id);
    
    // Delete watch sessions
    await getSupabase()
      .from('watch_sessions')
      .delete()
      .eq('episode_id', id);
    
    // Delete the episode
    const { error } = await getSupabase()
      .from('episodes')
      .delete()
      .eq('id', id);
    
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    
    res.json({ 
      message: 'Episode deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting episode:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to delete episode'
    });
  }
});

/**
 * POST /episodes/:id/video-sources
 * Add video source to episode (Admin/Moderator only)
 */
router.post('/:id/video-sources', authenticate, requireModerator, validateEpisodeIdParam, validateCreateVideoSource, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const videoSourceData = req.body;
    
    // Verify episode exists
    const { data: episode } = await getSupabase()
      .from('episodes')
      .select('id')
      .eq('id', id)
      .single();
    
    if (!episode) {
      res.status(404).json({
        error: 'Episode not found',
        message: 'The specified episode does not exist'
      });
      return;
    }
    
    // Check if video source with same quality already exists
    const { data: existing } = await getSupabase()
      .from('video_sources')
      .select('id')
      .eq('episode_id', id)
      .eq('quality', videoSourceData.quality)
      .single();
    
    if (existing) {
      res.status(409).json({
        error: 'Video source already exists',
        message: 'A video source with this quality already exists for this episode'
      });
      return;
    }
    
    const { data, error } = await getSupabase()
      .from('video_sources')
      .insert({
        ...videoSourceData,
        episode_id: id,
        created_at: new Date().toISOString(),
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
      message: 'Video source added successfully'
    });
  } catch (error) {
    console.error('Error adding video source:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to add video source'
    });
  }
});

/**
 * POST /episodes/:id/watch
 * Track watch progress (protected)
 */
router.post('/:id/watch', authenticate, validateEpisodeIdParam, validateUpdateProgress, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth?.user.id;
    const progressData = req.body;
    
    // Verify episode exists
    const { data: episode } = await getSupabase()
      .from('episodes')
      .select('id, anime_id')
      .eq('id', id)
      .single();
    
    if (!episode) {
      res.status(404).json({
        error: 'Episode not found',
        message: 'The specified episode does not exist'
      });
      return;
    }
    
    // Check if watch session already exists
    const { data: existing } = await getSupabase()
      .from('watch_sessions')
      .select('id')
      .eq('episode_id', id)
      .eq('user_id', userId)
      .single();
    
    let data, error;
    
    if (existing) {
      // Update existing session
      ({ data, error } = await getSupabase()
        .from('watch_sessions')
        .update({
          ...progressData,
          session_end: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single());
    } else {
      // Create new session
      ({ data, error } = await getSupabase()
        .from('watch_sessions')
        .insert({
          episode_id: id,
          anime_id: episode.anime_id,
          user_id: userId,
          ...progressData,
          session_start: new Date().toISOString(),
          session_end: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
        .select()
        .single());
    }
    
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    
    res.json({
      data,
      message: 'Watch progress updated successfully'
    });
  } catch (error) {
    console.error('Error updating watch progress:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to update watch progress'
    });
  }
});

/**
 * GET /episodes/:id/next
 * Get next episode in series (public with optional auth)
 */
router.get('/:id/next', optionalAuthenticate, validateEpisodeIdParam, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    
    // Get current episode
    const { data: currentEpisode } = await getSupabase()
      .from('episodes')
      .select('anime_id, episode_number, season_number')
      .eq('id', id)
      .single();
    
    if (!currentEpisode) {
      res.status(404).json({
        error: 'Episode not found',
        message: 'The current episode does not exist'
      });
      return;
    }
    
    // Find next episode
    const { data: nextEpisode } = await getSupabase()
      .from('episodes')
      .select('*')
      .eq('anime_id', currentEpisode.anime_id)
      .eq('season_number', currentEpisode.season_number)
      .gt('episode_number', currentEpisode.episode_number)
      .order('episode_number', { ascending: true })
      .limit(1)
      .single();
    
    if (!nextEpisode) {
      // Try next season
      const { data: nextSeasonEpisode } = await getSupabase()
        .from('episodes')
        .select('*')
        .eq('anime_id', currentEpisode.anime_id)
        .gt('season_number', currentEpisode.season_number)
        .order('season_number', { ascending: true })
        .order('episode_number', { ascending: true })
        .limit(1)
        .single();
      
      if (!nextSeasonEpisode) {
        res.status(404).json({
          error: 'No next episode',
          message: 'This is the last available episode'
        });
        return;
      }
      
      res.json(nextSeasonEpisode);
      return;
    }
    
    res.json(nextEpisode);
  } catch (error) {
    console.error('Error fetching next episode:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch next episode'
    });
  }
});

/**
 * GET /episodes/:id/previous
 * Get previous episode in series (public with optional auth)
 */
router.get('/:id/previous', optionalAuthenticate, validateEpisodeIdParam, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    
    // Get current episode
    const { data: currentEpisode } = await getSupabase()
      .from('episodes')
      .select('anime_id, episode_number, season_number')
      .eq('id', id)
      .single();
    
    if (!currentEpisode) {
      res.status(404).json({
        error: 'Episode not found',
        message: 'The current episode does not exist'
      });
      return;
    }
    
    // Find previous episode
    const { data: previousEpisode } = await getSupabase()
      .from('episodes')
      .select('*')
      .eq('anime_id', currentEpisode.anime_id)
      .eq('season_number', currentEpisode.season_number)
      .lt('episode_number', currentEpisode.episode_number)
      .order('episode_number', { ascending: false })
      .limit(1)
      .single();
    
    if (!previousEpisode) {
      // Try previous season
      const { data: previousSeasonEpisode } = await getSupabase()
        .from('episodes')
        .select('*')
        .eq('anime_id', currentEpisode.anime_id)
        .lt('season_number', currentEpisode.season_number)
        .order('season_number', { ascending: false })
        .order('episode_number', { ascending: false })
        .limit(1)
        .single();
      
      if (!previousSeasonEpisode) {
        res.status(404).json({
          error: 'No previous episode',
          message: 'This is the first available episode'
        });
        return;
      }
      
      res.json(previousSeasonEpisode);
      return;
    }
    
    res.json(previousEpisode);
  } catch (error) {
    console.error('Error fetching previous episode:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch previous episode'
    });
  }
});

export default router;