// Supabase client functions for episode management and video streaming

import { supabase } from './client';
import type { 
  Episode, 
  VideoSource, 
  SubtitleTrack, 
  WatchSession, 
  PlayerSettings,
  EpisodeThumbnail,
  StreamingAnalytics,
  VideoQuality,
  DeviceType
} from '@/lib/types/episodes';

// Episode Management
export const episodes = {
  // Get all episodes for an anime
  getByAnime: async (animeId: number) => {
    const { data, error } = await supabase
      .from('episodes')
      .select(`
        *,
        video_sources (*),
        subtitle_tracks (*)
      `)
      .eq('anime_id', animeId)
      .order('season_number', { ascending: true })
      .order('episode_number', { ascending: true });
    
    return { data: data as Episode[], error };
  },

  // Get specific episode by ID
  getById: async (episodeId: string) => {
    const { data, error } = await supabase
      .from('episodes')
      .select(`
        *,
        video_sources (*),
        subtitle_tracks (*)
      `)
      .eq('id', episodeId)
      .single();
    
    return { data: data as Episode, error };
  },

  // Get episodes by season
  getBySeason: async (animeId: number, seasonNumber: number) => {
    const { data, error } = await supabase
      .from('episodes')
      .select(`
        *,
        video_sources (*),
        subtitle_tracks (*)
      `)
      .eq('anime_id', animeId)
      .eq('season_number', seasonNumber)
      .order('episode_number', { ascending: true });
    
    return { data: data as Episode[], error };
  },

  // Get next episode
  getNext: async (animeId: number, currentEpisodeNumber: number, seasonNumber: number = 1) => {
    const { data, error } = await supabase
      .from('episodes')
      .select(`
        *,
        video_sources (*),
        subtitle_tracks (*)
      `)
      .eq('anime_id', animeId)
      .eq('season_number', seasonNumber)
      .eq('episode_number', currentEpisodeNumber + 1)
      .single();
    
    return { data: data as Episode, error };
  },

  // Get previous episode
  getPrevious: async (animeId: number, currentEpisodeNumber: number, seasonNumber: number = 1) => {
    const { data, error } = await supabase
      .from('episodes')
      .select(`
        *,
        video_sources (*),
        subtitle_tracks (*)
      `)
      .eq('anime_id', animeId)
      .eq('season_number', seasonNumber)
      .eq('episode_number', currentEpisodeNumber - 1)
      .single();
    
    return { data: data as Episode, error };
  },

  // Search episodes
  search: async (animeId: number, query: string) => {
    const { data, error } = await supabase
      .from('episodes')
      .select(`
        *,
        video_sources (*),
        subtitle_tracks (*)
      `)
      .eq('anime_id', animeId)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order('episode_number', { ascending: true });
    
    return { data: data as Episode[], error };
  },

  // Update view count
  incrementViewCount: async (episodeId: string) => {
    const { error } = await supabase.rpc('increment_episode_views', {
      episode_id: episodeId
    });
    
    return { error };
  }
};

// Video Sources Management
export const videoSources = {
  // Get video sources for an episode
  getByEpisode: async (episodeId: string) => {
    const { data, error } = await supabase
      .from('video_sources')
      .select('*')
      .eq('episode_id', episodeId)
      .order('quality', { ascending: false }); // 4K first, then 1080p, etc.
    
    return { data: data as VideoSource[], error };
  },

  // Get primary video source for an episode
  getPrimary: async (episodeId: string, quality?: VideoQuality) => {
    let query = supabase
      .from('video_sources')
      .select('*')
      .eq('episode_id', episodeId)
      .eq('is_primary', true);

    if (quality) {
      query = query.eq('quality', quality);
    }
    
    const { data, error } = await query.single();
    return { data: data as VideoSource, error };
  }
};

// Subtitle Tracks Management
export const subtitleTracks = {
  // Get subtitle tracks for an episode
  getByEpisode: async (episodeId: string) => {
    const { data, error } = await supabase
      .from('subtitle_tracks')
      .select('*')
      .eq('episode_id', episodeId)
      .order('is_default', { ascending: false }); // Default subtitles first
    
    return { data: data as SubtitleTrack[], error };
  }
};

