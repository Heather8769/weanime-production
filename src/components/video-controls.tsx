'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import * as Slider from '@radix-ui/react-slider'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useWatchStore, Episode } from '@/lib/watch-store'
import { cn } from '@/lib/utils'

interface VideoControlsProps {
  episode: Episode
  animeId: number
  onSeek: (seconds: number) => void
  onToggleFullscreen: () => void
}

export function VideoControls({ episode, animeId, onSeek, onToggleFullscreen }: VideoControlsProps) {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  
  const {
    currentTime,
    duration,
    isPlaying,
    volume,
    muted,
    fullscreen,
    settings,
    episodes,
    setIsPlaying,
    setVolume,
    setMuted,
    updateSettings,
    playNextEpisode,
    playPreviousEpisode,
  } = useWatchStore()

  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Memoize progress percentage to prevent infinite re-renders
  const progressPercentage = useMemo(() => {
    return duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0
  }, [currentTime, duration])

  const currentEpisodeIndex = useMemo(() =>
    episodes.findIndex(ep => ep.id === episode.id),
    [episodes, episode.id]
  )

  const hasNextEpisode = currentEpisodeIndex < episodes.length - 1
  const hasPreviousEpisode = currentEpisodeIndex > 0

  const handleProgressChange = useCallback((value: number[]) => {
    if (duration > 0) {
      const newTime = (value[0] / 100) * duration
      onSeek(newTime)
    }
  }, [duration, onSeek])

  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0] / 100
    setVolume(newVolume)
    if (newVolume > 0 && muted) {
      setMuted(false)
    }
  }, [setVolume, muted, setMuted])

  const toggleMute = () => {
    setMuted(!muted)
  }

  const changePlaybackRate = (rate: number) => {
    updateSettings({ playbackRate: rate })
  }

  const changeQuality = (quality: string) => {
    updateSettings({ quality })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute bottom-0 left-0 right-0 glass-card border-t border-white/10 p-4"
    >
      {/* Progress Bar */}
      <div className="mb-4 relative">
        <div className="glass-card relative w-full h-1.5 rounded-full border border-white/20 cursor-pointer">
          <div
            className="absolute anime-gradient rounded-full h-full glow-effect transition-all duration-200"
            style={{ width: `${isNaN(progressPercentage) ? 0 : progressPercentage}%` }}
          />
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={isNaN(progressPercentage) ? 0 : progressPercentage}
            onChange={(e) => handleProgressChange([parseFloat(e.target.value)])}
            className="absolute inset-0 w-full h-5 opacity-0 cursor-pointer"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-white">
        {/* Left Controls */}
        <div className="flex items-center space-x-4">
          {/* Enhanced Play/Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="glass-card p-3 hover:bg-white/20 rounded-full transition-all duration-300 glow-effect-hover"
          >
            {isPlaying ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>

          {/* Enhanced Previous Episode */}
          <button
            onClick={playPreviousEpisode}
            disabled={!hasPreviousEpisode}
            className={cn(
              "glass-card p-2 rounded-full transition-all duration-300",
              hasPreviousEpisode
                ? "hover:bg-white/20 glow-effect-hover"
                : "opacity-50 cursor-not-allowed"
            )}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </button>

          {/* Enhanced Next Episode */}
          <button
            onClick={playNextEpisode}
            disabled={!hasNextEpisode}
            className={cn(
              "glass-card p-2 rounded-full transition-all duration-300",
              hasNextEpisode
                ? "hover:bg-white/20 glow-effect-hover"
                : "opacity-50 cursor-not-allowed"
            )}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </button>

          {/* Volume */}
          <div 
            className="flex items-center space-x-2"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <button
              onClick={toggleMute}
              className="glass-card p-2 hover:bg-white/20 rounded-full transition-all duration-300 glow-effect-hover"
            >
              {muted || volume === 0 ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                </svg>
              ) : volume < 0.5 ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
              )}
            </button>
            
            {showVolumeSlider && (
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                exit={{ opacity: 0, scaleX: 0 }}
                className="w-20 relative"
              >
                <div className="glass-card relative w-full h-1 rounded-full border border-white/20">
                  <div
                    className="absolute bg-white rounded-full h-full transition-all duration-200"
                    style={{ width: `${muted ? 0 : Math.min(100, Math.max(0, volume * 100))}%` }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={muted ? 0 : Math.min(100, Math.max(0, volume * 100))}
                    onChange={(e) => handleVolumeChange([parseFloat(e.target.value)])}
                    className="absolute inset-0 w-full h-5 opacity-0 cursor-pointer"
                  />
                </div>
              </motion.div>
            )}
          </div>

          {/* Enhanced Time Display */}
          <div className="glass-card px-3 py-1 rounded-lg text-sm font-mono text-white border border-white/20">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-2">
          {/* Enhanced Episode Info */}
          <div className="glass-card px-3 py-1 rounded-lg text-sm text-white/90 mr-4 border border-white/20">
            Episode {episode.number}
            {episodes.length > 1 && ` of ${episodes.length}`}
          </div>

          {/* Enhanced Playback Speed */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="glass-card px-3 py-1 text-sm hover:bg-white/20 rounded-lg transition-all duration-300 text-white border border-white/20 glow-effect-hover">
                {settings.playbackRate}x
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="glass-modal border border-white/20 rounded-xl p-3 space-y-1">
                {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                  <DropdownMenu.Item
                    key={rate}
                    onClick={() => changePlaybackRate(rate)}
                    className={cn(
                      "glass-card px-3 py-2 text-sm rounded-lg cursor-pointer transition-all duration-300 border border-white/10",
                      settings.playbackRate === rate
                        ? "anime-gradient text-white glow-effect"
                        : "hover:bg-white/20 text-white"
                    )}
                  >
                    {rate}x
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          {/* Enhanced Quality */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="glass-card px-3 py-1 text-sm hover:bg-white/20 rounded-lg transition-all duration-300 text-white border border-white/20 glow-effect-hover">
                {settings.quality === 'auto' ? 'Auto' : settings.quality}
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="glass-modal border border-white/20 rounded-xl p-3 space-y-1">
                <DropdownMenu.Item
                  onClick={() => changeQuality('auto')}
                  className={cn(
                    "px-3 py-1 text-sm rounded cursor-pointer transition-colors",
                    settings.quality === 'auto' 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-white/20 text-white"
                  )}
                >
                  Auto
                </DropdownMenu.Item>
                {episode.sources.map((source) => (
                  <DropdownMenu.Item
                    key={source.quality}
                    onClick={() => changeQuality(source.quality)}
                    className={cn(
                      "px-3 py-1 text-sm rounded cursor-pointer transition-colors",
                      settings.quality === source.quality 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-white/20 text-white"
                    )}
                  >
                    {source.quality}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          {/* Enhanced Fullscreen */}
          <button
            onClick={onToggleFullscreen}
            className="glass-card p-2 hover:bg-white/20 rounded-full transition-all duration-300 glow-effect-hover"
          >
            {fullscreen ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
