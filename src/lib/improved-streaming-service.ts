// Improved anime streaming service with working APIs and robust error handling
import { fetchLegalAnimeStreams } from './real-anime-apis'

interface AnimeMapping {
  title: string
  alternativeNames: string[]
}

interface StreamingHealth {
  timestamp: string
  services: {
    anilist?: string
    jikan?: string
  }
  overall: string
}

const ENHANCED_ANIME_MAPPINGS: Record<number, AnimeMapping> = {
  1: { title: 'Cowboy Bebop', alternativeNames: ['cowboy-bebop'] },
  20: { title: 'Naruto', alternativeNames: ['naruto'] },
  21: { title: 'One Piece', alternativeNames: ['one-piece'] }
}

const ENHANCED_DEMO_STREAMS = {
  servers: [
    {
      name: "HD Server",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      quality: "1080p",
      type: "mp4"
    },
    {
      name: "Standard Server", 
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      quality: "720p",
      type: "mp4"
    }
  ],
  subtitles: [
    {
      language: "English",
      url: "/api/subtitles?lang=en&episode=1",
      format: "vtt"
    }
  ]
}

class APICircuitBreaker {
  private failures: Map<string, number> = new Map()
  private lastFailure: Map<string, number> = new Map()
  private readonly maxFailures = 3
  private readonly resetTimeout = 300000

  isOpen(apiName: string): boolean {
    const failures = this.failures.get(apiName) || 0
    const lastFailure = this.lastFailure.get(apiName) || 0
    
    if (failures >= this.maxFailures) {
      if (Date.now() - lastFailure > this.resetTimeout) {
        this.failures.set(apiName, 0)
        return false
      }
      return true
    }
    return false
  }

  recordFailure(apiName: string): void {
    const current = this.failures.get(apiName) || 0
    this.failures.set(apiName, current + 1)
    this.lastFailure.set(apiName, Date.now())
  }

  recordSuccess(apiName: string): void {
    this.failures.set(apiName, 0)
  }
}

const circuitBreaker = new APICircuitBreaker()

export async function getEnhancedAnimeStreams(animeId: number, episode: number = 1) {
  console.log(`🎬 Enhanced streaming service: Fetching streams for anime ${animeId}, episode ${episode}`)
  
  const animeMapping = ENHANCED_ANIME_MAPPINGS[animeId]
  const startTime = Date.now()
  
  try {
    if (!circuitBreaker.isOpen('real-apis')) {
      try {
        const realStreams = await Promise.race([
          fetchLegalAnimeStreams(animeId, episode),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Real API timeout')), 5000)
          )
        ]) as any
        
        if (realStreams && realStreams.servers && realStreams.servers.length > 0) {
          circuitBreaker.recordSuccess('real-apis')
          return {
            ...realStreams,
            source: 'real-api',
            responseTime: Date.now() - startTime
          }
        }
      } catch (error) {
        circuitBreaker.recordFailure('real-apis')
      }
    }

    return {
      animeId,
      episode,
      title: animeMapping?.title || `Anime ${animeId}`,
      servers: ENHANCED_DEMO_STREAMS.servers.map((server) => ({
        ...server,
        name: `${server.name} - ${animeMapping?.title || 'Demo'} EP${episode}`
      })),
      subtitles: ENHANCED_DEMO_STREAMS.subtitles,
      source: 'enhanced-demo',
      responseTime: Date.now() - startTime,
      metadata: {
        totalEpisodes: 26,
        duration: "24 minutes",
        status: "Demo Content - Real streaming APIs temporarily unavailable"
      }
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      animeId,
      episode,
      title: `Anime ${animeId}`,
      servers: [{
        name: "Fallback Server",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        quality: "720p",
        type: "mp4"
      }],
      subtitles: [],
      source: 'fallback',
      responseTime: Date.now() - startTime,
      error: errorMessage
    }
  }
}

export async function checkStreamingHealth(): Promise<StreamingHealth> {
  const health: StreamingHealth = {
    timestamp: new Date().toISOString(),
    services: {},
    overall: 'healthy'
  }

  try {
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ Media(id: 1) { id } }' }),
      signal: AbortSignal.timeout(5000)
    })
    health.services.anilist = response.ok ? 'healthy' : 'degraded'
  } catch {
    health.services.anilist = 'down'
  }

  try {
    const response = await fetch('https://api.jikan.moe/v4/anime/1', {
      signal: AbortSignal.timeout(5000)
    })
    health.services.jikan = response.ok ? 'healthy' : 'degraded'
  } catch {
    health.services.jikan = 'down'
  }

  const serviceStates = Object.values(health.services)
  if (serviceStates.every(state => state === 'healthy')) {
    health.overall = 'healthy'
  } else if (serviceStates.some(state => state === 'healthy')) {
    health.overall = 'degraded'
  } else {
    health.overall = 'down'
  }

  return health
}
