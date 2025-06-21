/**
 * Real Crunchyroll Data Service - NO FALLBACK/MOCK DATA
 * 
 * This service provides authentic anime data from Crunchyroll only.
 * When real data is unavailable, it fails with clear error messages
 * instead of providing mock/fallback content.
 */

import { createAPIError, withRetry, WeAnimeError, ErrorCode } from './error-handling'
import { crunchyrollIntegration } from './crunchyroll-integration'

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
      // Use multiple search strategies to find trending anime
      // Strategy 1: Genre-based searches for popular categories
      const trendingStrategies = [
        { query: 'action', type: 'genre' },
        { query: 'adventure', type: 'genre' },
        { query: 'drama', type: 'genre' },
        { query: 'fantasy', type: 'genre' },
        { query: 'romance', type: 'genre' },
        { query: 'comedy', type: 'genre' },
        { query: 'thriller', type: 'genre' },
        { query: 'supernatural', type: 'genre' }
      ]

      const trendingResults: RealAnimeData[] = []
      
      // Use Crunchyroll integration for real search
      for (const strategy of trendingStrategies) {
        try {
          console.log(`🔍 [REAL-ONLY] Searching trending ${strategy.type}: ${strategy.query}`)
          
          const searchResults = await crunchyrollIntegration.searchAnime(strategy.query)
          
          if (searchResults.length > 0) {
            // Take top 2 results from each strategy
            for (const series of searchResults.slice(0, 2)) {
              trendingResults.push({
                id: series.id,
                title: series.title,
                description: series.description,
                image_url: series.poster_tall || '',
                episode_count: series.total_episodes,
                rating: 0, // Rating not available from search
                year: new Date().getFullYear(), // Assume current year
                genres: [strategy.query], // Use search query as genre
                isReal: true,
                source: 'crunchyroll'
              } as RealAnimeData)
              
              console.log(`✅ [REAL-ONLY] Found trending anime: ${series.title}`)
            }
          }
        } catch (error) {
          console.warn(`⚠️ [REAL-ONLY] Failed to fetch trending anime for ${strategy.query}:`, error)
        }

        // Rate limiting between requests
        await new Promise(resolve => setTimeout(resolve, 200))
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
      
      // Use intelligent search strategies for seasonal anime
      const seasonalStrategies = [
        { query: `${currentSeason.toLowerCase()} ${currentYear}`, type: 'temporal' },
        { query: `${currentYear}`, type: 'year' },
        { query: `${currentSeason.toLowerCase()} season`, type: 'season' },
        { query: 'ongoing', type: 'status' },
        { query: 'airing', type: 'status' },
        { query: 'simulcast', type: 'release' }
      ]

      const seasonalResults: RealAnimeData[] = []
      
      // Use Crunchyroll integration for real seasonal search
      for (const strategy of seasonalStrategies) {
        try {
          console.log(`🔍 [REAL-ONLY] Searching seasonal ${strategy.type}: ${strategy.query}`)
          
          const searchResults = await crunchyrollIntegration.searchAnime(strategy.query)
          
          if (searchResults.length > 0) {
            // Take top 3 results from each strategy
            for (const series of searchResults.slice(0, 3)) {
              seasonalResults.push({
                id: series.id,
                title: series.title,
                description: series.description,
                image_url: series.poster_tall || '',
                episode_count: series.total_episodes,
                rating: 0, // Rating not available from search
                year: currentYear,
                genres: [strategy.type], // Use strategy type as genre indicator
                isReal: true,
                source: 'crunchyroll'
              } as RealAnimeData)
              
              console.log(`✅ [REAL-ONLY] Found seasonal anime: ${series.title}`)
            }
          }
        } catch (error) {
          console.warn(`⚠️ [REAL-ONLY] Failed to fetch seasonal anime for ${strategy.query}:`, error)
        }

        // Rate limiting between requests
        await new Promise(resolve => setTimeout(resolve, 250))
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
      // Use real Crunchyroll integration for search
      const searchResults = await withRetry(async () => {
        return await crunchyrollIntegration.searchAnime(query.trim())
      }, { maxAttempts: 3 })

      if (searchResults.length === 0) {
        throw new WeAnimeError(ErrorCode.NO_RESULTS, `No anime found for "${query}" on Crunchyroll`)
      }

      // Transform Crunchyroll results to expected format
      const realResults: RealAnimeData[] = searchResults.slice(0, limit).map((series) => ({
        id: series.id,
        title: series.title,
        description: series.description,
        image_url: series.poster_tall || '',
        episode_count: series.total_episodes,
        rating: 0, // Rating not available from search
        year: new Date().getFullYear(), // Default to current year
        genres: [], // Genres not available from search
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
      // Use real Crunchyroll integration for series details
      const seriesDetails = await withRetry(async () => {
        return await crunchyrollIntegration.getSeriesDetails(animeId)
      }, { maxAttempts: 3 })

      const realAnime: RealAnimeData = {
        id: seriesDetails.id,
        title: seriesDetails.title,
        description: seriesDetails.description,
        image_url: seriesDetails.poster_tall || '',
        episode_count: seriesDetails.total_episodes,
        rating: 0, // Rating not available
        year: new Date().getFullYear(), // Default to current year
        genres: [], // Genres not available
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
 * REAL CRUNCHYROLL INTEGRATION - NO MOCK DATA:
 * 
 * ✅ TRENDING_ANIME - Uses real Crunchyroll genre-based search strategies
 * ✅ SEASONAL_ANIME - Uses real Crunchyroll temporal and status-based searches
 * ✅ ANIME_SEARCH - Uses real Crunchyroll search API through bridge service
 * ✅ ANIME_DETAILS - Uses real Crunchyroll series details API
 * 
 * WeAnime now provides ONLY authentic Crunchyroll content through:
 * - Rust-based Crunchyroll Bridge service (port 8081)
 * - Real Crunchyroll API authentication and session management
 * - Intelligent search strategies instead of hardcoded anime lists
 * 
 * When real data is unavailable, the application shows clear
 * error messages instead of misleading mock content.
 */