/**
 * Real Crunchyroll Episode Service - NO MOCK DATA
 * 
 * This service provides authentic episode data from Crunchyroll only.
 * It does NOT provide fallback or mock content when real data is unavailable.
 */

import { Episode, VideoSource, Subtitle } from './watch-store'
import { createAPIError, withRetry, WeAnimeError, ErrorCode } from './error-handling'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8003'

export interface CrunchyrollEpisode {
  id: string
  number: number
  title: string
  description: string
  thumbnail_url: string
  duration_seconds: number
  air_date: string
}

export interface CrunchyrollStreamData {
  hls_url: string
  quality: string
  subtitles: Array<{
    language: string
    label: string
    url: string
    format: string
  }>
  duration_seconds: number
}

/**
 * Real Crunchyroll Episode Service - ZERO TOLERANCE FOR MOCK DATA
 */
export class RealEpisodeService {
  
  /**
   * Get real episodes from Crunchyroll ONLY
   * @param animeId - Crunchyroll series ID
   * @returns Promise<Episode[]> - Real episodes or throws error
   */
  static async getRealEpisodes(animeId: string): Promise<Episode[]> {
    if (!animeId || animeId.trim() === '') {
      throw new WeAnimeError(ErrorCode.INVALID_INPUT, 'Invalid anime ID provided')
    }

    console.log(`🔍 [REAL-ONLY] Fetching episodes for anime: ${animeId}`)

    try {
      const response = await withRetry(async () => {
        const res = await fetch(`${BACKEND_URL}/api/episodes/${animeId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-cache' // Always get fresh real data
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new Error(`Real episodes API failed: ${res.status} - ${errorData.detail || res.statusText}`)
        }

        return res
      }, { maxAttempts: 3 })

      const data = await response.json()

      if (!data.success || !Array.isArray(data.episodes)) {
        throw new WeAnimeError(ErrorCode.API_ERROR, 'Invalid episodes response from Crunchyroll')
      }

      // Convert Crunchyroll episodes to WeAnime Episode format
      const realEpisodes: Episode[] = data.episodes.map((crEpisode: CrunchyrollEpisode): Episode => ({
        id: crEpisode.id,
        number: crEpisode.number,
        title: crEpisode.title,
        description: crEpisode.description,
        thumbnail: crEpisode.thumbnail_url,
        duration: crEpisode.duration_seconds,
        sources: [], // Will be populated when episode is selected for streaming
        subtitles: [],
        skipTimes: {
          intro: undefined, // Real skip times would come from Crunchyroll if available
          outro: undefined
        },
        airDate: crEpisode.air_date,
        streamingId: crEpisode.id,
        isReal: true, // Mark as authentic content
        source: 'crunchyroll' // Source indicator
      }))

      console.log(`✅ [REAL-ONLY] Successfully loaded ${realEpisodes.length} real episodes from Crunchyroll`)
      
      if (realEpisodes.length === 0) {
        throw new WeAnimeError(ErrorCode.NO_CONTENT, 'No episodes available for this anime on Crunchyroll')
      }

      return realEpisodes

    } catch (error) {
      console.error(`❌ [REAL-ONLY] Failed to fetch real episodes for anime ${animeId}:`, error)
      
      // NO FALLBACK TO MOCK DATA - FAIL CLEARLY
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new WeAnimeError(
        ErrorCode.EPISODES_UNAVAILABLE,
        `Real Crunchyroll episodes unavailable: ${errorMessage}. WeAnime only displays authentic content.`
      )
    }
  }

  /**
   * Get real streaming sources for episode from Crunchyroll ONLY
   * @param episodeId - Crunchyroll episode ID
   * @param quality - Preferred quality (1080p, 720p, 480p)
   * @returns Promise<VideoSource[]> - Real streaming sources or throws error
   */
  static async getRealStreamingSources(episodeId: string, quality: string = '1080p'): Promise<VideoSource[]> {
    if (!episodeId || episodeId.trim() === '') {
      throw new WeAnimeError(ErrorCode.INVALID_INPUT, 'Invalid episode ID provided')
    }

    console.log(`🎬 [REAL-ONLY] Getting real stream for episode: ${episodeId} at ${quality}`)

    try {
      const response = await withRetry(async () => {
        const res = await fetch(`${BACKEND_URL}/api/stream/${episodeId}?quality=${quality}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-cache' // Always get fresh stream URLs
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          
          if (res.status === 429) {
            throw new WeAnimeError(ErrorCode.RATE_LIMITED, 'Crunchyroll stream limit reached - please try again later')
          }
          
          throw new Error(`Real stream API failed: ${res.status} - ${errorData.detail || res.statusText}`)
        }

        return res
      }, { maxAttempts: 2 }) // Fewer retries for streaming to avoid hitting rate limits

      const data: CrunchyrollStreamData = await response.json()

      if (!data.hls_url) {
        throw new WeAnimeError(ErrorCode.API_ERROR, 'Invalid stream response from Crunchyroll')
      }

      // Convert Crunchyroll stream to WeAnime VideoSource format
      const realSources: VideoSource[] = [{
        quality: data.quality,
        url: data.hls_url,
        type: 'hls',
        isReal: true,
        source: 'crunchyroll'
      }]

      console.log(`✅ [REAL-ONLY] Real stream URL obtained from Crunchyroll: ${data.hls_url.substring(0, 50)}...`)
      return realSources

    } catch (error) {
      console.error(`❌ [REAL-ONLY] Failed to get real stream for episode ${episodeId}:`, error)
      
      // NO FALLBACK TO MOCK DATA - FAIL CLEARLY
      const errorMessage = error instanceof Error ? error.message : 'Stream not accessible'
      throw new WeAnimeError(
        ErrorCode.STREAM_UNAVAILABLE,
        `Real Crunchyroll stream unavailable: ${errorMessage}. WeAnime only provides authentic streaming.`
      )
    }
  }

