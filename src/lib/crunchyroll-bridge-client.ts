// Production-Ready Crunchyroll Bridge HTTP Client
// Replaces the old spawn-based approach with proper HTTP microservice integration

import { getEnvConfig } from './env-validation'

export interface CrunchyrollSession {
  sessionToken: string
  expiresIn: number
  createdAt: Date
}

export interface CrunchyrollSearchResult {
  id: string
  title: string
  description?: string
  imageUrl?: string
  episodeCount?: number
  rating?: number
}

export interface CrunchyrollSearchResponse {
  results: CrunchyrollSearchResult[]
  total: number
  query: string
}

export interface CrunchyrollStreamSource {
  hls_url: string
  quality: string
  subtitles: CrunchyrollSubtitle[]
  duration_seconds?: number
}

export interface CrunchyrollSubtitle {
  language: string
  label: string
  url: string
  format: string
}

export interface CrunchyrollEpisode {
  id: string
  number: number
  title: string
  description?: string
  thumbnailUrl?: string
  durationSeconds?: number
  airDate?: string
}

export interface CrunchyrollEpisodesResponse {
  episodes: CrunchyrollEpisode[]
  animeId: string
  totalEpisodes: number
}export interface BridgeHealthResponse {
  status: string
  version: string
  uptimeSeconds: number
  activeSessions: number
}

export interface BridgeErrorResponse {
  error: string
  code: string
  details?: string
}

class CrunchyrollBridgeClient {
  private baseUrl: string
  private currentSession: CrunchyrollSession | null = null
  private config: ReturnType<typeof getEnvConfig>

  constructor() {
    this.config = getEnvConfig()
    this.baseUrl = process.env.CRUNCHYROLL_BRIDGE_URL || 'http://localhost:8081'
  }

  // Health check
  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      return response.ok
    } catch (error) {
      console.error('Bridge health check failed:', error)
      return false
    }
  }

  // Get detailed health information
  async getHealth(): Promise<BridgeHealthResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/health`)
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Failed to get bridge health:', error)
      return null
    }
  }

  // Authentication
  async login(username: string, password: string): Promise<CrunchyrollSession> {
    try {
      const response = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        const error: BridgeErrorResponse = await response.json()
        throw new Error(`Login failed: ${error.error} (${error.code})`)
      }

      const loginResponse = await response.json()
      this.currentSession = {
        sessionToken: loginResponse.session_token,
        expiresIn: loginResponse.expires_in,
        createdAt: new Date(),
      }

      console.log('✅ Crunchyroll bridge login successful')
      return this.currentSession
    } catch (error) {
      console.error('❌ Crunchyroll bridge login failed:', error)
      throw error
    }
  }

  // Get current session or login with stored credentials
  async getSession(): Promise<CrunchyrollSession> {
    if (this.currentSession && this.isSessionValid(this.currentSession)) {
      return this.currentSession
    }

    // Try to login with stored credentials
    const username = this.config.streaming.crunchyroll.email
    const password = this.config.streaming.crunchyroll.password

    if (!username || !password) {
      throw new Error('Crunchyroll credentials not configured')
    }

    return this.login(username, password)
  }

  private isSessionValid(session: CrunchyrollSession): boolean {
    const now = new Date()
    const expiresAt = new Date(session.createdAt.getTime() + session.expiresIn * 1000)
    return now < expiresAt
  }

  // Search anime
  async searchAnime(query: string, limit: number = 20): Promise<CrunchyrollSearchResponse> {
    const session = await this.getSession()

    try {
      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: query,
          session_token: session.sessionToken,
          limit,
        }),
      })

      if (!response.ok) {
        const error: BridgeErrorResponse = await response.json()
        throw new Error(`Search failed: ${error.error} (${error.code})`)
      }

      const searchResponse = await response.json()
      console.log(`🔍 Crunchyroll search for "${query}" returned ${searchResponse.results.length} results`)
      return searchResponse
    } catch (error) {
      console.error('❌ Crunchyroll search failed:', error)
      throw error
    }
  }

  // Get streaming source for episode
  async getStreamingSource(episodeId: string, quality: string = '1080p'): Promise<CrunchyrollStreamSource> {
    const session = await this.getSession()

    try {
      const response = await fetch(`${this.baseUrl}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episode_id: episodeId,
          session_token: session.sessionToken,
          quality,
        }),
      })

      if (!response.ok) {
        const error: BridgeErrorResponse = await response.json()
        throw new Error(`Stream failed: ${error.error} (${error.code})`)
      }

      const streamResponse = await response.json()
      console.log(`🎥 Crunchyroll stream generated for episode ${episodeId}`)
      return streamResponse
    } catch (error) {
      console.error('❌ Crunchyroll stream generation failed:', error)
      throw error
    }
  }

  // Get episodes for anime series
  async getEpisodes(animeId: string): Promise<CrunchyrollEpisodesResponse> {
    const session = await this.getSession()

    try {
      const response = await fetch(`${this.baseUrl}/episodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anime_id: animeId,
          session_token: session.sessionToken,
        }),
      })

      if (!response.ok) {
        const error: BridgeErrorResponse = await response.json()
        throw new Error(`Episodes fetch failed: ${error.error} (${error.code})`)
      }

      const episodesResponse = await response.json()
      console.log(`📺 Crunchyroll episodes fetched for anime ${animeId}: ${episodesResponse.total_episodes} episodes`)
      return episodesResponse
    } catch (error) {
      console.error('❌ Crunchyroll episodes fetch failed:', error)
      throw error
    }
  }

  // Test login with credentials
  async testLogin(): Promise<boolean> {
    try {
      const username = this.config.streaming.crunchyroll.email
      const password = this.config.streaming.crunchyroll.password

      if (!username || !password) {
        console.warn('⚠️ Crunchyroll credentials not configured')
        return false
      }

      await this.login(username, password)
      return true
    } catch (error) {
      console.error('❌ Crunchyroll login test failed:', error)
      return false
    }
  }

  // Clear current session
  logout(): void {
    this.currentSession = null
    console.log('🔓 Crunchyroll session cleared')
  }
}

// Export singleton instance
export const crunchyrollBridgeClient = new CrunchyrollBridgeClient()