import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../supabase'

export interface UIPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  autoPlay: boolean
  autoNext: boolean
  skipIntro: boolean
  skipOutro: boolean
  showSubtitles: boolean
  subtitleLanguage: string
  audioLanguage: 'sub' | 'dub' | 'both'
  videoQuality: 'auto' | '1080p' | '720p' | '480p' | '360p'
  theaterMode: boolean
  miniPlayer: boolean
  notifications: boolean
  spoilerProtection: boolean
}

export interface ViewingPreferences {
  defaultVolume: number
  playbackSpeed: number
  autoSkipIntroSeconds: number
  autoSkipOutroSeconds: number
  rememberedVolume: boolean
  continueWatching: boolean
  markAsWatchedThreshold: number // percentage (e.g., 85 for 85%)
  episodeGridSize: 'small' | 'medium' | 'large'
  animeListView: 'grid' | 'list'
  showProgressBars: boolean
  showEpisodeNumbers: boolean
  showAirDates: boolean
}

export interface AccessibilityPreferences {
  reducedMotion: boolean
  highContrast: boolean
  fontSize: 'small' | 'medium' | 'large' | 'extra-large'
  keyboardNavigation: boolean
  screenReaderOptimized: boolean
  colorBlindFriendly: boolean
  focusIndicators: boolean
}

export interface ContentPreferences {
  preferredGenres: string[]
  blockedGenres: string[]
  contentRating: 'all' | 'pg13' | 'mature'
  hideCompleted: boolean
  hideDropped: boolean
  showAdultContent: boolean
  airingAnimeOnly: boolean
  preferredStudios: string[]
}

export interface NotificationPreferences {
  newEpisodeAlerts: boolean
  seasonFinaleAlerts: boolean
  newSeasonAlerts: boolean
  recommendationAlerts: boolean
  systemNotifications: boolean
  emailNotifications: boolean
  pushNotifications: boolean
  notificationSound: boolean
  quietHours: {
    enabled: boolean
    start: string // 'HH:MM'
    end: string   // 'HH:MM'
  }
}

interface UserPreferencesState {
  // Preference categories
  ui: UIPreferences
  viewing: ViewingPreferences
  accessibility: AccessibilityPreferences
  content: ContentPreferences
  notifications: NotificationPreferences
  
  // Sync state
  isLoading: boolean
  lastSyncTime: number
  hasUnsavedChanges: boolean
  
  // Actions
  updateUIPreferences: (preferences: Partial<UIPreferences>) => void
  updateViewingPreferences: (preferences: Partial<ViewingPreferences>) => void
  updateAccessibilityPreferences: (preferences: Partial<AccessibilityPreferences>) => void
  updateContentPreferences: (preferences: Partial<ContentPreferences>) => void
  updateNotificationPreferences: (preferences: Partial<NotificationPreferences>) => void
  
  // Bulk operations
  resetToDefaults: () => void
  exportPreferences: () => string
  importPreferences: (data: string) => boolean
  
  // Sync with backend
  syncPreferences: () => Promise<void>
  loadPreferences: () => Promise<void>
  
  // Helper functions
  isInQuietHours: () => boolean
  shouldShowNotification: (type: string) => boolean
  getEffectiveTheme: () => 'light' | 'dark'
  isAccessibilityEnabled: () => boolean
}

const DEFAULT_UI_PREFERENCES: UIPreferences = {
  theme: 'system',
  language: 'en',
  autoPlay: true,
  autoNext: false,
  skipIntro: true,
  skipOutro: false,
  showSubtitles: true,
  subtitleLanguage: 'en',
  audioLanguage: 'sub',
  videoQuality: 'auto',
  theaterMode: false,
  miniPlayer: false,
  notifications: true,
  spoilerProtection: true,
}

const DEFAULT_VIEWING_PREFERENCES: ViewingPreferences = {
  defaultVolume: 0.8,
  playbackSpeed: 1.0,
  autoSkipIntroSeconds: 85,
  autoSkipOutroSeconds: 30,
  rememberedVolume: true,
  continueWatching: true,
  markAsWatchedThreshold: 85,
  episodeGridSize: 'medium',
  animeListView: 'grid',
  showProgressBars: true,
  showEpisodeNumbers: true,
  showAirDates: true,
}

