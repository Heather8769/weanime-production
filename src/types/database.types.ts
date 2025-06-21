export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          email: string
          full_name: string | null
          avatar_url: string | null
          bio: string | null
          is_premium: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          is_premium?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          is_premium?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      anime: {
        Row: {
          id: number
          title_english: string | null
          title_romaji: string | null
          title_native: string | null
          description: string | null
          cover_image_large: string | null
          cover_image_medium: string | null
          banner_image: string | null
          average_score: number | null
          episodes: number | null
          status: string | null
          season: string | null
          season_year: number | null
          genres: string[] | null
          studios: string[] | null
          start_date: string | null
          end_date: string | null
          popularity: number | null
          trending_rank: number | null
          is_adult: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          title_english?: string | null
          title_romaji?: string | null
          title_native?: string | null
          description?: string | null
          cover_image_large?: string | null
          cover_image_medium?: string | null
          banner_image?: string | null
          average_score?: number | null
          episodes?: number | null
          status?: string | null
          season?: string | null
          season_year?: number | null
          genres?: string[] | null
          studios?: string[] | null
          start_date?: string | null
          end_date?: string | null
          popularity?: number | null
          trending_rank?: number | null
          is_adult?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          title_english?: string | null
          title_romaji?: string | null
          title_native?: string | null
          description?: string | null
          cover_image_large?: string | null
          cover_image_medium?: string | null
          banner_image?: string | null
          average_score?: number | null
          episodes?: number | null
          status?: string | null
          season?: string | null
          season_year?: number | null
          genres?: string[] | null
          studios?: string[] | null
          start_date?: string | null
          end_date?: string | null
          popularity?: number | null
          trending_rank?: number | null
          is_adult?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      watchlist: {
        Row: {
          id: string
          user_id: string
          anime_id: number
          status: 'watching' | 'completed' | 'dropped' | 'plan_to_watch' | 'on_hold'
          progress: number
          rating: number | null
          start_date: string | null
          finish_date: string | null
          notes: string | null
          favorite: boolean
          rewatching: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          anime_id: number
          status?: 'watching' | 'completed' | 'dropped' | 'plan_to_watch' | 'on_hold'
          progress?: number
          rating?: number | null
          start_date?: string | null
          finish_date?: string | null
          notes?: string | null
          favorite?: boolean
          rewatching?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          anime_id?: number
          status?: 'watching' | 'completed' | 'dropped' | 'plan_to_watch' | 'on_hold'
          progress?: number
          rating?: number | null
          start_date?: string | null
          finish_date?: string | null
          notes?: string | null
          favorite?: boolean
          rewatching?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      recent_episodes: {
        Row: {
          id: string
          user_id: string
          episode_id: string
          anime_id: number | null
          episode_number: number | null
          episode_title: string | null
          anime_title: string | null
          thumbnail_url: string | null
          progress_seconds: number
          duration_seconds: number | null
          completed: boolean
          watched_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          episode_id: string
          anime_id?: number | null
          episode_number?: number | null
          episode_title?: string | null
          anime_title?: string | null
          thumbnail_url?: string | null
          progress_seconds?: number
          duration_seconds?: number | null
          completed?: boolean
          watched_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          episode_id?: string
          anime_id?: number | null
          episode_number?: number | null
          episode_title?: string | null
          anime_title?: string | null
          thumbnail_url?: string | null
          progress_seconds?: number
          duration_seconds?: number | null
          completed?: boolean
          watched_at?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}