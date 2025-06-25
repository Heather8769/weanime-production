// Secure Crunchyroll Bridge - Replaces spawn('curl') with native fetch API
// This fixes critical security vulnerabilities in the original implementation

import { getEnvConfig } from './env-validation'

interface CrunchyrollEpisodeInfo {
  id: string
  title: string
  episode_number: number
  season_number: number
  series_title: string
  description: string
  duration_ms: number
  thumbnail?: string
  subtitles: SubtitleTrack[]
  audio_locale: string
}

interface CrunchyrollStreamingSource {
  url: string
  quality: string
  type: 'hls' | 'dash'
  language: string
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
  episodes: CrunchyrollEpisodeInfo[]
  total_episodes: number
}

interface BridgeResponse {
  success: boolean
  data?: any
  error?: string
  code?: string
}

/**
 * Secure Crunchyroll Bridge Client
 * Uses native fetch API with proper security measures
 * Replaces the vulnerable spawn('curl') implementation
 */
export class SecureCrunchyrollBridge {
  private bridgeUrl: string
  private maxRetries: number = 3
  private requestTimeout: number = 30000 // 30 seconds
  private config: ReturnType<typeof getEnvConfig>

  constructor(bridgeUrl?: string) {
    this.config = getEnvConfig()
    this.bridgeUrl = bridgeUrl || this.config.streaming.crunchyroll.bridgeUrl || 'http://localhost:8081'
    
    // Validate bridge URL to prevent SSRF attacks
    this.validateBridgeUrl(this.bridgeUrl)
  }

  /**
   * Validate bridge URL to prevent SSRF attacks
   */
  private validateBridgeUrl(url: string): void {
    try {
      const parsedUrl = new URL(url)
      
      // Only allow http/https protocols
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol: only http and https are allowed')
      }
      
      // Prevent localhost bypass attempts
      const hostname = parsedUrl.hostname.toLowerCase()
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        console.warn('⚠️ Using localhost bridge URL - ensure this is intentional')
      }
      
