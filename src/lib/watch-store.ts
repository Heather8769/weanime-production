import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from './supabase'

export interface Episode {
  id: string
  number: number
  title: string
  description?: string
  thumbnail?: string
  duration: number // in seconds
  sources: VideoSource[]
  subtitles: Subtitle[]
  skipTimes?: {
    intro?: { start: number; end: number }
    outro?: { start: number; end: number }
  }
}

export interface VideoSource {
  url: string
  quality: string // '1080p', '720p', '480p', etc.
  type: 'hls' | 'mp4' | 'youtube'
  language?: 'sub' | 'dub'
}

export interface Subtitle {
  url: string
  language: string
  label: string
  default?: boolean
}

export interface WatchProgress {
  animeId: number
  episodeId: string
  episodeNumber: number
  currentTime: number
  duration: number
  completed: boolean
  lastWatched: Date
}

export interface PlayerSettings {
  volume: number
  muted: boolean
  playbackRate: number
  quality: string
  subtitleLanguage: string
  autoPlay: boolean
  autoSkipIntro: boolean
  autoSkipOutro: boolean
  theaterMode: boolean
}

interface WatchState {
  // Current playback state
  currentAnime: number | null
  currentEpisode: Episode | null
  episodes: Episode[]
  isPlaying: boolean
  currentTime: number
  duration: number
  buffered: number
  volume: number
  muted: boolean
  fullscreen: boolean
  
  // Player settings
  settings: PlayerSettings
  
  // Watch progress
  watchProgress: Map<string, WatchProgress>
  
  // Actions
  setCurrentAnime: (animeId: number) => void
  setCurrentEpisode: (episode: Episode) => void
  setEpisodes: (episodes: Episode[]) => void
  setIsPlaying: (playing: boolean) => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setBuffered: (buffered: number) => void
  setVolume: (volume: number) => void
  setMuted: (muted: boolean) => void
  setFullscreen: (fullscreen: boolean) => void
  updateSettings: (settings: Partial<PlayerSettings>) => void
  
  // Progress management
  updateProgress: (animeId: number, episodeId: string, episodeNumber: number, currentTime: number, duration: number) => void
  markEpisodeCompleted: (animeId: number, episodeId: string, episodeNumber: number) => void
  getProgress: (animeId: number, episodeId: string) => WatchProgress | undefined
  getAnimeProgress: (animeId: number) => WatchProgress[]
  
  // Episode navigation
  playNextEpisode: () => void
  playPreviousEpisode: () => void
  
  // Sync with Supabase
  syncProgress: () => Promise<void>
  loadProgress: () => Promise<void>

  // Statistics
  getWatchStatistics: () => {
    totalWatchTime: number
    episodesWatched: number
    animeWatched: number
    averageWatchTime: number
  }
}

