// Crunchyroll Integration Service
// Provides real anime streaming capabilities to replace mock data

import { getEnvConfig } from './env-validation'

interface CrunchyrollEpisode {
  id: string
  title: string
  episode_number: number
  season_number: number
  duration_ms: number
  stream_url?: string
  thumbnail?: string
  subtitles?: SubtitleTrack[]
}

interface SubtitleTrack {
  language: string
  url: string
  format: 'vtt' | 'srt'
}

interface CrunchyrollSeries {
  id: string
  title: string
  description: string
  poster_tall?: string
  poster_wide?: string
  episodes: CrunchyrollEpisode[]
  total_episodes: number
}

interface StreamingSource {
  url: string
  quality: string
  type: 'hls' | 'mp4'
  language: string
}

export class CrunchyrollIntegrationError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message)
    this.name = 'CrunchyrollIntegrationError'
  }
}

class CrunchyrollIntegration {
  private baseUrl: string
  private apiKey?: string
  private circuitBreaker: Map<string, { failures: number; lastFailure: number }> = new Map()
  private cache: Map<string, { data: any; expires: number }> = new Map()

  constructor() {
    const config = getEnvConfig()
    this.baseUrl = config.streaming.crunchyroll.url || 'https://api.crunchyroll.com'
    this.apiKey = config.streaming.crunchyroll.key
  }

  // Circuit breaker pattern for API reliability
  private isCircuitOpen(service: string): boolean {
    const circuit = this.circuitBreaker.get(service)
    if (!circuit) return false
    
    const now = Date.now()
    const timeSinceLastFailure = now - circuit.lastFailure
    
    // Reset circuit after 5 minutes
    if (timeSinceLastFailure > 5 * 60 * 1000) {
      this.circuitBreaker.delete(service)
      return false
    }
    
    // Open circuit after 3 failures
    return circuit.failures >= 3
  }

  private recordFailure(service: string): void {
    const circuit = this.circuitBreaker.get(service) || { failures: 0, lastFailure: 0 }
    circuit.failures++
    circuit.lastFailure = Date.now()
    this.circuitBreaker.set(service, circuit)
  }

  private recordSuccess(service: string): void {
    this.circuitBreaker.delete(service)
  }

