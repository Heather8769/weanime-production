import { NextResponse } from 'next/server'
import { cachedFetch, cacheKeys } from '@/lib/api-cache'

const ANILIST_GRAPHQL_URL = 'https://graphql.anilist.co'

const TRENDING_QUERY = `
  query GetTrendingAnime($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        currentPage
        lastPage
        hasNextPage
        perPage
      }
      media(type: ANIME, sort: TRENDING_DESC, status: RELEASING) {
        id
        title {
          romaji
          english
          native
        }
        description
        coverImage {
          large
          medium
          color
        }
        bannerImage
        episodes
        status
        season
        seasonYear
        format
        genres
        averageScore
        popularity
        trending
        studios {
          nodes {
            name
          }
        }
        nextAiringEpisode {
          episode
          timeUntilAiring
        }
      }
    }
  }
`

export async function GET() {
  try {
    console.log('Fetching trending anime from AniList...')

    // Try to get from cache first
    const cacheKey = cacheKeys.trending()
    const { apiCache } = await import('@/lib/api-cache')
    const cached = apiCache.get(cacheKey)

    if (cached) {
      console.log('Returning cached trending data')
      return NextResponse.json(cached)
    }

    // Make the GraphQL request with proper error handling
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    try {
      const response = await fetch(ANILIST_GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query: TRENDING_QUERY,
          variables: {
            page: 1,
            perPage: 20
          }
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error(`AniList API error: ${response.status}`)
        throw new Error(`AniList API error: ${response.status}`)
      }

      const responseData = await response.json()

      if (responseData.errors) {
        console.error('AniList GraphQL errors:', responseData.errors)
        throw new Error('GraphQL errors from AniList')
      }

      const animeList = responseData.data?.Page?.media || []
      console.log(`Successfully fetched ${animeList.length} trending anime`)

      // Transform to our format
      const transformedAnime = animeList.map((anime: any) => ({
        id: anime.id,
        title: anime.title.english || anime.title.romaji || anime.title.native,
        description: anime.description?.replace(/<[^>]*>/g, '') || 'No description available',
        image: anime.coverImage.large || anime.coverImage.medium,
        bannerImage: anime.bannerImage,
        episodes: anime.episodes,
        status: anime.status,
        season: anime.season,
        year: anime.seasonYear,
        format: anime.format,
        genres: anime.genres || [],
        rating: anime.averageScore ? anime.averageScore / 10 : null,
        popularity: anime.popularity,
        trending: anime.trending,
        studios: anime.studios?.nodes?.map((studio: any) => studio.name) || [],
        nextEpisode: anime.nextAiringEpisode ? {
          episode: anime.nextAiringEpisode.episode,
          timeUntilAiring: anime.nextAiringEpisode.timeUntilAiring
        } : null
      }))

      const result = {
        success: true,
        data: transformedAnime,
        total: responseData.data?.Page?.pageInfo?.total || 0,
        source: 'anilist',
        timestamp: new Date().toISOString(),
        cached: false
      }

      // Cache the result for 10 minutes
      apiCache.set(cacheKey, result, 10 * 60 * 1000)

      return NextResponse.json(result)

    } catch (fetchError) {
      clearTimeout(timeoutId)
      throw fetchError
    }

  } catch (error) {
    console.error('Trending API error:', error)

    // Try real trending data when external API fails
    console.log('Trying real trending data due to API failure')
    try {
      const { getTrendingAnime } = await import('@/lib/anilist')
      const realTrending = await getTrendingAnime()

      const realResult = {
        success: true,
        data: realTrending,
        total: Array.isArray(realTrending) ? realTrending.length : 0,
        source: 'anilist_real',
        message: 'Real AniList trending anime loaded',
        timestamp: new Date().toISOString(),
        cached: false
      }

      return NextResponse.json(realResult)
    } catch (realError) {
      console.warn('Real trending service also failed:', realError)
      
      // Return error instead of mock data
      return NextResponse.json(
        {
          success: false,
          error: 'Trending anime temporarily unavailable',
          message: 'Both external APIs and real Crunchyroll service are unavailable',
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      )
    }
  }
}
