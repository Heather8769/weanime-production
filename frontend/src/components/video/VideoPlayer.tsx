'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import VideoControls from './VideoControls';
import MobileControls from './MobileControls';
import QualitySelector from './QualitySelector';
import SubtitleMenu from './SubtitleMenu';
import SettingsPanel from './SettingsPanel';
import { Episode } from '@/lib/types/episodes';
import { useVideoPlayer } from '@/lib/hooks/useVideoPlayer';

interface VideoPlayerProps {
  episode: Episode;
  animeId: string;
  autoPlay?: boolean;
  startTime?: number;
  onProgressUpdate?: (progress: number) => void;
  onEpisodeEnd?: (episode: Episode) => void;
  onQualityChange?: (quality: string) => void;
  onError?: (error: string) => void;
}

export default function VideoPlayer({
  episode,
  animeId,
  autoPlay = false,
  startTime = 0,
  onProgressUpdate,
  onEpisodeEnd,
  onQualityChange,
  onError
}: VideoPlayerProps) {
  // Use the video player hook
  const {
    playerState,
    playerActions,
    videoRef,
    containerRef,
    isLoading
  } = useVideoPlayer({
    episode,
    autoPlay,
    startTime,
    onProgressUpdate,
    onEpisodeEnd,
    onQualityChange,
    onError
  });

  // UI state
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Get available video sources and subtitles
  const availableQualities = episode.videoSources?.map(source => source.quality) || ['720p'];
  const availableSubtitles = episode.subtitleTracks || [];

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Keyboard shortcuts (only for desktop)
  useEffect(() => {
    if (isMobile) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target !== document.body) return;
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          playerActions.togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          playerActions.seek(playerState.currentTime - 10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          playerActions.seek(playerState.currentTime + 10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          playerActions.setVolume(Math.min(1, playerState.volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          playerActions.setVolume(Math.max(0, playerState.volume - 0.1));
          break;
        case 'KeyM':
          e.preventDefault();
          playerActions.toggleMute();
          break;
        case 'KeyF':
          e.preventDefault();
          playerActions.toggleFullscreen();
          break;
        case 'KeyP':
          e.preventDefault();
          playerActions.togglePictureInPicture();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, playerState, playerActions]);

  // Get current video source
  const currentVideoSource = episode.videoSources?.find(
    source => source.quality === playerState.selectedQuality
  ) || episode.videoSources?.[0];

  return (
    <div 
      ref={containerRef}
      className="relative w-full bg-black rounded-xl overflow-hidden group"
      style={{ aspectRatio: '16/9' }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        src={currentVideoSource?.url}
        playsInline
        preload="metadata"
      >
        {/* Subtitle tracks */}
        {availableSubtitles.map(subtitle => (
          <track
            key={subtitle.id}
            kind="subtitles"
            src={subtitle.url}
            srcLang={subtitle.language}
            label={subtitle.label}
            default={subtitle.isDefault}
          />
        ))}
      </video>

      {/* Loading overlay */}
      <AnimatePresence>
        {isLoading && (
          <div
            className="absolute inset-0 bg-black/50 flex items-center justify-center animate-in fade-in duration-300"
          >
            <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-xl p-6">
              <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-white text-center">Loading episode...</p>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Error overlay */}
      <AnimatePresence>
        {playerState.error && (
          <div
            className="absolute inset-0 bg-black/50 flex items-center justify-center animate-in fade-in duration-300"
          >
            <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-xl p-6 max-w-md text-center">
              <h3 className="text-white font-medium mb-2">Playback Error</h3>
              <p className="text-ash-300 mb-4">{playerState.error}</p>
              <button
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.load();
                  }
                }}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Buffering indicator */}
      <AnimatePresence>
        {playerState.isBuffering && !isLoading && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none animate-in fade-in duration-300"
          >
            <div className="animate-spin w-12 h-12 border-3 border-white border-t-transparent rounded-full" />
          </div>
        )}
      </AnimatePresence>

      {/* Player Controls */}
      {isMobile ? (
        <MobileControls
          playerState={playerState}
          playerActions={playerActions}
          episode={episode}
          isVisible={playerState.showControls}
          onShowSettings={() => setShowSettingsPanel(true)}
        />
      ) : (
        <VideoControls
          playerState={playerState}
          playerActions={playerActions}
          episode={episode}
          isVisible={playerState.showControls}
          onShowQualityMenu={() => setShowQualityMenu(true)}
          onShowSubtitleMenu={() => setShowSubtitleMenu(true)}
          onShowSettings={() => setShowSettingsPanel(true)}
        />
      )}

      {/* Quality Selector */}
      <AnimatePresence>
        {showQualityMenu && (
          <QualitySelector
            availableQualities={availableQualities}
            selectedQuality={playerState.selectedQuality}
            onQualityChange={playerActions.changeQuality}
            onClose={() => setShowQualityMenu(false)}
          />
        )}
      </AnimatePresence>

      {/* Subtitle Menu */}
      <AnimatePresence>
        {showSubtitleMenu && (
          <SubtitleMenu
            availableSubtitles={availableSubtitles}
            selectedSubtitle={playerState.selectedSubtitle}
            onSubtitleChange={playerActions.changeSubtitle}
            onClose={() => setShowSubtitleMenu(false)}
          />
        )}
      </AnimatePresence>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettingsPanel && (
          <SettingsPanel
            playerState={playerState}
            playerActions={playerActions}
            onClose={() => setShowSettingsPanel(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}