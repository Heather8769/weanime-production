import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from './supabase'
import { AniListAnime } from './anilist'

export type WatchStatus = 'watching' | 'completed' | 'dropped' | 'plan_to_watch' | 'on_hold'

export interface WatchlistItem {
  id: string
  animeId: number
  status: WatchStatus
  progress: number // episodes watched
  rating: number | null // 1-10 rating
  startDate: Date | null
  finishDate: Date | null
  notes: string
  favorite: boolean
  rewatching: boolean
  createdAt: Date
  updatedAt: Date
}

export interface WatchlistStats {
  totalAnime: number
  watching: number
  completed: number
  planToWatch: number
  dropped: number
  onHold: number
  totalEpisodes: number
  totalWatchTime: number // in minutes
  averageRating: number
  favoriteGenres: string[]
}

interface WatchlistState {
  // Watchlist data
  watchlist: Map<number, WatchlistItem>
  isLoading: boolean
  error: string | null
  
  // Actions
  addToWatchlist: (anime: AniListAnime, status?: WatchStatus) => Promise<void>
  removeFromWatchlist: (animeId: number) => Promise<void>
  updateWatchlistItem: (animeId: number, updates: Partial<WatchlistItem>) => Promise<void>
  updateProgress: (animeId: number, episodesWatched: number) => Promise<void>
  updateRating: (animeId: number, rating: number | null) => Promise<void>
  updateStatus: (animeId: number, status: WatchStatus) => Promise<void>
  toggleFavorite: (animeId: number) => Promise<void>
  
  // Getters
  getWatchlistItem: (animeId: number) => WatchlistItem | undefined
  isInWatchlist: (animeId: number) => boolean
  getWatchlistByStatus: (status: WatchStatus) => WatchlistItem[]
  getWatchlistStats: () => WatchlistStats
  getFavorites: () => WatchlistItem[]
  
  // Sync
  loadWatchlist: () => Promise<void>
  syncWatchlist: () => Promise<void>
  
  // Bulk operations
  markAsCompleted: (animeId: number) => Promise<void>
  markAsDropped: (animeId: number) => Promise<void>
  startWatching: (animeId: number) => Promise<void>
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      // Initial state
      watchlist: new Map(),
      isLoading: false,
      error: null,
      
      // Actions
      addToWatchlist: async (anime, status = 'plan_to_watch') => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')
        
        set({ isLoading: true, error: null })
        
