import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../supabase'

export interface WatchProgress {
  animeId: number
  episodeId: string
  episodeNumber: number
  currentTime: number
  duration: number
  completed: boolean
  lastWatched: Date
  watchedAt: Date
}

export interface WatchHistory {
  animeId: number
  episodeId: string
  episodeNumber: number
  animeTitle: string
  episodeTitle: string
  thumbnail?: string
  watchedAt: Date
  completed: boolean
  progress: number // percentage
}

interface WatchProgressState {
  // Progress tracking
  watchProgress: Map<string, WatchProgress>
  watchHistory: WatchHistory[]
  isLoading: boolean
  lastSyncTime: number
  
  // Actions
  updateProgress: (animeId: number, episodeId: string, episodeNumber: number, currentTime: number, duration: number) => void
  markEpisodeCompleted: (animeId: number, episodeId: string, episodeNumber: number) => void
  getProgress: (animeId: number, episodeId: string) => WatchProgress | undefined
  getAnimeProgress: (animeId: number) => WatchProgress[]
  addToHistory: (animeId: number, episodeId: string, episodeNumber: number, animeTitle: string, episodeTitle: string, thumbnail?: string) => void
  getRecentHistory: (limit?: number) => WatchHistory[]
  clearHistory: () => void
  removeFromHistory: (animeId: number, episodeId: string) => void
  
  // Sync with Supabase
  syncProgress: () => Promise<void>
  loadProgress: () => Promise<void>
  
  // Statistics
  getWatchStatistics: () => {
    totalWatchTime: number
    episodesWatched: number
    animeWatched: number
    averageWatchTime: number
    completionRate: number
    streakDays: number
  }
  
  // Bulk operations
  markMultipleCompleted: (items: Array<{ animeId: number; episodeId: string; episodeNumber: number }>) => void
  exportProgress: () => string
  importProgress: (data: string) => boolean
}

