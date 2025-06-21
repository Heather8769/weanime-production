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
    // Use the Crunchyroll Bridge service instead of direct API
    this.baseUrl = config.streaming.crunchyroll.url || 'http://localhost:8081'
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
      // Use real Crunchyroll Bridge service
      const sessionToken = await this.getSessionToken()
      const results = await this.fetchFromCrunchyrollBridge('/search', {
        q: query,
        session_token: sessionToken,
        limit: 20
      })
      
      // Transform bridge response to expected format
      const transformedResults: CrunchyrollSeries[] = results.results.map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description || '',
        poster_tall: item.image_url,
        poster_wide: item.image_url,
        episodes: [],
        total_episodes: item.episode_count || 0
      }))
      
      this.recordSuccess('search')
      this.setCached(cacheKey, transformedResults)
      return transformedResults
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
      const sessionToken = await this.getSessionToken()
      const episodesResponse = await this.fetchFromCrunchyrollBridge('/episodes', {
        anime_id: seriesId,
        session_token: sessionToken
      })
      
      // Get series info from search (using first search result)
      const searchResults = await this.searchAnime('id:' + seriesId)
      const seriesInfo = searchResults[0] || {
        id: seriesId,
        title: 'Unknown Series',
        description: '',
        poster_tall: undefined,
        poster_wide: undefined,
        total_episodes: 0
      }
      
      const result: CrunchyrollSeries = {
        ...seriesInfo,
        episodes: episodesResponse.episodes.map((ep: any) => ({
          id: ep.id,
          title: ep.title,
          episode_number: ep.number,
          season_number: 1,
          duration_ms: (ep.duration_seconds || 0) * 1000,
          thumbnail: ep.thumbnail_url
        }))
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
      const sessionToken = await this.getSessionToken()
      const streamData = await this.fetchFromCrunchyrollBridge('/stream', {
        episode_id: episodeId,
        session_token: sessionToken,
        quality: '1080p'
      })
      
      const sources: StreamingSource[] = [{
        url: streamData.hls_url,
        quality: streamData.quality,
        type: 'hls',
        language: 'sub'
      }]
      
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

  // Private method to handle Crunchyroll Bridge requests
  private async fetchFromCrunchyrollBridge(endpoint: string, data?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`
    
    const headers: Record<string, string> = {
      'User-Agent': 'WeAnime/1.0 (compatible; anime streaming)',
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }

    const response = await fetch(url, {
      method: data ? 'POST' : 'GET',
      headers,
      body: data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(30000) // 30 second timeout for bridge
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Bridge request failed: ${response.status} - ${errorData.error || response.statusText}`)
    }

    return response.json()
  }

  // Get session token for Crunchyroll Bridge
  private async getSessionToken(): Promise<string> {
    const config = getEnvConfig()
    const username = config.streaming.crunchyroll.email
    const password = config.streaming.crunchyroll.password

    if (!username || !password) {
      throw new CrunchyrollIntegrationError('Crunchyroll credentials not configured', 401)
    }

    // Try to get cached session token
    const sessionKey = 'crunchyroll_session'
    const cachedSession = this.getCached<{ token: string; expires: number }>(sessionKey)
    if (cachedSession && Date.now() < cachedSession.expires) {
      return cachedSession.token
    }

    // Login to get new session token
    const loginResponse = await this.fetchFromCrunchyrollBridge('/login', {
      username,
      password
    })

    // Cache the session token
    this.setCached(sessionKey, {
      token: loginResponse.session_token,
      expires: Date.now() + (loginResponse.expires_in * 1000)
    }, loginResponse.expires_in * 1000)

    return loginResponse.session_token
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
    // For now, use search-based mapping since MAL->Crunchyroll mapping 
    // would require a separate mapping service or database
    // This could be enhanced with a proper mapping API later
    console.warn(`MAL ID mapping not implemented for ID: ${malId}. Consider implementing a mapping service.`)
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
