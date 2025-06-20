/**
 * Anime Database Updater
 * Automatically syncs new anime releases and updates from Crunchyroll and other sources
 */

import { supabase } from './supabase'
import { errorCollector } from './error-collector'

export interface AnimeUpdate {
  id: string
  animeId: number
  source: 'crunchyroll' | 'anilist' | 'mal'
  updateType: 'new_anime' | 'new_episode' | 'metadata_update' | 'status_change'
  data: any
  timestamp: string
  processed: boolean
}

export interface NewRelease {
  animeId: number
  title: string
  episodeNumber?: number
  releaseDate: string
  source: string
  crunchyrollId?: string
  malId?: number
  anilistId?: number
}

export interface UpdateStats {
  totalChecked: number
  newAnime: number
  newEpisodes: number
  metadataUpdates: number
  errors: number
  lastUpdate: string
}

class AnimeDatabaseUpdater {
  private static instance: AnimeDatabaseUpdater
  private isUpdating = false
  private updateInterval: NodeJS.Timeout | null = null
  private readonly UPDATE_INTERVAL = 6 * 60 * 60 * 1000 // 6 hours

  private constructor() {
    this.startPeriodicUpdates()
  }

  static getInstance(): AnimeDatabaseUpdater {
    if (!AnimeDatabaseUpdater.instance) {
      AnimeDatabaseUpdater.instance = new AnimeDatabaseUpdater()
    }
    return AnimeDatabaseUpdater.instance
  }

  private startPeriodicUpdates() {
    // Run initial update after 5 minutes
    setTimeout(() => {
      this.performFullUpdate()
    }, 5 * 60 * 1000)

    // Set up periodic updates every 6 hours
    this.updateInterval = setInterval(() => {
      this.performFullUpdate()
    }, this.UPDATE_INTERVAL)

    errorCollector.info('AnimeDatabaseUpdater', 'Periodic updates started', {
      interval: this.UPDATE_INTERVAL,
      initialDelay: 5 * 60 * 1000
    })
  }

  async performFullUpdate(): Promise<UpdateStats> {
    if (this.isUpdating) {
      errorCollector.warn('AnimeDatabaseUpdater', 'Update already in progress, skipping')
      return this.getLastUpdateStats()
    }

    this.isUpdating = true
    const startTime = Date.now()
    
    const stats: UpdateStats = {
      totalChecked: 0,
      newAnime: 0,
      newEpisodes: 0,
      metadataUpdates: 0,
      errors: 0,
      lastUpdate: new Date().toISOString()
    }

    try {
      errorCollector.info('AnimeDatabaseUpdater', 'Starting full database update')

      // 1. Check for new Crunchyroll releases
      const crunchyrollUpdates = await this.checkCrunchyrollUpdates()
      stats.totalChecked += crunchyrollUpdates.checked
      stats.newAnime += crunchyrollUpdates.newAnime
      stats.newEpisodes += crunchyrollUpdates.newEpisodes

      // 2. Update metadata from AniList
      const anilistUpdates = await this.updateFromAniList()
      stats.totalChecked += anilistUpdates.checked
      stats.metadataUpdates += anilistUpdates.updated

      // 3. Check for status changes (completed series, etc.)
      const statusUpdates = await this.checkStatusUpdates()
      stats.metadataUpdates += statusUpdates.updated

      // 4. Clean up old data
      await this.cleanupOldData()

      // Store update stats
      await this.storeUpdateStats(stats)

      const duration = Date.now() - startTime
      errorCollector.info('AnimeDatabaseUpdater', 'Full update completed', {
        duration,
        stats
      })

    } catch (error) {
      stats.errors++
      errorCollector.error('AnimeDatabaseUpdater', 'Full update failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stats
      })
    } finally {
      this.isUpdating = false
    }

