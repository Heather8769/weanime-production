// Backend proxy service for connecting to FastAPI backend
import { getEnvConfig } from './env-validation'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export interface BackendSearchResult {
  title: string
  slug: string
}

export interface BackendStreamResponse {
  stream_url: string
}

export interface BackendDownloadResponse {
  download_url: string
}

export interface BackendSearchResponse {
  results: BackendSearchResult[]
}

export class BackendProxy {
  private baseUrl: string
  private timeout: number

  constructor() {
    this.baseUrl = BACKEND_URL
    this.timeout = 30000 // 30 seconds
  }

  private async fetchWithTimeout(url: string, options: RequestInit = {}) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return response
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout')
      }
      throw error
    }
  }

  async searchAnime(query: string): Promise<BackendSearchResponse> {
    try {
      const url = `${this.baseUrl}/api/search?q=${encodeURIComponent(query)}`
      const response = await this.fetchWithTimeout(url)
      return await response.json()
    } catch (error) {
      console.error('Backend search error:', error)
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getStreamUrl(animeSlug: string, episodeNumber: number): Promise<BackendStreamResponse> {
    try {
      const url = `${this.baseUrl}/api/watch?anime_slug=${encodeURIComponent(animeSlug)}&episode_number=${episodeNumber}`
      const response = await this.fetchWithTimeout(url)
      return await response.json()
    } catch (error) {
      console.error('Backend stream error:', error)
      throw new Error(`Stream fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getDownloadUrl(animeSlug: string, episodeNumber: number): Promise<BackendDownloadResponse> {
    try {
      const url = `${this.baseUrl}/api/download?anime_slug=${encodeURIComponent(animeSlug)}&episode_number=${episodeNumber}`
      const response = await this.fetchWithTimeout(url)
      return await response.json()
    } catch (error) {
      console.error('Backend download error:', error)
      throw new Error(`Download fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async healthCheck(): Promise<{ status: string; message: string }> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/`)
      return await response.json()
    } catch (error) {
      console.error('Backend health check error:', error)
      throw new Error(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Get episodes for an anime (if the backend supports it)
  async getEpisodes(animeSlug: string): Promise<any[]> {
    try {
      // This would need to be implemented in the backend
      const url = `${this.baseUrl}/api/episodes?anime_slug=${encodeURIComponent(animeSlug)}`
      const response = await this.fetchWithTimeout(url)
      return await response.json()
    } catch (error) {
      console.error('Backend episodes error:', error)
      // Return empty array if episodes endpoint doesn't exist
      return []
    }
  }
}

// Singleton instance
export const backendProxy = new BackendProxy()

// Helper function to check if backend is available
export async function isBackendAvailable(): Promise<boolean> {
  try {
    await backendProxy.healthCheck()
    return true
  } catch (error) {
    console.warn('Backend not available:', error instanceof Error ? error.message : 'Unknown error')
    return false
  }
}

// Helper function to get backend status
export async function getBackendStatus(): Promise<{
  available: boolean
  url: string
  error?: string
}> {
  try {
    await backendProxy.healthCheck()
    return {
      available: true,
      url: BACKEND_URL,
    }
  } catch (error) {
    return {
      available: false,
      url: BACKEND_URL,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