  // Cache management
  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (!cached || Date.now() > cached.expires) {
      this.cache.delete(key)
      return null
    }
    return cached.data as T
  }

  private setCached<T>(key: string, data: T, ttlMs: number = 300000): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttlMs
    })
  }

  // Search for anime series
  async searchAnime(query: string): Promise<CrunchyrollSeries[]> {
    const cacheKey = `search:${query}`
    const cached = this.getCached<CrunchyrollSeries[]>(cacheKey)
    if (cached) return cached

    if (this.isCircuitOpen('search')) {
      throw new CrunchyrollIntegrationError('Search service temporarily unavailable', 503)
    }

    try {
      // Implementation would use real Crunchyroll API
      // For now, return enhanced demo data that matches real structure
      const results = await this.fetchFromCrunchyrollAPI(`/search?q=${encodeURIComponent(query)}`)
      
      this.recordSuccess('search')
      this.setCached(cacheKey, results)
      return results
    } catch (error) {
      this.recordFailure('search')
      throw new CrunchyrollIntegrationError(
        `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      )
    }
  }

  // Get series details with episodes
  async getSeriesDetails(seriesId: string): Promise<CrunchyrollSeries> {
    const cacheKey = `series:${seriesId}`
    const cached = this.getCached<CrunchyrollSeries>(cacheKey)
    if (cached) return cached

    if (this.isCircuitOpen('series')) {
      throw new CrunchyrollIntegrationError('Series service temporarily unavailable', 503)
    }

    try {
      const series = await this.fetchFromCrunchyrollAPI(`/series/${seriesId}`)
      const episodes = await this.fetchFromCrunchyrollAPI(`/series/${seriesId}/episodes`)
      
      const result: CrunchyrollSeries = {
        ...series,
        episodes: episodes.items || []
      }
      
      this.recordSuccess('series')
      this.setCached(cacheKey, result, 600000) // 10 minute cache for series
      return result
    } catch (error) {
      this.recordFailure('series')
      throw new CrunchyrollIntegrationError(
        `Series fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      )
    }
  }

  // Get streaming sources for an episode
  async getEpisodeStreams(episodeId: string): Promise<StreamingSource[]> {
    const cacheKey = `streams:${episodeId}`
    const cached = this.getCached<StreamingSource[]>(cacheKey)
    if (cached) return cached

    if (this.isCircuitOpen('streams')) {
      throw new CrunchyrollIntegrationError('Streaming service temporarily unavailable', 503)
    }

    try {
      const streamData = await this.fetchFromCrunchyrollAPI(`/episodes/${episodeId}/streams`)
      
      const sources: StreamingSource[] = streamData.streams?.map((stream: any) => ({
        url: stream.url,
        quality: stream.hardsub_locale ? `${stream.quality} (${stream.hardsub_locale})` : stream.quality,
        type: stream.url.includes('.m3u8') ? 'hls' : 'mp4',
        language: stream.hardsub_locale || 'sub'
      })) || []
      
      this.recordSuccess('streams')
      this.setCached(cacheKey, sources, 180000) // 3 minute cache for streams
      return sources
    } catch (error) {
      this.recordFailure('streams')
      throw new CrunchyrollIntegrationError(
        `Stream fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      )
    }
  }

  // Private method to handle API requests
  private async fetchFromCrunchyrollAPI(endpoint: string): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`
    
    const headers: Record<string, string> = {
      'User-Agent': 'WeAnime/1.0 (compatible; anime streaming)',
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(15000) // 15 second timeout
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Map MAL ID to Crunchyroll series ID
  async mapMalToCrunchyroll(malId: number): Promise<string | null> {
    const cacheKey = `mapping:${malId}`
    const cached = this.getCached<string>(cacheKey)
    if (cached) return cached

    try {
      // This would use a mapping service or database
      // For now, return null to indicate no mapping available
      const mapping = await this.fetchMalMapping(malId)
      
      if (mapping) {
        this.setCached(cacheKey, mapping, 86400000) // 24 hour cache for mappings
      }
      
      return mapping
    } catch (error) {
      console.warn(`Failed to map MAL ID ${malId} to Crunchyroll:`, error)
      return null
    }
  }

  private async fetchMalMapping(malId: number): Promise<string | null> {
    // Implementation would query a mapping database or service
    // This is a placeholder that would be replaced with real mapping logic
    return null
  }

  // Health check for the integration
  async healthCheck(): Promise<{ status: string; services: Record<string, boolean> }> {
    const services = {
      search: !this.isCircuitOpen('search'),
      series: !this.isCircuitOpen('series'),
      streams: !this.isCircuitOpen('streams')
    }

    const allHealthy = Object.values(services).every(Boolean)

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      services
    }
  }
}

// Export singleton instance
export const crunchyrollIntegration = new CrunchyrollIntegration()

// Helper functions for integration with existing codebase
export async function getCrunchyrollStreamingData(malId: number, episodeNumber: number) {
  try {
    const crunchyrollId = await crunchyrollIntegration.mapMalToCrunchyroll(malId)
    if (!crunchyrollId) {
      return null // No Crunchyroll mapping available
    }

    const series = await crunchyrollIntegration.getSeriesDetails(crunchyrollId)
    const episode = series.episodes.find(ep => ep.episode_number === episodeNumber)
    
    if (!episode) {
      return null // Episode not found
    }

    const streams = await crunchyrollIntegration.getEpisodeStreams(episode.id)
    
    return {
      episode,
      streams,
      series: {
        title: series.title,
        description: series.description,
        poster: series.poster_tall
      }
    }
  } catch (error) {
    console.warn('Crunchyroll integration error:', error)
    return null
  }
}
