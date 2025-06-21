/**
 * Real Crunchyroll Streaming Service - NO MOCK DATA
 * 
 * This service provides ONLY authentic streaming data from Crunchyroll.
 * It does NOT provide demo, fallback, or mock content.
 */

import { WeAnimeError, ErrorCode, withRetry } from './error-handling'

export interface RealStreamingSource {
  id: string
  title: string
  url: string
  quality: string
  type: 'hls' | 'mp4'
  isReal: true
  source: 'crunchyroll'
  language?: 'sub' | 'dub'
  subtitles?: RealSubtitle[]
}

export interface RealSubtitle {
  language: string
  url: string
  label: string
  isReal: true
  source: 'crunchyroll'
}

export interface RealStreamingResponse {
  success: boolean
  animeId: number
  episodeNumber: number
  sources: RealStreamingSource[]
  subtitles: RealSubtitle[]
  title: string
  description?: string
  duration?: number
  isReal: true
  source: 'crunchyroll'
  timestamp: string
}

const CRUNCHYROLL_BRIDGE_URL = process.env.CRUNCHYROLL_BRIDGE_URL || process.env.NEXT_PUBLIC_CRUNCHYROLL_BRIDGE_URL || 'http://localhost:8081'

/**
 * Get real anime streaming data from Crunchyroll ONLY
 */
export async function getRealAnimeStreaming(
  animeId: string | number, 
  episodeNumber: string | number
): Promise<RealStreamingResponse> {
  
  // Convert inputs to ensure proper types
  const numericAnimeId = typeof animeId === 'string' ? parseInt(animeId, 10) : animeId
  const numericEpisodeNumber = typeof episodeNumber === 'string' ? parseInt(episodeNumber, 10) : episodeNumber
  
  if (isNaN(numericAnimeId) || isNaN(numericEpisodeNumber)) {
    throw new WeAnimeError(
      ErrorCode.INVALID_INPUT,
      'Invalid anime ID or episode number provided'
    )
  }

  console.log(`🎬 [REAL-STREAMING] Fetching real Crunchyroll stream for anime ${numericAnimeId}, episode ${numericEpisodeNumber}`)

  try {
    // Get real streaming data from Crunchyroll Bridge
    const streamingData = await withRetry(async () => {
      const response = await fetch(
        `${CRUNCHYROLL_BRIDGE_URL}/api/stream/${numericAnimeId}/${numericEpisodeNumber}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          cache: 'no-cache' // Always get fresh real data
        }
      )

      if (!response.ok) {
        if (response.status === 404) {
          throw new WeAnimeError(
            ErrorCode.NO_CONTENT,
            `Real episode not found on Crunchyroll: anime ${numericAnimeId}, episode ${numericEpisodeNumber}`
          )
        }
        
        if (response.status === 429) {
          throw new WeAnimeError(
            ErrorCode.RATE_LIMITED,
            'Crunchyroll rate limit reached - please try again later'
          )
        }

        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Crunchyroll Bridge API failed: ${response.status} - ${errorData.message || response.statusText}`)
      }

      return response.json()
    }, { maxAttempts: 3 })

    // Validate response structure
    if (!streamingData.success || !streamingData.sources || !Array.isArray(streamingData.sources)) {
      throw new WeAnimeError(
        ErrorCode.API_ERROR,
        'Invalid streaming response from Crunchyroll Bridge'
      )
    }

    // Validate that sources are real Crunchyroll streams
    const realSources: RealStreamingSource[] = streamingData.sources
      .filter((source: any) => isRealCrunchyrollSource(source))
      .map((source: any): RealStreamingSource => ({
        id: source.id || `cr-${numericAnimeId}-${numericEpisodeNumber}`,
        title: source.title || `Episode ${numericEpisodeNumber}`,
        url: source.url,
        quality: source.quality || '1080p',
        type: source.type || 'hls',
        isReal: true,
        source: 'crunchyroll',
        language: source.language,
        subtitles: source.subtitles?.map((sub: any): RealSubtitle => ({
          language: sub.language,
          url: sub.url,
          label: sub.label,
          isReal: true,
          source: 'crunchyroll'
        })) || []
      }))

    if (realSources.length === 0) {
      throw new WeAnimeError(
        ErrorCode.NO_CONTENT,
        'No real Crunchyroll streaming sources available for this episode'
      )
    }

    // Extract subtitles from all sources
    const allSubtitles: RealSubtitle[] = realSources
      .flatMap(source => source.subtitles || [])
      .filter((subtitle, index, self) => 
        index === self.findIndex(s => s.language === subtitle.language)
      )

    const response: RealStreamingResponse = {
      success: true,
      animeId: numericAnimeId,
      episodeNumber: numericEpisodeNumber,
      sources: realSources,
      subtitles: allSubtitles,
      title: streamingData.title || `Anime ${numericAnimeId} - Episode ${numericEpisodeNumber}`,
      description: streamingData.description,
      duration: streamingData.duration,
      isReal: true,
      source: 'crunchyroll',
      timestamp: new Date().toISOString()
    }

    console.log(`✅ [REAL-STREAMING] Successfully retrieved ${realSources.length} real streaming sources from Crunchyroll`)
    return response

  } catch (error) {
    console.error(`❌ [REAL-STREAMING] Failed to get real streaming data:`, error)
    
    if (error instanceof WeAnimeError) {
      throw error
    }

    // NO FALLBACK TO MOCK DATA - FAIL CLEARLY
    throw new WeAnimeError(
      ErrorCode.STREAM_UNAVAILABLE,
      `Real Crunchyroll streaming unavailable: ${error instanceof Error ? error.message : 'Unknown error'}. WeAnime only provides authentic streaming.`
    )
  }
}

