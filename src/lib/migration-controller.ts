// Migration Controller
// Manages gradual migration from mock data to real content

import { getEnvConfig } from './env-validation'
import { getCrunchyrollStreamingData } from './crunchyroll-integration'
import { getStreamingWithFallback } from './enhanced-backend-proxy'
import { apiRateLimiter } from './api-rate-limiter'
import { crunchyrollBridgeClient } from './crunchyroll-bridge-client'

// Real metadata fetching functions
async function fetchAnimeMetadata(animeId: string): Promise<{title: string; totalEpisodes: number}> {
  try {
    // Try to get metadata from AniList API
    const response = await fetch(`https://graphql.anilist.co/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query ($id: Int) {
            Media (id: $id, type: ANIME) {
              title {
                romaji
                english
              }
              episodes
            }
          }
        `,
        variables: { id: parseInt(animeId) }
      })
    })
    
    const data = await response.json()
    if (data.data?.Media) {
      return {
        title: data.data.Media.title.english || data.data.Media.title.romaji,
        totalEpisodes: data.data.Media.episodes || 0
      }
    }
  } catch (error) {
    console.warn('Failed to fetch anime metadata from AniList:', error)
  }
  
  // Fallback to basic metadata
  return {
    title: `Anime ${animeId}`,
    totalEpisodes: 0
  }
}

async function fetchEpisodeMetadata(animeId: string, episodeNumber: string): Promise<{title: string}> {
  try {
    // For now, return basic episode title
    // Could be expanded to fetch from episode-specific APIs
    return {
      title: `Episode ${episodeNumber}`
    }
  } catch (error) {
    console.warn('Failed to fetch episode metadata:', error)
    return {
      title: `Episode ${episodeNumber}`
    }
  }
}

interface MigrationConfig {
  enableCrunchyroll: boolean
  enableBackend: boolean
  enableRealStreaming: boolean
  fallbackToMock: boolean
  migrationPercentage: number // 0-100, percentage of requests to use real sources
}

interface ContentSource {
  type: 'crunchyroll' | 'backend' | 'mock' | 'fallback'
  priority: number
  enabled: boolean
  healthCheck: () => Promise<boolean>
}

interface StreamingResult {
  success: boolean
  source: string
  data?: any
  error?: string
  fallbackUsed: boolean
}

export class MigrationController {
  private config: MigrationConfig
  private sources: ContentSource[]
  private migrationStats: Map<string, { attempts: number; successes: number; source: string }> = new Map()

  constructor() {
    const envConfig = getEnvConfig()
    
    this.config = {
      enableCrunchyroll: envConfig.streaming.crunchyroll.enabled,
      enableBackend: true, // Always try backend
      enableRealStreaming: true, // Force enable real streaming
      fallbackToMock: false, // NO MORE MOCK DATA - real content only!
      migrationPercentage: this.getMigrationPercentage()
    }

    this.sources = this.initializeSources()
  }

  private getMigrationPercentage(): number {
    // 100% real content - no more mock data!
    const stored = typeof window !== 'undefined' ? localStorage.getItem('migration-percentage') : null
    return stored ? parseInt(stored, 10) : 100
  }

  private initializeSources(): ContentSource[] {
    return [
      {
        type: 'crunchyroll' as const,
        priority: 1,
        enabled: this.config.enableCrunchyroll,
        healthCheck: async () => {
          try {
            // Check both API rate limiter and new bridge client
            const apiAvailable = apiRateLimiter.isApiAvailable('crunchyroll')
            const bridgeHealthy = await crunchyrollBridgeClient.isHealthy()
            return apiAvailable && bridgeHealthy
          } catch {
            return false
          }
        }
      },
      {
        type: 'backend' as const,
        priority: 2,
        enabled: this.config.enableBackend,
        healthCheck: async () => {
          try {
            return apiRateLimiter.isApiAvailable('weanime-backend')
          } catch {
            return false
          }
        }
      },
      // Mock source removed - real content only!
    ].filter(source => source.enabled)
  }

