'use client'

import { useState, useEffect } from 'react'
import { BackendSearch } from '@/components/backend-search'
import { BackendPlayer } from '@/components/backend-player'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getBackendStatus } from '@/lib/backend-proxy'
import { Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react'

interface BackendStatus {
  available: boolean
  url: string
  error?: string
}

export default function BackendTestPage() {
  const [selectedAnime, setSelectedAnime] = useState<{ title: string; slug: string } | null>(null)
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)

  const checkBackendStatus = async () => {
    setStatusLoading(true)
    try {
      const status = await getBackendStatus()
      setBackendStatus(status)
    } catch (error) {
      setBackendStatus({
        available: false,
        url: 'Unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setStatusLoading(false)
    }
  }

  useEffect(() => {
    checkBackendStatus()
  }, [])

  const handleAnimeSelect = (anime: { title: string; slug: string }) => {
    setSelectedAnime(anime)
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Backend Integration Test</h1>
        <p className="text-muted-foreground">
          Test the integration between Next.js frontend and FastAPI backend
        </p>
      </div>

      {/* Backend Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Backend Status</span>
            <Button
              variant="outline"
              size="sm"
              onClick={checkBackendStatus}
              disabled={statusLoading}
              className="flex items-center gap-2"
            >
              {statusLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statusLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Checking backend status...</span>
            </div>
          ) : backendStatus ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {backendStatus.available ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <Badge variant={backendStatus.available ? 'default' : 'destructive'}>
                  {backendStatus.available ? 'Online' : 'Offline'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {backendStatus.url}
                </span>
              </div>
              {backendStatus.error && (
                <p className="text-sm text-red-600">
                  Error: {backendStatus.error}
                </p>
              )}
              {!backendStatus.available && (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Make sure the backend is running:</p>
                  <code className="block bg-muted p-2 rounded text-xs">
                    cd weanime-backend<br />
                    pip install -r requirements.txt<br />
                    uvicorn main:app --reload --port 8001
                  </code>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle>Search Anime</CardTitle>
        </CardHeader>
        <CardContent>
          <BackendSearch onAnimeSelect={handleAnimeSelect} />
        </CardContent>
      </Card>

      {/* Selected Anime Info */}
      {selectedAnime && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Anime</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Title:</strong> {selectedAnime.title}</p>
              <p><strong>Slug:</strong> {selectedAnime.slug}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Player Section */}
      <Card>
        <CardHeader>
          <CardTitle>Stream Player</CardTitle>
        </CardHeader>
        <CardContent>
          <BackendPlayer 
            initialAnimeSlug={selectedAnime?.slug || ''}
            initialEpisodeNumber={1}
          />
        </CardContent>
      </Card>

      {/* API Endpoints Info */}
      <Card>
        <CardHeader>
          <CardTitle>Available API Endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold">Frontend Proxy Routes:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li><code>/api/backend/search?q=query</code></li>
                  <li><code>/api/backend/stream?anime_slug=...&episode_number=...</code></li>
                  <li><code>/api/backend/download?anime_slug=...&episode_number=...</code></li>
                  <li><code>/api/backend/health</code></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold">Backend Routes:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li><code>http://localhost:8001/api/search</code></li>
                  <li><code>http://localhost:8001/api/watch</code></li>
                  <li><code>http://localhost:8001/api/download</code></li>
                  <li><code>http://localhost:8001/</code></li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
