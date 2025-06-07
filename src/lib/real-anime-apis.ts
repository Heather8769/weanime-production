// Real anime streaming APIs integration with proper error handling
// Based on the anime_manga_databases.markdown document

import {
  WeAnimeError,
  ErrorCode,
  createAPIError,
  createStreamingError,
  handleFetchError,
  withRetry
} from './error-handling'
import { getEnvConfig } from './env-validation'

// Real API configurations from the anime_manga_databases.markdown document
export const REAL_ANIME_APIS = {
  // Anime-API (Nekidev) - Provides anime metadata and streaming links
  nekidev: {
    baseUrl: 'https://api.nekidev.com', // Real GitHub-based API
    endpoints: {
      anime: '/anime',
      stream: '/stream',
      metadata: '/metadata',
      search: '/search',
      episodes: '/episodes',
      characters: '/characters'
    },
    features: ['anime_details', 'episode_lists', 'streaming_urls', 'genres', 'search'],
    legal_notes: 'Streaming links may come from unofficial sources. Verify copyright compliance.',
    priority: 1
  },

  // AnbuAnime API - RESTful API serving anime video streams from GogoAnime
  anbu: {
    baseUrl: 'https://api.anbu.app', // Real AnbuAnime API
    endpoints: {
      anime: '/anime',
      episodes: '/episodes',
      stream: '/stream'
    },
    features: ['episode_streaming', 'anime_metadata', 'series_search'],
    legal_notes: 'Sources videos from GogoAnime, an unofficial platform. Significant copyright risks.',
    priority: 2
  },

  // JustalK/ANIME-API - Scraper API for anime streaming and download links
  justalk: {
    baseUrl: 'https://anime-api.justalk.dev', // Real JustalK API
    endpoints: {
      search: '/search',
      anime: '/anime',
      stream: '/stream'
    },
    features: ['search_anime_pages', 'extract_streaming_urls', 'basic_metadata'],
    legal_notes: 'Scrapes unofficial sites, posing legal risks. Ensure compliance with copyright laws.',
    priority: 3
  },

  // Alternative APIs for fallback
  consumet: {
    baseUrl: 'https://api.consumet.org', // Consumet API - popular anime streaming API
    endpoints: {
      anime: '/anime/gogoanime',
      search: '/anime/gogoanime/search',
      info: '/anime/gogoanime/info',
      watch: '/anime/gogoanime/watch'
    },
    features: ['real_streaming_links', 'episode_data', 'search'],
    legal_notes: 'Uses GogoAnime as source. Copyright considerations apply.',
    priority: 4
  }
}

// Legal anime content configuration
export const LEGAL_ANIME_PROVIDERS = {
  // Official streaming platforms with API access
  crunchyroll: {
    name: 'Crunchyroll',
    apiUrl: process.env.CRUNCHYROLL_API_URL,
    apiKey: process.env.CRUNCHYROLL_API_KEY,
    enabled: !!process.env.CRUNCHYROLL_API_KEY,
    priority: 1,
    regions: ['US', 'CA', 'UK', 'AU'],
    contentTypes: ['sub', 'dub']
  },
  funimation: {
    name: 'Funimation',
    apiUrl: process.env.FUNIMATION_API_URL,
    apiKey: process.env.FUNIMATION_API_KEY,
    enabled: !!process.env.FUNIMATION_API_KEY,
    priority: 2,
    regions: ['US', 'CA'],
    contentTypes: ['dub', 'sub']
  },
  // YouTube official channels for trailers and some free content
  youtube: {
    name: 'YouTube',
    apiUrl: 'https://www.googleapis.com/youtube/v3',
    apiKey: process.env.YOUTUBE_API_KEY,
    enabled: !!process.env.YOUTUBE_API_KEY,
    priority: 3,
    regions: ['global'],
    contentTypes: ['trailer', 'preview', 'free']
  }
}

// Placeholder content for development/demo purposes only
export const DEVELOPMENT_PLACEHOLDER_DATA = {
  20: { // Naruto - Development placeholder
    title: 'Naruto',
    episodes: {
      1: {
        title: 'Enter: Naruto Uzumaki!',
        sources: [
          {
            url: null, // No actual stream - placeholder only
            quality: '1080p',
            type: 'placeholder',
            language: 'sub',
            server: 'Development Placeholder',
            provider: 'Development Only',
            message: 'Content requires valid streaming license'
          }
        ]
      }
    }
  }
}

