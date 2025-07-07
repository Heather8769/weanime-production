'use client';

import { useState, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import {
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  BackwardIcon,
  ForwardIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/solid';
import { Episode, PlayerState, PlayerActions } from '@/lib/types/episodes';

interface MobileControlsProps {
  playerState: PlayerState;
  playerActions: PlayerActions;
  episode: Episode;
  isVisible: boolean;
  onShowSettings?: () => void;
}

export default function MobileControls({
  playerState,
  playerActions,
  episode,
  isVisible,
  onShowSettings
}: MobileControlsProps) {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [lastTap, setLastTap] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showSeekPreview, setShowSeekPreview] = useState(false);
  const [seekPreviewTime, setSeekPreviewTime] = useState(0);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const volumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Format time helper
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle tap gestures
  const handleTap = (e: React.TouchEvent) => {
    const now = Date.now();
    const tapGap = now - lastTap;
    
    if (tapGap < 300 && tapGap > 0) {
      setTapCount(prev => prev + 1);
      if (tapCount === 1) {
        // Double tap detected
        playerActions.togglePlay();
      }
    } else {
      setTapCount(1);
    }
    
    setLastTap(now);
  };

  // Swipe gestures
  const swipeHandlers = useSwipeable({
    onSwipedUp: () => {
      if (!playerState.isFullscreen) {
        playerActions.toggleFullscreen();
      }
    },
    onSwipedDown: () => {
      if (playerState.isFullscreen) {
        playerActions.toggleFullscreen();
      }
    },
    onSwipedLeft: () => {
      playerActions.seek(playerState.currentTime + 10);
    },
    onSwipedRight: () => {
      playerActions.seek(playerState.currentTime - 10);
    },
    preventScrollOnSwipe: true,
    trackMouse: false
  });

  // Progress bar handlers for mobile
  const handleProgressTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    handleProgressTouch(e);
  };

  const handleProgressTouch = (e: React.TouchEvent) => {
    if (!progressBarRef.current) return;
    
    const touch = e.touches[0];
    const rect = progressBarRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    const newTime = percentage * playerState.duration;
    
    setSeekPreviewTime(newTime);
    setShowSeekPreview(true);
    
    if (isDragging) {
      playerActions.seek(newTime);
    }
  };

  const handleProgressTouchEnd = () => {
    setIsDragging(false);
    setShowSeekPreview(false);
  };

  // Volume control
  const handleVolumeToggle = () => {
    setShowVolumeSlider(true);
    
    if (volumeTimeoutRef.current) {
      clearTimeout(volumeTimeoutRef.current);
    }
    
    volumeTimeoutRef.current = setTimeout(() => {
      setShowVolumeSlider(false);
    }, 3000);
  };

  // Skip intro/outro detection
  const showSkipIntro = episode.introStartSeconds && episode.introEndSeconds &&
    playerState.currentTime >= episode.introStartSeconds &&
    playerState.currentTime <= episode.introEndSeconds;

  const showSkipOutro = episode.outroStartSeconds &&
    playerState.currentTime >= episode.outroStartSeconds;

  const progressPercentage = playerState.duration > 0 
    ? (playerState.currentTime / playerState.duration) * 100 
    : 0;

  return (
    <AnimatePresence>
      {isVisible && (
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 touch-none animate-in fade-in duration-300"
          {...swipeHandlers}
        >
          {/* Tap area for play/pause */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            onTouchEnd={handleTap}
          >
            {/* Central play/pause button */}
            <button
              onClick={playerActions.togglePlay}
              className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center touch-manipulation active:scale-90 transition-transform"
            >
              {playerState.isPlaying ? (
                <PauseIcon className="w-10 h-10 text-white" />
              ) : (
                <PlayIcon className="w-10 h-10 text-white ml-1" />
              )}
            </button>
          </div>

          {/* Skip Intro Button */}
          <AnimatePresence>
            {showSkipIntro && (
              <button
                onClick={playerActions.skipIntro}
                className="absolute top-4 right-4 glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white font-medium touch-manipulation animate-in slide-in-from-right duration-300"
              >
                Skip Intro
              </button>
            )}
          </AnimatePresence>

          {/* Skip Outro Button */}
          <AnimatePresence>
            {showSkipOutro && (
              <button
                onClick={playerActions.skipOutro}
                className="absolute top-4 right-4 glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white font-medium touch-manipulation animate-in slide-in-from-right duration-300"
              >
                Skip Outro
              </button>
            )}
          </AnimatePresence>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 touch-manipulation">
            {/* Progress Bar */}
            <div className="mb-6">
              <div
                ref={progressBarRef}
                className="relative h-3 bg-white/20 rounded-full touch-manipulation"
                onTouchStart={handleProgressTouchStart}
                onTouchMove={handleProgressTouch}
                onTouchEnd={handleProgressTouchEnd}
              >
                {/* Progress Track */}
                <div
                  className="absolute top-0 left-0 h-full bg-purple-500 rounded-full"
                  style={{ width: `${progressPercentage}%` }}
                />
                
                {/* Progress Handle */}
                <div
                  className="absolute top-1/2 transform -translate-y-1/2 w-6 h-6 bg-purple-500 rounded-full shadow-lg"
                  style={{ left: `${progressPercentage}%`, marginLeft: '-12px' }}
                />

                {/* Seek Preview */}
                {showSeekPreview && (
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-sm px-3 py-1 rounded whitespace-nowrap">
                    {formatTime(seekPreviewTime)}
                  </div>
                )}
              </div>
            </div>

            {/* Control Buttons Row */}
            <div className="flex items-center justify-between">
              {/* Left Controls */}
              <div className="flex items-center space-x-4">
                {/* Skip Backward */}
                <button
                  onClick={() => playerActions.seek(playerState.currentTime - 10)}
                  className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center touch-manipulation"
                >
                  <BackwardIcon className="w-6 h-6 text-white" />
                </button>

                {/* Skip Forward */}
                <button
                  onClick={() => playerActions.seek(playerState.currentTime + 10)}
                  className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center touch-manipulation"
                >
                  <ForwardIcon className="w-6 h-6 text-white" />
                </button>

                {/* Volume */}
                <div className="relative">
                  <button
                    onClick={handleVolumeToggle}
                    className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center touch-manipulation"
                  >
                    {playerState.isMuted || playerState.volume === 0 ? (
                      <SpeakerXMarkIcon className="w-6 h-6 text-white" />
                    ) : (
                      <SpeakerWaveIcon className="w-6 h-6 text-white" />
                    )}
                  </button>

                  {/* Volume Slider */}
                  <AnimatePresence>
                    {showVolumeSlider && (
                      <div
                        className="absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-black/90 rounded-lg p-4 animate-in slide-in-from-bottom duration-300"
                      >
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={playerState.isMuted ? 0 : playerState.volume}
                          onChange={(e) => playerActions.setVolume(parseFloat(e.target.value))}
                          className="w-24 h-2 bg-white/20 rounded-full appearance-none cursor-pointer slider vertical-slider"
                          style={{ writingMode: 'bt-lr' as any, WebkitAppearance: 'slider-vertical' }}
                        />
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Center - Time Display */}
              <div className="text-white text-sm font-mono bg-black/50 px-3 py-1 rounded">
                {formatTime(playerState.currentTime)} / {formatTime(playerState.duration)}
              </div>

              {/* Right Controls */}
              <div className="flex items-center space-x-4">
                {/* Settings */}
                <button
                  onClick={onShowSettings}
                  className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center touch-manipulation"
                >
                  <Cog6ToothIcon className="w-6 h-6 text-white" />
                </button>

                {/* Fullscreen */}
                <button
                  onClick={playerActions.toggleFullscreen}
                  className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center touch-manipulation"
                >
                  {playerState.isFullscreen ? (
                    <ArrowsPointingInIcon className="w-6 h-6 text-white" />
                  ) : (
                    <ArrowsPointingOutIcon className="w-6 h-6 text-white" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Gesture Hints */}
          {!playerState.isPlaying && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center mt-32">
              <div className="text-white/60 text-sm space-y-2">
                <p>Double tap to play/pause</p>
                <p>Swipe left/right to seek</p>
                <p>Swipe up for fullscreen</p>
              </div>
            </div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}