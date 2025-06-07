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
      watch_progress: {
        Row: {
          id: string
          user_id: string
          anime_id: number
          episode_id: string
          episode_number: number
          progress_seconds: number
          duration_seconds: number
          completed: boolean
          last_watched: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          anime_id: number
          episode_id: string
          episode_number: number
          progress_seconds?: number
          duration_seconds?: number
          completed?: boolean
          last_watched?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          anime_id?: number
          episode_id?: string
          episode_number?: number
          progress_seconds?: number
          duration_seconds?: number
          completed?: boolean
          last_watched?: string
          created_at?: string
          updated_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          user_id: string
          anime_id: number | null
          episode_id: string | null
          parent_id: string | null
          content: string
          is_spoiler: boolean
          upvotes: number
          downvotes: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          anime_id?: number | null
          episode_id?: string | null
          parent_id?: string | null
          content: string
          is_spoiler?: boolean
          upvotes?: number
          downvotes?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          anime_id?: number | null
          episode_id?: string | null
          parent_id?: string | null
          content?: string
          is_spoiler?: boolean
          upvotes?: number
          downvotes?: number
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
      watchlist_status: 'watching' | 'completed' | 'dropped' | 'plan_to_watch' | 'on_hold'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
