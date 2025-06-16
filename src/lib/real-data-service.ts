/**
 * Real Crunchyroll Data Service - NO FALLBACK/MOCK DATA
 * 
 * This service provides authentic anime data from Crunchyroll only.
 * When real data is unavailable, it fails with clear error messages
 * instead of providing mock/fallback content.
 */

import { createAPIError, withRetry, WeAnimeError, ErrorCode } from './error-handling'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8003'

export interface RealAnimeData {
  id: string
  title: string
  description: string
  image_url: string
  episode_count: number
  rating: number
  year: number
  genres: string[]
  isReal: true
  source: 'crunchyroll'
}

/**
 * Real Crunchyroll Data Service - ZERO TOLERANCE FOR MOCK DATA
 */
export class RealAnimeDataService {
  
  /**
   * Get real trending anime from Crunchyroll by searching for popular titles
   * @returns Promise<RealAnimeData[]> - Real trending anime or throws error
   */
  static async getRealTrendingAnime(): Promise<RealAnimeData[]> {
    console.log('🔥 [REAL-ONLY] Fetching real trending anime from Crunchyroll...')
    
    try {
      // Search for known popular anime that are likely to be on Crunchyroll
      const trendingQueries = [
        'Attack on Titan',
        'Demon Slayer', 
        'One Piece',
        'Jujutsu Kaisen',
        'Chainsaw Man',
        'Spy x Family',
        'My Hero Academia',
        'Naruto',
        'Dragon Ball',
        'Hunter x Hunter'
      ]

      const trendingResults: RealAnimeData[] = []
      
      for (const query of trendingQueries) {
        try {
          console.log(`🔍 [REAL-ONLY] Searching for trending anime: ${query}`)
          
          const response = await fetch(`${BACKEND_URL}/api/search?q=${encodeURIComponent(query)}&limit=2`)
          
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.results.length > 0) {
              // Take the first result for each query
              const result = data.results[0]
              trendingResults.push({
                ...result,
                isReal: true,
                source: 'crunchyroll'
              } as RealAnimeData)
              
              console.log(`✅ [REAL-ONLY] Found trending anime: ${result.title}`)
            }
          }
        } catch (error) {
          console.warn(`⚠️ [REAL-ONLY] Failed to fetch trending anime for query: ${query}`)
        }

        // Don't overwhelm the API
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      if (trendingResults.length === 0) {
        throw new WeAnimeError(ErrorCode.NO_CONTENT, 'No trending anime available from Crunchyroll')
      }

      // Remove duplicates by ID
      const uniqueResults = trendingResults.filter((anime, index, self) => 
        index === self.findIndex(a => a.id === anime.id)
      )

      console.log(`✅ [REAL-ONLY] Found ${uniqueResults.length} real trending anime from Crunchyroll`)
      return uniqueResults

    } catch (error) {
      console.error('❌ [REAL-ONLY] Failed to fetch real trending anime:', error)
      
      // NO FALLBACK TO MOCK DATA
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new WeAnimeError(ErrorCode.API_ERROR, 
        `Real trending anime unavailable: ${errorMessage}. WeAnime only displays authentic content.`
      )
    }
  }

  /**
   * Get real seasonal anime from Crunchyroll by searching for current year content
   * @returns Promise<RealAnimeData[]> - Real seasonal anime or throws error
   */
  static async getRealSeasonalAnime(): Promise<RealAnimeData[]> {
    console.log('📅 [REAL-ONLY] Fetching real seasonal anime from Crunchyroll...')
    
    try {
      const currentYear = new Date().getFullYear()
      const currentSeason = this.getCurrentSeason()
      
      // Search for current season anime with various queries
      const seasonalQueries = [
        `${currentYear} anime`,
        `${currentSeason} ${currentYear}`,
        'new anime',
        'latest anime',
        'recent anime',
        `${currentYear} season`
      ]

      const seasonalResults: RealAnimeData[] = []
      
      for (const query of seasonalQueries) {
        try {
          console.log(`🔍 [REAL-ONLY] Searching for seasonal anime: ${query}`)
          
          const response = await fetch(`${BACKEND_URL}/api/search?q=${encodeURIComponent(query)}&limit=5`)
          
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.results.length > 0) {
              data.results.forEach((result: any) => {
                seasonalResults.push({
                  ...result,
                  isReal: true,
                  source: 'crunchyroll'
                } as RealAnimeData)
              })
              
              console.log(`✅ [REAL-ONLY] Found ${data.results.length} seasonal anime for "${query}"`)
            }
          }
        } catch (error) {
          console.warn(`⚠️ [REAL-ONLY] Failed to fetch seasonal anime for query: ${query}`)
        }

        // Don't overwhelm the API
        await new Promise(resolve => setTimeout(resolve, 150))
      }

      if (seasonalResults.length === 0) {
        throw new WeAnimeError(ErrorCode.NO_CONTENT, 'No seasonal anime available from Crunchyroll')
      }

      // Remove duplicates by ID and filter for current year if possible
      const uniqueResults = seasonalResults
        .filter((anime, index, self) => 
          index === self.findIndex(a => a.id === anime.id)
        )
        .filter(anime => 
          !anime.year || anime.year >= currentYear - 1 // Current or previous year
        )
        .slice(0, 20) // Limit to 20 results

      console.log(`✅ [REAL-ONLY] Found ${uniqueResults.length} real seasonal anime from Crunchyroll`)
      return uniqueResults

    } catch (error) {
      console.error('❌ [REAL-ONLY] Failed to fetch real seasonal anime:', error)
      
      // NO FALLBACK TO MOCK DATA
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new WeAnimeError(ErrorCode.API_ERROR, 
        `Real seasonal anime unavailable: ${errorMessage}. WeAnime only displays authentic content.`
      )
    }
  }

  /**
   * Search real anime by query from Crunchyroll ONLY
   * @param query - Search query
   * @param limit - Maximum results
   * @returns Promise<RealAnimeData[]> - Real anime results or throws error
   */
  static async searchRealAnime(query: string, limit: number = 20): Promise<RealAnimeData[]> {
    if (!query || query.trim().length < 2) {
      throw new WeAnimeError(ErrorCode.INVALID_INPUT, 'Search query too short (minimum 2 characters)')
    }

    console.log(`🔍 [REAL-ONLY] Searching real anime for: "${query}"`)
    
    try {
      const response = await withRetry(async () => {
        const res = await fetch(
          `${BACKEND_URL}/api/search?q=${encodeURIComponent(query.trim())}&limit=${limit}`
        )

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new Error(`Real search failed: ${res.status} - ${errorData.detail || res.statusText}`)
        }

        return res
      }, { maxAttempts: 3 })

      const data = await response.json()

      if (!data.success || !Array.isArray(data.results)) {
        throw new WeAnimeError(ErrorCode.API_ERROR, 'Invalid search response from Crunchyroll')
      }

      if (data.results.length === 0) {
        throw new WeAnimeError(ErrorCode.NO_RESULTS, `No anime found for "${query}" on Crunchyroll`)
      }

      const realResults: RealAnimeData[] = data.results.map((result: any) => ({
        ...result,
        isReal: true,
        source: 'crunchyroll'
      }))

      console.log(`✅ [REAL-ONLY] Found ${realResults.length} real anime results for "${query}"`)
      return realResults

    } catch (error) {
      console.error(`❌ [REAL-ONLY] Failed to search real anime for "${query}":`, error)
      
      // NO FALLBACK TO MOCK DATA
      const errorMessage = error instanceof Error ? error.message : 'Search failed'
      throw new WeAnimeError(ErrorCode.API_ERROR, 
        `Real anime search unavailable: ${errorMessage}. WeAnime only searches authentic content.`
      )
    }
  }

  /**
   * Get real anime details by ID from Crunchyroll
   * @param animeId - Crunchyroll anime/series ID
   * @returns Promise<RealAnimeData> - Real anime details or throws error
   */
  static async getRealAnimeDetails(animeId: string): Promise<RealAnimeData> {
    if (!animeId || animeId.trim() === '') {
      throw new WeAnimeError(ErrorCode.INVALID_INPUT, 'Invalid anime ID provided')
    }

    console.log(`📺 [REAL-ONLY] Fetching real anime details for: ${animeId}`)
    
    try {
      const response = await withRetry(async () => {
        const res = await fetch(`${BACKEND_URL}/api/anime/${animeId}`)

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new Error(`Real anime details failed: ${res.status} - ${errorData.detail || res.statusText}`)
        }

        return res
      }, { maxAttempts: 3 })

      const data = await response.json()

      if (!data.success || !data.anime) {
        throw new WeAnimeError(ErrorCode.API_ERROR, 'Invalid anime details response from Crunchyroll')
      }

      const realAnime: RealAnimeData = {
        ...data.anime,
        isReal: true,
        source: 'crunchyroll'
      }

      console.log(`✅ [REAL-ONLY] Found real anime details: ${realAnime.title}`)
      return realAnime

    } catch (error) {
      console.error(`❌ [REAL-ONLY] Failed to fetch real anime details for ${animeId}:`, error)
      
      // NO FALLBACK TO MOCK DATA
      const errorMessage = error instanceof Error ? error.message : 'Details unavailable'
      throw new WeAnimeError(ErrorCode.API_ERROR, 
        `Real anime details unavailable: ${errorMessage}. WeAnime only displays authentic content.`
      )
    }
  }

  /**
   * Get current anime season based on month
   * @returns string - Current season name
   */
  private static getCurrentSeason(): string {
    const month = new Date().getMonth() + 1 // 1-12
    
    if (month >= 12 || month <= 2) return 'Winter'
    if (month >= 3 && month <= 5) return 'Spring'  
    if (month >= 6 && month <= 8) return 'Summer'
    if (month >= 9 && month <= 11) return 'Fall'
    
    return 'Current'
  }

  /**
   * Validate that anime data is real (not mock/fallback)
   * @param anime - Anime data to validate
   * @returns boolean - True if data appears to be real
   */
  static isRealAnimeData(anime: any): boolean {
    // Check for mock data indicators
    if (!anime || typeof anime !== 'object') return false
    
    // Check for mock titles or IDs
    const mockIndicators = [
      'fallback',
      'demo',
      'mock',
      'test',
      'placeholder',
      'example'
    ]

    const title = (anime.title || '').toLowerCase()
    const id = String(anime.id || '').toLowerCase()
    
    for (const indicator of mockIndicators) {
      if (title.includes(indicator) || id.includes(indicator)) {
        console.warn(`⚠️ [REAL-ONLY] Rejected mock anime data: ${anime.title}`)
        return false
      }
    }

    // Check for real source indicator
    return anime.isReal === true && anime.source === 'crunchyroll'
  }
}

// Export the service methods
export const {
  getRealTrendingAnime,
  getRealSeasonalAnime,
  searchRealAnime,
  getRealAnimeDetails,
  isRealAnimeData
} = RealAnimeDataService

// Default export
export default RealAnimeDataService

/*
 * DELETED MOCK DATA (NO LONGER AVAILABLE):
 * 
 * ❌ FALLBACK_TRENDING_ANIME - REMOVED (500+ lines of mock data)
 * ❌ FALLBACK_SEASONAL_ANIME - REMOVED (200+ lines of mock data)  
 * ❌ FALLBACK_EPISODES - REMOVED (300+ lines of mock episodes)
 * ❌ Any other mock anime data constants - REMOVED
 * 
 * WeAnime now provides ONLY authentic Crunchyroll content.
 * No fallbacks, no mock data, no placeholder anime information.
 * 
 * When real data is unavailable, the application will show clear
 * error messages instead of misleading mock content.
 */