const DEFAULT_ACCESSIBILITY_PREFERENCES: AccessibilityPreferences = {
  reducedMotion: false,
  highContrast: false,
  fontSize: 'medium',
  keyboardNavigation: false,
  screenReaderOptimized: false,
  colorBlindFriendly: false,
  focusIndicators: false,
}

const DEFAULT_CONTENT_PREFERENCES: ContentPreferences = {
  preferredGenres: [],
  blockedGenres: [],
  contentRating: 'all',
  hideCompleted: false,
  hideDropped: false,
  showAdultContent: false,
  airingAnimeOnly: false,
  preferredStudios: [],
}

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  newEpisodeAlerts: true,
  seasonFinaleAlerts: true,
  newSeasonAlerts: true,
  recommendationAlerts: false,
  systemNotifications: true,
  emailNotifications: false,
  pushNotifications: false,
  notificationSound: true,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
}

export const useUserPreferencesStore = create<UserPreferencesState>()(
  persist(
    (set, get) => ({
      // Initial state
      ui: DEFAULT_UI_PREFERENCES,
      viewing: DEFAULT_VIEWING_PREFERENCES,
      accessibility: DEFAULT_ACCESSIBILITY_PREFERENCES,
      content: DEFAULT_CONTENT_PREFERENCES,
      notifications: DEFAULT_NOTIFICATION_PREFERENCES,
      isLoading: false,
      lastSyncTime: 0,
      hasUnsavedChanges: false,
      
      // Actions
      updateUIPreferences: (preferences) => {
        set((state) => ({
          ui: { ...state.ui, ...preferences },
          hasUnsavedChanges: true,
        }))
      },
      
      updateViewingPreferences: (preferences) => {
        set((state) => ({
          viewing: { ...state.viewing, ...preferences },
          hasUnsavedChanges: true,
        }))
      },
      
      updateAccessibilityPreferences: (preferences) => {
        set((state) => ({
          accessibility: { ...state.accessibility, ...preferences },
          hasUnsavedChanges: true,
        }))
      },
      
      updateContentPreferences: (preferences) => {
        set((state) => ({
          content: { ...state.content, ...preferences },
          hasUnsavedChanges: true,
        }))
      },
      
      updateNotificationPreferences: (preferences) => {
        set((state) => ({
          notifications: { ...state.notifications, ...preferences },
          hasUnsavedChanges: true,
        }))
      },
      
      resetToDefaults: () => {
        set({
          ui: DEFAULT_UI_PREFERENCES,
          viewing: DEFAULT_VIEWING_PREFERENCES,
          accessibility: DEFAULT_ACCESSIBILITY_PREFERENCES,
          content: DEFAULT_CONTENT_PREFERENCES,
          notifications: DEFAULT_NOTIFICATION_PREFERENCES,
          hasUnsavedChanges: true,
        })
      },
      
      exportPreferences: () => {
        const state = get()
        const exportData = {
          ui: state.ui,
          viewing: state.viewing,
          accessibility: state.accessibility,
          content: state.content,
          notifications: state.notifications,
          exportedAt: new Date().toISOString(),
          version: '1.0',
        }
        
        return JSON.stringify(exportData, null, 2)
      },
      
      importPreferences: (data) => {
        try {
          const importData = JSON.parse(data)
          
          if (!importData.ui && !importData.viewing) {
            return false
          }
          
          set({
            ui: { ...DEFAULT_UI_PREFERENCES, ...importData.ui },
            viewing: { ...DEFAULT_VIEWING_PREFERENCES, ...importData.viewing },
            accessibility: { ...DEFAULT_ACCESSIBILITY_PREFERENCES, ...importData.accessibility },
            content: { ...DEFAULT_CONTENT_PREFERENCES, ...importData.content },
            notifications: { ...DEFAULT_NOTIFICATION_PREFERENCES, ...importData.notifications },
            hasUnsavedChanges: true,
          })
          
          return true
        } catch (error) {
          console.error('Failed to import preferences:', error)
          return false
        }
      },
      
      syncPreferences: async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        
        set({ isLoading: true })
        
        try {
          const state = get()
          
          await supabase
            .from('user_preferences')
            .upsert({
              user_id: user.id,
              ui_preferences: state.ui,
              viewing_preferences: state.viewing,
              accessibility_preferences: state.accessibility,
              content_preferences: state.content,
              notification_preferences: state.notifications,
              updated_at: new Date().toISOString(),
            })
          
          set({ 
            hasUnsavedChanges: false,
            lastSyncTime: Date.now(),
          })
        } catch (error) {
          console.error('Failed to sync preferences:', error)
        } finally {
          set({ isLoading: false })
        }
      },
      
      loadPreferences: async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        
        set({ isLoading: true })
        
        try {
          const { data } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', user.id)
            .single()
          
          if (data) {
            set({
              ui: { ...DEFAULT_UI_PREFERENCES, ...data.ui_preferences },
              viewing: { ...DEFAULT_VIEWING_PREFERENCES, ...data.viewing_preferences },
              accessibility: { ...DEFAULT_ACCESSIBILITY_PREFERENCES, ...data.accessibility_preferences },
              content: { ...DEFAULT_CONTENT_PREFERENCES, ...data.content_preferences },
              notifications: { ...DEFAULT_NOTIFICATION_PREFERENCES, ...data.notification_preferences },
              lastSyncTime: Date.now(),
              hasUnsavedChanges: false,
            })
          }
        } catch (error) {
          console.error('Failed to load preferences:', error)
        } finally {
          set({ isLoading: false })
        }
      },
      
      isInQuietHours: () => {
        const state = get()
        if (!state.notifications.quietHours.enabled) return false
        
        const now = new Date()
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
        const { start, end } = state.notifications.quietHours
        
        if (start < end) {
          return currentTime >= start && currentTime <= end
        } else {
          // Overnight quiet hours (e.g., 22:00 to 08:00)
          return currentTime >= start || currentTime <= end
        }
      },
      
      shouldShowNotification: (type: string) => {
        const state = get()
        
        if (state.isInQuietHours()) return false
        if (!state.notifications.systemNotifications) return false
        
        switch (type) {
          case 'newEpisode':
            return state.notifications.newEpisodeAlerts
          case 'seasonFinale':
            return state.notifications.seasonFinaleAlerts
          case 'newSeason':
            return state.notifications.newSeasonAlerts
          case 'recommendation':
            return state.notifications.recommendationAlerts
          default:
            return true
        }
      },
      
      getEffectiveTheme: () => {
        const state = get()
        
        if (state.ui.theme === 'system') {
          if (typeof window !== 'undefined') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
          }
          return 'light'
        }
        
        return state.ui.theme
      },
      
      isAccessibilityEnabled: () => {
        const state = get()
        return (
          state.accessibility.reducedMotion ||
          state.accessibility.highContrast ||
          state.accessibility.keyboardNavigation ||
          state.accessibility.screenReaderOptimized ||
          state.accessibility.colorBlindFriendly ||
          state.accessibility.focusIndicators
        )
      },
    }),
    {
      name: 'user-preferences-store',
      partialize: (state) => ({
        ui: state.ui,
        viewing: state.viewing,
        accessibility: state.accessibility,
        content: state.content,
        notifications: state.notifications,
        lastSyncTime: state.lastSyncTime,
      }),
      storage: {
        getItem: (name) => {
          if (typeof window === 'undefined') return null
          try {
            const item = localStorage.getItem(name)
            return item ? JSON.parse(item) : null
          } catch (error) {
            console.warn('Failed to parse user preferences storage:', error)
            localStorage.removeItem(name)
            return null
          }
        },
        setItem: (name, value) => {
          if (typeof window === 'undefined') return
          try {
            localStorage.setItem(name, JSON.stringify(value))
          } catch (error) {
            console.warn('Failed to store user preferences:', error)
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

// Export helper functions
export const getUserPreferences = () => useUserPreferencesStore.getState()

export const getEffectiveTheme = () => useUserPreferencesStore.getState().getEffectiveTheme()

export const shouldShowNotification = (type: string) => 
  useUserPreferencesStore.getState().shouldShowNotification(type)