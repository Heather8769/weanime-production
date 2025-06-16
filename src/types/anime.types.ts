// Anime-related type definitions

export interface AnimeTitle {
  english: string | null
  romaji: string
  native: string
}

export interface CoverImage {
  large: string
  medium: string
  color: string | null
}

export interface AnimeDate {
  year: number | null
  month: number | null
  day: number | null
}

export interface Studio {
  id: number
  name: string
  isAnimationStudio: boolean
}

export interface Tag {
  id: number
  name: string
  description: string
  rank: number
}

export interface Trailer {
  id: string
  site: string
  thumbnail: string
}

export interface AnimeRelation {
  id: number
  relationType: string
  node: {
    id: number
    title: AnimeTitle
    coverImage: CoverImage
    format: AnimeFormat
    status: AnimeStatus
  }
}

export interface Recommendation {
  id: number
  rating: number
  mediaRecommendation: Anime
}

export type AnimeStatus = 
  | 'FINISHED'
  | 'RELEASING'
  | 'NOT_YET_RELEASED'
  | 'CANCELLED'
  | 'HIATUS'

export type AnimeFormat = 
  | 'TV'
  | 'TV_SHORT'
  | 'MOVIE'
  | 'SPECIAL'
  | 'OVA'
  | 'ONA'
  | 'MUSIC'

export type AnimeSeason = 
  | 'WINTER'
  | 'SPRING'
  | 'SUMMER'
  | 'FALL'

export type AnimeSource = 
  | 'ORIGINAL'
  | 'MANGA'
  | 'LIGHT_NOVEL'
  | 'VISUAL_NOVEL'
  | 'VIDEO_GAME'
  | 'OTHER'

export interface Anime {
  id: number
  title: AnimeTitle
  description: string | null
  coverImage: CoverImage
  bannerImage: string | null
  genres: string[]
  tags: Tag[]
  episodes: number | null
  duration: number | null
  status: AnimeStatus
  format: AnimeFormat
  season: AnimeSeason | null
  seasonYear: number | null
  startDate: AnimeDate
  endDate: AnimeDate
  source: AnimeSource
  averageScore: number | null
  popularity: number
  trending: number
  favourites: number
  studios: {
    nodes: Studio[]
  }
  relations: {
    edges: AnimeRelation[]
  }
  recommendations: {
    nodes: Recommendation[]
  }
  trailer: Trailer | null
  nextAiringEpisode: {
    airingAt: number
    timeUntilAiring: number
    episode: number
  } | null
}

export interface AnimeSearchResult {
  data: {
    Page: {
      media: Anime[]
      pageInfo: {
        total: number
        currentPage: number
        lastPage: number
        hasNextPage: boolean
        perPage: number
      }
    }
  }
}

export interface AnimeDetailsResult {
  data: {
    Media: Anime
  }
}

// Streaming-related types
export interface VideoSource {
  url: string | null
  quality: string
  type: 'hls' | 'mp4' | 'youtube'
  language?: 'sub' | 'dub' | 'N/A'
  server?: string
  provider?: string
  legal?: boolean
  message?: string
  contentType?: 'episode' | 'trailer' | 'preview'
}

export interface Subtitle {
  url: string
  language: string
  label: string
  default?: boolean
}

export interface Episode {
  id: string
  number: number
  title: string
  description?: string
  thumbnail?: string
  duration: number
  sources: VideoSource[]
  subtitles: Subtitle[]
  skipTimes?: {
    intro?: { start: number; end: number }
    outro?: { start: number; end: number }
  }
  airDate?: string
  streamingId?: string
}

export interface StreamingData {
  title: string
  sources: VideoSource[]
  requiresLicense?: boolean
}

// User-related types
export interface WatchlistEntry {
  id: string
  user_id: string
  anime_id: number
  status: 'watching' | 'completed' | 'dropped' | 'plan_to_watch' | 'on_hold'
  progress: number
  rating: number | null
  start_date: string | null
  finish_date: string | null
  notes: string | null
  favorite: boolean
  rewatching: boolean
  created_at: string
  updated_at: string
}

export interface WatchProgress {
  id: string
  user_id: string
  anime_id: number
  episode_id: string
  episode_number: number
  progress_seconds: number
  duration_seconds: number
  completed: boolean
  last_watched: string
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  user_id: string
  anime_id: number | null
  episode_id: string | null
  parent_id: string | null
  content: string
  is_spoiler: boolean
  upvotes: number
  downvotes: number
  created_at: string
  updated_at: string
  user?: {
    username: string
    avatar_url: string | null
  }
  replies?: Comment[]
}

// API Response types
export interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Search and filter types
export interface SearchFilters {
  genre?: string[]
  year?: number
  season?: AnimeSeason
  status?: AnimeStatus
  format?: AnimeFormat
  sort?: string
  search?: string
}

export interface AnimeCardProps {
  anime: Anime
  variant?: 'default' | 'compact' | 'detailed'
  showDetails?: boolean
  loading?: boolean
  watchlistStatus?: string
  onClick?: (anime: Anime) => void
}
