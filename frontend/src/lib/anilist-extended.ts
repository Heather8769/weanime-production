// Extended AniList GraphQL API for detailed anime information

const ANILIST_API_URL = 'https://graphql.anilist.co';

// Detailed anime query with characters, staff, and relations
const ANIME_DETAIL_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      title {
        romaji
        english
        native
      }
      description
      bannerImage
      coverImage {
        large
        medium
        color
      }
      episodes
      duration
      status
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
      genres
      averageScore
      meanScore
      popularity
      favourites
      trending
      format
      source
      countryOfOrigin
      isAdult
      studios {
        nodes {
          id
          name
          isAnimationStudio
        }
      }
      staff {
        edges {
          id
          role
          node {
            id
            name {
              full
              native
            }
            image {
              large
              medium
            }
            description
            primaryOccupations
          }
        }
      }
      characters {
        edges {
          id
          role
          voiceActors(language: JAPANESE) {
            id
            name {
              full
              native
            }
            image {
              large
              medium
            }
            languageV2
          }
          node {
            id
            name {
              full
              native
            }
            image {
              large
              medium
            }
            description
            gender
            age
          }
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
            meanScore
          }
        }
      }
      recommendations {
        edges {
          node {
            mediaRecommendation {
              id
              title {
                romaji
                english
              }
              coverImage {
                medium
              }
              format
              meanScore
              popularity
            }
          }
        }
      }
      trailer {
        id
        site
        thumbnail
      }
      tags {
        id
        name
        description
        category
        rank
        isGeneralSpoiler
        isMediaSpoiler
      }
      stats {
        scoreDistribution {
          score
          amount
        }
        statusDistribution {
          status
          amount
        }
      }
      reviews {
        edges {
          node {
            id
            rating
            ratingAmount
            summary
            body
            user {
              id
              name
              avatar {
                medium
              }
            }
            createdAt
          }
        }
      }
    }
  }
`;

// Character details query
const CHARACTER_DETAIL_QUERY = `
  query ($id: Int) {
    Character(id: $id) {
      id
      name {
        full
        native
        alternative
      }
      image {
        large
        medium
      }
      description
      gender
      dateOfBirth {
        year
        month
        day
      }
      age
      bloodType
      media {
        edges {
          id
          characterRole
          voiceActors {
            id
            name {
              full
            }
            image {
              medium
            }
            languageV2
          }
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
            startDate {
              year
            }
          }
        }
      }
      favourites
    }
  }
`;

// Staff details query
const STAFF_DETAIL_QUERY = `
  query ($id: Int) {
    Staff(id: $id) {
      id
      name {
        full
        native
      }
      image {
        large
        medium
      }
      description
      primaryOccupations
      gender
      dateOfBirth {
        year
        month
        day
      }
      dateOfDeath {
        year
        month
        day
      }
      age
      yearsActive
      homeTown
      bloodType
      staffMedia {
        edges {
          id
          staffRole
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
            startDate {
              year
            }
          }
        }
      }
      characters {
        edges {
          id
          role
          media {
            id
            title {
              romaji
            }
            coverImage {
              medium
            }
          }
          node {
            id
            name {
              full
            }
            image {
              medium
            }
          }
        }
      }
      favourites
    }
  }
`;

// Search anime with detailed info
const SEARCH_ANIME_DETAILED_QUERY = `
  query ($search: String, $page: Int, $perPage: Int, $genre: String, $year: Int, $season: MediaSeason, $format: MediaFormat, $status: MediaStatus, $sort: [MediaSort]) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        currentPage
        lastPage
        hasNextPage
        perPage
      }
      media(type: ANIME, search: $search, genre: $genre, seasonYear: $year, season: $season, format: $format, status: $status, sort: $sort) {
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
        duration
        status
        startDate {
          year
          month
          day
        }
        season
        seasonYear
        genres
        averageScore
        popularity
        favourites
        format
        studios {
          nodes {
            name
          }
        }
        trailer {
          id
          site
        }
      }
    }
  }
