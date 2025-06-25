import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface VideoSource {
  url: string
  quality: string // '1080p', '720p', '480p', etc.
  type: 'hls' | 'mp4' | 'youtube'
  language?: 'sub' | 'dub'
  isReal?: boolean
  source?: string
}

export interface Subtitle {
  url: string
  language: string
  label: string
  default?: boolean
  isReal?: boolean
  source?: string
}

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
  airDate?: string
  streamingId?: string
  isReal?: boolean
  source?: string
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

interface VideoPlaybackState {
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
  
  // Actions
  setCurrentAnime: (animeId: number) => void
  setCurrentEpisode: (episode: Episode | null) => void
  setEpisodes: (episodes: Episode[]) => void
  setIsPlaying: (playing: boolean) => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setBuffered: (buffered: number) => void
  setVolume: (volume: number) => void
  setMuted: (muted: boolean) => void
  setFullscreen: (fullscreen: boolean) => void
  updateSettings: (settings: Partial<PlayerSettings>) => void
  
  // Episode navigation
  playNextEpisode: () => void
  playPreviousEpisode: () => void
  
  // Utility functions
  getCurrentQualityOptions: () => VideoSource[]
  getCurrentSubtitleOptions: () => Subtitle[]
  getEpisodeProgress: () => number // percentage
  canAutoSkip: (type: 'intro' | 'outro') => boolean
}

const DEFAULT_SETTINGS: PlayerSettings = {
  volume: 1,
  muted: false,
  playbackRate: 1,
  quality: 'auto',
  subtitleLanguage: 'en',
  autoPlay: true,
  autoSkipIntro: true,
  autoSkipOutro: false,
  theaterMode: false,
}

export const useVideoPlaybackStore = create<VideoPlaybackState>()(
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
      
      settings: DEFAULT_SETTINGS,
      
      // Actions
      setCurrentAnime: (animeId) => set({ currentAnime: animeId }),
      
      setCurrentEpisode: (episode) => set({ currentEpisode: episode }),
      
      setEpisodes: (episodes) => set({ episodes }),
      
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      
      setCurrentTime: (time) => set({ currentTime: time }),
      
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
      
      playNextEpisode: () => {
        const state = get()
        if (!state.currentEpisode || !state.episodes.length) return
        
        const currentIndex = state.episodes.findIndex(ep => ep.id === state.currentEpisode!.id)
        const nextIndex = currentIndex + 1
        
        if (nextIndex < state.episodes.length) {
          state.setCurrentEpisode(state.episodes[nextIndex])
          set({ currentTime: 0, isPlaying: state.settings.autoPlay })
        }
      },
      
      playPreviousEpisode: () => {
        const state = get()
        if (!state.currentEpisode || !state.episodes.length) return
        
        const currentIndex = state.episodes.findIndex(ep => ep.id === state.currentEpisode!.id)
        const prevIndex = currentIndex - 1
        
        if (prevIndex >= 0) {
          state.setCurrentEpisode(state.episodes[prevIndex])
          set({ currentTime: 0, isPlaying: state.settings.autoPlay })
        }
      },
      
      getCurrentQualityOptions: () => {
        const state = get()
        return state.currentEpisode?.sources || []
      },
      
      getCurrentSubtitleOptions: () => {
        const state = get()
        return state.currentEpisode?.subtitles || []
      },
      
      getEpisodeProgress: () => {
        const state = get()
        if (state.duration === 0) return 0
        return (state.currentTime / state.duration) * 100
      },
      
      canAutoSkip: (type: 'intro' | 'outro') => {
        const state = get()
        const setting = type === 'intro' ? state.settings.autoSkipIntro : state.settings.autoSkipOutro
        const skipTimes = state.currentEpisode?.skipTimes?.[type]
        
        return setting && !!skipTimes &&
          state.currentTime >= skipTimes.start &&
          state.currentTime <= skipTimes.end
      },
    }),
    {
      name: 'video-playback-store',
      partialize: (state) => ({
        settings: state.settings,
        volume: state.volume,
        muted: state.muted,
      }),
      storage: {
        getItem: (name) => {
          if (typeof window === 'undefined') return null
          try {
            const item = localStorage.getItem(name)
            return item ? JSON.parse(item) : null
          } catch (error) {
            console.warn('Failed to parse video playback storage:', error)
            localStorage.removeItem(name)
            return null
          }
        },
        setItem: (name, value) => {
          if (typeof window === 'undefined') return
          try {
            localStorage.setItem(name, JSON.stringify(value))
          } catch (error) {
            console.warn('Failed to store video playback data:', error)
          }
        },
        removeItem: (name) => {
          if (typeof window === 'undefined') return
          localStorage.removeItem(name)
        },
      },
    }
  )
)

// Export helper function for external access
export const getVideoPlaybackState = () => useVideoPlaybackStore.getState()