// Watch Sessions Management
export const watchSessions = {
  // Create a new watch session
  create: async (userId: string, episodeId: string, deviceType?: DeviceType) => {
    const { data, error } = await supabase
      .from('watch_sessions')
      .insert({
        user_id: userId,
        episode_id: episodeId,
        device_type: deviceType,
        session_start: new Date().toISOString()
      })
      .select()
      .single();
    
    return { data: data as WatchSession, error };
  },

  // Update watch progress
  updateProgress: async (
    sessionId: string, 
    currentTime: number, 
    duration: number,
    additionalData?: Partial<WatchSession>
  ) => {
    const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
    const completed = progressPercentage >= 90; // Mark as completed at 90%

    const { data, error } = await supabase
      .from('watch_sessions')
      .update({
        last_position: Math.floor(currentTime),
        progress_percentage: progressPercentage,
        total_duration: Math.floor(duration),
        completed,
        updated_at: new Date().toISOString(),
        ...additionalData
      })
      .eq('id', sessionId)
      .select()
      .single();
    
    return { data: data as WatchSession, error };
  },

  // End watch session
  end: async (sessionId: string, finalStats?: Partial<WatchSession>) => {
    const { data, error } = await supabase
      .from('watch_sessions')
      .update({
        session_end: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...finalStats
      })
      .eq('id', sessionId)
      .select()
      .single();
    
    return { data: data as WatchSession, error };
  },

  // Get user's watch progress for an anime
  getAnimeProgress: async (userId: string, animeId: number) => {
    const { data, error } = await supabase
      .from('watch_sessions')
      .select(`
        episode_id,
        progress_percentage,
        last_position,
        completed,
        updated_at,
        episodes!inner(anime_id, episode_number, season_number, title, thumbnail_url)
      `)
      .eq('user_id', userId)
      .eq('episodes.anime_id', animeId)
      .order('updated_at', { ascending: false });
    
    return { data, error };
  },

  // Get latest watch session for an episode
  getLatest: async (userId: string, episodeId: string) => {
    const { data, error } = await supabase
      .from('watch_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('episode_id', episodeId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
    
    return { data: data as WatchSession, error };
  },

  // Get continue watching list
  getContinueWatching: async (userId: string, limit: number = 10) => {
    const { data, error } = await supabase
      .from('watch_sessions')
      .select(`
        *,
        episodes!inner(
          *,
          anime_cache!inner(title_romaji, title_english, cover_image_medium)
        )
      `)
      .eq('user_id', userId)
      .eq('completed', false)
      .gte('progress_percentage', 5) // At least 5% watched
      .order('updated_at', { ascending: false })
      .limit(limit);
    
    return { data, error };
  }
};

// Player Settings Management
export const playerSettings = {
  // Get user's player settings
  get: async (userId: string) => {
    const { data, error } = await supabase
      .from('player_settings')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    return { data: data as PlayerSettings, error };
  },

  // Update player settings
  update: async (userId: string, settings: Partial<PlayerSettings>) => {
    const { data, error } = await supabase
      .from('player_settings')
      .upsert({
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    return { data: data as PlayerSettings, error };
  }
};

// Episode Thumbnails Management
export const episodeThumbnails = {
  // Get thumbnails for episode (for progress bar previews)
  getByEpisode: async (episodeId: string) => {
    const { data, error } = await supabase
      .from('episode_thumbnails')
      .select('*')
      .eq('episode_id', episodeId)
      .order('timestamp_seconds', { ascending: true });
    
    return { data: data as EpisodeThumbnail[], error };
  },

  // Get thumbnail for specific timestamp
  getAtTimestamp: async (episodeId: string, timestampSeconds: number) => {
    const { data, error } = await supabase
      .from('episode_thumbnails')
      .select('*')
      .eq('episode_id', episodeId)
      .lte('timestamp_seconds', timestampSeconds)
      .order('timestamp_seconds', { ascending: false })
      .limit(1)
      .single();
    
    return { data: data as EpisodeThumbnail, error };
  }
};

// Streaming Analytics
export const streamingAnalytics = {
  // Log streaming event
  logEvent: async (
    sessionId: string,
    eventType: string,
    eventData?: Record<string, any>,
    performanceMetrics?: {
      bufferHealth?: number;
      networkSpeed?: number;
      cpuUsage?: number;
      memoryUsage?: number;
    }
  ) => {
    const { error } = await supabase
      .from('streaming_analytics')
      .insert({
        session_id: sessionId,
        event_type: eventType,
        event_data: eventData,
        buffer_health: performanceMetrics?.bufferHealth,
        network_speed: performanceMetrics?.networkSpeed,
        cpu_usage: performanceMetrics?.cpuUsage,
        memory_usage: performanceMetrics?.memoryUsage
      });
    
    return { error };
  },

  // Get analytics for a session
  getBySession: async (sessionId: string) => {
    const { data, error } = await supabase
      .from('streaming_analytics')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    
    return { data: data as StreamingAnalytics[], error };
  }
};

// Utility Functions
export const episodeUtils = {
  // Format episode title
  formatEpisodeTitle: (episode: Episode) => {
    if (episode.title) {
      return `${episode.episodeNumber}. ${episode.title}`;
    }
    return `Episode ${episode.episodeNumber}`;
  },

  // Format duration
  formatDuration: (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  },

  // Calculate completion percentage
  calculateCompletion: (currentTime: number, duration: number) => {
    if (duration === 0) return 0;
    return Math.min(100, (currentTime / duration) * 100);
  },

  // Check if episode should be marked as completed
  isCompleted: (currentTime: number, duration: number, threshold: number = 0.9) => {
    if (duration === 0) return false;
    return (currentTime / duration) >= threshold;
  },

  // Get optimal video quality based on network speed
  getOptimalQuality: (networkSpeedKbps: number): VideoQuality => {
    if (networkSpeedKbps >= 25000) return '4K';
    if (networkSpeedKbps >= 8000) return '1080p';
    if (networkSpeedKbps >= 3000) return '720p';
    return '480p';
  }
};