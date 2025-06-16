// Enhanced Backend Proxy Service
// Provides robust integration with WeAnime backend and fallback systems

import { getEnvConfig } from './env-validation'
import { apiRateLimiter } from './api-rate-limiter'

interface BackendResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp?: string
}

interface StreamingData {
  stream_url: string
  quality?: string
  type?: 'hls' | 'mp4'
  subtitles?: SubtitleTrack[]
  thumbnail?: string
  duration?: number
}

interface SubtitleTrack {
  language: string
  label: string
  url: string
  format: 'vtt' | 'srt'
}

interface SearchResult {
  title: string
  slug: string
  image?: string
  year?: string
  status?: string
  episodes?: string
  type?: string
  url?: string
}

export class EnhancedBackendProxyError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public retryable: boolean = false
  ) {
    super(message)
    this.name = 'EnhancedBackendProxyError'
  }
}

class EnhancedBackendProxy {
  private baseUrl: string
  private fallbackUrls: string[]
  private cache: Map<string, { data: any; expires: number }> = new Map()
  private healthStatus: Map<string, { healthy: boolean; lastCheck: number }> = new Map()

  constructor() {
    const config = getEnvConfig()
    this.baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8002'

    // Get fallback URLs from environment, default to just the main backend
    const fallbackUrlsEnv = process.env.NEXT_PUBLIC_BACKEND_FALLBACK_URLS || 'http://localhost:8002'
    this.fallbackUrls = fallbackUrlsEnv.split(',').map((url: string) => url.trim()).filter((url: string) => url !== this.baseUrl)

    // Configure rate limiting for backend
    apiRateLimiter.setConfig('weanime-backend', {
      minInterval: 100,     // 0.1 seconds between calls
      maxFailures: 5,       // Allow more failures for backend
      resetTime: 180000     // Reset after 3 minutes
    })
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

  // Health check for backend endpoints
  private async checkHealth(url: string): Promise<boolean> {
    const cacheKey = `health:${url}`
    const cached = this.healthStatus.get(cacheKey)
    
    // Use cached health status if recent (30 seconds)
    if (cached && Date.now() - cached.lastCheck < 30000) {
      return cached.healthy
    }

    try {
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout for health checks
      })
      
      const healthy = response.ok
      this.healthStatus.set(cacheKey, {
        healthy,
        lastCheck: Date.now()
      })
      
      return healthy
    } catch (error) {
      this.healthStatus.set(cacheKey, {
        healthy: false,
        lastCheck: Date.now()
      })
      return false
    }
  }

  // Get the best available backend URL
  private async getBestBackendUrl(): Promise<string> {
    // Check primary backend first
    if (await this.checkHealth(this.baseUrl)) {
      return this.baseUrl
    }

    // Try fallback URLs
    for (const fallbackUrl of this.fallbackUrls) {
      if (await this.checkHealth(fallbackUrl)) {
        console.log(`🔄 Using fallback backend: ${fallbackUrl}`)
        return fallbackUrl
      }
    }

    // If all backends are down, still try primary (might be temporary)
    console.warn('⚠️ All backends appear unhealthy, using primary anyway')
    return this.baseUrl
  }

  // Enhanced API request with retry logic
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<BackendResponse<T>> {
    const cacheKey = `${endpoint}:${JSON.stringify(options)}`
    
    // Check cache for GET requests
    if (!options.method || options.method === 'GET') {
      const cached = this.getCached<BackendResponse<T>>(cacheKey)
      if (cached) {
        console.log(`📦 Cache hit for ${endpoint}`)
        return cached
      }
    }

    return apiRateLimiter.executeApiCall('weanime-backend', async () => {
      const backendUrl = await this.getBestBackendUrl()
      const url = `${backendUrl}${endpoint}`

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WeAnime-Frontend/1.0',
          ...options.headers
        },
        signal: AbortSignal.timeout(15000) // 15 second timeout
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new EnhancedBackendProxyError(
          `Backend request failed: ${response.status} ${response.statusText} - ${errorText}`,
          response.status,
          'BACKEND_ERROR',
          response.status >= 500 // 5xx errors are retryable
        )
      }

      const data: BackendResponse<T> = await response.json()

      // Cache successful GET responses
      if (!options.method || options.method === 'GET') {
        this.setCached(cacheKey, data, 180000) // 3 minute cache
      }

      return data
    }, 2) // Retry up to 2 times
  }

  // Search for anime
  async searchAnime(query: string): Promise<SearchResult[]> {
    try {
      const response = await this.makeRequest<SearchResult[]>(`/api/search?q=${encodeURIComponent(query)}`)
      
      if (response.success && response.data) {
        return response.data
      }

      throw new EnhancedBackendProxyError(
        response.error || 'Search failed',
        400,
        'SEARCH_FAILED'
      )
    } catch (error) {
      console.error('Backend search error:', error)
      
      if (error instanceof EnhancedBackendProxyError) {
        throw error
      }

      throw new EnhancedBackendProxyError(
        `Search request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'SEARCH_ERROR',
        true
      )
    }
  }

  // Get streaming URL for an episode
  async getStreamingUrl(animeSlug: string, episodeNumber: number): Promise<StreamingData> {
    try {
      const response = await this.makeRequest<StreamingData>(
        `/api/watch?anime_slug=${encodeURIComponent(animeSlug)}&episode_number=${episodeNumber}`
      )

      if (response.success && response.data) {
        return response.data
      }

      throw new EnhancedBackendProxyError(
        response.error || 'Streaming URL fetch failed',
        404,
        'STREAM_NOT_FOUND'
      )
    } catch (error) {
      console.error('Backend streaming error:', error)
      
      if (error instanceof EnhancedBackendProxyError) {
        throw error
      }

      throw new EnhancedBackendProxyError(
        `Streaming request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'STREAMING_ERROR',
        true
      )
    }
  }

  // Get download URL for an episode
  async getDownloadUrl(animeSlug: string, episodeNumber: number): Promise<{ download_url: string }> {
    try {
      const response = await this.makeRequest<{ download_url: string }>(
        `/api/download?anime_slug=${encodeURIComponent(animeSlug)}&episode_number=${episodeNumber}`
      )

      if (response.success && response.data) {
        return response.data
      }

      throw new EnhancedBackendProxyError(
        response.error || 'Download URL fetch failed',
        404,
        'DOWNLOAD_NOT_FOUND'
      )
    } catch (error) {
      console.error('Backend download error:', error)
      
      if (error instanceof EnhancedBackendProxyError) {
        throw error
      }

      throw new EnhancedBackendProxyError(
        `Download request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'DOWNLOAD_ERROR',
        true
      )
    }
  }

  // Health check for the entire backend system
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    backends: Record<string, boolean>
    rateLimiter: any
  }> {
    const backends: Record<string, boolean> = {}
    
    // Check all backend URLs
    backends[this.baseUrl] = await this.checkHealth(this.baseUrl)
    
    for (const fallbackUrl of this.fallbackUrls) {
      backends[fallbackUrl] = await this.checkHealth(fallbackUrl)
    }

    const healthyBackends = Object.values(backends).filter(Boolean).length
    const totalBackends = Object.keys(backends).length

    let status: 'healthy' | 'degraded' | 'unhealthy'
    if (healthyBackends === totalBackends) {
      status = 'healthy'
    } else if (healthyBackends > 0) {
      status = 'degraded'
    } else {
      status = 'unhealthy'
    }

    return {
      status,
      backends,
      rateLimiter: apiRateLimiter.getApiStatus('weanime-backend')
    }
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear()
    this.healthStatus.clear()
    console.log('🧹 Backend proxy cache cleared')
  }
}

// Export singleton instance
export const enhancedBackendProxy = new EnhancedBackendProxy()

// Helper functions for common operations
export async function searchAnimeWithFallback(query: string): Promise<SearchResult[]> {
  try {
    return await enhancedBackendProxy.searchAnime(query)
  } catch (error) {
    console.warn('Backend search failed, using fallback:', error)
    // Return empty array as fallback
    return []
  }
}

export async function getStreamingWithFallback(
  animeSlug: string, 
  episodeNumber: number
): Promise<StreamingData | null> {
  try {
    return await enhancedBackendProxy.getStreamingUrl(animeSlug, episodeNumber)
  } catch (error) {
    console.warn('Backend streaming failed:', error)
    return null
  }
}
