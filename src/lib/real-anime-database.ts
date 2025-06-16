// Real Anime Database Service
// Aggregates data from multiple real sources: AniList, MAL, Jikan, etc.

import { apiRateLimiter } from './api-rate-limiter'

export interface RealAnimeInfo {
  id: number
  title: {
    romaji: string
    english?: string
    native?: string
  }
  description?: string
  episodes?: number
  duration?: number
  status: 'FINISHED' | 'RELEASING' | 'NOT_YET_RELEASED' | 'CANCELLED'
  season?: string
  seasonYear?: number
  genres: string[]
  studios: string[]
  coverImage: {
    large?: string
    medium?: string
  }
  bannerImage?: string
  averageScore?: number
  popularity?: number
  source: 'anilist' | 'mal' | 'jikan'
}

export interface RealEpisodeInfo {
  id: string
  number: number
  title?: string
  description?: string
  airDate?: string
  duration?: number
  thumbnail?: string
  sources: RealVideoSource[]
}

export interface RealVideoSource {
  url: string
  quality: string
  format: 'mp4' | 'hls' | 'dash'
  subtitles?: RealSubtitle[]
}

export interface RealSubtitle {
  language: string
  url: string
  format: 'vtt' | 'srt' | 'ass'
}

class RealAnimeDatabaseService {
  private readonly anilistEndpoint = 'https://graphql.anilist.co'
  private readonly jikanEndpoint = 'https://api.jikan.moe/v4'

  // Get comprehensive anime information from multiple sources
  async getAnimeInfo(animeId: number): Promise<RealAnimeInfo | null> {
    try {
      // Try AniList first (most comprehensive)
      const anilistData = await this.getAniListAnime(animeId)
      if (anilistData) {
        return anilistData
      }

      // Fallback to Jikan (MyAnimeList)
      const jikanData = await this.getJikanAnime(animeId)
      if (jikanData) {
        return jikanData
      }

      return null
    } catch (error) {
      console.error('Failed to get anime info:', error)
      return null
    }
  }

  // Get real episode list with metadata
  async getEpisodeList(animeId: number): Promise<RealEpisodeInfo[]> {
    try {
      // Try to get episodes from Jikan (has episode data)
      const jikanEpisodes = await this.getJikanEpisodes(animeId)
      if (jikanEpisodes.length > 0) {
        return jikanEpisodes
      }

      // Fallback: generate episode list from anime info
      const animeInfo = await this.getAnimeInfo(animeId)
      if (animeInfo?.episodes) {
        return Array.from({ length: animeInfo.episodes }, (_, i) => ({
          id: `${animeId}-${i + 1}`,
          number: i + 1,
          title: `Episode ${i + 1}`,
          sources: [] // Will be populated by streaming services
        }))
      }

      return []
    } catch (error) {
      console.error('Failed to get episode list:', error)
      return []
    }
  }

