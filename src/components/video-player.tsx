'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactPlayer from 'react-player'
import { useWatchStore, Episode } from '@/lib/watch-store'
import { VideoControls } from './video-controls'
import { cn } from '@/lib/utils'

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

  const handleReady = () => {
    setIsReady(true)
  }

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
    console.error('Video player error:', error)
    setHasError(true)
    setIsReady(false)

    // Auto-retry up to 3 times
    if (retryCount < 3) {
      setTimeout(() => {
        setRetryCount(prev => prev + 1)
        setHasError(false)
        setIsReady(false)
      }, 2000)
    }
  }, [retryCount])

  const handleRetry = useCallback(() => {
    setHasError(false)
    setRetryCount(0)
    setIsReady(false)
  }, [])

  const handleSeek = (seconds: number) => {
    playerRef.current?.seekTo(seconds)
  }

  // Get the best video source (memoized for performance)
  const videoSource = useMemo(() => {
    const preferredQuality = settings.quality === 'auto' ? '1080p' : settings.quality
    const source = episode.sources.find(s => s.quality === preferredQuality) || episode.sources[0]
    return source?.url || ''
  }, [episode.sources, settings.quality])

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
              crossOrigin: 'anonymous',
            },
            tracks: episode.subtitles.map(sub => ({
              kind: 'subtitles',
              src: sub.url,
              srcLang: sub.language,
              label: sub.label,
              default: sub.default,
            })),
          },
        }}
      />

      {/* Loading Overlay */}
      {!isReady && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="flex items-center space-x-3 text-white">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Loading episode...</span>
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
