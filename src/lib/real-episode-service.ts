import type { Episode, VideoSource, Subtitle, WatchProgress } from './watch-store'

/**
 * Episode Service - Handles episode data fetching and management
 * Integrates with backend streaming services and provides fallback data
 */

interface EpisodeWithProgress {
  episode: Episode
  animeId: number
  progress: WatchProgress
}

/**
 * Get episodes for an anime from backend or fallback data
 * @param animeId - The AniList anime ID
 * @param fallbackEpisodeCount - Fallback episode count if backend fails
 * @returns Array of episodes
 */
export async function getAnimeEpisodes(animeId: number, fallbackEpisodeCount?: number): Promise<Episode[]> {
  try {
    console.log(`Episode service: Getting episodes for anime ${animeId}`)
    
    // Try to get episodes from backend first
    const backendResponse = await fetch(`/api/backend/episodes?animeId=${animeId}`)
    
    if (backendResponse.ok) {
      const backendData = await backendResponse.json()
      
      if (backendData.success && backendData.data && Array.isArray(backendData.data)) {
        console.log(`Episode service: Found ${backendData.data.length} episodes from backend`)
        
        // Convert backend episodes to our Episode format
        const episodes: Episode[] = backendData.data.map((ep: any, index: number) => ({
          id: ep.id || `${animeId}-${index + 1}`,
          number: ep.number || index + 1,
          title: ep.title || `Episode ${ep.number || index + 1}`,
          description: ep.description || ep.synopsis,
          thumbnail: ep.image || ep.thumbnail,
          duration: ep.duration || 1440, // 24 minutes default
          sources: [], // Will be populated when needed
          subtitles: [],
          airDate: ep.airDate || ep.releaseDate,
          streamingId: ep.streamingId || ep.id,
          isReal: true,
          source: 'backend'
        }))
        
        return episodes
      }
    }
    
    console.log('Episode service: Backend failed, generating fallback episodes')
    
    // Fallback: Generate episodes based on episode count
    const episodeCount = fallbackEpisodeCount || 12 // Default to 12 episodes
    const episodes: Episode[] = []
    
    for (let i = 1; i <= episodeCount; i++) {
      episodes.push({
        id: `${animeId}-${i}`,
        number: i,
        title: `Episode ${i}`,
        description: `Episode ${i} of this anime series.`,
        thumbnail: undefined,
        duration: 1440, // 24 minutes
        sources: [],
        subtitles: [],
        isReal: false,
        source: 'fallback'
      })
    }
    
    console.log(`Episode service: Generated ${episodes.length} fallback episodes`)
    return episodes
    
  } catch (error) {
    console.error('Episode service: Error getting episodes:', error)
    
    // Emergency fallback
    const episodeCount = fallbackEpisodeCount || 12
    const episodes: Episode[] = []
    
    for (let i = 1; i <= episodeCount; i++) {
      episodes.push({
        id: `${animeId}-${i}`,
        number: i,
        title: `Episode ${i}`,
        description: `Episode ${i} of this anime series.`,
        thumbnail: undefined,
        duration: 1440, // 24 minutes
        sources: [],
        subtitles: [],
        isReal: false,
        source: 'fallback'
      })
    }
    
    return episodes
  }
}

/**
 * Get the next episode to watch based on user progress
 * @param animeId - The AniList anime ID
 * @param watchProgress - Map of watch progress
 * @returns Next episode to watch or null
 */
export async function getNextEpisodeToWatch(animeId: number, watchProgress: Map<string, WatchProgress>): Promise<Episode | null> {
  try {
    console.log(`Episode service: Finding next episode for anime ${animeId}`)
    
    // Get all episodes for this anime
    const episodes = await getAnimeEpisodes(animeId)
    
    if (episodes.length === 0) {
      return null
    }
    
    // Get progress for this anime
    const animeProgress = Array.from(watchProgress.values())
      .filter(p => p.animeId === animeId)
      .sort((a, b) => b.episodeNumber - a.episodeNumber) // Sort by episode number descending
    
    if (animeProgress.length === 0) {
      // No progress, return first episode
      return episodes[0]
    }
    
    // Find the last watched episode
    const lastWatched = animeProgress[0]
    
    if (lastWatched.completed) {
      // Last episode was completed, find next episode
      const nextEpisodeNumber = lastWatched.episodeNumber + 1
      const nextEpisode = episodes.find(ep => ep.number === nextEpisodeNumber)
      
      if (nextEpisode) {
        return nextEpisode
      } else {
        // No next episode, return last episode for rewatching
        return episodes.find(ep => ep.number === lastWatched.episodeNumber) || episodes[episodes.length - 1]
      }
    } else {
      // Last episode was not completed, continue from there
      return episodes.find(ep => ep.number === lastWatched.episodeNumber) || episodes[0]
    }
    
  } catch (error) {
    console.error('Episode service: Error finding next episode:', error)
    
    // Fallback to first episode
    const episodes = await getAnimeEpisodes(animeId)
    return episodes.length > 0 ? episodes[0] : null
  }
}