export const useWatchStore = create<WatchState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentAnime: null,
      currentEpisode: null,
      episodes: [],
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      buffered: 0,
      volume: 1,
      muted: false,
      fullscreen: false,
      
      settings: {
        volume: 1,
        muted: false,
        playbackRate: 1,
        quality: 'auto',
        subtitleLanguage: 'en',
        autoPlay: true,
        autoSkipIntro: true,
        autoSkipOutro: false,
        theaterMode: false,
      },
      
      watchProgress: new Map(),
      
      // Actions
      setCurrentAnime: (animeId) => set({ currentAnime: animeId }),
      
      setCurrentEpisode: (episode) => set({ currentEpisode: episode }),
      
      setEpisodes: (episodes) => set({ episodes }),
      
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      
      setCurrentTime: (time) => {
        set({ currentTime: time })
        
        // Auto-update progress every 10 seconds
        const state = get()
        if (state.currentAnime && state.currentEpisode && time > 0) {
          const progressKey = `${state.currentAnime}-${state.currentEpisode.id}`
          const lastUpdate = state.watchProgress.get(progressKey)?.lastWatched
          
          const lastUpdateTime = lastUpdate instanceof Date ? lastUpdate.getTime() : (lastUpdate ? new Date(lastUpdate).getTime() : 0)
          if (!lastUpdate || Date.now() - lastUpdateTime > 10000) {
            state.updateProgress(
              state.currentAnime,
              state.currentEpisode.id,
              state.currentEpisode.number,
              time,
              state.duration
            )
          }
        }
      },
      
      setDuration: (duration) => set({ duration }),
      
      setBuffered: (buffered) => set({ buffered }),
      
      setVolume: (volume) => {
        set({ volume })
        get().updateSettings({ volume })
      },
      
      setMuted: (muted) => {
        set({ muted })
        get().updateSettings({ muted })
      },
      
      setFullscreen: (fullscreen) => set({ fullscreen }),
      
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings }
        })),
      
      updateProgress: (animeId, episodeId, episodeNumber, currentTime, duration) => {
        const progressKey = `${animeId}-${episodeId}`
        const completed = currentTime / duration > 0.9 // Mark as completed if 90% watched
        
        set((state) => {
          const newProgress = new Map(state.watchProgress)
          newProgress.set(progressKey, {
            animeId,
            episodeId,
            episodeNumber,
            currentTime,
            duration,
            completed,
            lastWatched: new Date(),
          })
          return { watchProgress: newProgress }
        })
      },
      
      markEpisodeCompleted: (animeId, episodeId, episodeNumber) => {
        const state = get()
        state.updateProgress(animeId, episodeId, episodeNumber, state.duration, state.duration)
      },
      
      getProgress: (animeId, episodeId) => {
        const progressKey = `${animeId}-${episodeId}`
        return get().watchProgress.get(progressKey)
      },
      
      getAnimeProgress: (animeId) => {
        const progress = Array.from(get().watchProgress.values())
        return progress.filter(p => p.animeId === animeId)
      },
      
      playNextEpisode: () => {
        const state = get()
        if (!state.currentEpisode || !state.episodes.length) return
        
        const currentIndex = state.episodes.findIndex(ep => ep.id === state.currentEpisode!.id)
        const nextIndex = currentIndex + 1
        
        if (nextIndex < state.episodes.length) {
          state.setCurrentEpisode(state.episodes[nextIndex])
        }
      },
      
      playPreviousEpisode: () => {
        const state = get()
        if (!state.currentEpisode || !state.episodes.length) return
        
        const currentIndex = state.episodes.findIndex(ep => ep.id === state.currentEpisode!.id)
        const prevIndex = currentIndex - 1
        
        if (prevIndex >= 0) {
          state.setCurrentEpisode(state.episodes[prevIndex])
        }
      },
      
      syncProgress: async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        
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
              current_time: progress.currentTime,
              duration: progress.duration,
              completed: progress.completed,
              last_watched: progress.lastWatched.toISOString(),
            })
        }
      },
      
      loadProgress: async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        
        const { data: progressData } = await supabase
          .from('watch_progress')
          .select('*')
          .eq('user_id', user.id)
        
        if (progressData) {
          const progressMap = new Map<string, WatchProgress>()
          
          progressData.forEach((item) => {
            const key = `${item.anime_id}-${item.episode_id}`
            progressMap.set(key, {
              animeId: item.anime_id,
              episodeId: item.episode_id,
              episodeNumber: item.episode_number,
              currentTime: item.current_time,
              duration: item.duration,
              completed: item.completed,
              lastWatched: new Date(item.last_watched),
            })
          })
          
          set({ watchProgress: progressMap })
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

        return {
          totalWatchTime,
          episodesWatched,
          animeWatched,
          averageWatchTime,
        }
      },
    }),
    {
      name: 'watch-store',
      partialize: (state) => ({
        settings: state.settings,
        watchProgress: Array.from(state.watchProgress.entries()),
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.watchProgress) {
          // Convert array back to Map and ensure dates are properly converted
          const progressEntries = (state.watchProgress as any).map(([key, value]: [string, any]) => [
            key,
            {
              ...value,
              lastWatched: new Date(value.lastWatched)
            }
          ])
          state.watchProgress = new Map(progressEntries)
        }
      },
    }
  )
)

// Export helper function for getting watch statistics
export const getWatchStatistics = () => {
  return useWatchStore.getState().getWatchStatistics()
}
