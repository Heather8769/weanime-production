import { spawn } from 'child_process'
import { promisify } from 'util'

interface CrunchyrollEpisodeInfo {
  id: string
  title: string
  episode_number: number
  season_number: number
  series_title: string
  description: string
  duration_ms: number
  thumbnail?: string
  subtitles: SubtitleTrack[]
  audio_locale: string
}

interface CrunchyrollStreamingSource {
  url: string
  quality: string
  type: 'hls' | 'dash'
  language: string
  subtitles?: SubtitleTrack[]
}

interface SubtitleTrack {
  language: string
  url: string
  format: 'vtt' | 'srt'
}

interface CrunchyrollSeries {
  id: string
  title: string
  description: string
  poster_tall?: string
  poster_wide?: string
  episodes: CrunchyrollEpisodeInfo[]
  total_episodes: number
}

/**
 * Crunchyroll Bridge Client
 * Communicates with the Rust-based Crunchyroll bridge service
 */
export class CrunchyrollBridge {
  private bridgeUrl: string
  private maxRetries: number = 3

  constructor(bridgeUrl: string = 'http://localhost:8081') {
    this.bridgeUrl = bridgeUrl
  }

  /**
   * Execute a command on the Crunchyroll bridge service
   */
  private async executeBridgeCommand(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn('curl', [
        '-X', 'POST',
        '-H', 'Content-Type: application/json',
        '-d', JSON.stringify({ command: args }),
        `${this.bridgeUrl}/execute`
      ])

      let output = ''
      let error = ''

      process.stdout.on('data', (data) => {
        output += data.toString()
      })

      process.stderr.on('data', (data) => {
        error += data.toString()
      })

      process.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim())
        } else {
          reject(new Error(`Bridge command failed: ${error}`))
        }
      })
    })
  }

  /**
   * Test connection to the bridge service
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.executeBridgeCommand(['health'])
      return true
    } catch (error) {
      console.error('Bridge connection test failed:', error)
      return false
    }
  }

  /**
   * Login to Crunchyroll through the bridge
   */
  async login(email: string, password: string): Promise<boolean> {
    try {
      const result = await this.executeBridgeCommand(['login', email, password])
      return result.includes('success')
    } catch (error) {
      console.error('Bridge login failed:', error)
      return false
    }
  }

  /**
   * Search for anime series
   */
  async searchSeries(query: string): Promise<CrunchyrollSeries[]> {
    try {
      const output = await this.executeBridgeCommand(['search', query])
      const searchResults = JSON.parse(output)
      return searchResults.series || []
    } catch (error) {
      console.error('Bridge search failed:', error)
      return []
    }
  }

  /**
   * Get series information
   */
  async getSeriesInfo(seriesId: string): Promise<CrunchyrollSeries | null> {
    try {
      const output = await this.executeBridgeCommand(['series', seriesId])
      const seriesData = JSON.parse(output)
      return seriesData
    } catch (error) {
      console.error('Failed to get series info:', error)
      return null
    }
  }

  /**
   * Get episode information
   */
  async getEpisodeInfo(episodeId: string): Promise<CrunchyrollEpisodeInfo | null> {
    try {
      const output = await this.executeBridgeCommand(['episode', episodeId])
      
      // Parse actual Crunchyroll response
      if (output && output.length > 0) {
        const episodeData = JSON.parse(output)
        return {
          id: episodeData.id || episodeId,
          title: episodeData.title || 'Crunchyroll Episode',
          episode_number: episodeData.episode_number || 1,
          season_number: episodeData.season_number || 1,
          series_title: episodeData.series_title || 'Crunchyroll Series',
          description: episodeData.description || 'Episode from Crunchyroll',
          duration_ms: episodeData.duration_ms || 1440000,
          thumbnail: episodeData.thumbnail || null,
          subtitles: [],
          audio_locale: 'en-US'
        }
      } else {
        return null
      }
    } catch (error) {
      console.error('Failed to get episode info:', error)
      return null
    }
  }

  /**
   * Get streaming sources for an episode
   */
  async getStreamingSources(episodeId: string): Promise<CrunchyrollStreamingSource[]> {
    try {
      const output = await this.executeBridgeCommand(['stream', episodeId])
      const streamData = JSON.parse(output)
      
      if (streamData.sources && Array.isArray(streamData.sources)) {
        return streamData.sources.map((source: any) => ({
          url: source.url,
          quality: source.quality || '1080p',
          type: source.type || 'hls',
          language: source.language || 'en-US',
          subtitles: source.subtitles || []
        }))
      }
      
      return []
    } catch (error) {
      console.error('Failed to get streaming sources:', error)
      return []
    }
  }
}

// Export default instance
export default new CrunchyrollBridge()