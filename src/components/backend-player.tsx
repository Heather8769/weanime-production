'use client'

import { useState } from 'react'
import { useBackendStream, useBackendDownload } from '@/hooks/use-backend-stream'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Play, Download, Loader2, AlertCircle, ExternalLink } from 'lucide-react'

interface BackendPlayerProps {
  initialAnimeSlug?: string
  initialEpisodeNumber?: number
}

export function BackendPlayer({ 
  initialAnimeSlug = '', 
  initialEpisodeNumber = 1 
}: BackendPlayerProps) {
  const [animeSlug, setAnimeSlug] = useState(initialAnimeSlug)
  const [episodeNumber, setEpisodeNumber] = useState(initialEpisodeNumber)
  const [shouldFetchStream, setShouldFetchStream] = useState(false)
  const [shouldFetchDownload, setShouldFetchDownload] = useState(false)

  const { 
    data: streamData, 
    isLoading: streamLoading, 
    error: streamError 
  } = useBackendStream(
    shouldFetchStream ? animeSlug : '',
    shouldFetchStream ? episodeNumber : 0
  )

  const { 
    data: downloadData, 
    isLoading: downloadLoading, 
    error: downloadError 
  } = useBackendDownload(
    shouldFetchDownload ? animeSlug : '',
    shouldFetchDownload ? episodeNumber : 0
  )

  const handleGetStream = () => {
    if (animeSlug && episodeNumber > 0) {
      setShouldFetchStream(true)
      setShouldFetchDownload(false)
    }
  }

  const handleGetDownload = () => {
    if (animeSlug && episodeNumber > 0) {
      setShouldFetchDownload(true)
      setShouldFetchStream(false)
    }
  }

  const resetFetching = () => {
    setShouldFetchStream(false)
    setShouldFetchDownload(false)
  }

  return (
    <div className="space-y-6">
      {/* Input Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Backend Player
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Anime Slug</label>
              <Input
                placeholder="e.g., jujutsu-kaisen"
                value={animeSlug}
                onChange={(e) => {
                  setAnimeSlug(e.target.value)
                  resetFetching()
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Episode Number</label>
              <Input
                type="number"
                min="1"
                placeholder="1"
                value={episodeNumber}
                onChange={(e) => {
                  setEpisodeNumber(parseInt(e.target.value) || 1)
                  resetFetching()
                }}
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleGetStream} 
              disabled={!animeSlug || episodeNumber < 1 || streamLoading}
              className="flex items-center gap-2"
            >
              {streamLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Get Stream
            </Button>
            
            <Button 
              onClick={handleGetDownload} 
              disabled={!animeSlug || episodeNumber < 1 || downloadLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              {downloadLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Get Download
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stream Results */}
      {streamError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Stream error: {streamError.message}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {streamData?.stream_url && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Stream Player
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Stream URL:</span>
              <a 
                href={streamData.stream_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline text-sm break-all flex items-center gap-1"
              >
                {streamData.stream_url}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            
            {/* Embed the stream */}
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <iframe
                src={streamData.stream_url}
                className="w-full h-full"
                allowFullScreen
                title={`${animeSlug} Episode ${episodeNumber}`}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Download Results */}
      {downloadError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Download error: {downloadError.message}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {downloadData?.download_url && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Download Link
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Download URL:</span>
              <a 
                href={downloadData.download_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline text-sm break-all flex items-center gap-1"
              >
                {downloadData.download_url}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            
            <Button asChild className="w-full">
              <a 
                href={downloadData.download_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Episode {episodeNumber}
              </a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
