// User Authentication Service
// Integrates with Supabase Auth for secure user management

import { createClient } from '@supabase/supabase-js'
import { getEnvConfig } from './env-validation'

export interface User {
  id: string
  email: string
  username?: string
  avatar_url?: string
  created_at: string
  subscription_tier: 'free' | 'premium' | 'pro'
  preferences: UserPreferences
}

export interface UserPreferences {
  language: string
  subtitle_language: string
  video_quality: string
  auto_play: boolean
  skip_intro: boolean
  dark_mode: boolean
  notifications: {
    new_episodes: boolean
    recommendations: boolean
    updates: boolean
  }
}

export interface WatchlistItem {
  id: string
  user_id: string
  anime_id: number
  anime_title: string
  anime_image: string
  status: 'watching' | 'completed' | 'plan_to_watch' | 'dropped' | 'on_hold'
  current_episode: number
  total_episodes: number
  rating?: number
  notes?: string
  added_at: string
  updated_at: string
}

export interface WatchHistory {
  id: string
  user_id: string
  anime_id: number
  episode_number: number
  watch_time: number
  total_time: number
  completed: boolean
  watched_at: string
}

class AuthService {
  private supabase
  private currentUser: User | null = null

  constructor() {
    const config = getEnvConfig()
    this.supabase = createClient(
      config.supabase.url,
      config.supabase.anonKey
    )
  }

  // Authentication Methods
  async signUp(email: string, password: string, username?: string): Promise<{ user: User | null, error: string | null }> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username || email.split('@')[0],
            subscription_tier: 'free',
            preferences: this.getDefaultPreferences()
          }
        }
      })

      if (error) {
        return { user: null, error: error.message }
      }

      if (data.user) {
        const user = await this.createUserProfile(data.user)
        return { user, error: null }
      }

      return { user: null, error: 'Failed to create user' }
    } catch (error) {
      return { user: null, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async signIn(email: string, password: string): Promise<{ user: User | null, error: string | null }> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        return { user: null, error: error.message }
      }

      if (data.user) {
        const user = await this.getUserProfile(data.user.id)
        this.currentUser = user
        return { user, error: null }
      }

      return { user: null, error: 'Failed to sign in' }
    } catch (error) {
      return { user: null, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async signOut(): Promise<{ error: string | null }> {
    try {
      const { error } = await this.supabase.auth.signOut()
      this.currentUser = null
      return { error: error?.message || null }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async getCurrentUser(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser
    }

    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (user) {
        this.currentUser = await this.getUserProfile(user.id)
        return this.currentUser
      }
      return null
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  }

  // User Profile Methods
  private async createUserProfile(authUser: any): Promise<User> {
    const userProfile: User = {
      id: authUser.id,
      email: authUser.email,
      username: authUser.user_metadata?.username || authUser.email.split('@')[0],
      avatar_url: authUser.user_metadata?.avatar_url,
      created_at: authUser.created_at,
      subscription_tier: 'free',
      preferences: this.getDefaultPreferences()
    }

    // Store in Supabase
    await this.supabase
      .from('user_profiles')
      .insert(userProfile)

    return userProfile
  }

  private async getUserProfile(userId: string): Promise<User | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error || !data) {
        console.error('Error fetching user profile:', error)
        return null
      }

      return data as User
    } catch (error) {
      console.error('Error getting user profile:', error)
      return null
    }
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      language: 'en',
      subtitle_language: 'en',
      video_quality: '1080p',
      auto_play: true,
      skip_intro: true,
      dark_mode: true,
      notifications: {
        new_episodes: true,
        recommendations: true,
        updates: false
      }
    }
  }

  // Watchlist Methods
  async addToWatchlist(animeId: number, animeTitle: string, animeImage: string, status: WatchlistItem['status'] = 'plan_to_watch'): Promise<{ success: boolean, error?: string }> {
    const user = await this.getCurrentUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    try {
      const watchlistItem: Omit<WatchlistItem, 'id'> = {
        user_id: user.id,
        anime_id: animeId,
        anime_title: animeTitle,
        anime_image: animeImage,
        status,
        current_episode: 0,
        total_episodes: 0, // Will be updated when episode info is available
        added_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { error } = await this.supabase
        .from('watchlist')
        .insert(watchlistItem)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async removeFromWatchlist(animeId: number): Promise<{ success: boolean, error?: string }> {
    const user = await this.getCurrentUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    try {
      const { error } = await this.supabase
        .from('watchlist')
        .delete()
        .eq('user_id', user.id)
        .eq('anime_id', animeId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async getWatchlist(): Promise<WatchlistItem[]> {
    const user = await this.getCurrentUser()
    if (!user) {
      return []
    }

    try {
      const { data, error } = await this.supabase
        .from('watchlist')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error fetching watchlist:', error)
        return []
      }

      return data as WatchlistItem[]
    } catch (error) {
      console.error('Error getting watchlist:', error)
      return []
    }
  }

  async updateWatchProgress(animeId: number, episodeNumber: number, watchTime: number, totalTime: number): Promise<{ success: boolean, error?: string }> {
    const user = await this.getCurrentUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    try {
      // Update watchlist progress
      await this.supabase
        .from('watchlist')
        .update({
          current_episode: episodeNumber,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('anime_id', animeId)

      // Record watch history
      const watchHistory: Omit<WatchHistory, 'id'> = {
        user_id: user.id,
        anime_id: animeId,
        episode_number: episodeNumber,
        watch_time: watchTime,
        total_time: totalTime,
        completed: watchTime >= totalTime * 0.9, // Consider 90% as completed
        watched_at: new Date().toISOString()
      }

      await this.supabase
        .from('watch_history')
        .insert(watchHistory)

      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

export const authService = new AuthService()