        try {
          const newItem: WatchlistItem = {
            id: crypto.randomUUID(),
            animeId: anime.id,
            status,
            progress: 0,
            rating: null,
            startDate: status === 'watching' ? new Date() : null,
            finishDate: null,
            notes: '',
            favorite: false,
            rewatching: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
          
          // Add to Supabase
          const { error } = await supabase
            .from('watchlist')
            .insert({
              user_id: user.id,
              anime_id: anime.id,
              status,
              progress: 0,
              rating: null,
              start_date: newItem.startDate?.toISOString(),
              finish_date: null,
              notes: '',
              favorite: false,
              rewatching: false,
            })
          
          if (error) throw error
          
          // Update local state
          set((state) => {
            const newWatchlist = new Map(state.watchlist)
            newWatchlist.set(anime.id, newItem)
            return { watchlist: newWatchlist }
          })
        } catch (error) {
          set({ error: (error as Error).message })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },
      
      removeFromWatchlist: async (animeId) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')
        
        set({ isLoading: true, error: null })
        
        try {
          const { error } = await supabase
            .from('watchlist')
            .delete()
            .eq('user_id', user.id)
            .eq('anime_id', animeId)
          
          if (error) throw error
          
          set((state) => {
            const newWatchlist = new Map(state.watchlist)
            newWatchlist.delete(animeId)
            return { watchlist: newWatchlist }
          })
        } catch (error) {
          set({ error: (error as Error).message })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },
      
      updateWatchlistItem: async (animeId, updates) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')
        
        const currentItem = get().watchlist.get(animeId)
        if (!currentItem) return
        
        set({ isLoading: true, error: null })
        
        try {
          const updatedItem = {
            ...currentItem,
            ...updates,
            updatedAt: new Date(),
          }
          
          // Update in Supabase
          const { error } = await supabase
            .from('watchlist')
            .update({
              status: updatedItem.status,
              progress: updatedItem.progress,
              rating: updatedItem.rating,
              start_date: updatedItem.startDate?.toISOString(),
              finish_date: updatedItem.finishDate?.toISOString(),
              notes: updatedItem.notes,
              favorite: updatedItem.favorite,
              rewatching: updatedItem.rewatching,
              updated_at: updatedItem.updatedAt.toISOString(),
            })
            .eq('user_id', user.id)
            .eq('anime_id', animeId)
          
          if (error) throw error
          
          // Update local state
          set((state) => {
            const newWatchlist = new Map(state.watchlist)
            newWatchlist.set(animeId, updatedItem)
            return { watchlist: newWatchlist }
          })
        } catch (error) {
          set({ error: (error as Error).message })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },
      
      updateProgress: async (animeId, episodesWatched) => {
        const item = get().watchlist.get(animeId)
        if (!item) return
        
        const updates: Partial<WatchlistItem> = {
          progress: episodesWatched,
        }
        
        // Auto-update status based on progress
        if (episodesWatched > 0 && item.status === 'plan_to_watch') {
          updates.status = 'watching'
          updates.startDate = new Date()
        }
        
        await get().updateWatchlistItem(animeId, updates)
      },
      
      updateRating: async (animeId, rating) => {
        await get().updateWatchlistItem(animeId, { rating })
      },
      
      updateStatus: async (animeId, status) => {
        const updates: Partial<WatchlistItem> = { status }
        
        // Set dates based on status
        if (status === 'watching' && !get().watchlist.get(animeId)?.startDate) {
          updates.startDate = new Date()
        } else if (status === 'completed') {
          updates.finishDate = new Date()
        }
        
        await get().updateWatchlistItem(animeId, updates)
      },
      
      toggleFavorite: async (animeId) => {
        const item = get().watchlist.get(animeId)
        if (!item) return
        
        await get().updateWatchlistItem(animeId, { favorite: !item.favorite })
      },
      
      // Getters
      getWatchlistItem: (animeId) => {
        return get().watchlist.get(animeId)
      },
      
      isInWatchlist: (animeId) => {
        return get().watchlist.has(animeId)
      },
      
      getWatchlistByStatus: (status) => {
        return Array.from(get().watchlist.values()).filter(item => item.status === status)
      },
      
      getWatchlistStats: () => {
        const watchlist = Array.from(get().watchlist.values())
        
        const stats: WatchlistStats = {
          totalAnime: watchlist.length,
          watching: watchlist.filter(item => item.status === 'watching').length,
          completed: watchlist.filter(item => item.status === 'completed').length,
          planToWatch: watchlist.filter(item => item.status === 'plan_to_watch').length,
          dropped: watchlist.filter(item => item.status === 'dropped').length,
          onHold: watchlist.filter(item => item.status === 'on_hold').length,
          totalEpisodes: watchlist.reduce((acc, item) => acc + item.progress, 0),
          totalWatchTime: 0, // Would need episode duration data
          averageRating: 0,
          favoriteGenres: [],
        }
        
        // Calculate average rating
        const ratedItems = watchlist.filter(item => item.rating !== null)
        if (ratedItems.length > 0) {
          stats.averageRating = ratedItems.reduce((acc, item) => acc + (item.rating || 0), 0) / ratedItems.length
        }
        
        return stats
      },
      
      getFavorites: () => {
        return Array.from(get().watchlist.values()).filter(item => item.favorite)
      },
      
      // Sync operations
      loadWatchlist: async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        
        set({ isLoading: true, error: null })
        
        try {
          const { data, error } = await supabase
            .from('watchlist')
            .select('*')
            .eq('user_id', user.id)
          
          if (error) throw error
          
          const watchlistMap = new Map<number, WatchlistItem>()
          
          data?.forEach((item) => {
            watchlistMap.set(item.anime_id, {
              id: item.id,
              animeId: item.anime_id,
              status: item.status,
              progress: item.progress,
              rating: item.rating,
              startDate: item.start_date ? new Date(item.start_date) : null,
              finishDate: item.finish_date ? new Date(item.finish_date) : null,
              notes: item.notes || '',
              favorite: item.favorite || false,
              rewatching: item.rewatching || false,
              createdAt: new Date(item.created_at),
              updatedAt: new Date(item.updated_at),
            })
          })
          
          set({ watchlist: watchlistMap })
        } catch (error) {
          set({ error: (error as Error).message })
        } finally {
          set({ isLoading: false })
        }
      },
      
      syncWatchlist: async () => {
        // This would sync local changes to server
        // For now, we're doing real-time updates
      },
      
      // Convenience methods
      markAsCompleted: async (animeId) => {
        await get().updateStatus(animeId, 'completed')
      },
      
      markAsDropped: async (animeId) => {
        await get().updateStatus(animeId, 'dropped')
      },
      
      startWatching: async (animeId) => {
        await get().updateStatus(animeId, 'watching')
      },
    }),
    {
      name: 'watchlist-store',
      partialize: (state) => ({
        watchlist: Array.from(state.watchlist.entries()),
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.watchlist) {
          // Convert array back to Map
          state.watchlist = new Map(state.watchlist as any)
        }
      },
    }
  )
)