  // Determine if this request should use real content or mock data
  shouldUseMigration(animeId: number): boolean {
    // Expanded priority anime list - always use real content for these
    const priorityAnimeIds = [
      // Classic/Popular Series
      1,     // Cowboy Bebop
      5,     // Cowboy Bebop (alternative ID)
      16,    // Angel's Egg
      20,    // Naruto
      21,    // One Piece
      30,    // Neon Genesis Evangelion

      // Modern Popular Series
      11757, // Sword Art Online
      16498, // Attack on Titan
      9253,  // Steins;Gate
      1535,  // Death Note
      11061, // Hunter x Hunter (2011)
      820,   // Ginga Eiyuu Densetsu

      // Studio Ghibli
      164,   // Mononoke Hime
      523,   // Spirited Away
      430,   // My Neighbor Totoro
      572,   // Grave of the Fireflies

      // Recent Popular
      40748, // Jujutsu Kaisen
      44511, // Chainsaw Man
      40456, // Kimetsu no Yaiba: Mugen Ressha-hen
      38000, // Kimetsu no Yaiba

      // Anime Movies
      129,   // Sen to Chihiro no Kamikakushi
      431,   // Howl's Moving Castle

      // Seasonal Favorites
      34566, // My Hero Academia
      31964, // Boku no Hero Academia 2nd Season
      36456, // Boku no Hero Academia 3rd Season
    ]

    if (priorityAnimeIds.includes(animeId)) {
      return true
    }

    // Use percentage-based migration for other content (now 100%)
    const random = Math.random() * 100
    return random < this.config.migrationPercentage
  }

  // Get streaming data with intelligent fallback
  async getStreamingData(animeId: number, episodeNumber: number): Promise<StreamingResult> {
    const useMigration = this.shouldUseMigration(animeId)
    const cacheKey = `${animeId}-${episodeNumber}`
    
    console.log(`🔄 Migration Controller: anime ${animeId} episode ${episodeNumber}, useMigration: ${useMigration}`)

    // Always try real sources - no more mock data fallbacks!
    const availableSources = await this.getAvailableSources()

    if (availableSources.length === 0) {
      console.error(`No available sources for anime ${animeId} episode ${episodeNumber}`)
      return {
        success: false,
        source: 'none',
        error: 'No streaming sources available. Please check your internet connection and try again.',
        fallbackUsed: false
      }
    }

    for (const source of availableSources) {
      try {
        const result = await this.trySource(source, animeId, episodeNumber)
        if (result.success) {
          this.recordSuccess(cacheKey, source.type)
          return result
        }
      } catch (error) {
        console.warn(`Source ${source.type} failed:`, error)
        this.recordFailure(cacheKey, source.type)
      }
    }

    // All real sources failed - return error instead of mock data
    console.error(`All real sources failed for anime ${animeId} episode ${episodeNumber}`)
    return {
      success: false,
      source: 'failed',
      error: 'Unable to load this episode. Please try another episode or check back later.',
      fallbackUsed: false
    }
  }

  private async getAvailableSources(): Promise<ContentSource[]> {
    const healthChecks = await Promise.allSettled(
      this.sources.map(async (source) => ({
        source,
        healthy: await source.healthCheck()
      }))
    )

    return healthChecks
      .filter((result): result is PromiseFulfilledResult<{ source: ContentSource; healthy: boolean }> => 
        result.status === 'fulfilled' && result.value.healthy
      )
      .map(result => result.value.source)
      .sort((a, b) => a.priority - b.priority)
  }

  private async trySource(source: ContentSource, animeId: number, episodeNumber: number): Promise<StreamingResult> {
    switch (source.type) {
      case 'crunchyroll':
        return this.tryCrunchyroll(animeId, episodeNumber)
      
      case 'backend':
        return this.tryBackend(animeId, episodeNumber)

      default:
        throw new Error(`Unknown source type: ${source.type}`)
    }
  }

