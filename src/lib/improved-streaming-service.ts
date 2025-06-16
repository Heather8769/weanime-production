/**
 * Enhanced Real Streaming Service - NO MOCK DATA
 * 
 * This service provides ONLY real streaming data from authenticated sources.
 * It does NOT provide demo, fallback, or mock content.
 */

import { weAnimeBackend, WeAnimeBackendError, WeAnimeBackend } from './weanime-backend'
import { fetchLegalAnimeStreams } from './real-anime-apis'
import { WeAnimeError, ErrorCode, withRetry } from './error-handling'

export interface EnhancedStreamingSource {
  name: string
  url: string
  quality: string
  type: 'hls' | 'mp4'
  isReal: true
  source: 'crunchyroll' | 'weanime-backend'
}

export interface EnhancedStreamingResponse {
  animeId: number
  episode: number
  title: string
  servers: EnhancedStreamingSource[]
  subtitles: Array<{
    language: string
    url: string
    format: string
    isReal: true
  }>
  source: string
  responseTime: number
  isReal: true
  metadata?: {
    totalEpisodes?: number
    duration?: string
    status: string
  }
}

interface AnimeMapping {
  title: string
  alternativeNames: string[]
}

const REAL_ANIME_MAPPINGS: Record<number, AnimeMapping> = {
  1: { title: 'Cowboy Bebop', alternativeNames: ['cowboy-bebop'] },
  20: { title: 'Naruto', alternativeNames: ['naruto'] },
  21: { title: 'One Piece', alternativeNames: ['one-piece'] },
  16498: { title: 'Attack on Titan', alternativeNames: ['attack-on-titan', 'shingeki-no-kyojin'] },
  38000: { title: 'Demon Slayer', alternativeNames: ['demon-slayer', 'kimetsu-no-yaiba'] },
  40748: { title: 'Jujutsu Kaisen', alternativeNames: ['jujutsu-kaisen'] },
  31964: { title: 'My Hero Academia', alternativeNames: ['my-hero-academia', 'boku-no-hero-academia'] }
}

class APICircuitBreaker {
  private failures: Map<string, number> = new Map()
  private lastFailure: Map<string, number> = new Map()
  private readonly threshold = 3
  private readonly resetTime = 60000 // 1 minute

  isOpen(service: string): boolean {
    const failures = this.failures.get(service) || 0
    const lastFailure = this.lastFailure.get(service) || 0
    
    if (failures >= this.threshold) {
      if (Date.now() - lastFailure > this.resetTime) {
        this.reset(service)
        return false
      }
      return true
    }
    return false
  }

  recordFailure(service: string): void {
    const current = this.failures.get(service) || 0
    this.failures.set(service, current + 1)
    this.lastFailure.set(service, Date.now())
  }

  recordSuccess(service: string): void {
    this.failures.delete(service)
    this.lastFailure.delete(service)
  }

  private reset(service: string): void {
    this.failures.delete(service)
    this.lastFailure.delete(service)
  }
}

const circuitBreaker = new APICircuitBreaker()

/**
 * Get enhanced anime streaming data from real sources ONLY
 */
