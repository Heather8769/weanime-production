// AniList GraphQL API client
const ANILIST_GRAPHQL_URL = 'https://graphql.anilist.co'

export interface AniListAnime {
  id: number
  title: {
    romaji: string
    english: string | null
    native: string
  }
  description: string | null
  startDate: {
    year: number | null
    month: number | null
    day: number | null
  }
  endDate: {
    year: number | null
    month: number | null
    day: number | null
  }
  season: 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL' | null
  seasonYear: number | null
  episodes: number | null
  duration: number | null
  status: 'FINISHED' | 'RELEASING' | 'NOT_YET_RELEASED' | 'CANCELLED' | 'HIATUS'
  format: 'TV' | 'TV_SHORT' | 'MOVIE' | 'SPECIAL' | 'OVA' | 'ONA' | 'MUSIC'
  genres: string[]
  averageScore: number | null
  popularity: number
  trending: number
  favourites: number
  coverImage: {
    large: string
    medium: string
    color: string | null
  }
  bannerImage: string | null
  studios: {
    nodes: Array<{
      id: number
      name: string
      isAnimationStudio: boolean
    }>
  }
  relations: {
    edges: Array<{
      id: number
      relationType: string
      node: {
        id: number
        title: {
          romaji: string
          english: string | null
        }
        coverImage: {
          medium: string
        }
        format: string
        status: string
      }
    }>
  }
  recommendations: {
    nodes: Array<{
      id: number
      rating: number
      mediaRecommendation: {
        id: number
        title: {
          romaji: string
          english: string | null
        }
        coverImage: {
          medium: string
        }
        averageScore: number | null
      }
    }>
  }
  trailer: {
    id: string
    site: string
    thumbnail: string
  } | null
}

export interface AniListSearchResult {
  Page: {
    pageInfo: {
      total: number
      currentPage: number
      lastPage: number
      hasNextPage: boolean
      perPage: number
    }
    media: AniListAnime[]
  }
}

// GraphQL Queries
export const SEARCH_ANIME_QUERY = `
  query SearchAnime($search: String, $page: Int, $perPage: Int, $sort: [MediaSort], $genre: String, $year: Int, $season: MediaSeason, $format: MediaFormat, $status: MediaStatus) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        currentPage
        lastPage
        hasNextPage
        perPage
      }
      media(search: $search, type: ANIME, sort: $sort, genre: $genre, seasonYear: $year, season: $season, format: $format, status: $status) {
        id
        title {
          romaji
          english
          native
        }
        description
        startDate {
          year
          month
          day
        }
        season
        seasonYear
        episodes
        duration
        status
        format
        genres
        averageScore
        popularity
        trending
        favourites
        coverImage {
          large
          medium
          color
        }
        bannerImage
        studios {
          nodes {
            id
            name
            isAnimationStudio
          }
        }
      }
    }
  }
`

export const GET_ANIME_DETAILS_QUERY = `
  query GetAnimeDetails($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      title {
        romaji
        english
        native
      }
      description
      startDate {
        year
        month
        day
      }
      endDate {
        year
        month
        day
      }
      season
      seasonYear
      episodes
      duration
      status
      format
      genres
      averageScore
      popularity
      trending
      favourites
      coverImage {
        large
        medium
        color
      }
      bannerImage
      studios {
        nodes {
          id
          name
          isAnimationStudio
        }
      }
      relations {
        edges {
          id
          relationType
          node {
            id
            title {
              romaji
              english
            }
            coverImage {
              medium
            }
            format
            status
          }
        }
      }
      recommendations {
        nodes {
          id
          rating
          mediaRecommendation {
            id
            title {
              romaji
              english
            }
            coverImage {
              medium
            }
            averageScore
          }
        }
      }
      trailer {
        id
        site
        thumbnail
      }
    }
  }
`

export const GET_TRENDING_ANIME_QUERY = `
  query GetTrendingAnime($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        currentPage
        lastPage
        hasNextPage
        perPage
      }
      media(type: ANIME, sort: TRENDING_DESC) {
        id
        title {
          romaji
          english
          native
        }
        coverImage {
          large
          medium
          color
        }
        averageScore
        popularity
        trending
        episodes
        status
        format
        genres
      }
    }
  }
`

export const GET_SEASONAL_ANIME_QUERY = `
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
        coverImage {
          large
          medium
          color
        }
        averageScore
        popularity
        episodes
        status
        format
        genres
        startDate {
          year
          month
          day
        }
      }
    }
  }
`

// API Functions
export async function searchAnime(variables: {
  search?: string
  page?: number
  perPage?: number
  sort?: string[]
  genre?: string
  year?: number
  season?: string
  format?: string
  status?: string
}): Promise<AniListSearchResult> {
  const response = await fetch('/api/anilist', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: SEARCH_ANIME_QUERY,
      variables: {
        page: 1,
        perPage: 20,
        sort: ['POPULARITY_DESC'],
        ...variables,
      },
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to fetch anime data')
  }

  const data = await response.json()

  if (data.errors) {
    throw new Error(data.errors[0].message)
  }

  return data.data
}

export async function getAnimeDetails(id: number): Promise<AniListAnime> {
  const response = await fetch('/api/anilist', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: GET_ANIME_DETAILS_QUERY,
      variables: { id },
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to fetch anime details')
  }

  const data = await response.json()

  if (data.errors) {
    throw new Error(data.errors[0].message)
  }

  return data.data.Media
}

export async function getTrendingAnime(page = 1, perPage = 20): Promise<AniListSearchResult> {
  const response = await fetch('/api/anilist', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: GET_TRENDING_ANIME_QUERY,
      variables: { page, perPage },
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to fetch trending anime')
  }

  const data = await response.json()

  if (data.errors) {
    throw new Error(data.errors[0].message)
  }

  return data.data
}

export async function getSeasonalAnime(
  season: string,
  year: number,
  page = 1,
  perPage = 20
): Promise<AniListSearchResult> {
  const response = await fetch('/api/anilist', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: GET_SEASONAL_ANIME_QUERY,
      variables: { season, year, page, perPage },
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to fetch seasonal anime')
  }

  const data = await response.json()

  if (data.errors) {
    throw new Error(data.errors[0].message)
  }

  return data.data
}