  /**
   * Get real subtitles for episode from Crunchyroll ONLY
   * @param episodeId - Crunchyroll episode ID
   * @returns Promise<Subtitle[]> - Real subtitles or empty array
   */
  static async getRealSubtitles(episodeId: string): Promise<Subtitle[]> {
    if (!episodeId || episodeId.trim() === '') {
      return []
    }

    try {
      console.log(`📝 [REAL-ONLY] Getting real subtitles for episode: ${episodeId}`)
      
      const response = await fetch(`${BACKEND_URL}/api/stream/${episodeId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        console.warn(`⚠️ [REAL-ONLY] Subtitles unavailable for episode ${episodeId}`)
        return [] // Return empty array, not mock subtitles
      }

      const data: CrunchyrollStreamData = await response.json()
      
      if (!Array.isArray(data.subtitles)) {
        return [] // No subtitles available
      }

      // Convert Crunchyroll subtitles to WeAnime format
      const realSubtitles: Subtitle[] = data.subtitles.map((crSub): Subtitle => ({
        language: crSub.language,
        url: crSub.url,
        label: crSub.label,
        isReal: true,
        source: 'crunchyroll'
      }))

      console.log(`✅ [REAL-ONLY] Found ${realSubtitles.length} real subtitle tracks from Crunchyroll`)
      return realSubtitles

    } catch (error) {
      console.warn(`⚠️ [REAL-ONLY] Subtitles unavailable for episode ${episodeId}:`, error)
      return [] // Return empty array, never mock subtitles
    }
  }

  /**
   * Search real anime from Crunchyroll ONLY
   * @param query - Search query
   * @param limit - Maximum results
   * @returns Promise<any[]> - Real anime results or throws error
   */
  static async searchRealAnime(query: string, limit: number = 20): Promise<any[]> {
    if (!query || query.trim().length < 2) {
      throw new WeAnimeError(ErrorCode.INVALID_INPUT, 'Search query too short (minimum 2 characters)')
    }

    console.log(`🔍 [REAL-ONLY] Searching real Crunchyroll anime: "${query}"`)
    
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/search?q=${encodeURIComponent(query.trim())}&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Real search failed: ${response.status} - ${errorData.detail || response.statusText}`)
      }

      const data = await response.json()

      if (!data.success || !Array.isArray(data.results)) {
        throw new WeAnimeError(ErrorCode.API_ERROR, 'Invalid search response from Crunchyroll')
      }

      if (data.results.length === 0) {
        throw new WeAnimeError(ErrorCode.NO_RESULTS, `No anime found for "${query}" on Crunchyroll`)
      }

      console.log(`✅ [REAL-ONLY] Found ${data.results.length} real anime results for "${query}"`)
      return data.results.map((result: any) => ({
        ...result,
        isReal: true,
        source: 'crunchyroll'
      }))

    } catch (error) {
      console.error(`❌ [REAL-ONLY] Failed to search real anime for "${query}":`, error)
      
      // NO FALLBACK TO MOCK DATA
      const errorMessage = error instanceof Error ? error.message : 'Search failed'
      throw new WeAnimeError(
        ErrorCode.SEARCH_UNAVAILABLE,
        `Real Crunchyroll search unavailable: ${errorMessage}. WeAnime only searches authentic content.`
      )
    }
  }

  /**
   * Validate that an episode ID is real (not mock/fallback)
   * @param episodeId - Episode ID to validate
   * @returns boolean - True if ID appears to be real Crunchyroll format
   */
  static isRealEpisodeId(episodeId: string): boolean {
    // Crunchyroll episode IDs are typically alphanumeric with specific patterns
    // Reject obvious mock/fallback patterns
    const mockPatterns = [
      /fallback/i,
      /demo/i,
      /mock/i,
      /test/i,
      /BigBuckBunny/i,
      /archive\.org/i,
      /sample-videos/i
    ]

    for (const pattern of mockPatterns) {
      if (pattern.test(episodeId)) {
        console.warn(`⚠️ [REAL-ONLY] Rejected mock episode ID: ${episodeId}`)
        return false
      }
    }

    return true
  }

  /**
   * Validate that a video URL is real (not mock/demo)
   * @param url - Video URL to validate
   * @returns boolean - True if URL appears to be real streaming source
   */
  static isRealStreamUrl(url: string): boolean {
    // Reject known demo/mock video sources
    const mockDomains = [
      'archive.org',
      'sample-videos.com',
      'file-examples.com',
      'commondatastorage.googleapis.com',
      'picsum.photos',
      'via.placeholder.com'
    ]

    for (const domain of mockDomains) {
      if (url.includes(domain)) {
        console.warn(`⚠️ [REAL-ONLY] Rejected mock video URL: ${url}`)
        return false
      }
    }

    return true
  }
}