  // Get anime from AniList GraphQL API
  private async getAniListAnime(animeId: number): Promise<RealAnimeInfo | null> {
    if (!apiRateLimiter.isApiAvailable('anilist')) {
      console.log('AniList API not available due to rate limiting')
      return null
    }

    const query = `
      query ($id: Int) {
        Media (id: $id, type: ANIME) {
          id
          title {
            romaji
            english
            native
          }
          description
          episodes
          duration
          status
          season
          seasonYear
          genres
          studios {
            nodes {
              name
            }
          }
          coverImage {
            large
            medium
          }
          bannerImage
          averageScore
          popularity
        }
      }
    `

    try {
      const response = await fetch(this.anilistEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: { id: animeId }
        })
      })

      if (!response.ok) {
        throw new Error(`AniList API error: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.errors) {
        console.warn('AniList GraphQL errors:', data.errors)
        return null
      }

      const media = data.data?.Media
      if (!media) {
        return null
      }

      return {
        id: media.id,
        title: media.title,
        description: media.description,
        episodes: media.episodes,
        duration: media.duration,
        status: media.status,
        season: media.season,
        seasonYear: media.seasonYear,
        genres: media.genres || [],
        studios: media.studios?.nodes?.map((s: any) => s.name) || [],
        coverImage: media.coverImage,
        bannerImage: media.bannerImage,
        averageScore: media.averageScore,
        popularity: media.popularity,
        source: 'anilist'
      }
    } catch (error) {
      console.error('AniList API error:', error)
      apiRateLimiter.recordFailure('anilist')
      return null
    }
  }

  // Get anime from Jikan (MyAnimeList) API
  private async getJikanAnime(animeId: number): Promise<RealAnimeInfo | null> {
    if (!apiRateLimiter.isApiAvailable('jikan')) {
      console.log('Jikan API not available due to rate limiting')
      return null
    }

    try {
      const response = await fetch(`${this.jikanEndpoint}/anime/${animeId}`)
      
      if (!response.ok) {
        if (response.status === 429) {
          apiRateLimiter.recordFailure('jikan')
        }
        throw new Error(`Jikan API error: ${response.status}`)
      }

      const data = await response.json()
      const anime = data.data

      if (!anime) {
        return null
      }

      return {
        id: anime.mal_id,
        title: {
          romaji: anime.title,
          english: anime.title_english,
          native: anime.title_japanese
        },
        description: anime.synopsis,
        episodes: anime.episodes,
        duration: anime.duration ? parseInt(anime.duration.split(' ')[0]) : undefined,
        status: this.mapJikanStatus(anime.status),
        season: anime.season,
        seasonYear: anime.year,
        genres: anime.genres?.map((g: any) => g.name) || [],
        studios: anime.studios?.map((s: any) => s.name) || [],
        coverImage: {
          large: anime.images?.jpg?.large_image_url,
          medium: anime.images?.jpg?.image_url
        },
        bannerImage: anime.images?.jpg?.large_image_url,
        averageScore: anime.score ? Math.round(anime.score * 10) : undefined,
        popularity: anime.popularity,
        source: 'jikan'
      }
    } catch (error) {
      console.error('Jikan API error:', error)
      apiRateLimiter.recordFailure('jikan')
      return null
    }
  }

  // Get episodes from Jikan API
  private async getJikanEpisodes(animeId: number): Promise<RealEpisodeInfo[]> {
    if (!apiRateLimiter.isApiAvailable('jikan')) {
      return []
    }

    try {
      const response = await fetch(`${this.jikanEndpoint}/anime/${animeId}/episodes`)
      
      if (!response.ok) {
        if (response.status === 429) {
          apiRateLimiter.recordFailure('jikan')
        }
        return []
      }

      const data = await response.json()
      const episodes = data.data || []

      return episodes.map((ep: any) => ({
        id: `${animeId}-${ep.mal_id}`,
        number: ep.mal_id,
        title: ep.title,
        description: ep.synopsis,
        airDate: ep.aired,
        duration: ep.duration ? parseInt(ep.duration.split(' ')[0]) * 60 : undefined,
        sources: [] // Will be populated by streaming services
      }))
    } catch (error) {
      console.error('Jikan episodes API error:', error)
      return []
    }
  }

  // Map Jikan status to AniList format
  private mapJikanStatus(status: string): RealAnimeInfo['status'] {
    switch (status?.toLowerCase()) {
      case 'finished airing':
        return 'FINISHED'
      case 'currently airing':
        return 'RELEASING'
      case 'not yet aired':
        return 'NOT_YET_RELEASED'
      default:
        return 'FINISHED'
    }
  }

  // Search for anime across multiple sources
  async searchAnime(query: string, limit: number = 10): Promise<RealAnimeInfo[]> {
    const results: RealAnimeInfo[] = []

    try {
      // Search AniList
      const anilistResults = await this.searchAniList(query, limit)
      results.push(...anilistResults)

      // If we don't have enough results, search Jikan
      if (results.length < limit) {
        const jikanResults = await this.searchJikan(query, limit - results.length)
        results.push(...jikanResults)
      }

      // Remove duplicates and return top results
      const uniqueResults = results.filter((anime, index, self) => 
        index === self.findIndex(a => a.id === anime.id && a.source === anime.source)
      )

      return uniqueResults.slice(0, limit)
    } catch (error) {
      console.error('Search anime error:', error)
      return []
    }
  }

  private async searchAniList(query: string, limit: number): Promise<RealAnimeInfo[]> {
    // Implementation for AniList search
    // Similar to getAniListAnime but with search query
    return []
  }

  private async searchJikan(query: string, limit: number): Promise<RealAnimeInfo[]> {
    // Implementation for Jikan search
    // Similar to getJikanAnime but with search query
    return []
  }
}

export const realAnimeDatabase = new RealAnimeDatabaseService()