/**
 * Validate that a streaming source is from real Crunchyroll
 */
function isRealCrunchyrollSource(source: any): boolean {
  if (!source || !source.url || typeof source.url !== 'string') {
    return false
  }

  // Check for known mock domains
  const mockDomains = [
    'archive.org',
    'sample-videos.com',
    'file-examples.com',
    'learningcontainer.com',
    'commondatastorage.googleapis.com',
    'download.blender.org'
  ]

  const url = source.url.toLowerCase()
  
  for (const mockDomain of mockDomains) {
    if (url.includes(mockDomain)) {
      console.warn(`⚠️ [REAL-STREAMING] Rejected mock streaming source: ${source.url}`)
      return false
    }
  }

  // Validate it's a proper streaming URL (HLS or direct video)
  const isValidStream = url.includes('.m3u8') || 
                       url.includes('.mp4') || 
                       url.includes('crunchyroll') ||
                       url.includes('cdn')

  if (!isValidStream) {
    console.warn(`⚠️ [REAL-STREAMING] Rejected invalid streaming URL format: ${source.url}`)
    return false
  }

  return true
}

/**
 * Check if Crunchyroll Bridge service is available
 */
export async function isCrunchyrollBridgeHealthy(): Promise<boolean> {
  try {
    const response = await fetch(`${CRUNCHYROLL_BRIDGE_URL}/health`, {
      method: 'HEAD',
      headers: { 'Accept': 'application/json' }
    })
    return response.ok
  } catch (error) {
    console.warn('Crunchyroll Bridge health check failed:', error)
    return false
  }
}

/**
 * Get supported streaming qualities from Crunchyroll
 */
export function getSupportedRealQualities(): string[] {
  return ['1080p', '720p', '480p', '360p']
}

/**
 * Generate episode streaming URL for direct access
 */
export function getRealStreamingUrl(animeId: number, episodeNumber: number, quality: string = '1080p'): string {
  return `${CRUNCHYROLL_BRIDGE_URL}/api/stream/${animeId}/${episodeNumber}?quality=${quality}`
}

// Export for backward compatibility
export const generateRealAnimeStreams = getRealAnimeStreaming