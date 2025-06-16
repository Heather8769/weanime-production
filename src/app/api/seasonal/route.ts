import { NextResponse } from 'next/server'

const ANILIST_GRAPHQL_URL = 'https://graphql.anilist.co'

const SEASONAL_QUERY = `
  query GetSeasonalAnime($season: MediaSeason, $year: Int, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        currentPage
        lastPage
        hasNextPage
        perPage
      }
      media(type: ANIME, season: $season, seasonYear: $year, sort: POPULARITY_DESC) {
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
        studios {
          nodes {
            name
          }
        }
        startDate {
          year
          month
          day
        }
        nextAiringEpisode {
          episode
          timeUntilAiring
        }
      }
    }
  }
`

function getCurrentSeason() {
  const now = new Date()
  const month = now.getMonth() + 1 // JavaScript months are 0-indexed
  const year = now.getFullYear()
  
  let season: string
  if (month >= 3 && month <= 5) {
    season = 'SPRING'
  } else if (month >= 6 && month <= 8) {
    season = 'SUMMER'
  } else if (month >= 9 && month <= 11) {
    season = 'FALL'
  } else {
    season = 'WINTER'
  }
  
  return { season, year }
}

export async function GET() {
  try {
    const { season, year } = getCurrentSeason()
    console.log(`Fetching ${season} ${year} seasonal anime from AniList...`)
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

    try {
      const response = await fetch(ANILIST_GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query: SEASONAL_QUERY,
          variables: {
            season,
            year,
            page: 1,
            perPage: 20
          }
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error(`AniList API error: ${response.status}`)
        return NextResponse.json(
          { 
            error: `AniList API error: ${response.status}`,
            success: false 
          },
          { status: response.status }
        )
      }

      const data = await response.json()

      if (data.errors) {
        console.error('AniList GraphQL errors:', data.errors)
        return NextResponse.json(
          { 
            error: 'GraphQL errors from AniList',
            details: data.errors,
            success: false 
          },
          { status: 400 }
        )
      }

      const animeList = data.data?.Page?.media || []
      console.log(`Successfully fetched ${animeList.length} seasonal anime`)

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
        studios: anime.studios?.nodes?.map((studio: any) => studio.name) || [],
        startDate: anime.startDate,
        nextEpisode: anime.nextAiringEpisode ? {
          episode: anime.nextAiringEpisode.episode,
          timeUntilAiring: anime.nextAiringEpisode.timeUntilAiring
        } : null
      }))

      return NextResponse.json({
        success: true,
        data: transformedAnime,
        season,
        year,
        total: data.data?.Page?.pageInfo?.total || 0,
        source: 'anilist',
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }

  } catch (error) {
    console.error('Seasonal API error:', error)
    
    // Return honest error, no fake data
    return NextResponse.json(
      { 
        error: 'Failed to fetch seasonal anime',
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    )
  }
}
