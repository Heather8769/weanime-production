// AniList GraphQL API integration for WeAnime
// Documentation: https://anilist.gitbook.io/anilist-apiv2-docs/

export interface AnimeData {
  id: number;
  title: {
    romaji: string;
    english?: string;
    native: string;
  };
  coverImage: {
    large: string;
    medium: string;
    color?: string;
  };
  bannerImage?: string;
  description: string;
  averageScore: number;
  seasonYear: number;
  genres: string[];
  episodes?: number;
  status: 'FINISHED' | 'RELEASING' | 'NOT_YET_RELEASED' | 'CANCELLED' | 'HIATUS';
  format: 'TV' | 'MOVIE' | 'OVA' | 'ONA' | 'SPECIAL' | 'MUSIC';
  trailer?: {
    id: string;
    site: string;
    thumbnail: string;
  };
  studios: {
    nodes: Array<{
      name: string;
      isAnimationStudio: boolean;
    }>;
  };
}

export interface AnimeListResponse {
  data: {
    Page: {
      media: AnimeData[];
      pageInfo: {
        hasNextPage: boolean;
        currentPage: number;
        lastPage: number;
      };
    };
  };
}

const ANILIST_API_URL = 'https://graphql.anilist.co';

// GraphQL query for trending anime
const TRENDING_ANIME_QUERY = `
  query TrendingAnime($page: Int, $perPage: Int, $type: MediaType) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        hasNextPage
        currentPage
        lastPage
      }
      media(type: $type, sort: TRENDING_DESC, isAdult: false) {
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
        bannerImage
        description
        averageScore
        seasonYear
        genres
        episodes
        status
        format
        trailer {
          id
          site
          thumbnail
        }
        studios {
          nodes {
            name
            isAnimationStudio
          }
        }
      }
    }
  }
`;

// GraphQL query for popular anime
const POPULAR_ANIME_QUERY = `
  query PopularAnime($page: Int, $perPage: Int, $type: MediaType) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        hasNextPage
        currentPage
        lastPage
      }
      media(type: $type, sort: POPULARITY_DESC, isAdult: false) {
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
        bannerImage
        description
        averageScore
        seasonYear
        genres
        episodes
        status
        format
        trailer {
          id
          site
          thumbnail
        }
        studios {
          nodes {
            name
            isAnimationStudio
          }
        }
      }
    }
  }
`;

// GraphQL query for anime by genre
const ANIME_BY_GENRE_QUERY = `
  query AnimeByGenre($page: Int, $perPage: Int, $type: MediaType, $genre: String) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        hasNextPage
        currentPage
        lastPage
      }
      media(type: $type, genre: $genre, sort: SCORE_DESC, isAdult: false) {
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
        bannerImage
        description
        averageScore
        seasonYear
        genres
        episodes
        status
        format
        trailer {
          id
          site
          thumbnail
        }
        studios {
          nodes {
            name
            isAnimationStudio
          }
        }
      }
    }
  }
`;

// GraphQL query for search
const SEARCH_ANIME_QUERY = `
  query SearchAnime($page: Int, $perPage: Int, $type: MediaType, $search: String) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        hasNextPage
        currentPage
        lastPage
      }
      media(type: $type, search: $search, sort: POPULARITY_DESC, isAdult: false) {
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
        bannerImage
        description
        averageScore
        seasonYear
        genres
        episodes
        status
        format
        trailer {
          id
          site
          thumbnail
        }
        studios {
          nodes {
            name
            isAnimationStudio
          }
        }
      }
    }
  }
`;

