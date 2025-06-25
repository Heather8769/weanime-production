// Store exports and coordination
export * from './video-playback-store'
export * from './watch-progress-store'
export * from './user-preferences-store'
export * from './analytics-store'

import { useVideoPlaybackStore } from './video-playback-store'
import { useWatchProgressStore } from './watch-progress-store'
import { useUserPreferencesStore } from './user-preferences-store'
import { useAnalyticsStore } from './analytics-store'

// Store coordination hooks and utilities
export const useStores = () => ({
  videoPlayback: useVideoPlaybackStore(),
  watchProgress: useWatchProgressStore(),
  userPreferences: useUserPreferencesStore(),
  analytics: useAnalyticsStore(),
})

// Get store states (non-hook version for use in regular functions)
const getStores = () => ({
  videoPlayback: useVideoPlaybackStore.getState(),
  watchProgress: useWatchProgressStore.getState(),
  userPreferences: useUserPreferencesStore.getState(),
  analytics: useAnalyticsStore.getState(),
})

// Coordinated actions that span multiple stores
export const coordinatedActions = {
  // Initialize all stores for a user session
  initializeSession: async () => {
    const stores = getStores()
    
    try {
      await Promise.all([
        stores.watchProgress.loadProgress(),
        stores.userPreferences.loadPreferences(),
        stores.analytics.loadAnalytics(),
      ])
    } catch (error) {
      console.error('Failed to initialize stores:', error)
    }
  },

  // Start watching an episode with full coordination
  startWatching: (animeId: number, episode: any, animeTitle: string) => {
    const { videoPlayback, watchProgress, userPreferences, analytics } = getStores()
    
    // Set up video playback
    videoPlayback.setCurrentAnime(animeId)
    videoPlayback.setCurrentEpisode(episode)
    
    // Apply user preferences
    videoPlayback.setVolume(userPreferences.viewing.defaultVolume)
    videoPlayback.updateSettings({
      autoPlay: userPreferences.ui.autoPlay,
      autoSkipIntro: userPreferences.ui.skipIntro,
      autoSkipOutro: userPreferences.ui.skipOutro,
      subtitleLanguage: userPreferences.ui.subtitleLanguage,
      quality: userPreferences.ui.videoQuality,
      theaterMode: userPreferences.ui.theaterMode,
      playbackRate: userPreferences.viewing.playbackSpeed,
    })
    
    // Add to watch history
    watchProgress.addToHistory(
      animeId,
      episode.id,
      episode.number,
      animeTitle,
      episode.title,
      episode.thumbnail
    )
    
    // Start analytics session
    if (analytics.analyticsEnabled) {
      analytics.startSession(animeId, episode.id, userPreferences.ui.videoQuality)
    }
  },

  // Update progress across relevant stores
  updateWatchProgress: (animeId: number, episodeId: string, episodeNumber: number, currentTime: number, duration: number) => {
    const { watchProgress, analytics, userPreferences } = getStores()
    
    // Update watch progress
    watchProgress.updateProgress(animeId, episodeId, episodeNumber, currentTime, duration)
    
    // Update analytics session
    const completionPercentage = (currentTime / duration) * 100
    analytics.updateSession({
      duration: currentTime,
      totalEpisodeDuration: duration,
      completionPercentage,
    })
    
    // Check if episode should be marked as watched
    if (completionPercentage >= userPreferences.viewing.markAsWatchedThreshold) {
      watchProgress.markEpisodeCompleted(animeId, episodeId, episodeNumber)
    }
  },

  // Stop watching with cleanup
  stopWatching: () => {
    const { analytics } = getStores()
    
    // End analytics session
    analytics.endSession()
    
    // Trigger sync of progress data
    setTimeout(() => {
      const { watchProgress } = getStores()
      watchProgress.syncProgress()
    }, 1000)
  },

  // Handle user preference changes that affect other stores
  updatePreferences: (category: string, preferences: any) => {
    const { userPreferences, videoPlayback, analytics } = getStores()
    
    // Update preferences store
    switch (category) {
      case 'ui':
        userPreferences.updateUIPreferences(preferences)
        // Apply to current playback if active
        if (videoPlayback.currentEpisode) {
          videoPlayback.updateSettings({
            autoPlay: preferences.autoPlay,
            autoSkipIntro: preferences.skipIntro,
            autoSkipOutro: preferences.skipOutro,
            subtitleLanguage: preferences.subtitleLanguage,
            quality: preferences.videoQuality,
            theaterMode: preferences.theaterMode,
          })
        }
        break
      case 'viewing':
        userPreferences.updateViewingPreferences(preferences)
        if (videoPlayback.currentEpisode) {
          videoPlayback.updateSettings({
            playbackRate: preferences.playbackSpeed,
          })
          if (preferences.defaultVolume !== undefined) {
            videoPlayback.setVolume(preferences.defaultVolume)
          }
        }
        break
      case 'accessibility':
        userPreferences.updateAccessibilityPreferences(preferences)
        break
      case 'content':
        userPreferences.updateContentPreferences(preferences)
        break
      case 'notifications':
        userPreferences.updateNotificationPreferences(preferences)
        break
    }
    
    // Track preference changes in analytics
    analytics.trackEvent('preference_changed', { category, preferences })
  },

  // Sync all stores
  syncAllStores: async () => {
    const { watchProgress, userPreferences, analytics } = getStores()
    
    try {
      await Promise.all([
        watchProgress.syncProgress(),
        userPreferences.syncPreferences(),
        analytics.syncAnalytics(),
      ])
    } catch (error) {
      console.error('Failed to sync stores:', error)
    }
  },

  // Export all data
  exportAllData: () => {
    const { watchProgress, userPreferences, analytics } = getStores()
    
    const exportData = {
      watchProgress: watchProgress.exportProgress(),
      userPreferences: userPreferences.exportPreferences(),
      analytics: analytics.exportAnalytics(),
      exportedAt: new Date().toISOString(),
      version: '1.0',
    }
    
    return JSON.stringify(exportData, null, 2)
  },

  // Import all data
  importAllData: (data: string) => {
    try {
      const importData = JSON.parse(data)
      const { watchProgress, userPreferences, analytics } = getStores()
      
      let success = true
      
      if (importData.watchProgress) {
        success = watchProgress.importProgress(importData.watchProgress) && success
      }
      
      if (importData.userPreferences) {
        success = userPreferences.importPreferences(importData.userPreferences) && success
      }
      
      if (importData.analytics) {
        // Analytics import would need to be implemented
        console.warn('Analytics import not yet implemented')
      }
      
      return success
    } catch (error) {
      console.error('Failed to import data:', error)
      return false
    }
  },

  // Clear all data
  clearAllData: () => {
    const { watchProgress, userPreferences, analytics } = getStores()
    
    watchProgress.clearHistory()
    userPreferences.resetToDefaults()
    analytics.clearAnalytics()
  },

  // Handle video events with coordination
  handleVideoEvent: (event: string, data?: any) => {
    const { analytics, videoPlayback } = getStores()
    
    switch (event) {
      case 'play':
        analytics.trackEvent('video_play', data)
        videoPlayback.setIsPlaying(true)
        break
      case 'pause':
        analytics.trackEvent('video_pause', data)
        analytics.updateSession({ pauseCount: (analytics.currentSession?.pauseCount || 0) + 1 })
        videoPlayback.setIsPlaying(false)
        break
      case 'seek':
        analytics.trackEvent('video_seek', data)
        analytics.updateSession({ seekCount: (analytics.currentSession?.seekCount || 0) + 1 })
        break
      case 'volumechange':
        analytics.trackEvent('video_volume_change', data)
        analytics.updateSession({ volumeChanges: (analytics.currentSession?.volumeChanges || 0) + 1 })
        break
      case 'fullscreenchange':
        analytics.trackEvent('video_fullscreen_change', data)
        videoPlayback.setFullscreen(data?.isFullscreen || false)
        break
      case 'error':
        analytics.trackError('video_error', data)
        break
      case 'waiting':
        analytics.trackPerformance('bufferingEvent', 1)
        break
      case 'loadstart':
        const loadStartTime = Date.now()
        analytics.trackEvent('video_load_start', { timestamp: loadStartTime })
        break
      case 'loadeddata':
        analytics.trackEvent('video_loaded', data)
        break
    }
  },

  // Get consolidated statistics
  getConsolidatedStats: () => {
    const { watchProgress, analytics, userPreferences } = getStores()
    
    const watchStats = watchProgress.getWatchStatistics()
    const analyticsStats = analytics.watchingBehavior
    const performanceReport = analytics.getPerformanceReport()
    
    return {
      watching: {
        totalWatchTime: watchStats.totalWatchTime,
        episodesWatched: watchStats.episodesWatched,
        animeWatched: watchStats.animeWatched,
        averageWatchTime: watchStats.averageWatchTime,
        completionRate: watchStats.completionRate,
        streakDays: watchStats.streakDays,
      },
      behavior: {
        averageSessionDuration: analyticsStats.averageSessionDuration,
        preferredWatchingHours: analyticsStats.preferredWatchingHours,
        bingeDays: analyticsStats.bingeDays.length,
        genrePreferences: analyticsStats.genrePreferences,
      },
      performance: {
        averageQuality: performanceReport.averageQuality,
        bufferingIssues: performanceReport.bufferingIssues,
        deviceCompatibility: performanceReport.deviceCompatibility,
        recommendedSettings: performanceReport.recommendedSettings,
      },
      preferences: {
        theme: userPreferences.getEffectiveTheme(),
        accessibilityEnabled: userPreferences.isAccessibilityEnabled(),
        notificationsEnabled: userPreferences.notifications.systemNotifications,
      },
    }
  },
}

