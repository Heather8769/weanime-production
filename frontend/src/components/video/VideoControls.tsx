'use client';

import { useState, useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  Cog6ToothIcon,
  RectangleStackIcon,
  LanguageIcon,
  BackwardIcon,
  ForwardIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon
} from '@heroicons/react/24/solid';
import { Episode, PlayerState, PlayerActions } from '@/lib/types/episodes';

interface VideoControlsProps {
  playerState: PlayerState;
  playerActions: PlayerActions;
  episode: Episode;
  isVisible: boolean;
  isMobile?: boolean;
  onShowQualityMenu?: () => void;
  onShowSubtitleMenu?: () => void;
  onShowSettings?: () => void;
}

export default function VideoControls({
  playerState,
  playerActions,
  episode,
  isVisible,
  isMobile = false,
  onShowQualityMenu,
  onShowSubtitleMenu,
  onShowSettings
}: VideoControlsProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const volumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Format time helper
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Progress bar handlers
  const handleProgressMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleProgressClick(e);
  };

  const handleProgressClick = (e: React.MouseEvent) => {
    if (!progressBarRef.current) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const percentage = (e.clientX - rect.left) / rect.width;
    const newTime = percentage * playerState.duration;
    
    playerActions.seek(newTime);
  };

  const handleProgressMouseMove = (e: React.MouseEvent) => {
    if (!progressBarRef.current) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const time = percentage * playerState.duration;
    
    setPreviewTime(time);
    setShowPreview(true);
    
    if (isDragging) {
      playerActions.seek(time);
    }
  };

  const handleProgressMouseLeave = () => {
    setShowPreview(false);
  };

  // Volume control handlers
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(e.target.value);
    playerActions.setVolume(volume);
  };

  const showVolumeSliderTemporarily = () => {
    setShowVolumeSlider(true);
    
    if (volumeTimeoutRef.current) {
      clearTimeout(volumeTimeoutRef.current);
    }
    
    volumeTimeoutRef.current = setTimeout(() => {
      setShowVolumeSlider(false);
    }, 2000);
  };

  // Global mouse events for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && progressBarRef.current) {
        const rect = progressBarRef.current.getBoundingClientRect();
        const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const newTime = percentage * playerState.duration;
        playerActions.seek(newTime);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, playerState.duration, playerActions]);

  // Skip intro/outro detection
  const showSkipIntro = episode.introStartSeconds && episode.introEndSeconds &&
    playerState.currentTime >= episode.introStartSeconds &&
    playerState.currentTime <= episode.introEndSeconds;

  const showSkipOutro = episode.outroStartSeconds &&
    playerState.currentTime >= episode.outroStartSeconds;

  const progressPercentage = playerState.duration > 0 
    ? (playerState.currentTime / playerState.duration) * 100 
    : 0;

  const previewPercentage = playerState.duration > 0 
    ? (previewTime / playerState.duration) * 100 
    : 0;

  return (
    <AnimatePresence>
      {isVisible && (
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none animate-in fade-in duration-300"
        >
          {/* Skip Intro Button */}
          <AnimatePresence>
            {showSkipIntro && (
              <button
                onClick={playerActions.skipIntro}
                className="absolute top-4 right-4 glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white font-medium hover:bg-white/20 transition-all pointer-events-auto animate-in slide-in-from-right duration-300"
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
                className="absolute top-4 right-4 glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white font-medium hover:bg-white/20 transition-all pointer-events-auto animate-in slide-in-from-right duration-300"
              >
                Skip Outro
              </button>
            )}
          </AnimatePresence>

          {/* Main Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-auto">
            {/* Progress Bar */}
            <div className="mb-4">
              <div
                ref={progressBarRef}
                className="relative h-2 bg-white/20 rounded-full cursor-pointer group hover:h-3 transition-all"
                onMouseDown={handleProgressMouseDown}
                onMouseMove={handleProgressMouseMove}
                onMouseLeave={handleProgressMouseLeave}
                onClick={handleProgressClick}
              >
                {/* Progress Track */}
                <div
                  className="absolute top-0 left-0 h-full bg-purple-500 rounded-full transition-all"
                  style={{ width: `${progressPercentage}%` }}
                />
                
                {/* Progress Handle */}
                <div
                  className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                  style={{ left: `${progressPercentage}%`, marginLeft: '-8px' }}
                />

                {/* Preview Indicator */}
                {showPreview && (
                  <div
                    className="absolute top-1/2 transform -translate-y-1/2 w-2 h-2 bg-white rounded-full"
                    style={{ left: `${previewPercentage}%`, marginLeft: '-4px' }}
                  />
                )}

                {/* Time Preview Tooltip */}
                {showPreview && (
                  <div
                    className="absolute bottom-6 transform -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap"
                    style={{ left: `${previewPercentage}%` }}
                  >
                    {formatTime(previewTime)}
                  </div>
                )}
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              {/* Left Controls */}
              <div className="flex items-center space-x-4">
                {/* Play/Pause */}
                <button
                  onClick={playerActions.togglePlay}
                  className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all"
                >
                  {playerState.isPlaying ? (
                    <PauseIcon className="w-6 h-6 text-white" />
                  ) : (
                    <PlayIcon className="w-6 h-6 text-white ml-1" />
                  )}
                </button>

                {/* Skip Backward */}
                <button
                  onClick={() => playerActions.seek(playerState.currentTime - 10)}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all"
                >
                  <BackwardIcon className="w-5 h-5 text-white" />
                </button>

                {/* Skip Forward */}
                <button
                  onClick={() => playerActions.seek(playerState.currentTime + 10)}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all"
                >
                  <ForwardIcon className="w-5 h-5 text-white" />
                </button>

                {/* Volume Control */}
                <div 
                  className="flex items-center space-x-2"
                  onMouseEnter={showVolumeSliderTemporarily}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <button
                    onClick={playerActions.toggleMute}
                    className="w-8 h-8 flex items-center justify-center text-white hover:text-purple-400 transition-colors"
                  >
                    {playerState.isMuted || playerState.volume === 0 ? (
                      <SpeakerXMarkIcon className="w-5 h-5" />
                    ) : (
                      <SpeakerWaveIcon className="w-5 h-5" />
                    )}
                  </button>

                  <AnimatePresence>
                    {showVolumeSlider && (
                      <div
                        className="overflow-hidden animate-in slide-in-from-left duration-300"
                        style={{ width: showVolumeSlider ? '80px' : '0px' }}
                      >
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={playerState.isMuted ? 0 : playerState.volume}
                          onChange={handleVolumeChange}
                          className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer slider"
                        />
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Time Display */}
                <div className="text-white text-sm font-mono">
                  {formatTime(playerState.currentTime)} / {formatTime(playerState.duration)}
                </div>
              </div>

              {/* Right Controls */}
              <div className="flex items-center space-x-2">
                {/* Playback Speed */}
                <div className="relative group">
                  <button className="px-3 py-1 text-white text-sm hover:bg-white/10 rounded transition-all">
                    {playerState.playbackRate}x
                  </button>
                  <div className="absolute bottom-full right-0 mb-2 bg-black/90 rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                    <div className="space-y-1">
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                        <button
                          key={speed}
                          onClick={() => playerActions.setPlaybackRate(speed)}
                          className={`block w-full text-left px-3 py-1 text-sm rounded transition-colors ${
                            playerState.playbackRate === speed
                              ? 'bg-purple-500 text-white'
                              : 'text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Subtitle Menu */}
                <button
                  onClick={onShowSubtitleMenu}
                  className="w-8 h-8 flex items-center justify-center text-white hover:text-purple-400 transition-colors"
                  title="Subtitles"
                >
                  <LanguageIcon className="w-5 h-5" />
                </button>

                {/* Quality Menu */}
                <button
                  onClick={onShowQualityMenu}
                  className="w-8 h-8 flex items-center justify-center text-white hover:text-purple-400 transition-colors"
                  title="Quality"
                >
                  <RectangleStackIcon className="w-5 h-5" />
                </button>

                {/* Picture in Picture */}
                <button
                  onClick={playerActions.togglePictureInPicture}
                  className="w-8 h-8 flex items-center justify-center text-white hover:text-purple-400 transition-colors"
                  title="Picture in Picture"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm13 8V5H4v7h12zM8 15v-2h4v2H8z" clipRule="evenodd" />
                  </svg>
                </button>

                {/* Settings */}
                <button
                  onClick={onShowSettings}
                  className="w-8 h-8 flex items-center justify-center text-white hover:text-purple-400 transition-colors"
                  title="Settings"
                >
                  <Cog6ToothIcon className="w-5 h-5" />
                </button>

                {/* Fullscreen */}
                <button
                  onClick={playerActions.toggleFullscreen}
                  className="w-8 h-8 flex items-center justify-center text-white hover:text-purple-400 transition-colors"
                  title="Fullscreen"
                >
                  {playerState.isFullscreen ? (
                    <ArrowsPointingInIcon className="w-5 h-5" />
                  ) : (
                    <ArrowsPointingOutIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}