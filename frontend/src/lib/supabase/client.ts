// Supabase client configuration for WeAnime
import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

// Create Supabase client for client components
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Helper functions for common operations

// Auth helpers
export const auth = {
  signUp: async (email: string, password: string, metadata?: any) => {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
  },

  signIn: async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({
      email,
      password,
    });
  },

  signOut: async () => {
    return supabase.auth.signOut();
  },

  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  getSession: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },
};

// User profile helpers
export const userProfiles = {
  get: async (userId: string) => {
    return supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
  },

  update: async (userId: string, updates: any) => {
    return supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId);
  },

  getByUsername: async (username: string) => {
    return supabase
      .from('user_profiles')
      .select('*')
      .eq('username', username)
      .single();
  },
};

// Bookmark helpers
export const bookmarks = {
  add: async (userId: string, animeId: number, animeData: any) => {
    return supabase
      .from('user_bookmarks')
      .insert({
        user_id: userId,
        anime_id: animeId,
        anime_title: animeData.title,
        anime_cover_image: animeData.image,
        total_episodes: animeData.episodes,
      });
  },

  remove: async (userId: string, animeId: number) => {
    return supabase
      .from('user_bookmarks')
      .delete()
      .eq('user_id', userId)
      .eq('anime_id', animeId);
  },

  get: async (userId: string) => {
    return supabase
      .from('user_bookmarks')
      .select('*')
      .eq('user_id', userId)
      .order('added_at', { ascending: false });
  },

  updateStatus: async (userId: string, animeId: number, status: string) => {
    return supabase
      .from('user_bookmarks')
      .update({ watch_status: status })
      .eq('user_id', userId)
      .eq('anime_id', animeId);
  },

  updateProgress: async (userId: string, animeId: number, progress: number) => {
    return supabase
      .from('user_bookmarks')
      .update({ progress })
      .eq('user_id', userId)
      .eq('anime_id', animeId);
  },

  setRating: async (userId: string, animeId: number, rating: number) => {
    return supabase
      .from('user_bookmarks')
      .update({ rating })
      .eq('user_id', userId)
      .eq('anime_id', animeId);
  },

  toggleFavorite: async (userId: string, animeId: number) => {
    // First get current favorite status
    const { data: bookmark } = await supabase
      .from('user_bookmarks')
      .select('is_favorite')
      .eq('user_id', userId)
      .eq('anime_id', animeId)
      .single();

    if (bookmark) {
      return supabase
        .from('user_bookmarks')
        .update({ is_favorite: !bookmark.is_favorite })
        .eq('user_id', userId)
        .eq('anime_id', animeId);
    }
    return { error: 'Bookmark not found' };
  },

  checkExists: async (userId: string, animeId: number) => {
    const { data } = await supabase
      .from('user_bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('anime_id', animeId)
      .single();
    
    return !!data;
  },
};

// Watch history helpers
export const watchHistory = {
  add: async (userId: string, animeId: number, episodeNumber: number, progressSeconds = 0) => {
    return supabase
      .from('watch_history')
      .upsert({
        user_id: userId,
        anime_id: animeId,
        episode_number: episodeNumber,
        progress_seconds: progressSeconds,
        watched_at: new Date().toISOString(),
      });
  },

  get: async (userId: string, limit = 50) => {
    return supabase
      .from('watch_history')
      .select('*')
      .eq('user_id', userId)
      .order('watched_at', { ascending: false })
      .limit(limit);
  },

  getForAnime: async (userId: string, animeId: number) => {
    return supabase
      .from('watch_history')
      .select('*')
      .eq('user_id', userId)
      .eq('anime_id', animeId)
      .order('episode_number', { ascending: true });
  },

  updateProgress: async (userId: string, animeId: number, episodeNumber: number, progressSeconds: number, durationSeconds?: number) => {
    return supabase
      .from('watch_history')
      .upsert({
        user_id: userId,
        anime_id: animeId,
        episode_number: episodeNumber,
        progress_seconds: progressSeconds,
        duration_seconds: durationSeconds,
        completed: durationSeconds ? (progressSeconds / durationSeconds) > 0.9 : false,
        watched_at: new Date().toISOString(),
      });
  },
};

// Comments helpers
export const comments = {
  add: async (userId: string, animeId: number, content: string, episodeNumber?: number, parentId?: string) => {
    return supabase
      .from('comments')
      .insert({
        user_id: userId,
        anime_id: animeId,
        content,
        episode_number: episodeNumber,
        parent_id: parentId,
      });
  },

  get: async (animeId: number, episodeNumber?: number) => {
    let query = supabase
      .from('comments')
      .select(`
        *,
        user_profiles (username, display_name, avatar_url)
      `)
      .eq('anime_id', animeId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (episodeNumber !== undefined) {
      query = query.eq('episode_number', episodeNumber);
    } else {
      query = query.is('episode_number', null);
    }

    return query;
  },

  update: async (commentId: string, content: string) => {
    return supabase
      .from('comments')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', commentId);
  },

  delete: async (commentId: string) => {
    return supabase
      .from('comments')
      .update({ is_deleted: true })
      .eq('id', commentId);
  },

  vote: async (userId: string, commentId: string, isUpvote: boolean) => {
    return supabase
      .from('comment_votes')
      .upsert({
        user_id: userId,
        comment_id: commentId,
        is_upvote: isUpvote,
      });
  },

  removeVote: async (userId: string, commentId: string) => {
    return supabase
      .from('comment_votes')
      .delete()
      .eq('user_id', userId)
      .eq('comment_id', commentId);
  },
};

// Search history helpers
export const searchHistory = {
  add: async (userId: string | null, searchTerm: string, resultsCount: number, clickedAnimeId?: number) => {
    return supabase
      .from('search_history')
      .insert({
        user_id: userId,
        search_term: searchTerm,
        results_count: resultsCount,
        clicked_anime_id: clickedAnimeId,
      });
  },

  get: async (userId: string, limit = 20) => {
    return supabase
      .from('search_history')
      .select('search_term')
      .eq('user_id', userId)
      .order('searched_at', { ascending: false })
      .limit(limit);
  },

  getPopular: async (limit = 10) => {
    return supabase
      .from('search_history')
      .select('search_term')
      .gte('searched_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      .order('searched_at', { ascending: false })
      .limit(limit);
  },
};

// Anime cache helpers
export const animeCache = {
  get: async (animeId: number) => {
    return supabase
      .from('anime_cache')
      .select('*')
      .eq('id', animeId)
      .single();
  },

  set: async (animeData: any) => {
    return supabase
      .from('anime_cache')
      .upsert({
        id: animeData.id,
        title_romaji: animeData.title.romaji,
        title_english: animeData.title.english,
        title_native: animeData.title.native,
        description: animeData.description,
        cover_image_large: animeData.coverImage.large,
        cover_image_medium: animeData.coverImage.medium,
        banner_image: animeData.bannerImage,
        average_score: animeData.averageScore,
        season_year: animeData.seasonYear,
        genres: animeData.genres,
        episodes: animeData.episodes,
        status: animeData.status,
        format: animeData.format,
        trailer_id: animeData.trailer?.id,
        trailer_site: animeData.trailer?.site,
        studios: animeData.studios?.nodes?.map((studio: any) => studio.name) || [],
        is_adult: animeData.isAdult,
      });
  },

  search: async (searchTerm: string) => {
    return supabase
      .from('anime_cache')
      .select('*')
      .or(`title_romaji.ilike.%${searchTerm}%,title_english.ilike.%${searchTerm}%`)
      .order('average_score', { ascending: false })
      .limit(20);
  },
};

// Notifications helpers
export const notifications = {
  get: async (userId: string) => {
    return supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
  },

  markAsRead: async (notificationId: string) => {
    return supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
  },

  markAllAsRead: async (userId: string) => {
    return supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
  },

  getUnreadCount: async (userId: string) => {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    
    return count || 0;
  },
};