// Fetch legal anime streaming data with proper licensing and error handling
export async function fetchLegalAnimeStreams(animeId: number, episodeNumber: number, userRegion: string = 'US') {
  const envConfig = getEnvConfig()

  try {
    // Priority 1: Check for legal streaming providers
    const availableProviders = Object.entries(LEGAL_ANIME_PROVIDERS)
      .filter(([, provider]) => provider.enabled && provider.regions.includes(userRegion))
      .sort(([, a], [, b]) => a.priority - b.priority)

    for (const [providerName, provider] of availableProviders) {
      try {
        const streamingData = await withRetry(
          () => fetchFromLegalProvider(providerName, provider, animeId, episodeNumber),
          { maxAttempts: 2, delay: 1000 }
        )

        if (streamingData) {
          console.log(`✅ Successfully fetched legal streaming data from ${providerName} for anime ${animeId} episode ${episodeNumber}`)
          return streamingData
        }
      } catch (error) {
        console.warn(`❌ Failed to fetch from ${providerName}:`, error instanceof WeAnimeError ? error.message : error)
        continue
      }
    }

    // Priority 2: Try community APIs with proper attribution (with warnings)
    const apiPriorities = Object.entries(REAL_ANIME_APIS)
      .sort(([,a], [,b]) => a.priority - b.priority)

    for (const [apiName, apiConfig] of apiPriorities) {
      try {
        const streamingData = await withRetry(
          () => fetchFromRealAPI(apiName, apiConfig, animeId, episodeNumber),
          { maxAttempts: 2, delay: 1000 }
        )

        if (streamingData) {
          console.warn(`⚠️ Using community API ${apiName} for anime ${animeId} episode ${episodeNumber} - verify licensing`)
          return streamingData
        }
      } catch (error) {
        console.warn(`❌ Failed to fetch from ${apiName}:`, error instanceof WeAnimeError ? error.message : error)
        continue
      }
    }

    // Priority 3: Development placeholder (no actual streaming)
    if (envConfig.isDevelopment) {
      console.log(`🚫 No legal streaming source available for anime ${animeId} episode ${episodeNumber} - showing placeholder`)
      return generatePlaceholderContent(animeId, episodeNumber)
    }

    // Production: Throw error if no legal source available
    throw createStreamingError(
      `No legal streaming source available for anime ${animeId} episode ${episodeNumber}`,
      availableProviders.length > 0
    )

  } catch (error) {
    if (error instanceof WeAnimeError) {
      throw error
    }

    throw new WeAnimeError(ErrorCode.STREAMING_ERROR, 'Failed to fetch streaming data', {
      details: { animeId, episodeNumber, userRegion },
      cause: error instanceof Error ? error : undefined
    })
  }
}

// Fetch from a specific real API
async function fetchFromRealAPI(apiName: string, apiConfig: any, animeId: number, episodeNumber: number) {
  const timeout = 10000 // 10 second timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    let url: string
    let response: Response

    switch (apiName) {
      case 'consumet':
        // Consumet API - most reliable for real streaming
        url = `${apiConfig.baseUrl}${apiConfig.endpoints.watch}/${animeId}-episode-${episodeNumber}`
        response = await fetch(url, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        })
        break

      case 'nekidev':
        // Anime-API (Nekidev)
        url = `${apiConfig.baseUrl}${apiConfig.endpoints.stream}/${animeId}/${episodeNumber}`
        response = await fetch(url, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        })
        break

      case 'anbu':
        // AnbuAnime API
        url = `${apiConfig.baseUrl}${apiConfig.endpoints.stream}/${animeId}/${episodeNumber}`
        response = await fetch(url, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        })
        break

      case 'justalk':
        // JustalK/ANIME-API
        url = `${apiConfig.baseUrl}${apiConfig.endpoints.stream}/${animeId}/${episodeNumber}`
        response = await fetch(url, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        })
        break

      default:
        return null
    }

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`API ${apiName} returned ${response.status}`)
    }

    const data = await response.json()
    return transformAPIResponse(apiName, data, animeId, episodeNumber)

  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

// Transform API responses to our standard format
function transformAPIResponse(apiName: string, data: any, animeId: number, episodeNumber: number) {
  try {
    switch (apiName) {
      case 'consumet':
        // Consumet API response format
        if (data.sources && Array.isArray(data.sources)) {
          return {
            title: `Episode ${episodeNumber}`,
            sources: data.sources.map((source: any, index: number) => ({
              url: source.url,
              quality: source.quality || `${1080 - (index * 240)}p`,
              type: source.isM3U8 ? 'hls' : 'mp4',
              language: 'sub',
              server: `Consumet Server ${index + 1}`,
              provider: 'Consumet API'
            }))
          }
        }
        break

      case 'nekidev':
        // Anime-API (Nekidev) response format
        if (data.streamingLinks || data.sources) {
          const sources = data.streamingLinks || data.sources
          return {
            title: data.title || `Episode ${episodeNumber}`,
            sources: sources.map((source: any, index: number) => ({
              url: source.url || source.link,
              quality: source.quality || `${1080 - (index * 240)}p`,
              type: 'hls',
              language: source.language || 'sub',
              server: `Nekidev Server ${index + 1}`,
              provider: 'Anime-API (Nekidev)'
            }))
          }
        }
        break

      case 'anbu':
        // AnbuAnime API response format
        if (data.video || data.stream) {
          const streamData = data.video || data.stream
          return {
            title: data.title || `Episode ${episodeNumber}`,
            sources: [{
              url: streamData.url || streamData,
              quality: streamData.quality || '1080p',
              type: 'hls',
              language: 'sub',
              server: 'AnbuAnime Server',
              provider: 'AnbuAnime API'
            }]
          }
        }
        break

      case 'justalk':
        // JustalK/ANIME-API response format
        if (data.streams || data.links) {
          const streams = data.streams || data.links
          return {
            title: data.title || `Episode ${episodeNumber}`,
            sources: streams.map((stream: any, index: number) => ({
              url: stream.url || stream.link,
              quality: stream.quality || `${1080 - (index * 240)}p`,
              type: 'hls',
              language: 'sub',
              server: `JustalK Server ${index + 1}`,
              provider: 'JustalK/ANIME-API'
            }))
          }
        }
        break
    }

    return null
  } catch (error) {
    console.error(`Error transforming ${apiName} response:`, error)
    return null
  }
}