// Export only real functions - NO MOCK EXPORTS
export const {
  getRealEpisodes,
  getRealStreamingSources,
  getRealSubtitles,
  searchRealAnime,
  isRealEpisodeId,
  isRealStreamUrl
} = RealEpisodeService

// Legacy function exports for backward compatibility
export async function getAnimeEpisodes(animeId: number, totalEpisodes?: number): Promise<Episode[]> {
  try {
    return await RealEpisodeService.getRealEpisodes(String(animeId))
  } catch (error) {
    console.error(`Failed to get episodes for anime ${animeId}:`, error)
    // Return empty array instead of mock data
    return []
  }
}

export async function getNextEpisodeToWatch(animeId: number, watchProgress: Map<string, any>): Promise<Episode | null> {
  try {
    const episodes = await getAnimeEpisodes(animeId)
    
    // Find the first unwatched episode
    for (const episode of episodes) {
      const progressKey = `${animeId}-${episode.id}`
      const progress = watchProgress.get(progressKey)
      
      if (!progress || !progress.completed) {
        return episode
      }
    }
    
    // All episodes watched, return the last one
    return episodes[episodes.length - 1] || null
  } catch (error) {
    console.error(`Failed to get next episode for anime ${animeId}:`, error)
    return null
  }
}

export async function getEpisodeWithVideoSources(animeId: number, episodeNumber: number): Promise<Episode | null> {
  try {
    const episodes = await getAnimeEpisodes(animeId)
    const episode = episodes.find(ep => ep.number === episodeNumber)
    
    if (!episode) {
      console.error(`Episode ${episodeNumber} not found for anime ${animeId}`)
      return null
    }

    // Try to get real streaming sources
    try {
      const sources = await RealEpisodeService.getRealStreamingSources(episode.id)
      const subtitles = await RealEpisodeService.getRealSubtitles(episode.id)
      
      return {
        ...episode,
        sources,
        subtitles
      }
    } catch (error) {
      console.warn(`Failed to get streaming sources for episode ${episode.id}:`, error)
      // Return episode without sources rather than mock sources
      return episode
    }
  } catch (error) {
    console.error(`Failed to get episode with sources for anime ${animeId} episode ${episodeNumber}:`, error)
    return null
  }
}

export async function getRecentlyWatchedEpisodes(watchProgress: Map<string, any>, limit: number = 10): Promise<Array<{ episode: Episode; animeId: number; progress: any }>> {
  const recentEpisodes: Array<{ episode: Episode; animeId: number; progress: any }> = []
  
  try {
    // Convert progress map to array and sort by last watched
    const progressArray = Array.from(watchProgress.values())
      .sort((a, b) => new Date(b.lastWatched).getTime() - new Date(a.lastWatched).getTime())
      .slice(0, limit)
    
    for (const progress of progressArray) {
      const animeId = progress.animeId
      const episodeId = progress.episodeId
      
      try {
        const episodes = await getAnimeEpisodes(animeId)
        const episode = episodes.find(ep => ep.id === episodeId)
        
        if (episode) {
          recentEpisodes.push({ episode, animeId, progress })
        }
      } catch (error) {
        console.warn(`Failed to get episode for recent watch: ${animeId}/${episodeId}`)
      }
    }
  } catch (error) {
    console.error('Failed to get recently watched episodes:', error)
  }
  
  return recentEpisodes
}

export async function getEpisodeById(animeId: number, episodeId: string): Promise<Episode | null> {
  try {
    const episodes = await getAnimeEpisodes(animeId)
    return episodes.find(ep => ep.id === episodeId) || null
  } catch (error) {
    console.error(`Failed to get episode by ID ${episodeId} for anime ${animeId}:`, error)
    return null
  }
}

// Default export for convenience
export default RealEpisodeService

/*
 * DELETED MOCK FUNCTIONS (NO LONGER AVAILABLE):
 * 
 * ❌ generateFallbackEpisodes() - REMOVED
 * ❌ generateBasicVideoSources() - REMOVED  
 * ❌ generateEpisodeDuration() - REMOVED
 * ❌ generateSkipTimes() - REMOVED
 * ❌ REAL_ANIME_TRAILERS - REMOVED (use real Crunchyroll data)
 * ❌ Any other mock/demo data generation - REMOVED
 * 
 * WeAnime now displays ONLY authentic Crunchyroll content.
 * No fallbacks, no mock data, no placeholder content.
 */