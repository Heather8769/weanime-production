// WeAnime Backend Integration Service
// Provides safe, typed interface to the WeAnime FastAPI backend

import { getEnvConfig } from './env-validation'

interface SearchResult {
  title: string
  slug: string
  image?: string
  year?: string
  status?: string
  episodes?: string
  type?: string
}

interface StreamResponse {
  stream_url: string
}

interface DownloadResponse {
  download_url: string
}

interface EpisodeInfo {
  episode: string
  slug: string
}

export class WeAnimeBackendError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message)
    this.name = 'WeAnimeBackendError'
  }
}

export class WeAnimeBackend {
  private baseUrl: string
  private apiKey?: string
  private timeout: number = 30000 // 30 seconds
  private retryAttempts: number = 3
  private retryDelay: number = 1000

  constructor() {
    const config = getEnvConfig()
    this.baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
    this.apiKey = process.env.BACKEND_API_KEY
    
    // Remove trailing slash
    this.baseUrl = this.baseUrl.replace(/\/$/, '')
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    // Add API key if configured
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new WeAnimeBackendError(
          `Backend request failed: ${response.statusText}`,
          response.status,
          'REQUEST_FAILED'
        )
      }

      const data = await response.json()
      return data
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof WeAnimeBackendError) {
        throw error
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new WeAnimeBackendError(
            'Backend request timed out',
            408,
            'TIMEOUT'
          )
        }
        
        throw new WeAnimeBackendError(
          `Backend connection failed: ${error.message}`,
          0,
          'CONNECTION_FAILED'
        )
      }

      throw new WeAnimeBackendError(
        'Unknown backend error',
        500,
        'UNKNOWN_ERROR'
      )
    }
  }

  private async retryRequest<T>(
    fn: () => Promise<T>,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await fn()
    } catch (error) {
      if (attempt >= this.retryAttempts) {
        throw error
      }

      // Only retry on connection failures or timeouts
      if (error instanceof WeAnimeBackendError &&
          (error.code === 'CONNECTION_FAILED' || error.code === 'TIMEOUT')) {
        await new Promise(resolve => 
          setTimeout(resolve, this.retryDelay * attempt)
        )
        return this.retryRequest(fn, attempt + 1)
      }

      throw error
    }
  }

  async searchAnime(query: string): Promise<SearchResult[]> {
    if (!query.trim()) {
      throw new WeAnimeBackendError(
        'Search query cannot be empty',
        400,
        'INVALID_QUERY'
      )
    }

    return this.retryRequest(async () => {
      const response = await this.makeRequest<{ results: SearchResult[] }>(
        `/api/search?q=${encodeURIComponent(query.trim())}`
      )
      return response.results || []
    })
  }

  async getStreamUrl(animeSlug: string, episodeNumber: number): Promise<string> {
    if (!animeSlug.trim()) {
      throw new WeAnimeBackendError(
        'Anime slug cannot be empty',
        400,
        'INVALID_SLUG'
      )
    }

    if (episodeNumber < 1) {
      throw new WeAnimeBackendError(
        'Episode number must be positive',
        400,
        'INVALID_EPISODE'
      )
    }

    return this.retryRequest(async () => {
      const response = await this.makeRequest<StreamResponse>(
        `/api/watch?anime_slug=${encodeURIComponent(animeSlug)}&episode_number=${episodeNumber}`
      )
      
      if (!response.stream_url) {
        throw new WeAnimeBackendError(
          'No stream URL returned from backend',
          404,
          'NO_STREAM_URL'
        )
      }

      return response.stream_url
    })
  }

  async getDownloadUrl(animeSlug: string, episodeNumber: number): Promise<string> {
    if (!animeSlug.trim()) {
      throw new WeAnimeBackendError(
        'Anime slug cannot be empty',
        400,
        'INVALID_SLUG'
      )
    }

    if (episodeNumber < 1) {
      throw new WeAnimeBackendError(
        'Episode number must be positive',
        400,
        'INVALID_EPISODE'
      )
    }

    return this.retryRequest(async () => {
      const response = await this.makeRequest<DownloadResponse>(
        `/api/download?anime_slug=${encodeURIComponent(animeSlug)}&episode_number=${episodeNumber}`
      )
      
      if (!response.download_url) {
        throw new WeAnimeBackendError(
          'No download URL returned from backend',
          404,
          'NO_DOWNLOAD_URL'
        )
      }

      return response.download_url
    })
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.makeRequest('/', { method: 'GET' })
      return true
    } catch {
      return false
    }
  }

  // Helper method to validate URLs before using them
  static isValidStreamUrl(url: string): boolean {
    try {
      const parsed = new URL(url)
      // Basic validation - could be enhanced based on your requirements
      return ['http:', 'https:'].includes(parsed.protocol)
    } catch {
      return false
    }
  }
}

// Export singleton instance
export const weAnimeBackend = new WeAnimeBackend()

// Export types for use in components
export type { SearchResult, StreamResponse, DownloadResponse }