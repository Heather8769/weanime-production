// Recently Watched Episodes Helper Functions
// Implementation based on weanime_fix_guide_with_code.md

import { createClient } from '@/lib/supabase'

const supabase = createClient()

export interface RecentEpisode {
  id: string
  user_id: string
  episode_id: string
  anime_id?: number
  episode_number?: number
  episode_title?: string
  anime_title?: string
  thumbnail_url?: string
  progress_seconds: number
  duration_seconds?: number
  completed: boolean
  watched_at: string
  created_at: string
  updated_at: string
}

/**
 * Save a recently watched episode
 * Implementation from fix guide
 */
export async function saveRecentlyWatched(
  userId: string, 
  episodeId: string,
  options: {
    animeId?: number
    episodeNumber?: number
    episodeTitle?: string
    animeTitle?: string
    thumbnailUrl?: string
    progressSeconds?: number
    durationSeconds?: number
    completed?: boolean
  } = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('recent_episodes').upsert([
      { 
        user_id: userId, 
        episode_id: episodeId, 
        anime_id: options.animeId,
        episode_number: options.episodeNumber,
        episode_title: options.episodeTitle,
        anime_title: options.animeTitle,
        thumbnail_url: options.thumbnailUrl,
        progress_seconds: options.progressSeconds || 0,
        duration_seconds: options.durationSeconds,
        completed: options.completed || false,
        watched_at: new Date().toISOString()
      }
    ], {
      onConflict: 'user_id,episode_id'
    })
    
    if (error) {
      console.error("Failed to save episode", error)
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (error) {
    console.error("Failed to save episode", error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Retrieve recently watched episodes
 * Implementation from fix guide
 */
export async function fetchRecentEpisodes(
  userId: string,
  limit: number = 10
): Promise<{ data: RecentEpisode[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('recent_episodes')
      .select('*')
      .eq('user_id', userId)
      .order('watched_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Failed to fetch recent episodes", error)
      return { data: null, error: error.message }
    }

    return { data: data as RecentEpisode[], error: null }
  } catch (error) {
    console.error("Failed to fetch recent episodes", error)
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Update progress for a recently watched episode
 */
export async function updateEpisodeProgress(
  userId: string,
  episodeId: string,
  progressSeconds: number,
  durationSeconds?: number,
  completed?: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = {
      progress_seconds: progressSeconds,
      watched_at: new Date().toISOString()
    }

    if (durationSeconds !== undefined) {
      updateData.duration_seconds = durationSeconds
    }

    if (completed !== undefined) {
      updateData.completed = completed
    }

    const { error } = await supabase
      .from('recent_episodes')
      .update(updateData)
      .eq('user_id', userId)
      .eq('episode_id', episodeId)

    if (error) {
      console.error("Failed to update episode progress", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Failed to update episode progress", error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Remove a recently watched episode
 */
export async function removeRecentEpisode(
  userId: string,
  episodeId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('recent_episodes')
      .delete()
      .eq('user_id', userId)
      .eq('episode_id', episodeId)

    if (error) {
      console.error("Failed to remove recent episode", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Failed to remove recent episode", error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Get recently watched episodes for current authenticated user
 */
export async function getCurrentUserRecentEpisodes(
  limit: number = 10
): Promise<{ data: RecentEpisode[] | null; error: string | null }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { data: null, error: 'User not authenticated' }
    }

    return await fetchRecentEpisodes(user.id, limit)
  } catch (error) {
    console.error("Failed to get current user recent episodes", error)
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Save episode progress for current authenticated user
 */
export async function saveCurrentUserEpisodeProgress(
  episodeId: string,
  options: {
    animeId?: number
    episodeNumber?: number
    episodeTitle?: string
    animeTitle?: string
    thumbnailUrl?: string
    progressSeconds?: number
    durationSeconds?: number
    completed?: boolean
  } = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { success: false, error: 'User not authenticated' }
    }

    return await saveRecentlyWatched(user.id, episodeId, options)
  } catch (error) {
    console.error("Failed to save current user episode progress", error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
