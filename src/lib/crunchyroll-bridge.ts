// ⚠️ DEPRECATED: This file contains critical security vulnerabilities
// 🚨 SECURITY ALERT: This implementation uses spawn('curl') which is vulnerable to command injection
//
// This file has been replaced with a secure implementation.
// Please migrate to: import { SecureCrunchyrollBridge } from './crunchyroll-bridge-secure'
//
// Security issues fixed in the new implementation:
// - Command injection via spawn('curl')
// - Credential exposure in process arguments
// - Missing input validation
// - No timeout handling
// - Resource leaks from unmanaged processes

import { SecureCrunchyrollBridge } from './crunchyroll-bridge-secure'

// Re-export types for backward compatibility
export interface CrunchyrollEpisodeInfo {
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

export interface CrunchyrollStreamingSource {
  url: string
  quality: string
  type: 'hls' | 'dash'
  language: string
  subtitles?: SubtitleTrack[]
}

export interface SubtitleTrack {
  language: string
  url: string
  format: 'vtt' | 'srt'
}

export interface CrunchyrollSeries {
  id: string
  title: string
  description: string
  poster_tall?: string
  poster_wide?: string
  episodes: CrunchyrollEpisodeInfo[]
  total_episodes: number
}

/**
 * @deprecated SECURITY VULNERABILITY - DO NOT USE
 * This class contains critical security vulnerabilities and should not be used.
 * Use SecureCrunchyrollBridge from './crunchyroll-bridge-secure' instead.
 *
 * Security issues:
 * - Command injection via spawn('curl')
 * - Credential exposure in process arguments
 * - Missing input validation
 * - No timeout handling
 */
export class CrunchyrollBridge {
  private secureImplementation: SecureCrunchyrollBridge

  constructor(bridgeUrl: string = 'http://localhost:8081') {
    console.error('🚨 SECURITY WARNING: CrunchyrollBridge is deprecated due to security vulnerabilities!')
    console.error('🔒 Please migrate to SecureCrunchyrollBridge from "./crunchyroll-bridge-secure"')
    console.error('⚠️  This implementation will be removed in a future version')
    
    // Use secure implementation internally
    this.secureImplementation = new SecureCrunchyrollBridge(bridgeUrl)
  }

  /**
   * Test connection to the bridge service
   * @deprecated Use SecureCrunchyrollBridge instead
   */
  async testConnection(): Promise<boolean> {
    console.warn('🚨 DEPRECATED: testConnection() - Use SecureCrunchyrollBridge instead')
    return this.secureImplementation.testConnection()
  }

  /**
   * Login to Crunchyroll through the bridge
   * @deprecated Use SecureCrunchyrollBridge instead
   */
  async login(email: string, password: string): Promise<boolean> {
    console.warn('🚨 DEPRECATED: login() - Use SecureCrunchyrollBridge instead')
    return this.secureImplementation.login(email, password)
  }

  /**
   * Search for anime series
   * @deprecated Use SecureCrunchyrollBridge instead
   */
  async searchSeries(query: string): Promise<CrunchyrollSeries[]> {
    console.warn('🚨 DEPRECATED: searchSeries() - Use SecureCrunchyrollBridge instead')
    return this.secureImplementation.searchSeries(query)
  }

  /**
   * Get series information
   * @deprecated Use SecureCrunchyrollBridge instead
   */
  async getSeriesInfo(seriesId: string): Promise<CrunchyrollSeries | null> {
    console.warn('🚨 DEPRECATED: getSeriesInfo() - Use SecureCrunchyrollBridge instead')
    return this.secureImplementation.getSeriesInfo(seriesId)
  }

  /**
   * Get episode information
   * @deprecated Use SecureCrunchyrollBridge instead
   */
  async getEpisodeInfo(episodeId: string): Promise<CrunchyrollEpisodeInfo | null> {
    console.warn('🚨 DEPRECATED: getEpisodeInfo() - Use SecureCrunchyrollBridge instead')
    return this.secureImplementation.getEpisodeInfo(episodeId)
  }

  /**
   * Get streaming sources for an episode
   * @deprecated Use SecureCrunchyrollBridge instead
   */
  async getStreamingSources(episodeId: string): Promise<CrunchyrollStreamingSource[]> {
    console.warn('🚨 DEPRECATED: getStreamingSources() - Use SecureCrunchyrollBridge instead')
    return this.secureImplementation.getStreamingSources(episodeId)
  }
}

// Export default instance with deprecation warning
console.warn('🚨 SECURITY WARNING: Default CrunchyrollBridge export is deprecated!')
console.warn('🔒 Use: import { SecureCrunchyrollBridge } from "./crunchyroll-bridge-secure"')

/**
 * @deprecated SECURITY VULNERABILITY - Use SecureCrunchyrollBridge instead
 * This default export maintains backward compatibility but uses the secure implementation internally.
 * Please migrate to SecureCrunchyrollBridge directly.
 */
const legacyBridgeInstance = new CrunchyrollBridge()
export default legacyBridgeInstance

// Export the secure implementation for easy migration
export { SecureCrunchyrollBridge } from './crunchyroll-bridge-secure'