// Hook for accessing coordinated actions
export const useCoordinatedActions = () => coordinatedActions

// Migration helper for moving from monolithic store
export const migrateFromMonolithicStore = () => {
  try {
    // Check if old store data exists
    const oldStoreData = localStorage.getItem('watch-store')
    if (!oldStoreData) return false
    
    const oldData = JSON.parse(oldStoreData)
    const { watchProgress, userPreferences, analytics } = getStores()
    
    // Migrate watch progress
    if (oldData.watchProgress) {
      // Convert old format to new format
      const progressEntries = oldData.watchProgress instanceof Map 
        ? Array.from(oldData.watchProgress.entries())
        : oldData.watchProgress
        
      for (const [key, progress] of progressEntries) {
        watchProgress.updateProgress(
          progress.animeId,
          progress.episodeId,
          progress.episodeNumber,
          progress.currentTime,
          progress.duration
        )
      }
    }
    
    // Migrate settings to preferences
    if (oldData.settings) {
      userPreferences.updateUIPreferences({
        autoPlay: oldData.settings.autoPlay,
        skipIntro: oldData.settings.autoSkipIntro,
        skipOutro: oldData.settings.autoSkipOutro,
        subtitleLanguage: oldData.settings.subtitleLanguage,
        videoQuality: oldData.settings.quality,
        theaterMode: oldData.settings.theaterMode,
      })
      
      userPreferences.updateViewingPreferences({
        defaultVolume: oldData.settings.volume,
        playbackSpeed: oldData.settings.playbackRate,
      })
    }
    
    // Start fresh analytics
    analytics.trackEvent('migration_completed', { 
      migratedData: {
        progressEntries: oldData.watchProgress?.length || 0,
        hasSettings: !!oldData.settings
      }
    })
    
    // Remove old data
    localStorage.removeItem('watch-store')
    
    console.log('Successfully migrated from monolithic store')
    return true
  } catch (error) {
    console.error('Failed to migrate from monolithic store:', error)
    return false
  }
}

// Initialize stores on app start
export const initializeStores = async () => {
  try {
    // Check for migration first
    migrateFromMonolithicStore()
    
    // Initialize all stores
    await coordinatedActions.initializeSession()
    
    // Set up periodic sync
    const syncInterval = 5 * 60 * 1000 // 5 minutes
    setInterval(() => {
      coordinatedActions.syncAllStores()
    }, syncInterval)
    
    console.log('Stores initialized successfully')
  } catch (error) {
    console.error('Failed to initialize stores:', error)
  }
}