export async function getEnhancedAnimeStreams(
  animeId: string | number, 
  episode: string | number, 
  animeSlug?: string
): Promise<EnhancedStreamingResponse> {
  
  // Convert inputs to ensure proper types
  const numericAnimeId = typeof animeId === 'string' ? parseInt(animeId, 10) : animeId
  const numericEpisode = typeof episode === 'string' ? parseInt(episode, 10) : episode
  
  // Validate the converted numbers
  if (isNaN(numericAnimeId) || isNaN(numericEpisode)) {
    throw new WeAnimeError(
      ErrorCode.INVALID_INPUT,
      'Invalid anime ID or episode number provided'
    )
  }

  console.log(`🎬 Enhanced streaming service: Fetching real streams for anime ${numericAnimeId}, episode ${numericEpisode}`)
  
  const animeMapping = REAL_ANIME_MAPPINGS[numericAnimeId]
  const startTime = Date.now()
  
  try {
    // Try WeAnime backend first if anime slug is provided
    if (animeSlug && !circuitBreaker.isOpen('weanime-backend')) {
      try {
        console.log(`🔗 Trying WeAnime backend for ${animeSlug}`)
        const streamUrl = await weAnimeBackend.getStreamUrl(animeSlug, numericEpisode)
        
        if (streamUrl && WeAnimeBackend.isValidStreamUrl(streamUrl)) {
          circuitBreaker.recordSuccess('weanime-backend')
          return {
            animeId: numericAnimeId,
            episode: numericEpisode,
            title: animeMapping?.title || `Anime ${numericAnimeId}`,
            servers: [{
              name: "WeAnime Primary Server",
              url: streamUrl,
              quality: "1080p",
              type: "hls",
              isReal: true,
              source: "weanime-backend"
            }],
            subtitles: [],
            source: 'weanime-backend',
            responseTime: Date.now() - startTime,
            isReal: true,
            metadata: {
              status: "Real WeAnime Backend Stream"
            }
          }
        }
      } catch (error) {
        console.warn(`WeAnime backend failed:`, error)
        circuitBreaker.recordFailure('weanime-backend')
        
        if (error instanceof WeAnimeBackendError) {
          throw new WeAnimeError(
            ErrorCode.API_ERROR,
            `WeAnime backend error: ${error.message}`
          )
        }
      }
    }

    // Try legal streaming APIs as fallback
    if (!circuitBreaker.isOpen('real-apis')) {
      try {
        console.log(`🔗 Trying legal streaming APIs`)
        const realStreams = await withRetry(async () => {
          return await fetchLegalAnimeStreams(numericAnimeId, numericEpisode)
        }, { maxAttempts: 2 })
        
        if (realStreams && typeof realStreams === 'object' && 'sources' in realStreams && Array.isArray(realStreams.sources) && realStreams.sources.length > 0) {
          circuitBreaker.recordSuccess('real-apis')
          
          // Validate that all sources are real streaming sources
          const realServers = realStreams.sources
            .filter((source: any) => isRealStreamingSource(source))
            .map((source: any): EnhancedStreamingSource => ({
              name: source.name || "Real Streaming Server",
              url: source.url,
              quality: source.quality || "1080p",
              type: source.type || "hls",
              isReal: true,
              source: "crunchyroll"
            }))

          if (realServers.length === 0) {
            throw new WeAnimeError(
              ErrorCode.NO_CONTENT,
              'No real streaming sources available from legal APIs'
            )
          }

          return {
            animeId: numericAnimeId,
            episode: numericEpisode,
            title: realStreams.title || animeMapping?.title || `Anime ${numericAnimeId}`,
            servers: realServers,
            subtitles: [],
            source: 'legal-streaming-api',
            responseTime: Date.now() - startTime,
            isReal: true,
            metadata: {
              status: "Real Legal Streaming API"
            }
          }
        }
      } catch (error) {
        console.warn(`Legal streaming APIs failed:`, error)
        circuitBreaker.recordFailure('real-apis')
        
        if (error instanceof WeAnimeError) {
          throw error
        }
      }
    }

    // NO FALLBACK TO MOCK DATA - FAIL CLEARLY
    throw new WeAnimeError(
      ErrorCode.STREAM_UNAVAILABLE,
      `No real streaming sources available for anime ${numericAnimeId}, episode ${numericEpisode}. WeAnime only provides authentic streaming.`
    )
    
  } catch (error) {
    console.error(`Enhanced streaming service error:`, error)
    
    if (error instanceof WeAnimeError) {
      throw error
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new WeAnimeError(
      ErrorCode.STREAM_UNAVAILABLE,
      `Real streaming unavailable: ${errorMessage}`
    )
  }
}

/**
 * Validate that a streaming source is from real services
 */
function isRealStreamingSource(server: any): boolean {
  if (!server || !server.url || typeof server.url !== 'string') {
    return false
  }

  // Check for known mock domains
  const mockDomains = [
    'archive.org',
    'sample-videos.com',
    'file-examples.com',
    'learningcontainer.com',
    'commondatastorage.googleapis.com',
    'download.blender.org',
    'picsum.photos',
    'via.placeholder.com'
  ]

  const url = server.url.toLowerCase()
  
  for (const mockDomain of mockDomains) {
    if (url.includes(mockDomain)) {
      console.warn(`⚠️ [ENHANCED-STREAMING] Rejected mock streaming source: ${server.url}`)
      return false
    }
  }

  // Validate it's a proper streaming URL
  const isValidStream = url.includes('.m3u8') || 
                       url.includes('.mp4') || 
                       url.includes('crunchyroll') ||
                       url.includes('funimation') ||
                       url.includes('cdn')

  if (!isValidStream) {
    console.warn(`⚠️ [ENHANCED-STREAMING] Rejected invalid streaming URL format: ${server.url}`)
    return false
  }

  return true
}

/**
 * Get streaming service health status
 */
export async function getStreamingHealth(): Promise<{
  timestamp: string
  services: {
    weAnimeBackend: string
    realAPIs: string
  }
  overall: string
}> {
  const health = {
    timestamp: new Date().toISOString(),
    services: {
      weAnimeBackend: circuitBreaker.isOpen('weanime-backend') ? 'DOWN' : 'UP',
      realAPIs: circuitBreaker.isOpen('real-apis') ? 'DOWN' : 'UP'
    },
    overall: 'UNKNOWN'
  }

  const upServices = Object.values(health.services).filter(status => status === 'UP').length
  const totalServices = Object.keys(health.services).length

  if (upServices === totalServices) {
    health.overall = 'HEALTHY'
  } else if (upServices > 0) {
    health.overall = 'DEGRADED'
  } else {
    health.overall = 'DOWN'
  }

  return health
}

/**
 * Reset circuit breaker for a specific service
 */
export function resetCircuitBreaker(service: string): void {
  circuitBreaker.recordSuccess(service)
  console.log(`🔄 Circuit breaker reset for service: ${service}`)
}