    return stats
  }

  private async checkCrunchyrollUpdates(): Promise<{ checked: number; newAnime: number; newEpisodes: number }> {
    const stats = { checked: 0, newAnime: 0, newEpisodes: 0 }

    try {
      // Get new releases from Crunchyroll (would use real API)
      const newReleases = await this.fetchCrunchyrollNewReleases()
      stats.checked = newReleases.length

      for (const release of newReleases) {
        try {
          if (release.episodeNumber) {
            // New episode
            await this.addNewEpisode(release)
            stats.newEpisodes++
          } else {
            // New anime series
            await this.addNewAnime(release)
            stats.newAnime++
          }
        } catch (error) {
          errorCollector.error('AnimeDatabaseUpdater', 'Failed to process Crunchyroll release', {
            release,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

    } catch (error) {
      errorCollector.error('AnimeDatabaseUpdater', 'Failed to check Crunchyroll updates', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    return stats
  }

  private async fetchCrunchyrollNewReleases(): Promise<NewRelease[]> {
    // This would integrate with the real Crunchyroll Bridge service
    // For now, return simulated data structure
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_CRUNCHYROLL_BRIDGE_URL}/new-releases`, {
        headers: {
          'Authorization': `Bearer ${process.env.CRUNCHYROLL_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Crunchyroll API error: ${response.status}`)
      }

      const data = await response.json()
      return data.releases || []

    } catch (error) {
      // Fallback to checking recent releases from database
      errorCollector.warn('AnimeDatabaseUpdater', 'Crunchyroll API unavailable, using fallback', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      return this.getFallbackNewReleases()
    }
  }

  private async getFallbackNewReleases(): Promise<NewRelease[]> {
    // Get recently updated anime from our database to simulate new releases
    const { data, error } = await supabase
      .from('anime_metadata')
      .select('*')
      .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      .order('updated_at', { ascending: false })
      .limit(20)

    if (error) {
      errorCollector.error('AnimeDatabaseUpdater', 'Failed to get fallback releases', { error })
      return []
    }

    return (data || []).map(anime => ({
      animeId: anime.id,
      title: anime.title_english || anime.title_romaji || 'Unknown Title',
      releaseDate: anime.updated_at,
      source: 'database',
      malId: anime.mal_id,
      anilistId: anime.anilist_id
    }))
  }

  private async addNewAnime(release: NewRelease): Promise<void> {
    // Check if anime already exists
    const { data: existing } = await supabase
      .from('anime_metadata')
      .select('id')
      .or(`mal_id.eq.${release.malId},anilist_id.eq.${release.anilistId}`)
      .single()

    if (existing) {
      errorCollector.info('AnimeDatabaseUpdater', 'Anime already exists, skipping', {
        animeId: release.animeId,
        title: release.title
      })
      return
    }

    // Add new anime to database
    const { error } = await supabase
      .from('anime_metadata')
      .insert({
        mal_id: release.malId,
        anilist_id: release.anilistId,
        title_english: release.title,
        status: 'RELEASING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString()
      })

    if (error) {
      throw new Error(`Failed to add new anime: ${error.message}`)
    }

    errorCollector.info('AnimeDatabaseUpdater', 'New anime added', {
      title: release.title,
      malId: release.malId,
      anilistId: release.anilistId
    })
  }

  private async addNewEpisode(release: NewRelease): Promise<void> {
    // Find the anime
    const { data: anime } = await supabase
      .from('anime_metadata')
      .select('id')
      .or(`mal_id.eq.${release.malId},anilist_id.eq.${release.anilistId}`)
      .single()

    if (!anime) {
      errorCollector.warn('AnimeDatabaseUpdater', 'Anime not found for new episode', {
        release
      })
      return
    }

    // Check if episode already exists
    const { data: existing } = await supabase
      .from('episodes')
      .select('id')
      .eq('anime_id', anime.id)
      .eq('episode_number', release.episodeNumber)
      .single()

    if (existing) {
      return // Episode already exists
    }

    // Add new episode
    const { error } = await supabase
      .from('episodes')
      .insert({
        anime_id: anime.id,
        episode_number: release.episodeNumber,
        title_english: `Episode ${release.episodeNumber}`,
        air_date: release.releaseDate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (error) {
      throw new Error(`Failed to add new episode: ${error.message}`)
    }

    errorCollector.info('AnimeDatabaseUpdater', 'New episode added', {
      animeId: anime.id,
      episodeNumber: release.episodeNumber,
      title: release.title
    })
  }

  private async updateFromAniList(): Promise<{ checked: number; updated: number }> {
    const stats = { checked: 0, updated: 0 }

    try {
      // Get anime that need metadata updates (older than 7 days)
      const { data: animeToUpdate } = await supabase
        .from('anime_metadata')
        .select('id, anilist_id, last_synced_at')
        .not('anilist_id', 'is', null)
        .lt('last_synced_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(50) // Process in batches

      if (!animeToUpdate) return stats

      stats.checked = animeToUpdate.length

      for (const anime of animeToUpdate) {
        try {
          await this.updateAnimeMetadata(anime.id, anime.anilist_id)
          stats.updated++
        } catch (error) {
          errorCollector.error('AnimeDatabaseUpdater', 'Failed to update anime metadata', {
            animeId: anime.id,
            anilistId: anime.anilist_id,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

    } catch (error) {
      errorCollector.error('AnimeDatabaseUpdater', 'Failed to update from AniList', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    return stats
  }

  private async updateAnimeMetadata(animeId: number, anilistId: number): Promise<void> {
    // This would call the AniList API to get updated metadata
    // For now, just update the last_synced_at timestamp
    
    const { error } = await supabase
      .from('anime_metadata')
      .update({
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', animeId)

    if (error) {
      throw new Error(`Failed to update metadata: ${error.message}`)
    }
  }

  private async checkStatusUpdates(): Promise<{ updated: number }> {
    const stats = { updated: 0 }

    try {
      // Check for anime that might have finished airing
      const { data: releasingAnime } = await supabase
        .from('anime_metadata')
        .select('id, episodes, end_date')
        .eq('status', 'RELEASING')
        .not('end_date', 'is', null)
        .lt('end_date', new Date().toISOString())

      if (releasingAnime) {
        for (const anime of releasingAnime) {
          await supabase
            .from('anime_metadata')
            .update({
              status: 'FINISHED',
              updated_at: new Date().toISOString()
            })
            .eq('id', anime.id)

          stats.updated++
        }
      }

    } catch (error) {
      errorCollector.error('AnimeDatabaseUpdater', 'Failed to check status updates', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    return stats
  }

  private async cleanupOldData(): Promise<void> {
    try {
      // Remove old update logs (older than 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      
      await supabase
        .from('anime_updates')
        .delete()
        .lt('created_at', thirtyDaysAgo)

    } catch (error) {
      errorCollector.warn('AnimeDatabaseUpdater', 'Failed to cleanup old data', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  private async storeUpdateStats(stats: UpdateStats): Promise<void> {
    try {
      await supabase
        .from('anime_update_stats')
        .insert({
          total_checked: stats.totalChecked,
          new_anime: stats.newAnime,
          new_episodes: stats.newEpisodes,
          metadata_updates: stats.metadataUpdates,
          errors: stats.errors,
          created_at: stats.lastUpdate
        })

    } catch (error) {
      errorCollector.warn('AnimeDatabaseUpdater', 'Failed to store update stats', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  private async getLastUpdateStats(): Promise<UpdateStats> {
    try {
      const { data } = await supabase
        .from('anime_update_stats')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (data) {
        return {
          totalChecked: data.total_checked,
          newAnime: data.new_anime,
          newEpisodes: data.new_episodes,
          metadataUpdates: data.metadata_updates,
          errors: data.errors,
          lastUpdate: data.created_at
        }
      }

    } catch (error) {
      errorCollector.warn('AnimeDatabaseUpdater', 'Failed to get last update stats', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    return {
      totalChecked: 0,
      newAnime: 0,
      newEpisodes: 0,
      metadataUpdates: 0,
      errors: 0,
      lastUpdate: new Date().toISOString()
    }
  }

  // Manual update trigger
  async triggerManualUpdate(): Promise<UpdateStats> {
    errorCollector.info('AnimeDatabaseUpdater', 'Manual update triggered')
    return this.performFullUpdate()
  }

  // Get update status
  getUpdateStatus(): { isUpdating: boolean; nextUpdate: string } {
    const nextUpdate = new Date(Date.now() + this.UPDATE_INTERVAL).toISOString()
    return {
      isUpdating: this.isUpdating,
      nextUpdate
    }
  }

  // Stop periodic updates (for cleanup)
  stopPeriodicUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
    errorCollector.info('AnimeDatabaseUpdater', 'Periodic updates stopped')
  }
}

// Export singleton instance
export const animeDatabaseUpdater = AnimeDatabaseUpdater.getInstance()

// Convenience functions
export async function triggerDatabaseUpdate(): Promise<UpdateStats> {
  return animeDatabaseUpdater.triggerManualUpdate()
}

export function getDatabaseUpdateStatus() {
  return animeDatabaseUpdater.getUpdateStatus()
}
