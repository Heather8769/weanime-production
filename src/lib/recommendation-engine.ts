// AI-Powered Recommendation Engine
// Provides personalized anime recommendations based on user behavior and preferences

import { authService, WatchlistItem, WatchHistory } from './auth-service'
import { realAnimeDatabase, RealAnimeInfo } from './real-anime-database'

export interface Recommendation {
  anime: RealAnimeInfo
  score: number
  reasons: string[]
  category: 'trending' | 'similar' | 'genre_match' | 'seasonal' | 'popular'
}

export interface RecommendationFilters {
  genres?: string[]
  status?: string[]
  year_range?: [number, number]
  episode_count_range?: [number, number]
  exclude_watched?: boolean
}

class RecommendationEngine {
  private readonly genreWeights: Record<string, number> = {
    'Action': 1.2,
    'Adventure': 1.1,
    'Drama': 1.0,
    'Comedy': 1.1,
    'Romance': 0.9,
    'Slice of Life': 0.8,
    'Fantasy': 1.2,
    'Sci-Fi': 1.1,
    'Thriller': 1.0,
    'Horror': 0.7,
    'Mystery': 1.0,
    'Supernatural': 1.1
  }

  // Get personalized recommendations for the current user
  async getPersonalizedRecommendations(limit: number = 20, filters?: RecommendationFilters): Promise<Recommendation[]> {
    const user = await authService.getCurrentUser()
    if (!user) {
      // Return popular recommendations for non-authenticated users
      return this.getPopularRecommendations(limit, filters)
    }

    try {
      // Get user's watchlist and history
      const watchlist = await authService.getWatchlist()
      const userPreferences = await this.analyzeUserPreferences(watchlist)

      // Generate recommendations based on different strategies
      const recommendations: Recommendation[] = []

      // 1. Genre-based recommendations (40% weight)
      const genreRecs = await this.getGenreBasedRecommendations(userPreferences.favoriteGenres, Math.ceil(limit * 0.4))
      recommendations.push(...genreRecs)

      // 2. Similar anime recommendations (30% weight)
      const similarRecs = await this.getSimilarAnimeRecommendations(watchlist, Math.ceil(limit * 0.3))
      recommendations.push(...similarRecs)

      // 3. Trending/Popular recommendations (20% weight)
      const trendingRecs = await this.getTrendingRecommendations(Math.ceil(limit * 0.2))
      recommendations.push(...trendingRecs)

      // 4. Seasonal recommendations (10% weight)
      const seasonalRecs = await this.getSeasonalRecommendations(Math.ceil(limit * 0.1))
      recommendations.push(...seasonalRecs)

      // Remove duplicates and filter
      const uniqueRecs = this.removeDuplicates(recommendations)
      const filteredRecs = this.applyFilters(uniqueRecs, filters)

      // Sort by score and return top results
      return filteredRecs
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)

    } catch (error) {
      console.error('Error generating personalized recommendations:', error)
      return this.getPopularRecommendations(limit, filters)
    }
  }

  // Analyze user preferences from watchlist
  private async analyzeUserPreferences(watchlist: WatchlistItem[]) {
    const genreCounts: Record<string, number> = {}
    const statusCounts: Record<string, number> = {}
    const yearCounts: Record<number, number> = {}

    // Analyze completed and watching anime
    const relevantItems = watchlist.filter(item => 
      item.status === 'completed' || item.status === 'watching'
    )

    for (const item of relevantItems) {
      try {
        const animeInfo = await realAnimeDatabase.getAnimeInfo(item.anime_id)
        if (animeInfo) {
          // Count genres
          animeInfo.genres.forEach(genre => {
            genreCounts[genre] = (genreCounts[genre] || 0) + 1
          })

          // Count status
          statusCounts[animeInfo.status] = (statusCounts[animeInfo.status] || 0) + 1

          // Count years
          if (animeInfo.seasonYear) {
            yearCounts[animeInfo.seasonYear] = (yearCounts[animeInfo.seasonYear] || 0) + 1
          }
        }
      } catch (error) {
        console.warn(`Could not analyze anime ${item.anime_id}:`, error)
      }
    }

    // Get top preferences
    const favoriteGenres = Object.entries(genreCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([genre]) => genre)

    const preferredYears = Object.entries(yearCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([year]) => parseInt(year))

    return {
      favoriteGenres,
      preferredYears,
      totalWatched: relevantItems.length
    }
  }

  // Get recommendations based on favorite genres
  private async getGenreBasedRecommendations(favoriteGenres: string[], limit: number): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = []

    for (const genre of favoriteGenres) {
      try {
        // Search for anime with this genre
        const searchResults = await realAnimeDatabase.searchAnime(`genre:${genre}`, Math.ceil(limit / favoriteGenres.length))
        
        for (const anime of searchResults) {
          const score = this.calculateGenreScore(anime, favoriteGenres)
          recommendations.push({
            anime,
            score,
            reasons: [`Matches your favorite genre: ${genre}`],
            category: 'genre_match'
          })
        }
      } catch (error) {
        console.warn(`Error getting genre recommendations for ${genre}:`, error)
      }
    }

    return recommendations
  }

  // Get recommendations similar to watched anime
  private async getSimilarAnimeRecommendations(watchlist: WatchlistItem[], limit: number): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = []

    // Get highly rated or completed anime from watchlist
    const favoriteAnime = watchlist.filter(item => 
      (item.status === 'completed' && (item.rating || 0) >= 8) ||
      item.status === 'watching'
    ).slice(0, 5) // Top 5 favorites

    for (const item of favoriteAnime) {
      try {
        const animeInfo = await realAnimeDatabase.getAnimeInfo(item.anime_id)
        if (animeInfo) {
          // Find similar anime based on genres and studios
          const similarAnime = await this.findSimilarAnime(animeInfo, Math.ceil(limit / favoriteAnime.length))
          
          for (const similar of similarAnime) {
            recommendations.push({
              anime: similar,
              score: this.calculateSimilarityScore(animeInfo, similar),
              reasons: [`Similar to ${animeInfo.title.romaji}`, `Shared genres: ${this.getSharedGenres(animeInfo, similar).join(', ')}`],
              category: 'similar'
            })
          }
        }
      } catch (error) {
        console.warn(`Error getting similar recommendations for ${item.anime_id}:`, error)
      }
    }

    return recommendations
  }

  // Get trending anime recommendations
  private async getTrendingRecommendations(limit: number): Promise<Recommendation[]> {
    try {
      // Get popular anime from current season
      const currentYear = new Date().getFullYear()
      const trendingAnime = await realAnimeDatabase.searchAnime(`year:${currentYear} sort:popularity`, limit)

      return trendingAnime.map(anime => ({
        anime,
        score: 0.8 + (anime.popularity || 0) / 100000, // Base score + popularity bonus
        reasons: ['Currently trending', 'High popularity'],
        category: 'trending' as const
      }))
    } catch (error) {
      console.error('Error getting trending recommendations:', error)
      return []
    }
  }

  // Get seasonal anime recommendations
  private async getSeasonalRecommendations(limit: number): Promise<Recommendation[]> {
    try {
      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()
      const currentSeason = this.getCurrentSeason(currentDate)

      const seasonalAnime = await realAnimeDatabase.searchAnime(`year:${currentYear} season:${currentSeason}`, limit)

      return seasonalAnime.map(anime => ({
        anime,
        score: 0.7 + (anime.averageScore || 0) / 100, // Base score + rating bonus
        reasons: [`${currentSeason} ${currentYear} anime`, 'New seasonal content'],
        category: 'seasonal' as const
      }))
    } catch (error) {
      console.error('Error getting seasonal recommendations:', error)
      return []
    }
  }

  // Get popular recommendations for non-authenticated users
  private async getPopularRecommendations(limit: number, filters?: RecommendationFilters): Promise<Recommendation[]> {
    try {
      const popularAnime = await realAnimeDatabase.searchAnime('sort:score', limit * 2) // Get more to filter

      const recommendations = popularAnime.map(anime => ({
        anime,
        score: (anime.averageScore || 0) / 100,
        reasons: ['Highly rated', 'Popular among users'],
        category: 'popular' as const
      }))

      const filteredRecs = this.applyFilters(recommendations, filters)
      return filteredRecs.slice(0, limit)
    } catch (error) {
      console.error('Error getting popular recommendations:', error)
      return []
    }
  }

  // Helper methods
  private calculateGenreScore(anime: RealAnimeInfo, favoriteGenres: string[]): number {
    let score = 0.5 // Base score
    
    anime.genres.forEach(genre => {
      if (favoriteGenres.includes(genre)) {
        score += (this.genreWeights[genre] || 1.0) * 0.2
      }
    })

    // Bonus for high rating
    if (anime.averageScore) {
      score += anime.averageScore / 100 * 0.3
    }

    return Math.min(score, 1.0)
  }

  private calculateSimilarityScore(original: RealAnimeInfo, similar: RealAnimeInfo): number {
    let score = 0.3 // Base score

    // Genre similarity
    const sharedGenres = this.getSharedGenres(original, similar)
    score += sharedGenres.length * 0.1

    // Studio similarity
    const sharedStudios = original.studios.filter(studio => similar.studios.includes(studio))
    score += sharedStudios.length * 0.15

    // Rating bonus
    if (similar.averageScore) {
      score += similar.averageScore / 100 * 0.2
    }

    return Math.min(score, 1.0)
  }

  private getSharedGenres(anime1: RealAnimeInfo, anime2: RealAnimeInfo): string[] {
    return anime1.genres.filter(genre => anime2.genres.includes(genre))
  }

  private async findSimilarAnime(anime: RealAnimeInfo, limit: number): Promise<RealAnimeInfo[]> {
    // Search for anime with similar genres
    const genreQuery = anime.genres.slice(0, 2).join(' ')
    return realAnimeDatabase.searchAnime(genreQuery, limit)
  }

  private getCurrentSeason(date: Date): string {
    const month = date.getMonth() + 1
    if (month >= 3 && month <= 5) return 'SPRING'
    if (month >= 6 && month <= 8) return 'SUMMER'
    if (month >= 9 && month <= 11) return 'FALL'
    return 'WINTER'
  }

  private removeDuplicates(recommendations: Recommendation[]): Recommendation[] {
    const seen = new Set<number>()
    return recommendations.filter(rec => {
      if (seen.has(rec.anime.id)) {
        return false
      }
      seen.add(rec.anime.id)
      return true
    })
  }

  private applyFilters(recommendations: Recommendation[], filters?: RecommendationFilters): Recommendation[] {
    if (!filters) return recommendations

    return recommendations.filter(rec => {
      // Genre filter
      if (filters.genres && filters.genres.length > 0) {
        const hasMatchingGenre = filters.genres.some(genre => rec.anime.genres.includes(genre))
        if (!hasMatchingGenre) return false
      }

      // Status filter
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(rec.anime.status)) return false
      }

      // Year range filter
      if (filters.year_range && rec.anime.seasonYear) {
        const [minYear, maxYear] = filters.year_range
        if (rec.anime.seasonYear < minYear || rec.anime.seasonYear > maxYear) return false
      }

      // Episode count filter
      if (filters.episode_count_range && rec.anime.episodes) {
        const [minEpisodes, maxEpisodes] = filters.episode_count_range
        if (rec.anime.episodes < minEpisodes || rec.anime.episodes > maxEpisodes) return false
      }

      return true
    })
  }
}

export const recommendationEngine = new RecommendationEngine()