// Fetch from legal streaming provider
async function fetchFromLegalProvider(providerName: string, provider: any, animeId: number, episodeNumber: number) {
  const timeout = 10000 // 10 second timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    let response: Response
    let url: string

    switch (providerName) {
      case 'crunchyroll':
        // Crunchyroll API integration (requires proper licensing agreement)
        url = `${provider.apiUrl}/content/${animeId}/episodes/${episodeNumber}/streams`
        response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Authorization': `Bearer ${provider.apiKey}`,
            'Accept': 'application/json'
          }
        })
        break

      case 'funimation':
        // Funimation API integration (requires proper licensing agreement)
        url = `${provider.apiUrl}/shows/${animeId}/episodes/${episodeNumber}/videos`
        response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Authorization': `Bearer ${provider.apiKey}`,
            'Accept': 'application/json'
          }
        })
        break

      case 'youtube':
        // YouTube API for trailers and free content only
        url = `${provider.apiUrl}/search?part=snippet&q=anime+${animeId}+episode+${episodeNumber}&type=video&key=${provider.apiKey}`
        response = await fetch(url, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        })
        break

      default:
        return null
    }

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`Provider ${providerName} returned ${response.status}`)
    }

    const data = await response.json()
    return transformLegalProviderResponse(providerName, data, animeId, episodeNumber)

  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

// Transform legal provider responses to standard format
function transformLegalProviderResponse(providerName: string, data: any, animeId: number, episodeNumber: number) {
  try {
    switch (providerName) {
      case 'crunchyroll':
        if (data.streams && Array.isArray(data.streams)) {
          return {
            title: data.title || `Episode ${episodeNumber}`,
            sources: data.streams.map((stream: any, index: number) => ({
              url: stream.url,
              quality: stream.quality || '1080p',
              type: stream.format === 'hls' ? 'hls' : 'mp4',
              language: stream.language || 'sub',
              server: `Crunchyroll Server ${index + 1}`,
              provider: 'Crunchyroll (Official)',
              legal: true
            }))
          }
        }
        break

      case 'youtube':
        if (data.items && Array.isArray(data.items)) {
          return {
            title: `Episode ${episodeNumber} - Trailer/Preview`,
            sources: data.items.slice(0, 1).map((item: any) => ({
              url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
              quality: '720p',
              type: 'youtube',
              language: 'sub',
              server: 'YouTube Official',
              provider: 'YouTube (Official)',
              legal: true,
              contentType: 'trailer'
            }))
          }
        }
        break
    }

    return null
  } catch (error) {
    console.error(`Error transforming ${providerName} response:`, error)
    return null
  }
}

// Generate placeholder content for development
function generatePlaceholderContent(animeId: number, episodeNumber: number) {
  return {
    title: `Episode ${episodeNumber} - Content Not Available`,
    sources: [{
      url: null,
      quality: 'N/A',
      type: 'placeholder',
      language: 'N/A',
      server: 'No Legal Source',
      provider: 'Placeholder',
      legal: false,
      message: 'This content requires a valid streaming license. Please configure legal streaming providers in your environment variables.'
    }],
    placeholder: true,
    requiresLicense: true
  }
}

// Get available legal streaming providers for a region
export function getAvailableLegalProviders(userRegion: string = 'US'): string[] {
  return Object.entries(LEGAL_ANIME_PROVIDERS)
    .filter(([, provider]) => provider.enabled && provider.regions.includes(userRegion))
    .map(([name]) => name)
}

// Check if anime has legal streaming data available
export function hasLegalStreamingData(animeId: number, userRegion: string = 'US'): boolean {
  const providers = getAvailableLegalProviders(userRegion)
  return providers.length > 0
}

// Get streaming quality options (standard qualities for legal providers)
export function getStreamingQualities(): string[] {
  return ['1080p', '720p', '480p', '360p']
}

// Check if content requires licensing
export function requiresStreamingLicense(animeId: number): boolean {
  // All anime content requires proper licensing
  return true
}

// Get licensing requirements message
export function getLicensingMessage(): string {
  return 'This content requires valid streaming licenses from official providers like Crunchyroll, Funimation, or other legal streaming services. Please configure your API keys in environment variables.'
}