  private async tryCrunchyroll(animeId: number, episodeNumber: number): Promise<StreamingResult> {
    try {
      // Use the new production-ready Crunchyroll bridge client
      console.log(`🦀 Using production Crunchyroll bridge for anime ${animeId} episode ${episodeNumber}`)

      // Check if bridge is healthy
      const isHealthy = await crunchyrollBridgeClient.isHealthy()
      if (!isHealthy) {
        throw new Error('Crunchyroll bridge is not healthy')
      }

      // Get streaming source from bridge
      const episodeId = `anime-${animeId}-episode-${episodeNumber}`
      const streamSource = await crunchyrollBridgeClient.getStreamingSource(episodeId, '1080p')

      if (streamSource) {
        // Get real anime metadata
        const animeMetadata = await fetchAnimeMetadata(animeId.toString())
        const episodeMetadata = await fetchEpisodeMetadata(animeId.toString(), episodeNumber.toString())
        
        const streamData = {
          streamUrl: streamSource.hls_url,
          quality: streamSource.quality,
          isM3U8: true, // Crunchyroll uses HLS
          animeTitle: animeMetadata.title || `Anime ${animeId}`,
          episodeTitle: episodeMetadata.title || `Episode ${episodeNumber}`,
          totalEpisodes: animeMetadata.totalEpisodes || 0,
          source: 'crunchyroll-bridge-v2',
          sourceType: 'crunchyroll',
          subtitles: streamSource.subtitles.map(sub => ({
            language: sub.language,
            label: sub.label,
            url: sub.url,
            format: sub.format
          })),
          duration: streamSource.duration_seconds
        }

        return {
          success: true,
          source: 'crunchyroll',
          data: streamData,
          fallbackUsed: false
        }
      }

      throw new Error('No stream source returned from bridge')
    } catch (error) {
      console.warn(`🔄 Crunchyroll bridge failed, trying fallback: ${error}`)

      // Fallback to old integration
      try {
        const data = await getCrunchyrollStreamingData(animeId, episodeNumber)

        if (data && data.streams.length > 0) {
          return {
            success: true,
            source: 'crunchyroll',
            data,
            fallbackUsed: true
          }
        }
      } catch (fallbackError) {
        console.error(`❌ Crunchyroll fallback also failed: ${fallbackError}`)
      }

      return {
        success: false,
        source: 'crunchyroll',
        error: error instanceof Error ? error.message : 'Unknown error',
        fallbackUsed: false
      }
    }
  }

  private async tryBackend(animeId: number, episodeNumber: number): Promise<StreamingResult> {
    try {
      // Convert animeId to slug (this would need proper mapping)
      const animeSlug = `anime-${animeId}` // Placeholder - implement proper mapping
      const data = await getStreamingWithFallback(animeSlug, episodeNumber)
      
      if (data) {
        return {
          success: true,
          source: 'backend',
          data,
          fallbackUsed: false
        }
      }
      
      throw new Error('No backend streams available')
    } catch (error) {
      return {
        success: false,
        source: 'backend',
        error: error instanceof Error ? error.message : 'Unknown error',
        fallbackUsed: false
      }
    }
  }

  // Mock data function removed - real content only!

  private recordSuccess(cacheKey: string, source: string): void {
    const stats = this.migrationStats.get(cacheKey) || { attempts: 0, successes: 0, source: 'unknown' }
    stats.attempts++
    stats.successes++
    stats.source = source
    this.migrationStats.set(cacheKey, stats)
  }

  private recordFailure(cacheKey: string, source: string): void {
    const stats = this.migrationStats.get(cacheKey) || { attempts: 0, successes: 0, source: 'unknown' }
    stats.attempts++
    stats.source = source
    this.migrationStats.set(cacheKey, stats)
  }

  // Get migration statistics
  getMigrationStats(): {
    totalAttempts: number
    totalSuccesses: number
    successRate: number
    sourceBreakdown: Record<string, number>
    migrationPercentage: number
  } {
    let totalAttempts = 0
    let totalSuccesses = 0
    const sourceBreakdown: Record<string, number> = {}

    for (const stats of this.migrationStats.values()) {
      totalAttempts += stats.attempts
      totalSuccesses += stats.successes
      sourceBreakdown[stats.source] = (sourceBreakdown[stats.source] || 0) + 1
    }

    return {
      totalAttempts,
      totalSuccesses,
      successRate: totalAttempts > 0 ? (totalSuccesses / totalAttempts) * 100 : 0,
      sourceBreakdown,
      migrationPercentage: this.config.migrationPercentage
    }
  }

  // Update migration percentage
  updateMigrationPercentage(percentage: number): void {
    this.config.migrationPercentage = Math.max(0, Math.min(100, percentage))
    if (typeof window !== 'undefined') {
      localStorage.setItem('migration-percentage', this.config.migrationPercentage.toString())
    }
    console.log(`🔄 Migration percentage updated to ${this.config.migrationPercentage}%`)
  }

  // Get current configuration
  getConfig(): MigrationConfig {
    return { ...this.config }
  }

  // Update configuration
  updateConfig(updates: Partial<MigrationConfig>): void {
    this.config = { ...this.config, ...updates }
    this.sources = this.initializeSources()
    console.log('🔄 Migration configuration updated:', this.config)
  }
}

// Export singleton instance
export const migrationController = new MigrationController()

// Helper function for easy integration
export async function getStreamingDataWithMigration(animeId: number, episodeNumber: number) {
  return migrationController.getStreamingData(animeId, episodeNumber)
}
