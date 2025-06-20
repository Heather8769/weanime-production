'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactPlayer from 'react-player'
import { useWatchStore, Episode } from '@/lib/watch-store'
import { VideoControls } from './video-controls'
import { cn } from '@/lib/utils'
import { videoStreamingOptimizer, getOptimizedPlayerConfig, preloadNextEpisode } from '@/lib/video-streaming-optimizer'
import { performanceMonitor } from '@/lib/performance-monitor'

interface VideoPlayerProps {
  episode: Episode
  animeId: number
  className?: string
}

export function VideoPlayer({ episode, animeId, className }: VideoPlayerProps) {
  const playerRef = useRef<ReactPlayer>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [showControls, setShowControls] = useState(true)
  const [controlsTimeout, setControlsTimeout] = useState<number | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [streamingMetrics, setStreamingMetrics] = useState(videoStreamingOptimizer.getMetrics())
  const [optimizedConfig, setOptimizedConfig] = useState(getOptimizedPlayerConfig())

  const {
    currentTime,
    duration,
    isPlaying,
    volume,
    muted,
    fullscreen,
    settings,
    setCurrentTime,
    setDuration,
    setIsPlaying,
    setVolume,
    setMuted,
    setFullscreen,
    updateProgress,
    getProgress,
    markEpisodeCompleted,
  } = useWatchStore()

  // Get saved progress for this episode
  const savedProgress = getProgress(animeId, episode.id)

  // Fullscreen handling
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setFullscreen(true)
    } else {
      document.exitFullscreen()
      setFullscreen(false)
    }
  }, [setFullscreen])

  // Auto-hide controls
  useEffect(() => {
    if (controlsTimeout) {
      clearTimeout(controlsTimeout)
      setControlsTimeout(null)
    }

    if (showControls && isPlaying) {
      const timeout = setTimeout(() => {
        setShowControls(false)
      }, 3000)
      setControlsTimeout(timeout as unknown as number)
    }

    return () => {
      if (controlsTimeout) {
        clearTimeout(controlsTimeout)
      }
    }
  }, [showControls, isPlaying]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle mouse movement to show controls
  const handleMouseMove = () => {
    setShowControls(true)
  }

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isReady) return

    switch (e.code) {
      case 'Space':
        e.preventDefault()
        setIsPlaying(!isPlaying)
        break
      case 'ArrowLeft':
        e.preventDefault()
        playerRef.current?.seekTo(Math.max(0, currentTime - 10))
        break
      case 'ArrowRight':
        e.preventDefault()
        playerRef.current?.seekTo(Math.min(duration, currentTime + 10))
        break
      case 'ArrowUp':
        e.preventDefault()
        setVolume(Math.min(1, volume + 0.1))
        break
      case 'ArrowDown':
        e.preventDefault()
        setVolume(Math.max(0, volume - 0.1))
        break
      case 'KeyM':
        e.preventDefault()
        setMuted(!muted)
        break
      case 'KeyF':
        e.preventDefault()
        toggleFullscreen()
        break
    }
  }, [isReady, isPlaying, currentTime, duration, volume, muted, setIsPlaying, setVolume, setMuted, toggleFullscreen])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [setFullscreen])

  // Preload next episode for seamless playback
  useEffect(() => {
    const episodes = useWatchStore.getState().episodes
    const currentIndex = episodes.findIndex(ep => ep.id === episode.id)
    const nextEpisode = episodes[currentIndex + 1]

    if (nextEpisode && nextEpisode.sources?.[0]?.url) {
      // Preload when current episode is 80% complete
      const preloadThreshold = duration * 0.8
      if (currentTime > preloadThreshold && currentTime > 0) {
        preloadNextEpisode(nextEpisode.sources[0].url)
      }
    }
  }, [currentTime, duration, episode.id])

  // Auto-skip intro/outro
  useEffect(() => {
    if (!episode.skipTimes || !isPlaying) return

    const { intro, outro } = episode.skipTimes

    if (settings.autoSkipIntro && intro && currentTime >= intro.start && currentTime <= intro.end) {
      playerRef.current?.seekTo(intro.end)
    }

    if (settings.autoSkipOutro && outro && currentTime >= outro.start && currentTime <= outro.end) {
      // Skip to next episode or end
      markEpisodeCompleted(animeId, episode.id, episode.number)
    }
  }, [currentTime, episode.skipTimes, settings.autoSkipIntro, settings.autoSkipOutro, animeId, episode.id, episode.number, isPlaying, markEpisodeCompleted])

  // Resume from saved progress
  useEffect(() => {
    if (isReady && savedProgress && !hasStarted && savedProgress.currentTime > 30) {
      playerRef.current?.seekTo(savedProgress.currentTime)
      setHasStarted(true)
    }
  }, [isReady, savedProgress, hasStarted])

  const handleReady = useCallback(() => {
    console.log('Video player ready for episode:', episode.id)
    setIsReady(true)
    setHasError(false)
    setRetryCount(0)

    // Initialize video performance monitoring
    const videoElement = playerRef.current?.getInternalPlayer() as HTMLVideoElement
    if (videoElement) {
      const cleanup = videoStreamingOptimizer.monitorVideoPerformance(videoElement)

      // Update metrics periodically
      const metricsInterval = setInterval(() => {
        setStreamingMetrics(videoStreamingOptimizer.getMetrics())
      }, 2000)

      // Store cleanup function for later use
      ;(videoElement as any).__cleanupMonitoring = () => {
        cleanup?.()
        clearInterval(metricsInterval)
      }
    }

    // Record startup performance
    performanceMonitor.recordMetric('video-ready-time', Date.now() - (window as any).__videoStartTime || 0)
  }, [episode.id])

  const handleStart = () => {
    setHasStarted(true)
  }

  const handleProgress = (state: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => {
    setCurrentTime(state.playedSeconds)
    
    // Update progress in store
    if (state.playedSeconds > 0) {
      updateProgress(animeId, episode.id, episode.number, state.playedSeconds, duration)
    }
  }

  const handleDuration = (duration: number) => {
    setDuration(duration)
  }

  const handleEnded = () => {
    markEpisodeCompleted(animeId, episode.id, episode.number)
    setIsPlaying(false)
  }

  const handleError = useCallback((error: any) => {
    // Only log meaningful errors, not empty objects
    const hasErrorContent = error && (
      error.message ||
      error.type ||
      error.code ||
      (typeof error === 'object' && Object.keys(error).length > 0 && JSON.stringify(error) !== '{}')
    )

    if (hasErrorContent) {
      console.error('Video player error details:', {
        error,
        episode: episode.id,
        retryCount,
        errorType: error?.type || 'unknown',
        errorMessage: error?.message || 'No message',
        timestamp: new Date().toISOString()
      })
    } else {
      console.warn('Video player received empty error event for episode:', episode.id)
    }

    setHasError(true)
    setIsReady(false)

    // Auto-retry up to 3 times
    if (retryCount < 3) {
      console.log(`Auto-retrying video load (${retryCount + 1}/3) in 2 seconds...`)
      setTimeout(() => {
        setRetryCount(prev => prev + 1)
        setHasError(false)
        setIsReady(false)
      }, 2000)
    } else {
      console.error('Max retries reached for video:', episode.id)
    }
  }, [retryCount, episode.id])

  const handleRetry = useCallback(() => {
    setHasError(false)
    setRetryCount(0)
    setIsReady(false)
  }, [])

  const handleSeek = (seconds: number) => {
    playerRef.current?.seekTo(seconds)
  }

  // Validate video source URL
  const validateVideoUrl = useCallback((url: string): boolean => {
    try {
      const urlObj = new URL(url)
      // Check if it's a valid HTTP/HTTPS URL
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        console.warn('Invalid protocol for video URL:', url)
        return false
      }
      // Check if it looks like a video file
      const validExtensions = ['.mp4', '.webm', '.ogg', '.m3u8']
      const hasValidExtension = validExtensions.some(ext =>
        urlObj.pathname.toLowerCase().includes(ext)
      )
      if (!hasValidExtension && !urlObj.hostname.includes('googleapis.com')) {
        console.warn('URL does not appear to be a video file:', url)
        return false
      }
      return true
    } catch (error) {
      console.error('Invalid video URL format:', url, error)
      return false
    }
  }, [])

  // Get the best video source (memoized for performance)
  const videoSource = useMemo(() => {
    // Validate episode exists and has an ID
    if (!episode || !episode.id) {
      console.warn('Invalid episode data provided to video player')
      return ''
    }

    // Validate episode sources exist and are not empty
    if (!episode.sources || episode.sources.length === 0) {
      console.error('No video sources available for episode:', episode.id)
      throw new Error('Real streaming source unavailable - no video sources provided')
    }

    const preferredQuality = settings.quality === 'auto' ? '1080p' : settings.quality
    let source = episode.sources.find(s => s.quality === preferredQuality)

    // Fallback to first available source if preferred quality not found
    if (!source) {
      source = episode.sources[0]
    }

    if (!source?.url) {
      console.error('No valid video URL found for episode:', episode.id)
      throw new Error('Real streaming source unavailable - no valid video URL')
    }

    // Validate the URL
    if (!validateVideoUrl(source.url)) {
      console.error('Video URL validation failed for episode:', episode.id, source.url)
      throw new Error('Real streaming source unavailable - invalid video URL format')
    }

    console.log('Using video source:', {
      url: source.url,
      quality: source.quality,
      episode: episode.id,
      isValidUrl: validateVideoUrl(source.url)
    })

    return source.url
  }, [episode, settings.quality, validateVideoUrl])

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative bg-black overflow-hidden',
        fullscreen ? 'fixed inset-0 z-50' : 'aspect-video',
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video Player */}
      {videoSource ? (
        <ReactPlayer
          ref={playerRef}
          url={videoSource}
          width="100%"
          height="100%"
          playing={isPlaying}
          volume={volume}
          muted={muted}
          playbackRate={settings.playbackRate}
          onReady={handleReady}
          onStart={handleStart}
          onProgress={handleProgress}
          onDuration={handleDuration}
          onEnded={handleEnded}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={handleError}
          config={{
            file: {
              attributes: {
                ...optimizedConfig,
                crossOrigin: 'anonymous',
                playsInline: true,
              },
              // Skip subtitles to avoid CSP issues
              tracks: [],
              forceVideo: true,
              hlsOptions: optimizedConfig.hlsConfig,
            },
          }}
          fallback={
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="text-center space-y-4 text-white p-6">
                <div className="text-4xl">📺</div>
                <h3 className="text-lg font-semibold">Video Player Error</h3>
                <p className="text-white/80">
                  Unable to load the video player. Please refresh the page or try a different browser.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-primary hover:bg-primary/80 rounded transition-colors"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          }
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-center space-y-4 text-white p-6">
            <div className="text-4xl">📺</div>
            <h3 className="text-lg font-semibold">No Video Source</h3>
            <p className="text-white/80">
              Unable to load video for this episode. Please try another episode or check back later.
            </p>
          </div>
        </div>
      )}

      {/* Performance Metrics (Debug Mode) */}
      {process.env.NODE_ENV === 'development' && streamingMetrics && (
        <div className="absolute top-4 right-4 glass-card p-2 text-xs text-white/80 max-w-xs">
          <div>Quality: {streamingMetrics.playbackQuality}</div>
          <div>Buffer: {streamingMetrics.bufferHealth.toFixed(1)}s</div>
          <div>Bandwidth: {streamingMetrics.bandwidth.toFixed(1)} Mbps</div>
          <div>Rebuffers: {streamingMetrics.rebufferingEvents}</div>
          <div>Startup: {streamingMetrics.startupTime}ms</div>
          {streamingMetrics.droppedFrames > 0 && (
            <div className="text-yellow-400">Dropped: {streamingMetrics.droppedFrames}</div>
          )}
        </div>
      )}

      {/* Loading Overlay */}
      {!isReady && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="flex items-center space-x-3 text-white">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Loading episode...</span>
            <span className="text-white/60 text-sm">Optimizing for your connection...</span>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center space-y-4 text-white p-6">
            <div className="text-4xl">⚠️</div>
            <h3 className="text-lg font-semibold">Video Error</h3>
            <p className="text-white/80">
              {retryCount < 3
                ? `Retrying... (${retryCount + 1}/3)`
                : 'Unable to load video. Please try again.'
              }
            </p>
            {retryCount >= 3 && (
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-primary hover:bg-primary/80 rounded transition-colors"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {/* Resume Progress Notification */}
      {savedProgress && savedProgress.currentTime > 30 && !hasStarted && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 left-4 right-4 bg-black/80 text-white p-4 rounded-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Resume watching?</p>
              <p className="text-sm text-white/80">
                You were at {Math.floor(savedProgress.currentTime / 60)}:
                {String(Math.floor(savedProgress.currentTime % 60)).padStart(2, '0')}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  playerRef.current?.seekTo(0)
                  setHasStarted(true)
                }}
                className="px-3 py-1 text-sm bg-white/20 hover:bg-white/30 rounded transition-colors"
              >
                Start Over
              </button>
              <button
                onClick={() => {
                  playerRef.current?.seekTo(savedProgress.currentTime)
                  setHasStarted(true)
                }}
                className="px-3 py-1 text-sm bg-primary hover:bg-primary/80 rounded transition-colors"
              >
                Resume
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Skip Intro/Outro Buttons */}
      {episode.skipTimes && (
        <>
          {episode.skipTimes.intro && 
           currentTime >= episode.skipTimes.intro.start && 
           currentTime <= episode.skipTimes.intro.end && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => handleSeek(episode.skipTimes!.intro!.end)}
              className="absolute top-4 right-4 bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Skip Intro
            </motion.button>
          )}
          
          {episode.skipTimes.outro && 
           currentTime >= episode.skipTimes.outro.start && 
           currentTime <= episode.skipTimes.outro.end && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => markEpisodeCompleted(animeId, episode.id, episode.number)}
              className="absolute top-4 right-4 bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Skip Outro
            </motion.button>
          )}
        </>
      )}

      {/* Video Controls */}
      <AnimatePresence>
        {showControls && (
          <VideoControls
            episode={episode}
            animeId={animeId}
            onSeek={handleSeek}
            onToggleFullscreen={toggleFullscreen}
          />
        )}
      </AnimatePresence>

      {/* Click to play/pause */}
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={() => setIsPlaying(!isPlaying)}
      />
    </div>
  )
}