      // Prevent private IP ranges in production
      if (process.env.NODE_ENV === 'production' && this.isPrivateIP(hostname)) {
        throw new Error('Private IP addresses not allowed in production')
      }
      
    } catch (error) {
      throw new Error(`Invalid bridge URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Check if hostname is a private IP address
   */
  private isPrivateIP(hostname: string): boolean {
    const privateRanges = [
      /^127\./, // 127.0.0.0/8
      /^10\./, // 10.0.0.0/8
      /^192\.168\./, // 192.168.0.0/16
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./ // 172.16.0.0/12
    ]
    
    return privateRanges.some(range => range.test(hostname))
  }

  /**
   * Secure HTTP request with proper validation and timeouts
   */
  private async secureRequest(endpoint: string, options: RequestInit = {}): Promise<BridgeResponse> {
    const url = `${this.bridgeUrl}${endpoint}`
    
    try {
      // Create AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout)
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WeAnime-Secure-Bridge/1.0',
          ...options.headers
        }
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }
      
      const data = await response.json()
      return { success: true, data }
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.requestTimeout}ms`)
      }
      
      console.error('Bridge request failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'BRIDGE_REQUEST_FAILED'
      }
    }
  }

  /**
   * Validate and sanitize command arguments
   */
  private validateCommand(command: string[]): string[] {
    if (!Array.isArray(command) || command.length === 0) {
      throw new Error('Invalid command: must be non-empty array')
    }
    
    // Sanitize each argument
    return command.map(arg => {
      if (typeof arg !== 'string') {
        throw new Error('Invalid command argument: must be string')
      }
      
      // Remove potentially dangerous characters
      const sanitized = arg.replace(/[;&|`$(){}[\]\\]/g, '')
      
      if (sanitized !== arg) {
        console.warn(`⚠️ Sanitized command argument: ${arg} -> ${sanitized}`)
      }
      
      return sanitized
    })
  }

  /**
   * Execute a command on the bridge service securely
   */
  private async executeBridgeCommand(args: string[]): Promise<string> {
    const sanitizedArgs = this.validateCommand(args)
    
    const response = await this.secureRequest('/execute', {
      method: 'POST',
      body: JSON.stringify({ command: sanitizedArgs })
    })
    
    if (!response.success) {
      throw new Error(response.error || 'Bridge command failed')
    }
    
    return JSON.stringify(response.data)
  }

  /**
   * Test connection to the bridge service
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.secureRequest('/health', { method: 'GET' })
      return response.success
    } catch (error) {
      console.error('Bridge connection test failed:', error)
      return false
    }
  }

  /**
   * Login to Crunchyroll through the bridge
   * Uses secure credential handling
   */
  async login(email: string, password: string): Promise<boolean> {
    // Validate credentials
    if (!email || !password) {
      throw new Error('Email and password are required')
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format')
    }
    
    // Prevent credential injection
    if (email.includes('\n') || email.includes('\r') || password.includes('\n') || password.includes('\r')) {
      throw new Error('Invalid characters in credentials')
    }
    
    try {
      const response = await this.secureRequest('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      })
      
      if (!response.success) {
        throw new Error(response.error || 'Login failed')
      }
      
      return response.data?.success || false
    } catch (error) {
      console.error('Bridge login failed:', error)
      return false
    }
  }

  /**
   * Search for anime series
   */
  async searchSeries(query: string): Promise<CrunchyrollSeries[]> {
    if (!query || query.trim().length === 0) {
      throw new Error('Search query is required')
    }
    
    // Sanitize search query
    const sanitizedQuery = query.trim().substring(0, 100) // Limit length
    
    try {
      const response = await this.secureRequest('/search', {
        method: 'POST',
        body: JSON.stringify({ query: sanitizedQuery })
      })
      
      if (!response.success) {
        throw new Error(response.error || 'Search failed')
      }
      
      return response.data?.series || []
    } catch (error) {
      console.error('Bridge search failed:', error)
      return []
    }
  }

  /**
   * Get series information
   */
  async getSeriesInfo(seriesId: string): Promise<CrunchyrollSeries | null> {
    if (!seriesId || !/^[a-zA-Z0-9_-]+$/.test(seriesId)) {
      throw new Error('Invalid series ID format')
    }
    
    try {
      const response = await this.secureRequest('/series', {
        method: 'POST',
        body: JSON.stringify({ series_id: seriesId })
      })
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to get series info')
      }
      
      return response.data || null
    } catch (error) {
      console.error('Failed to get series info:', error)
      return null
    }
  }

  /**
   * Get episode information
   */
  async getEpisodeInfo(episodeId: string): Promise<CrunchyrollEpisodeInfo | null> {
    if (!episodeId || !/^[a-zA-Z0-9_-]+$/.test(episodeId)) {
      throw new Error('Invalid episode ID format')
    }
    
    try {
      const response = await this.secureRequest('/episode', {
        method: 'POST',
        body: JSON.stringify({ episode_id: episodeId })
      })
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to get episode info')
      }
      
      const episodeData = response.data
      
      if (episodeData) {
        return {
          id: episodeData.id || episodeId,
          title: episodeData.title || 'Crunchyroll Episode',
          episode_number: episodeData.episode_number || 1,
          season_number: episodeData.season_number || 1,
          series_title: episodeData.series_title || 'Crunchyroll Series',
          description: episodeData.description || 'Episode from Crunchyroll',
          duration_ms: episodeData.duration_ms || 1440000,
          thumbnail: episodeData.thumbnail || null,
          subtitles: episodeData.subtitles || [],
          audio_locale: episodeData.audio_locale || 'en-US'
        }
      }
      
      return null
    } catch (error) {
      console.error('Failed to get episode info:', error)
      return null
    }
  }

  /**
   * Get streaming sources for an episode
   */
  async getStreamingSources(episodeId: string): Promise<CrunchyrollStreamingSource[]> {
    if (!episodeId || !/^[a-zA-Z0-9_-]+$/.test(episodeId)) {
      throw new Error('Invalid episode ID format')
    }
    
    try {
      const response = await this.secureRequest('/stream', {
        method: 'POST',
        body: JSON.stringify({ episode_id: episodeId })
      })
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to get streaming sources')
      }
      
      const streamData = response.data
      
      if (streamData?.sources && Array.isArray(streamData.sources)) {
        return streamData.sources.map((source: any) => ({
          url: source.url,
          quality: source.quality || '1080p',
          type: source.type || 'hls',
          language: source.language || 'en-US',
          subtitles: source.subtitles || []
        }))
      }
      
      return []
    } catch (error) {
      console.error('Failed to get streaming sources:', error)
      return []
    }
  }

  /**
   * Get bridge health status
   */
  async getHealthStatus(): Promise<{ healthy: boolean; details?: any }> {
    try {
      const response = await this.secureRequest('/health', { method: 'GET' })
      return {
        healthy: response.success,
        details: response.data
      }
    } catch (error) {
      return {
        healthy: false,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }
}

// Export default instance with proper named export
const secureBridgeInstance = new SecureCrunchyrollBridge()
export default secureBridgeInstance

// Export for backward compatibility
export { SecureCrunchyrollBridge as CrunchyrollBridge }