export const useWatchProgressStore = create<WatchProgressState>()(
  persist(
    (set, get) => ({
      // Initial state
      watchProgress: new Map(),
      watchHistory: [],
      isLoading: false,
      lastSyncTime: 0,
      
      // Actions
      updateProgress: (animeId, episodeId, episodeNumber, currentTime, duration) => {
        const progressKey = `${animeId}-${episodeId}`
        const completed = currentTime / duration > 0.9 // Mark as completed if 90% watched
        const now = new Date()
        
        set((state) => {
          const newProgress = new Map(state.watchProgress)
          const existingProgress = newProgress.get(progressKey)
          
          newProgress.set(progressKey, {
            animeId,
            episodeId,
            episodeNumber,
            currentTime,
            duration,
            completed,
            lastWatched: now,
            watchedAt: existingProgress?.watchedAt || now,
          })
          
          return { watchProgress: newProgress }
        })
        
        // Auto-sync every 30 seconds
        const state = get()
        if (Date.now() - state.lastSyncTime > 30000) {
          state.syncProgress()
          set({ lastSyncTime: Date.now() })
        }
      },
      
      markEpisodeCompleted: (animeId, episodeId, episodeNumber) => {
        const progressKey = `${animeId}-${episodeId}`
        const existingProgress = get().watchProgress.get(progressKey)
        
        if (existingProgress) {
          get().updateProgress(animeId, episodeId, episodeNumber, existingProgress.duration, existingProgress.duration)
        }
      },
      
      getProgress: (animeId, episodeId) => {
        const progressKey = `${animeId}-${episodeId}`
        return get().watchProgress.get(progressKey)
      },
      
      getAnimeProgress: (animeId) => {
        const progress = Array.from(get().watchProgress.values())
        return progress.filter(p => p.animeId === animeId)
      },
      
      addToHistory: (animeId, episodeId, episodeNumber, animeTitle, episodeTitle, thumbnail) => {
        const progressKey = `${animeId}-${episodeId}`
        const existingProgress = get().watchProgress.get(progressKey)
        
        const historyItem: WatchHistory = {
          animeId,
          episodeId,
          episodeNumber,
          animeTitle,
          episodeTitle,
          thumbnail,
          watchedAt: new Date(),
          completed: existingProgress?.completed || false,
          progress: existingProgress ? (existingProgress.currentTime / existingProgress.duration) * 100 : 0,
        }
        
        set((state) => {
          // Remove existing entry for this episode
          const filteredHistory = state.watchHistory.filter(
            h => !(h.animeId === animeId && h.episodeId === episodeId)
          )
          
          // Add new entry at the beginning
          const newHistory = [historyItem, ...filteredHistory]
          
          // Keep only last 1000 items
          return { watchHistory: newHistory.slice(0, 1000) }
        })
      },
      
      getRecentHistory: (limit = 50) => {
        return get().watchHistory.slice(0, limit)
      },
      
      clearHistory: () => {
        set({ watchHistory: [] })
      },
      
      removeFromHistory: (animeId, episodeId) => {
        set((state) => ({
          watchHistory: state.watchHistory.filter(
            h => !(h.animeId === animeId && h.episodeId === episodeId)
          )
        }))
      },
      
      syncProgress: async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        
        set({ isLoading: true })
        
        try {
          const state = get()
          const progressArray = Array.from(state.watchProgress.values())
          
          for (const progress of progressArray) {
            await supabase
              .from('watch_progress')
              .upsert({
                user_id: user.id,
                anime_id: progress.animeId,
                episode_id: progress.episodeId,
                episode_number: progress.episodeNumber,
                progress_seconds: progress.currentTime,
                duration_seconds: progress.duration,
                completed: progress.completed,
                last_watched: progress.lastWatched.toISOString(),
                watched_at: progress.watchedAt.toISOString(),
              })
          }
          
          // Sync history
          for (const historyItem of state.watchHistory.slice(0, 100)) { // Sync only recent 100 items
            await supabase
              .from('watch_history')
              .upsert({
                user_id: user.id,
                anime_id: historyItem.animeId,
                episode_id: historyItem.episodeId,
                episode_number: historyItem.episodeNumber,
                anime_title: historyItem.animeTitle,
                episode_title: historyItem.episodeTitle,
                thumbnail: historyItem.thumbnail,
                watched_at: historyItem.watchedAt.toISOString(),
                completed: historyItem.completed,
                progress: historyItem.progress,
              })
          }
          
          set({ lastSyncTime: Date.now() })
        } catch (error) {
          console.error('Failed to sync progress:', error)
        } finally {
          set({ isLoading: false })
        }
      },
      
      loadProgress: async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        
        set({ isLoading: true })
        
        try {
          // Load progress data
          const { data: progressData } = await supabase
            .from('watch_progress')
            .select('*')
            .eq('user_id', user.id)
            .order('last_watched', { ascending: false })
          
          if (progressData) {
            const progressMap = new Map<string, WatchProgress>()
            
            progressData.forEach((item) => {
              const key = `${item.anime_id}-${item.episode_id}`
              progressMap.set(key, {
                animeId: item.anime_id,
                episodeId: item.episode_id,
                episodeNumber: item.episode_number,
                currentTime: item.progress_seconds,
                duration: item.duration_seconds,
                completed: item.completed,
                lastWatched: new Date(item.last_watched),
                watchedAt: new Date(item.watched_at || item.last_watched),
              })
            })
            
            set({ watchProgress: progressMap })
          }
          
          // Load history data
          const { data: historyData } = await supabase
            .from('watch_history')
            .select('*')
            .eq('user_id', user.id)
            .order('watched_at', { ascending: false })
            .limit(500)
          
          if (historyData) {
            const history: WatchHistory[] = historyData.map(item => ({
              animeId: item.anime_id,
              episodeId: item.episode_id,
              episodeNumber: item.episode_number,
              animeTitle: item.anime_title,
              episodeTitle: item.episode_title,
              thumbnail: item.thumbnail,
              watchedAt: new Date(item.watched_at),
              completed: item.completed,
              progress: item.progress,
            }))
            
            set({ watchHistory: history })
          }
          
          set({ lastSyncTime: Date.now() })
        } catch (error) {
          console.error('Failed to load progress:', error)
        } finally {
          set({ isLoading: false })
        }
      },
      
      getWatchStatistics: () => {
        const state = get()
        const progressArray = Array.from(state.watchProgress.values())
        
        const totalWatchTime = progressArray.reduce((total, progress) => {
          return total + progress.currentTime
        }, 0)
        
        const episodesWatched = progressArray.filter(p => p.completed).length
        const uniqueAnime = new Set(progressArray.map(p => p.animeId))
        const animeWatched = uniqueAnime.size
        const averageWatchTime = progressArray.length > 0 ? totalWatchTime / progressArray.length : 0
        
        // Calculate completion rate
        const totalEpisodes = progressArray.length
        const completionRate = totalEpisodes > 0 ? (episodesWatched / totalEpisodes) * 100 : 0
        
        // Calculate streak (consecutive days with watch activity)
        const sortedHistory = state.watchHistory
          .sort((a, b) => b.watchedAt.getTime() - a.watchedAt.getTime())
        
        let streakDays = 0
        let currentDate = new Date()
        currentDate.setHours(0, 0, 0, 0)
        
        for (let i = 0; i < sortedHistory.length; i++) {
          const watchDate = new Date(sortedHistory[i].watchedAt)
          watchDate.setHours(0, 0, 0, 0)
          
          if (watchDate.getTime() === currentDate.getTime()) {
            streakDays++
            currentDate.setDate(currentDate.getDate() - 1)
          } else {
            break
          }
        }
        
        return {
          totalWatchTime,
          episodesWatched,
          animeWatched,
          averageWatchTime,
          completionRate,
          streakDays,
        }
      },
      
      markMultipleCompleted: (items) => {
        items.forEach(({ animeId, episodeId, episodeNumber }) => {
          get().markEpisodeCompleted(animeId, episodeId, episodeNumber)
        })
      },
      
      exportProgress: () => {
        const state = get()
        const exportData = {
          watchProgress: Array.from(state.watchProgress.entries()),
          watchHistory: state.watchHistory,
          exportedAt: new Date().toISOString(),
          version: '1.0',
        }
        
        return JSON.stringify(exportData, null, 2)
      },
      
      importProgress: (data) => {
        try {
          const importData = JSON.parse(data)
          
          if (!importData.watchProgress || !Array.isArray(importData.watchProgress)) {
            return false
          }
          
          const progressMap = new Map<string, WatchProgress>(importData.watchProgress)
          const history = importData.watchHistory || []
          
          set({
            watchProgress: progressMap,
            watchHistory: Array.isArray(history) ? history : [],
          })
          
          return true
        } catch (error) {
          console.error('Failed to import progress:', error)
          return false
        }
      },
    }),
    {
      name: 'watch-progress-store',
      partialize: (state) => ({
        watchProgress: Array.from(state.watchProgress.entries()),
        watchHistory: state.watchHistory.slice(0, 100), // Only persist recent 100 items
        lastSyncTime: state.lastSyncTime,
      }),
      storage: {
        getItem: (name) => {
          if (typeof window === 'undefined') return null
          try {
            const item = localStorage.getItem(name)
            return item ? JSON.parse(item) : null
          } catch (error) {
            console.warn('Failed to parse watch progress storage:', error)
            localStorage.removeItem(name)
            return null
          }
        },
        setItem: (name, value) => {
          if (typeof window === 'undefined') return
          try {
            localStorage.setItem(name, JSON.stringify(value))
          } catch (error) {
            console.warn('Failed to store watch progress data:', error)
          }
        },
        removeItem: (name) => {
          if (typeof window === 'undefined') return
          localStorage.removeItem(name)
        },
      },
      onRehydrateStorage: () => (state) => {
        if (state?.watchProgress) {
          try {
            // Convert array back to Map and ensure dates are properly converted
            const progressEntries = (state.watchProgress as any).map(([key, value]: [string, any]) => [
              key,
              {
                ...value,
                lastWatched: new Date(value.lastWatched),
                watchedAt: new Date(value.watchedAt || value.lastWatched),
              }
            ])
            state.watchProgress = new Map(progressEntries)
          } catch (error) {
            console.warn('Failed to rehydrate watch progress, resetting:', error)
            state.watchProgress = new Map()
          }
        } else {
          state!.watchProgress = new Map()
        }
        
        if (state?.watchHistory) {
          try {
            // Ensure watch history dates are properly converted
            state.watchHistory = state.watchHistory.map((item: any) => ({
              ...item,
              watchedAt: new Date(item.watchedAt),
            }))
          } catch (error) {
            console.warn('Failed to rehydrate watch history, resetting:', error)
            state.watchHistory = []
          }
        }
      },
    }
  )
)

// Export helper functions
export const getWatchProgress = (animeId: number, episodeId: string) => {
  return useWatchProgressStore.getState().getProgress(animeId, episodeId)
}

export const getWatchStatistics = () => {
  return useWatchProgressStore.getState().getWatchStatistics()
}