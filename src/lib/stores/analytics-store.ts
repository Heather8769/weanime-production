import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../supabase'

export interface ViewingSession {
  id: string
  animeId: number
  episodeId: string
  startTime: Date
  endTime?: Date
  duration: number // seconds watched
  totalEpisodeDuration: number
  completionPercentage: number
  quality: string
  device: string
  userAgent: string
  pauseCount: number
  seekCount: number
  volumeChanges: number
  fullscreenTime: number // seconds in fullscreen
  buffering: {
    events: number
    totalTime: number // total buffering time in seconds
  }
}

export interface WatchingBehavior {
  averageSessionDuration: number
  preferredWatchingHours: number[] // 0-23 hour array with frequency
  bingeDays: Date[] // days with 3+ episodes watched
  genrePreferences: Record<string, number> // genre -> watch time
  studioPreferences: Record<string, number>
  yearPreferences: Record<number, number>
  completionRate: number
  dropRate: number
  averageRating: number
}

export interface PerformanceMetrics {
  averageLoadTime: number
  bufferingFrequency: number
  qualityChanges: number
  errorCount: number
  crashCount: number
  memoryUsage: number[]
  networkSpeed: number[]
  devicePerformance: {
    cpu: number
    gpu: number
    memory: number
    storage: number
  }
}

export interface EngagementMetrics {
  dailyActiveTime: Record<string, number> // date -> minutes
  weeklyActiveTime: Record<string, number> // week -> minutes
  monthlyActiveTime: Record<string, number> // month -> minutes
  streakDays: number
  totalSessions: number
  averageSessionsPerDay: number
  searchQueries: string[]
  featuresUsed: Record<string, number>
  feedbackSubmitted: number
  socialInteractions: number
}

interface AnalyticsState {
  // Current session
  currentSession: ViewingSession | null
  isTracking: boolean
  
  // Analytics data
  viewingSessions: ViewingSession[]
  watchingBehavior: WatchingBehavior
  performanceMetrics: PerformanceMetrics
  engagementMetrics: EngagementMetrics
  
  // Settings
  analyticsEnabled: boolean
  performanceTracking: boolean
  detailedTracking: boolean
  
  // Sync state
  isLoading: boolean
  lastSyncTime: number
  
  // Session management
  startSession: (animeId: number, episodeId: string, quality: string) => void
  updateSession: (updates: Partial<ViewingSession>) => void
  endSession: () => void
  pauseTracking: () => void
  resumeTracking: () => void
  
  // Event tracking
  trackEvent: (event: string, data?: Record<string, any>) => void
  trackPerformance: (metric: string, value: number) => void
  trackError: (error: string, context?: Record<string, any>) => void
  trackInteraction: (element: string, action: string) => void
  
  // Analytics computation
  computeWatchingBehavior: () => WatchingBehavior
  getViewingTrends: (period: 'day' | 'week' | 'month') => Record<string, number>
  getTopAnime: (limit?: number) => Array<{ animeId: number; watchTime: number; episodes: number }>
  getWatchingHeatmap: () => Record<string, Record<string, number>> // day -> hour -> minutes
  
  // Performance analysis
  getPerformanceReport: () => {
    averageQuality: string
    bufferingIssues: boolean
    recommendedSettings: Record<string, any>
    deviceCompatibility: 'excellent' | 'good' | 'poor'
  }
  
  // Export/Import
  exportAnalytics: () => string
  clearAnalytics: () => void
  
  // Sync
  syncAnalytics: () => Promise<void>
  loadAnalytics: () => Promise<void>
  
  // Privacy
  anonymizeData: () => void
  toggleAnalytics: (enabled: boolean) => void
}

const DEFAULT_WATCHING_BEHAVIOR: WatchingBehavior = {
  averageSessionDuration: 0,
  preferredWatchingHours: new Array(24).fill(0),
  bingeDays: [],
  genrePreferences: {},
  studioPreferences: {},
  yearPreferences: {},
  completionRate: 0,
  dropRate: 0,
  averageRating: 0,
}