/**
 * Get an episode with enhanced video sources from streaming services
 * @param animeId - The AniList anime ID
 * @param episodeNumber - Episode number
 * @returns Episode with video sources or null
 */
export async function getEpisodeWithVideoSources(animeId: number, episodeNumber: number): Promise<Episode | null> {
  try {
    console.log(`Episode service: Getting video sources for anime ${animeId}, episode ${episodeNumber}`)
    
    // Try to get real streaming sources
    const streamingResponse = await fetch(`/api/real-streaming?animeId=${animeId}&episode=${episodeNumber}`)
    
    if (streamingResponse.ok) {
      const streamingData = await streamingResponse.json()
      
      if (streamingData.success && streamingData.data) {
        console.log(`Episode service: Found real streaming sources for episode ${episodeNumber}`)
        
        const episodeData = streamingData.data
        
        // Convert to our Episode format
        const episode: Episode = {
          id: episodeData.id || `${animeId}-${episodeNumber}`,
          number: episodeNumber,
          title: episodeData.title || `Episode ${episodeNumber}`,
          description: episodeData.description || episodeData.synopsis,
          thumbnail: episodeData.thumbnail || episodeData.image,
          duration: episodeData.duration || 1440,
          sources: episodeData.sources || [],
          subtitles: episodeData.subtitles || [],
          skipTimes: episodeData.skipTimes,
          airDate: episodeData.airDate,
          streamingId: episodeData.streamingId || episodeData.id,
          isReal: true,
          source: 'streaming'
        }
        
        return episode
      }
    }
    
    console.log(`Episode service: No real sources found for anime ${animeId} episode ${episodeNumber}`)
    
    // No fallback - return null when real content is unavailable
    return null
    
  } catch (error) {
    console.error('Episode service: Error getting video sources:', error)
    
    // No fallback content - return null when real content is unavailable
    console.error(`Episode service: Failed to get real episode for anime ${animeId} episode ${episodeNumber}:`, error)
    return null
  }
}

/**
 * Get recently watched episodes with their progress
 * @param watchProgress - Map of watch progress
 * @param limit - Maximum number of episodes to return
 * @returns Array of episodes with progress
 */
export async function getRecentlyWatchedEpisodes(watchProgress: Map<string, WatchProgress>, limit: number = 10): Promise<EpisodeWithProgress[]> {
  try {
    console.log(`Episode service: Getting ${limit} recently watched episodes`)
    
    // Convert progress map to array and sort by last watched
    const progressArray = Array.from(watchProgress.values())
      .sort((a, b) => {
        const aTime = a.lastWatched instanceof Date ? a.lastWatched.getTime() : new Date(a.lastWatched).getTime()
        const bTime = b.lastWatched instanceof Date ? b.lastWatched.getTime() : new Date(b.lastWatched).getTime()
        return bTime - aTime
      })
      .slice(0, limit)
    
    const recentEpisodes: EpisodeWithProgress[] = []
    
    // Get episode details for each progress entry
    for (const progress of progressArray) {
      try {
        // Get episodes for this anime
        const episodes = await getAnimeEpisodes(progress.animeId)
        const episode = episodes.find(ep => ep.id === progress.episodeId || ep.number === progress.episodeNumber)
        
        if (episode) {
          recentEpisodes.push({
            episode,
            animeId: progress.animeId,
            progress
          })
        }
      } catch (error) {
        console.error(`Episode service: Error getting episode details for ${progress.animeId}:${progress.episodeId}`, error)
        
        // Create fallback episode
        const fallbackEpisode: Episode = {
          id: progress.episodeId,
          number: progress.episodeNumber,
          title: `Episode ${progress.episodeNumber}`,
          description: `Episode ${progress.episodeNumber} of this anime series.`,
          thumbnail: undefined,
          duration: progress.duration || 1440,
          sources: [],
          subtitles: [],
          isReal: false,
          source: 'fallback'
        }
        
        recentEpisodes.push({
          episode: fallbackEpisode,
          animeId: progress.animeId,
          progress
        })
      }
    }
    
    console.log(`Episode service: Found ${recentEpisodes.length} recent episodes`)
    return recentEpisodes
    
  } catch (error) {
    console.error('Episode service: Error getting recent episodes:', error)
    return []
  }
}

/**
 * Helper function to validate episode data
 * @param episode - Episode to validate
 * @returns Whether the episode is valid
 */
export function validateEpisode(episode: any): episode is Episode {
  return (
    episode &&
    typeof episode.id === 'string' &&
    typeof episode.number === 'number' &&
    typeof episode.title === 'string' &&
    typeof episode.duration === 'number' &&
    Array.isArray(episode.sources) &&
    Array.isArray(episode.subtitles)
  )
}

// createFallbackEpisode function removed - zero tolerance for mock/demo content
// Components should handle null return values and show appropriate error messages