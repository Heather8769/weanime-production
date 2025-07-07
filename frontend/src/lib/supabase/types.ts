// TypeScript types for Supabase database
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
      user_profiles: {
        Row: {
          id: string
          username: string
          display_name: string | null
          bio: string | null
          avatar_url: string | null
          role: 'user' | 'admin' | 'moderator'
          preferences: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          role?: 'user' | 'admin' | 'moderator'
          preferences?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          role?: 'user' | 'admin' | 'moderator'
          preferences?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      anime_cache: {
        Row: {
          id: number
          title_romaji: string
          title_english: string | null
          title_native: string | null
          description: string | null
          cover_image_large: string | null
          cover_image_medium: string | null
          banner_image: string | null
          average_score: number | null
          season_year: number | null
          genres: string[]
          episodes: number | null
          status: string | null
          format: string | null
          trailer_id: string | null
          trailer_site: string | null
          studios: string[]
          is_adult: boolean
          cached_at: string
          updated_at: string
        }
        Insert: {
          id: number
          title_romaji: string
          title_english?: string | null
          title_native?: string | null
          description?: string | null
          cover_image_large?: string | null
          cover_image_medium?: string | null
          banner_image?: string | null
          average_score?: number | null
          season_year?: number | null
          genres?: string[]
          episodes?: number | null
          status?: string | null
          format?: string | null
          trailer_id?: string | null
          trailer_site?: string | null
          studios?: string[]
          is_adult?: boolean
          cached_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          title_romaji?: string
          title_english?: string | null
          title_native?: string | null
          description?: string | null
          cover_image_large?: string | null
          cover_image_medium?: string | null
          banner_image?: string | null
          average_score?: number | null
          season_year?: number | null
          genres?: string[]
          episodes?: number | null
          status?: string | null
          format?: string | null
          trailer_id?: string | null
          trailer_site?: string | null
          studios?: string[]
          is_adult?: boolean
          cached_at?: string
          updated_at?: string
        }
      }
      user_bookmarks: {
        Row: {
          id: string
          user_id: string
          anime_id: number
          anime_title: string
          anime_cover_image: string | null
          watch_status: 'watching' | 'completed' | 'plan_to_watch' | 'on_hold' | 'dropped'
          rating: number | null
          progress: number
          total_episodes: number | null
          notes: string | null
          is_favorite: boolean
          added_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          anime_id: number
          anime_title: string
          anime_cover_image?: string | null
          watch_status?: 'watching' | 'completed' | 'plan_to_watch' | 'on_hold' | 'dropped'
          rating?: number | null
          progress?: number
          total_episodes?: number | null
          notes?: string | null
          is_favorite?: boolean
          added_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          anime_id?: number
          anime_title?: string
          anime_cover_image?: string | null
          watch_status?: 'watching' | 'completed' | 'plan_to_watch' | 'on_hold' | 'dropped'
          rating?: number | null
          progress?: number
          total_episodes?: number | null
          notes?: string | null
          is_favorite?: boolean
          added_at?: string
          updated_at?: string
        }
      }
      watch_history: {
        Row: {
          id: string
          user_id: string
          anime_id: number
          episode_number: number
          progress_seconds: number
          duration_seconds: number | null
          completed: boolean
          watched_at: string
        }
        Insert: {
          id?: string
          user_id: string
          anime_id: number
          episode_number: number
          progress_seconds?: number
          duration_seconds?: number | null
          completed?: boolean
          watched_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          anime_id?: number
          episode_number?: number
          progress_seconds?: number
          duration_seconds?: number | null
          completed?: boolean
          watched_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          user_id: string
          anime_id: number
          episode_number: number | null
          content: string
          is_spoiler: boolean
          parent_id: string | null
          upvotes: number
          downvotes: number
          is_deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          anime_id: number
          episode_number?: number | null
          content: string
          is_spoiler?: boolean
          parent_id?: string | null
          upvotes?: number
          downvotes?: number
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          anime_id?: number
          episode_number?: number | null
          content?: string
          is_spoiler?: boolean
          parent_id?: string | null
          upvotes?: number
          downvotes?: number
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      comment_votes: {
        Row: {
          id: string
          user_id: string
          comment_id: string
          is_upvote: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          comment_id: string
          is_upvote: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          comment_id?: string
          is_upvote?: boolean
          created_at?: string
        }
      }
      search_history: {
        Row: {
          id: string
          user_id: string | null
          search_term: string
          results_count: number | null
          clicked_anime_id: number | null
          searched_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          search_term: string
          results_count?: number | null
          clicked_anime_id?: number | null
          searched_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          search_term?: string
          results_count?: number | null
          clicked_anime_id?: number | null
          searched_at?: string
        }
      }
      featured_anime: {
        Row: {
          id: string
          anime_id: number
          title: string
          description: string | null
          banner_image: string | null
          trailer_url: string | null
          is_active: boolean
          start_date: string | null
          end_date: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          anime_id: number
          title: string
          description?: string | null
          banner_image?: string | null
          trailer_url?: string | null
          is_active?: boolean
          start_date?: string | null
          end_date?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          anime_id?: number
          title?: string
          description?: string | null
          banner_image?: string | null
          trailer_url?: string | null
          is_active?: boolean
          start_date?: string | null
          end_date?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string
          anime_id: number | null
          is_read: boolean
          action_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type?: string
          anime_id?: number | null
          is_read?: boolean
          action_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: string
          anime_id?: number | null
          is_read?: boolean
          action_url?: string | null
          created_at?: string
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
      user_role: 'user' | 'admin' | 'moderator'
      anime_status: 'SUB' | 'DUB' | 'BOTH'
      quality_type: '480p' | '720p' | '1080p' | '4K'
      watch_status: 'watching' | 'completed' | 'plan_to_watch' | 'on_hold' | 'dropped'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for common operations
export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type UserBookmark = Database['public']['Tables']['user_bookmarks']['Row'];
export type WatchHistory = Database['public']['Tables']['watch_history']['Row'];
export type Comment = Database['public']['Tables']['comments']['Row'];
export type AnimeCache = Database['public']['Tables']['anime_cache']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];

export type WatchStatus = Database['public']['Enums']['watch_status'];
export type UserRole = Database['public']['Enums']['user_role'];
export type AnimeStatus = Database['public']['Enums']['anime_status'];
export type QualityType = Database['public']['Enums']['quality_type'];