const DEFAULT_PERFORMANCE_METRICS: PerformanceMetrics = {
  averageLoadTime: 0,
  bufferingFrequency: 0,
  qualityChanges: 0,
  errorCount: 0,
  crashCount: 0,
  memoryUsage: [],
  networkSpeed: [],
  devicePerformance: {
    cpu: 0,
    gpu: 0,
    memory: 0,
    storage: 0,
  },
}

const DEFAULT_ENGAGEMENT_METRICS: EngagementMetrics = {
  dailyActiveTime: {},
  weeklyActiveTime: {},
  monthlyActiveTime: {},
  streakDays: 0,
  totalSessions: 0,
  averageSessionsPerDay: 0,
  searchQueries: [],
  featuresUsed: {},
  feedbackSubmitted: 0,
  socialInteractions: 0,
}

export const useAnalyticsStore = create<AnalyticsState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentSession: null,
      isTracking: false,
      viewingSessions: [],
      watchingBehavior: DEFAULT_WATCHING_BEHAVIOR,
      performanceMetrics: DEFAULT_PERFORMANCE_METRICS,
      engagementMetrics: DEFAULT_ENGAGEMENT_METRICS,
      analyticsEnabled: true,
      performanceTracking: true,
      detailedTracking: false,
      isLoading: false,
      lastSyncTime: 0,
      
      // Session management
      startSession: (animeId, episodeId, quality) => {
        if (!get().analyticsEnabled) return
        
        const session: ViewingSession = {
          id: crypto.randomUUID(),
          animeId,
          episodeId,
          startTime: new Date(),
          duration: 0,
          totalEpisodeDuration: 0,
          completionPercentage: 0,
          quality,
          device: navigator.platform || 'unknown',
          userAgent: navigator.userAgent,
          pauseCount: 0,
          seekCount: 0,
          volumeChanges: 0,
          fullscreenTime: 0,
          buffering: {
            events: 0,
            totalTime: 0,
          },
        }
        
        set({ currentSession: session, isTracking: true })
      },
      
      updateSession: (updates) => {
        const state = get()
        if (!state.currentSession || !state.isTracking) return
        
        set({
          currentSession: { ...state.currentSession, ...updates }
        })
      },
      
      endSession: () => {
        const state = get()
        if (!state.currentSession) return
        
        const endedSession = {
          ...state.currentSession,
          endTime: new Date(),
        }
        
        set((prevState) => ({
          currentSession: null,
          isTracking: false,
          viewingSessions: [...prevState.viewingSessions, endedSession].slice(-1000), // Keep last 1000 sessions
        }))
        
        // Update analytics in background
        setTimeout(() => {
          get().computeWatchingBehavior()
        }, 100)
      },
      
      pauseTracking: () => {
        set({ isTracking: false })
      },
      
      resumeTracking: () => {
        const state = get()
        if (state.currentSession && state.analyticsEnabled) {
          set({ isTracking: true })
        }
      },
      
      trackEvent: (event, data = {}) => {
        if (!get().analyticsEnabled) return
        
        const state = get()
        const today = new Date().toISOString().split('T')[0]
        
        set({
          engagementMetrics: {
            ...state.engagementMetrics,
            featuresUsed: {
              ...state.engagementMetrics.featuresUsed,
              [event]: (state.engagementMetrics.featuresUsed[event] || 0) + 1,
            },
          },
        })
        
        // Log event for debugging in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Analytics] ${event}:`, data)
        }
      },
      
      trackPerformance: (metric, value) => {
        if (!get().performanceTracking) return
        
        const state = get()
        const metrics = { ...state.performanceMetrics }
        
        switch (metric) {
          case 'loadTime':
            metrics.averageLoadTime = (metrics.averageLoadTime + value) / 2
            break
          case 'bufferingEvent':
            metrics.bufferingFrequency += 1
            break
          case 'qualityChange':
            metrics.qualityChanges += 1
            break
          case 'error':
            metrics.errorCount += 1
            break
          case 'crash':
            metrics.crashCount += 1
            break
          case 'memory':
            metrics.memoryUsage.push(value)
            if (metrics.memoryUsage.length > 100) metrics.memoryUsage.shift()
            break
          case 'networkSpeed':
            metrics.networkSpeed.push(value)
            if (metrics.networkSpeed.length > 100) metrics.networkSpeed.shift()
            break
        }
        
        set({ performanceMetrics: metrics })
      },
      
      trackError: (error, context = {}) => {
        get().trackPerformance('error', 1)
        get().trackEvent('error', { error, context })
      },
      
      trackInteraction: (element, action) => {
        get().trackEvent('interaction', { element, action })
      },
      
      computeWatchingBehavior: () => {
        const state = get()
        const sessions = state.viewingSessions
        
        if (sessions.length === 0) return DEFAULT_WATCHING_BEHAVIOR
        
        // Calculate average session duration
        const totalDuration = sessions.reduce((sum, session) => sum + session.duration, 0)
        const averageSessionDuration = totalDuration / sessions.length
        
        // Calculate preferred watching hours
        const hourCounts = new Array(24).fill(0)
        sessions.forEach(session => {
          const hour = new Date(session.startTime).getHours()
          hourCounts[hour] += session.duration / 60 // convert to minutes
        })
        
        // Find binge days (3+ episodes in a day)
        const dailyEpisodes: Record<string, number> = {}
        sessions.forEach(session => {
          const date = new Date(session.startTime).toISOString().split('T')[0]
          dailyEpisodes[date] = (dailyEpisodes[date] || 0) + 1
        })
        
        const bingeDays = Object.entries(dailyEpisodes)
          .filter(([, count]) => count >= 3)
          .map(([date]) => new Date(date))
        
        // Calculate completion rate
        const completedSessions = sessions.filter(s => s.completionPercentage >= 85)
        const completionRate = (completedSessions.length / sessions.length) * 100
        
        const behavior: WatchingBehavior = {
          averageSessionDuration,
          preferredWatchingHours: hourCounts,
          bingeDays,
          genrePreferences: {}, // Would need anime metadata
          studioPreferences: {}, // Would need anime metadata
          yearPreferences: {}, // Would need anime metadata
          completionRate,
          dropRate: 100 - completionRate,
          averageRating: 0, // Would need rating data
        }
        
        set({ watchingBehavior: behavior })
        return behavior
      },
      
      getViewingTrends: (period) => {
        const state = get()
        const trends: Record<string, number> = {}
        
        const now = new Date()
        let startDate: Date
        
        switch (period) {
          case 'day':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
            break
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case 'month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            break
        }
        
        const recentSessions = state.viewingSessions.filter(
          session => new Date(session.startTime) >= startDate
        )
        
        recentSessions.forEach(session => {
          const key = new Date(session.startTime).toISOString().split('T')[0]
          trends[key] = (trends[key] || 0) + session.duration / 60 // minutes
        })
        
        return trends
      },
      
      getTopAnime: (limit = 10) => {
        const state = get()
        const animeStats: Record<number, { watchTime: number; episodes: number }> = {}
        
        state.viewingSessions.forEach(session => {
          if (!animeStats[session.animeId]) {
            animeStats[session.animeId] = { watchTime: 0, episodes: 0 }
          }
          animeStats[session.animeId].watchTime += session.duration
          animeStats[session.animeId].episodes += 1
        })
        
        return Object.entries(animeStats)
          .map(([animeId, stats]) => ({ animeId: parseInt(animeId), ...stats }))
          .sort((a, b) => b.watchTime - a.watchTime)
          .slice(0, limit)
      },
      
      getWatchingHeatmap: () => {
        const state = get()
        const heatmap: Record<string, Record<string, number>> = {}
        
        state.viewingSessions.forEach(session => {
          const date = new Date(session.startTime)
          const day = date.toLocaleDateString('en-US', { weekday: 'long' })
          const hour = date.getHours().toString()
          
          if (!heatmap[day]) heatmap[day] = {}
          heatmap[day][hour] = (heatmap[day][hour] || 0) + session.duration / 60
        })
        
        return heatmap
      },
      
      getPerformanceReport: () => {
        const state = get()
        const metrics = state.performanceMetrics
        
        const avgMemory = metrics.memoryUsage.length > 0 
          ? metrics.memoryUsage.reduce((a, b) => a + b, 0) / metrics.memoryUsage.length 
          : 0
        
        const avgSpeed = metrics.networkSpeed.length > 0
          ? metrics.networkSpeed.reduce((a, b) => a + b, 0) / metrics.networkSpeed.length
          : 0
        
        let deviceCompatibility: 'excellent' | 'good' | 'poor' = 'excellent'
        if (metrics.errorCount > 10 || metrics.bufferingFrequency > 50) {
          deviceCompatibility = 'poor'
        } else if (metrics.errorCount > 5 || metrics.bufferingFrequency > 20) {
          deviceCompatibility = 'good'
        }
        
        return {
          averageQuality: metrics.qualityChanges < 5 ? '1080p' : '720p',
          bufferingIssues: metrics.bufferingFrequency > 10,
          recommendedSettings: {
            quality: avgSpeed > 5 ? 'auto' : '720p',
            autoPlay: metrics.errorCount < 5,
            bufferTime: metrics.bufferingFrequency > 20 ? 30 : 10,
          },
          deviceCompatibility,
        }
      },
      
      exportAnalytics: () => {
        const state = get()
        const exportData = {
          viewingSessions: state.viewingSessions,
          watchingBehavior: state.watchingBehavior,
          performanceMetrics: state.performanceMetrics,
          engagementMetrics: state.engagementMetrics,
          exportedAt: new Date().toISOString(),
          version: '1.0',
        }
        
        return JSON.stringify(exportData, null, 2)
      },
      
      clearAnalytics: () => {
        set({
          viewingSessions: [],
          watchingBehavior: DEFAULT_WATCHING_BEHAVIOR,
          performanceMetrics: DEFAULT_PERFORMANCE_METRICS,
          engagementMetrics: DEFAULT_ENGAGEMENT_METRICS,
          currentSession: null,
          isTracking: false,
        })
      },
      
      syncAnalytics: async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || !get().analyticsEnabled) return
        
        set({ isLoading: true })
        
        try {
          const state = get()
          
          // Sync only recent sessions to avoid overwhelming the database
          const recentSessions = state.viewingSessions.slice(-50)
          
          for (const session of recentSessions) {
            await supabase
              .from('analytics_sessions')
              .upsert({
                user_id: user.id,
                session_id: session.id,
                anime_id: session.animeId,
                episode_id: session.episodeId,
                start_time: session.startTime.toISOString(),
                end_time: session.endTime?.toISOString(),
                duration: session.duration,
                completion_percentage: session.completionPercentage,
                quality: session.quality,
                device: session.device,
                pause_count: session.pauseCount,
                seek_count: session.seekCount,
                buffering_events: session.buffering.events,
                buffering_time: session.buffering.totalTime,
              })
          }
          
          set({ lastSyncTime: Date.now() })
        } catch (error) {
          console.error('Failed to sync analytics:', error)
        } finally {
          set({ isLoading: false })
        }
      },
      
      loadAnalytics: async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || !get().analyticsEnabled) return
        
        set({ isLoading: true })
        
        try {
          const { data } = await supabase
            .from('analytics_sessions')
            .select('*')
            .eq('user_id', user.id)
            .order('start_time', { ascending: false })
            .limit(500)
          
          if (data) {
            const sessions: ViewingSession[] = data.map(item => ({
              id: item.session_id,
              animeId: item.anime_id,
              episodeId: item.episode_id,
              startTime: new Date(item.start_time),
              endTime: item.end_time ? new Date(item.end_time) : undefined,
              duration: item.duration,
              totalEpisodeDuration: 0, // Not stored in DB
              completionPercentage: item.completion_percentage,
              quality: item.quality,
              device: item.device,
              userAgent: '', // Not stored for privacy
              pauseCount: item.pause_count,
              seekCount: item.seek_count,
              volumeChanges: 0, // Not stored
              fullscreenTime: 0, // Not stored
              buffering: {
                events: item.buffering_events,
                totalTime: item.buffering_time,
              },
            }))
            
            set({ viewingSessions: sessions })
            get().computeWatchingBehavior()
          }
          
          set({ lastSyncTime: Date.now() })
        } catch (error) {
          console.error('Failed to load analytics:', error)
        } finally {
          set({ isLoading: false })
        }
      },
      
      anonymizeData: () => {
        set((state) => ({
          viewingSessions: state.viewingSessions.map(session => ({
            ...session,
            userAgent: 'anonymized',
            device: 'anonymized',
          }))
        }))
      },
      
      toggleAnalytics: (enabled) => {
        set({ analyticsEnabled: enabled })
        
        if (!enabled) {
          // End current session and pause tracking
          get().endSession()
          set({ isTracking: false })
        }
      },
    }),
    {
      name: 'analytics-store',
      partialize: (state) => ({
        viewingSessions: state.viewingSessions.slice(-100), // Only persist recent 100 sessions
        watchingBehavior: state.watchingBehavior,
        performanceMetrics: state.performanceMetrics,
        engagementMetrics: state.engagementMetrics,
        analyticsEnabled: state.analyticsEnabled,
        performanceTracking: state.performanceTracking,
        detailedTracking: state.detailedTracking,
        lastSyncTime: state.lastSyncTime,
      }),
      storage: {
        getItem: (name) => {
          if (typeof window === 'undefined') return null
          try {
            const item = localStorage.getItem(name)
            return item ? JSON.parse(item) : null
          } catch (error) {
            console.warn('Failed to parse analytics storage:', error)
            localStorage.removeItem(name)
            return null
          }
        },
        setItem: (name, value) => {
          if (typeof window === 'undefined') return
          try {
            localStorage.setItem(name, JSON.stringify(value))
          } catch (error) {
            console.warn('Failed to store analytics data:', error)
          }
        },
        removeItem: (name) => {
          if (typeof window === 'undefined') return
          localStorage.removeItem(name)
        },
      },
      onRehydrateStorage: () => (state) => {
        if (state?.viewingSessions) {
          try {
            // Ensure dates are properly converted
            state.viewingSessions = state.viewingSessions.map((session: any) => ({
              ...session,
              startTime: new Date(session.startTime),
              endTime: session.endTime ? new Date(session.endTime) : undefined,
            }))
          } catch (error) {
            console.warn('Failed to rehydrate analytics sessions:', error)
            state.viewingSessions = []
          }
        }
        
        if (state?.watchingBehavior?.bingeDays) {
          try {
            state.watchingBehavior.bingeDays = state.watchingBehavior.bingeDays.map((date: any) => new Date(date))
          } catch (error) {
            console.warn('Failed to rehydrate binge days:', error)
            state.watchingBehavior.bingeDays = []
          }
        }
      },
    }
  )
)

// Export helper functions
export const getAnalytics = () => useAnalyticsStore.getState()

export const trackEvent = (event: string, data?: Record<string, any>) => 
  useAnalyticsStore.getState().trackEvent(event, data)

export const trackPerformance = (metric: string, value: number) => 
  useAnalyticsStore.getState().trackPerformance(metric, value)