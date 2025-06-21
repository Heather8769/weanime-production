import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import {
  searchAnime,
  getAnimeDetails,
  getTrendingAnime,
  getSeasonalAnime,
  type AniListAnime,
  type AniListSearchResult,
} from '@/lib/anilist'

// Search anime with filters
export function useSearchAnime(searchParams: {
  search?: string
  genre?: string
  year?: number
  season?: string
  format?: string
  status?: string
  sort?: string[]
}) {
  return useInfiniteQuery({
    queryKey: ['anime', 'search', searchParams],
    queryFn: ({ pageParam = 1 }) =>
      searchAnime({
        ...searchParams,
        page: pageParam,
        perPage: 20,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { pageInfo } = lastPage.Page
      return pageInfo.hasNextPage ? pageInfo.currentPage + 1 : undefined
    },
    enabled: Boolean(
      searchParams.search ||
      searchParams.genre ||
      searchParams.year ||
      searchParams.season ||
      searchParams.format ||
      searchParams.status
    ),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get anime details by ID
export function useAnimeDetails(id: number) {
  return useQuery({
    queryKey: ['anime', 'details', id],
    queryFn: () => getAnimeDetails(id),
    enabled: Boolean(id),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Get trending anime
export function useTrendingAnime() {
  return useInfiniteQuery({
    queryKey: ['anime', 'trending'],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await fetch('/api/trending')
      if (!response.ok) {
        throw new Error('Failed to fetch trending anime')
      }
      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch trending anime')
      }
      return {
        Page: {
          pageInfo: {
            total: data.total || 0,
            currentPage: pageParam,
            lastPage: Math.ceil((data.total || 0) / 20),
            hasNextPage: pageParam < Math.ceil((data.total || 0) / 20),
            perPage: 20
          },
          media: data.data || []
        }
      }
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { pageInfo } = lastPage.Page
      return pageInfo.hasNextPage ? pageInfo.currentPage + 1 : undefined
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get seasonal anime
export function useSeasonalAnime(season?: string, year?: number) {
  // Memoize the current date calculations to prevent infinite re-renders
  const { currentYear, currentSeason } = useMemo(() => {
    const currentDate = new Date()
    return {
      currentYear: year || currentDate.getFullYear(),
      currentSeason: season || getCurrentSeason()
    }
  }, [season, year])

  return useInfiniteQuery({
    queryKey: ['anime', 'seasonal', currentSeason, currentYear],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await fetch('/api/seasonal')
      if (!response.ok) {
        throw new Error('Failed to fetch seasonal anime')
      }
      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch seasonal anime')
      }
      return {
        Page: {
          pageInfo: {
            total: data.total || 0,
            currentPage: pageParam,
            lastPage: Math.ceil((data.total || 0) / 20),
            hasNextPage: pageParam < Math.ceil((data.total || 0) / 20),
            perPage: 20
          },
          media: data.data || []
        }
      }
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { pageInfo } = lastPage.Page
      return pageInfo.hasNextPage ? pageInfo.currentPage + 1 : undefined
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Get popular anime (using search with popularity sort)
export function usePopularAnime() {
  return useInfiniteQuery({
    queryKey: ['anime', 'popular'],
    queryFn: ({ pageParam = 1 }) =>
      searchAnime({
        page: pageParam,
        perPage: 20,
        sort: ['POPULARITY_DESC'],
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { pageInfo } = lastPage.Page
      return pageInfo.hasNextPage ? pageInfo.currentPage + 1 : undefined
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Get anime by genre
export function useAnimeByGenre(genre: string) {
  return useInfiniteQuery({
    queryKey: ['anime', 'genre', genre],
    queryFn: ({ pageParam = 1 }) =>
      searchAnime({
        genre,
        page: pageParam,
        perPage: 20,
        sort: ['POPULARITY_DESC'],
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { pageInfo } = lastPage.Page
      return pageInfo.hasNextPage ? pageInfo.currentPage + 1 : undefined
    },
    enabled: Boolean(genre),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Get anime recommendations based on an anime ID
export function useAnimeRecommendations(animeId: number) {
  return useQuery({
    queryKey: ['anime', 'recommendations', animeId],
    queryFn: async () => {
      const anime = await getAnimeDetails(animeId)
      return anime.recommendations.nodes
        .filter(rec => rec.mediaRecommendation)
        .slice(0, 12) // Limit to 12 recommendations
    },
    enabled: Boolean(animeId),
    staleTime: 15 * 60 * 1000, // 15 minutes
  })
}

// Utility function to get current season
function getCurrentSeason(): string {
  const month = new Date().getMonth() + 1 // getMonth() returns 0-11
  
  if (month >= 12 || month <= 2) return 'WINTER'
  if (month >= 3 && month <= 5) return 'SPRING'
  if (month >= 6 && month <= 8) return 'SUMMER'
  if (month >= 9 && month <= 11) return 'FALL'
  
  return 'SPRING' // fallback
}

// Utility function to get display title
export function getAnimeTitle(anime: AniListAnime): string {
  return anime.title.english || anime.title.romaji || anime.title.native
}

// Utility function to format anime status
export function formatAnimeStatus(status: string): string {
  switch (status) {
    case 'FINISHED':
      return 'Completed'
    case 'RELEASING':
      return 'Airing'
    case 'NOT_YET_RELEASED':
      return 'Upcoming'
    case 'CANCELLED':
      return 'Cancelled'
    case 'HIATUS':
      return 'On Hiatus'
    default:
      return status
  }
}

// Utility function to format anime format
export function formatAnimeFormat(format: string): string {
  switch (format) {
    case 'TV':
      return 'TV Series'
    case 'TV_SHORT':
      return 'TV Short'
    case 'MOVIE':
      return 'Movie'
    case 'SPECIAL':
      return 'Special'
    case 'OVA':
      return 'OVA'
    case 'ONA':
      return 'ONA'
    case 'MUSIC':
      return 'Music Video'
    default:
      return format
  }
}

// Utility function to get season and year display
export function getSeasonYear(anime: AniListAnime): string {
  if (!anime.season || !anime.seasonYear) return 'Unknown'
  
  const seasonMap = {
    WINTER: 'Winter',
    SPRING: 'Spring',
    SUMMER: 'Summer',
    FALL: 'Fall',
  }
  
  return `${seasonMap[anime.season]} ${anime.seasonYear}`
}