async function fetchFromAniList(query: string, variables: any): Promise<AnimeListResponse> {
  try {
    const response = await fetch(ANILIST_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`AniList API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.errors) {
      throw new Error(`AniList GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch from AniList:', error);
    throw error;
  }
}

// Convert AniList data to our internal format
export function convertToInternalFormat(anilistData: AnimeData) {
  // Determine SUB/DUB status (mock logic for now)
  const getStatus = () => {
    // In a real implementation, this would check against a database
    // or external service that tracks dub availability
    const dubGenres = ['Action', 'Adventure', 'Shounen'];
    const hasDub = anilistData.genres.some(genre => dubGenres.includes(genre));
    return hasDub ? 'BOTH' as const : 'SUB' as const;
  };

  return {
    id: anilistData.id.toString(),
    title: anilistData.title.english || anilistData.title.romaji,
    image: anilistData.coverImage.large,
    rating: (anilistData.averageScore || 0) / 10, // Convert from 100-scale to 10-scale
    year: anilistData.seasonYear || new Date().getFullYear(),
    genres: anilistData.genres,
    episodes: anilistData.episodes || 0,
    status: getStatus(),
    quality: '1080p' as const, // Default quality
    description: anilistData.description,
    bannerImage: anilistData.bannerImage,
    trailer: anilistData.trailer,
    studios: anilistData.studios.nodes.filter(studio => studio.isAnimationStudio),
  };
}

// Fetch trending anime
export async function getTrendingAnime(page = 1, perPage = 20) {
  const variables = { page, perPage, type: 'ANIME' };
  const response = await fetchFromAniList(TRENDING_ANIME_QUERY, variables);
  
  return {
    anime: response.data.Page.media.map(convertToInternalFormat),
    pageInfo: response.data.Page.pageInfo,
  };
}

// Fetch popular anime
export async function getPopularAnime(page = 1, perPage = 20) {
  const variables = { page, perPage, type: 'ANIME' };
  const response = await fetchFromAniList(POPULAR_ANIME_QUERY, variables);
  
  return {
    anime: response.data.Page.media.map(convertToInternalFormat),
    pageInfo: response.data.Page.pageInfo,
  };
}

// Fetch anime by genre
export async function getAnimeByGenre(genre: string, page = 1, perPage = 20) {
  const variables = { page, perPage, type: 'ANIME', genre };
  const response = await fetchFromAniList(ANIME_BY_GENRE_QUERY, variables);
  
  return {
    anime: response.data.Page.media.map(convertToInternalFormat),
    pageInfo: response.data.Page.pageInfo,
  };
}

// Search anime
export async function searchAnime(searchTerm: string, page = 1, perPage = 20) {
  const variables = { page, perPage, type: 'ANIME', search: searchTerm };
  const response = await fetchFromAniList(SEARCH_ANIME_QUERY, variables);
  
  return {
    anime: response.data.Page.media.map(convertToInternalFormat),
    pageInfo: response.data.Page.pageInfo,
  };
}

// Get featured anime (highest rated from current season)
export async function getFeaturedAnime() {
  const currentYear = new Date().getFullYear();
  const currentSeason = getCurrentSeason();
  
  const FEATURED_QUERY = `
    query FeaturedAnime($year: Int, $season: MediaSeason) {
      Page(page: 1, perPage: 1) {
        media(seasonYear: $year, season: $season, sort: SCORE_DESC, type: ANIME, isAdult: false) {
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
          bannerImage
          description
          averageScore
          seasonYear
          genres
          episodes
          status
          format
          trailer {
            id
            site
            thumbnail
          }
          studios {
            nodes {
              name
              isAnimationStudio
            }
          }
        }
      }
    }
  `;

  try {
    const variables = { year: currentYear, season: currentSeason };
    const response = await fetchFromAniList(FEATURED_QUERY, variables);
    
    const featuredAnime = response.data.Page.media[0];
    return featuredAnime ? convertToInternalFormat(featuredAnime) : null;
  } catch (error) {
    console.error('Failed to fetch featured anime:', error);
    return null;
  }
}

// Helper function to get current season
function getCurrentSeason(): 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL' {
  const month = new Date().getMonth();
  if (month >= 11 || month <= 1) return 'WINTER';
  if (month >= 2 && month <= 4) return 'SPRING';
  if (month >= 5 && month <= 7) return 'SUMMER';
  return 'FALL';
}