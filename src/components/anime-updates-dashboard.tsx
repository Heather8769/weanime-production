'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Database, 
  RefreshCw, 
  Plus, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Play,
  Pause
} from 'lucide-react'

interface UpdateStats {
  totalChecked: number
  newAnime: number
  newEpisodes: number
  metadataUpdates: number
  errors: number
  lastUpdate: string
}

interface UpdateStatus {
  isUpdating: boolean
  nextUpdate: string
}

interface RecentUpdate {
  id: number
  title: string
  type: 'anime' | 'episode'
  updatedAt: string
  status?: string
}

export function AnimeUpdatesDashboard() {
  const [updateStats, setUpdateStats] = useState<UpdateStats | null>(null)
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null)
  const [recentUpdates, setRecentUpdates] = useState<RecentUpdate[]>([])
  const [newReleases, setNewReleases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)

  useEffect(() => {
    loadDashboardData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadDashboardData = async () => {
    try {
      // Load overview data
      const overviewResponse = await fetch('/api/anime-updates')
      if (overviewResponse.ok) {
        const overviewData = await overviewResponse.json()
        setUpdateStatus(overviewData.overview.updateStatus)
        if (overviewData.overview.lastUpdate) {
          setUpdateStats(overviewData.overview.lastUpdate)
        }
      }

      // Load recent updates
      const recentResponse = await fetch('/api/anime-updates?type=recent')
      if (recentResponse.ok) {
        const recentData = await recentResponse.json()
        const combined = [
          ...recentData.recentAnime.map((anime: any) => ({
            id: anime.id,
            title: anime.title_english || anime.title_romaji,
            type: 'anime' as const,
            updatedAt: anime.updated_at,
            status: anime.status
          })),
          ...recentData.recentEpisodes.map((episode: any) => ({
            id: episode.id,
            title: `${episode.anime_metadata.title_english || episode.anime_metadata.title_romaji} - Episode ${episode.episode_number}`,
            type: 'episode' as const,
            updatedAt: episode.air_date
          }))
        ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        
        setRecentUpdates(combined.slice(0, 20))
      }

      // Load new releases
      const releasesResponse = await fetch('/api/anime-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check_new_releases' })
      })
      if (releasesResponse.ok) {
        const releasesData = await releasesResponse.json()
        setNewReleases(releasesData.newReleases || [])
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const triggerUpdate = async () => {
    setTriggering(true)
    try {
      const response = await fetch('/api/anime-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger_update' })
      })

      if (response.ok) {
        const data = await response.json()
        setUpdateStats(data.stats)
        
        // Reload data after update
        setTimeout(loadDashboardData, 2000)
      }
    } catch (error) {
      console.error('Failed to trigger update:', error)
    } finally {
      setTriggering(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FINISHED': return 'bg-green-500'
      case 'RELEASING': return 'bg-blue-500'
      case 'NOT_YET_RELEASED': return 'bg-yellow-500'
      case 'CANCELLED': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `${diffDays}d ago`
    if (diffHours > 0) return `${diffHours}h ago`
    return 'Just now'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading anime updates...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Database className="h-6 w-6 mr-2" />
            Anime Database Updates
          </h2>
          <p className="text-muted-foreground">
            Manage anime content and episode updates from Crunchyroll
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={loadDashboardData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={triggerUpdate} 
            disabled={triggering || updateStatus?.isUpdating}
          >
            {triggering ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Updating...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Trigger Update
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="h-4 w-4 mr-2 text-blue-500" />
              Update Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {updateStatus?.isUpdating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span className="text-sm">Updating...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Idle</span>
                </>
              )}
            </div>
            {updateStatus?.nextUpdate && (
              <p className="text-xs text-muted-foreground mt-1">
                Next: {formatTimeAgo(updateStatus.nextUpdate)}
              </p>
            )}
          </CardContent>
        </Card>

        {updateStats && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Plus className="h-4 w-4 mr-2 text-green-500" />
                  New Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {updateStats.newAnime + updateStats.newEpisodes}
                </div>
                <p className="text-xs text-muted-foreground">
                  {updateStats.newAnime} anime, {updateStats.newEpisodes} episodes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2 text-blue-500" />
                  Updates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{updateStats.metadataUpdates}</div>
                <p className="text-xs text-muted-foreground">
                  Metadata updates
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
                  Errors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{updateStats.errors}</div>
                <p className="text-xs text-muted-foreground">
                  Last update cycle
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Tabs defaultValue="recent" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recent">Recent Updates</TabsTrigger>
          <TabsTrigger value="releases">New Releases</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-4">
          <h3 className="text-lg font-semibold">Recent Database Updates</h3>
          
          {recentUpdates.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No recent updates found
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentUpdates.map((update) => (
                <Card key={`${update.type}-${update.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {update.type === 'anime' ? (
                          <Database className="h-5 w-5 text-blue-500" />
                        ) : (
                          <Play className="h-5 w-5 text-green-500" />
                        )}
                        <div>
                          <div className="font-medium">{update.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {update.type === 'anime' ? 'Anime Series' : 'Episode'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          {formatTimeAgo(update.updatedAt)}
                        </div>
                        {update.status && (
                          <Badge className={`${getStatusColor(update.status)} text-white text-xs`}>
                            {update.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="releases" className="space-y-4">
          <h3 className="text-lg font-semibold">New Releases (Last 7 Days)</h3>
          
          {newReleases.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No new releases in the last 7 days
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {newReleases.map((release) => (
                <Card key={release.episodeId}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-5 w-5 text-purple-500" />
                        <div>
                          <div className="font-medium">{release.anime.title}</div>
                          <div className="text-sm text-muted-foreground">
                            Episode {release.episodeNumber}
                            {release.episodeTitle && ` - ${release.episodeTitle}`}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          {new Date(release.airDate).toLocaleDateString()}
                        </div>
                        <Badge className={`${getStatusColor(release.anime.status)} text-white text-xs`}>
                          {release.anime.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          {updateStats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Last Update Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Total Checked</span>
                      <span className="text-sm">{updateStats.totalChecked}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">New Anime</span>
                      <span className="text-sm">{updateStats.newAnime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">New Episodes</span>
                      <span className="text-sm">{updateStats.newEpisodes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Metadata Updates</span>
                      <span className="text-sm">{updateStats.metadataUpdates}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Errors</span>
                      <span className="text-sm">{updateStats.errors}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Update Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium">Last Update</span>
                      <div className="text-sm text-muted-foreground">
                        {new Date(updateStats.lastUpdate).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Update Frequency</span>
                      <div className="text-sm text-muted-foreground">
                        Every 6 hours
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Data Sources</span>
                      <div className="text-sm text-muted-foreground">
                        Crunchyroll, AniList, MyAnimeList
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No update statistics available
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