`;

// Type definitions
export interface AnimeDetail {
  id: number;
  title: {
    romaji: string;
    english?: string;
    native?: string;
  };
  description?: string;
  bannerImage?: string;
  coverImage: {
    large: string;
    medium: string;
    color?: string;
  };
  episodes?: number;
  duration?: number;
  status: string;
  startDate?: {
    year?: number;
    month?: number;
    day?: number;
  };
  endDate?: {
    year?: number;
    month?: number;
    day?: number;
  };
  season?: string;
  seasonYear?: number;
  genres: string[];
  averageScore?: number;
  meanScore?: number;
  popularity?: number;
  favourites?: number;
  trending?: number;
  format: string;
  source?: string;
  countryOfOrigin?: string;
  isAdult: boolean;
  studios: {
    nodes: Array<{
      id: number;
      name: string;
      isAnimationStudio: boolean;
    }>;
  };
  staff: {
    edges: Array<{
      id: number;
      role: string;
      node: StaffMember;
    }>;
  };
  characters: {
    edges: Array<{
      id: number;
      role: string;
      voiceActors: VoiceActor[];
      node: Character;
    }>;
  };
  relations: {
    edges: Array<{
      id: number;
      relationType: string;
      node: RelatedMedia;
    }>;
  };
  recommendations: {
    edges: Array<{
      node: {
        mediaRecommendation: RecommendedMedia;
      };
    }>;
  };
  trailer?: {
    id: string;
    site: string;
    thumbnail?: string;
  };
  tags: Array<{
    id: number;
    name: string;
    description?: string;
    category?: string;
    rank?: number;
    isGeneralSpoiler: boolean;
    isMediaSpoiler: boolean;
  }>;
  stats: {
    scoreDistribution: Array<{
      score: number;
      amount: number;
    }>;
    statusDistribution: Array<{
      status: string;
      amount: number;
    }>;
  };
  reviews: {
    edges: Array<{
      node: Review;
    }>;
  };
}

export interface Character {
  id: number;
  name: {
    full: string;
    native?: string;
    alternative?: string[];
  };
  image: {
    large: string;
    medium: string;
  };
  description?: string;
  gender?: string;
  dateOfBirth?: {
    year?: number;
    month?: number;
    day?: number;
  };
  age?: string;
  bloodType?: string;
  favourites?: number;
}

export interface StaffMember {
  id: number;
  name: {
    full: string;
    native?: string;
  };
  image: {
    large: string;
    medium: string;
  };
  description?: string;
  primaryOccupations?: string[];
  gender?: string;
  dateOfBirth?: {
    year?: number;
    month?: number;
    day?: number;
  };
  age?: number;
  favourites?: number;
}

export interface VoiceActor {
  id: number;
  name: {
    full: string;
    native?: string;
  };
  image: {
    large: string;
    medium: string;
  };
  languageV2: string;
}

export interface RelatedMedia {
  id: number;
  title: {
    romaji: string;
    english?: string;
  };
  coverImage: {
    medium: string;
  };
  format: string;
  status: string;
  meanScore?: number;
}

export interface RecommendedMedia {
  id: number;
  title: {
    romaji: string;
    english?: string;
  };
  coverImage: {
    medium: string;
  };
  format: string;
  meanScore?: number;
  popularity?: number;
}

export interface Review {
  id: number;
  rating?: number;
  ratingAmount?: number;
  summary?: string;
  body?: string;
  user: {
    id: number;
    name: string;
    avatar: {
      medium: string;
    };
  };
  createdAt: number;
}

// API functions
async function executeQuery(query: string, variables: any = {}) {
  const response = await fetch(ANILIST_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(data.errors[0].message);
  }

  return data.data;
}

export async function getAnimeDetail(id: number): Promise<AnimeDetail> {
  const data = await executeQuery(ANIME_DETAIL_QUERY, { id });
  return data.Media;
}

export async function getCharacterDetail(id: number): Promise<Character> {
  const data = await executeQuery(CHARACTER_DETAIL_QUERY, { id });
  return data.Character;
}

export async function getStaffDetail(id: number): Promise<StaffMember> {
  const data = await executeQuery(STAFF_DETAIL_QUERY, { id });
  return data.Staff;
}

export async function searchAnimeDetailed(params: {
  search?: string;
  page?: number;
  perPage?: number;
  genre?: string;
  year?: number;
  season?: string;
  format?: string;
  status?: string;
  sort?: string[];
}) {
  const {
    search,
    page = 1,
    perPage = 20,
    genre,
    year,
    season,
    format,
    status,
    sort
  } = params;

  const data = await executeQuery(SEARCH_ANIME_DETAILED_QUERY, {
    search,
    page,
    perPage,
    genre,
    year,
    season,
    format,
    status,
    sort
  });

  return data.Page;
}

// Utility functions
export function formatAirDate(startDate?: { year?: number; month?: number; day?: number }, endDate?: { year?: number; month?: number; day?: number }): string {
  if (!startDate?.year) return 'Unknown';
  
  const start = `${startDate.year}`;
  if (endDate?.year && endDate.year !== startDate.year) {
    return `${start} - ${endDate.year}`;
  }
  
  return start;
}

export function formatDuration(duration?: number): string {
  if (!duration) return 'Unknown';
  
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  
  return `${minutes}m`;
}

export function formatScore(score?: number): string {
  if (!score) return 'N/A';
  return `${(score / 10).toFixed(1)}`;
}

export function getStudioNames(studios: AnimeDetail['studios']): string[] {
  return studios.nodes
    .filter(studio => studio.isAnimationStudio)
    .map(studio => studio.name);
}

export function getMainCharacters(characters: AnimeDetail['characters'], limit: number = 6) {
  return characters.edges
    .filter(edge => edge.role === 'MAIN')
    .slice(0, limit);
}

export function getSupportingCharacters(characters: AnimeDetail['characters'], limit: number = 12) {
  return characters.edges
    .filter(edge => edge.role === 'SUPPORTING')
    .slice(0, limit);
}

export function getDirector(staff: AnimeDetail['staff']): StaffMember | null {
  const director = staff.edges.find(edge => 
    edge.role.toLowerCase().includes('director') && 
    !edge.role.toLowerCase().includes('assistant')
  );
  
  return director?.node || null;
}

export function getMainStaff(staff: AnimeDetail['staff'], limit: number = 8) {
  const importantRoles = [
    'Director',
    'Original Creator',
    'Character Design',
    'Chief Animation Director',
    'Series Composition',
    'Music',
    'Producer',
    'Executive Producer'
  ];
  
  return staff.edges
    .filter(edge => importantRoles.some(role => 
      edge.role.toLowerCase().includes(role.toLowerCase())
    ))
    .slice(0, limit);
}