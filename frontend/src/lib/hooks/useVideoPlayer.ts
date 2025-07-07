'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Episode, PlayerState, PlayerActions, VideoQuality, SubtitleTrack } from '@/lib/types/episodes';
import { useAuth } from './useAuth';
import { watchSessions, streamingAnalytics, playerSettings } from '@/lib/supabase/episodes';

interface UseVideoPlayerProps {
  episode: Episode;
  autoPlay?: boolean;
  startTime?: number;
  onProgressUpdate?: (progress: number) => void;
  onEpisodeEnd?: (episode: Episode) => void;
  onQualityChange?: (quality: VideoQuality) => void;
  onError?: (error: string) => void;
}

interface UseVideoPlayerReturn {
  playerState: PlayerState;
  playerActions: PlayerActions;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isLoading: boolean;
  sessionId: string | null;
}

export function useVideoPlayer({
  episode,
  autoPlay = false,
  startTime = 0,
  onProgressUpdate,
  onEpisodeEnd,
  onQualityChange,
  onError
}: UseVideoPlayerProps): UseVideoPlayerReturn {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const lastProgressUpdate = useRef<number>(0);

  const [isLoading, setIsLoading] = useState(true);
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    currentTime: startTime,
    duration: 0,
    volume: 1,
    isMuted: false,
    isFullscreen: false,
    selectedQuality: '720p',
    selectedSubtitle: undefined,
    playbackRate: 1,
    isBuffering: false,
    showControls: true,
    isPictureInPicture: false,
    error: undefined
  });

  // Load user preferences
  useEffect(() => {
    if (user) {
      loadUserPreferences();
    }
  }, [user]);

  const loadUserPreferences = async () => {
    if (!user) return;
    
    try {
      const { data: settings } = await playerSettings.get(user.id);
      if (settings) {
        setPlayerState(prev => ({
          ...prev,
          volume: settings.volume,
          playbackRate: settings.playbackSpeed,
          selectedQuality: settings.defaultQuality === 'auto' ? '720p' : settings.defaultQuality as VideoQuality,
          selectedSubtitle: episode.subtitleTracks?.find(
            track => track.language === settings.defaultSubtitleLanguage
          )
        }));
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error);
    }
  };

  // Initialize watch session
  useEffect(() => {
    if (user) {
      initializeWatchSession();
    }
    return () => {
      if (sessionIdRef.current) {
        endWatchSession();
      }
    };
  }, [user, episode.id]);

  const initializeWatchSession = async () => {
    if (!user) return;
    
    try {
      const { data: session } = await watchSessions.create(
        user.id, 
        episode.id, 
        getDeviceType()
      );
      if (session) {
        sessionIdRef.current = session.id;
      }
    } catch (error) {
      console.error('Failed to create watch session:', error);
    }
  };

  const endWatchSession = async () => {
    if (!sessionIdRef.current) return;
    
    try {
      await watchSessions.end(sessionIdRef.current, {
        watchedDuration: Math.floor(playerState.currentTime),
        pauseCount: 0, // This would be tracked in a real implementation
        seekCount: 0,
        qualityChanges: 0,
        bufferEvents: 0
      });
    } catch (error) {
      console.error('Failed to end watch session:', error);
    }
  };

  const getDeviceType = (): 'desktop' | 'mobile' | 'tablet' | 'tv' => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|ipod/.test(userAgent)) return 'mobile';
    if (/tablet|ipad/.test(userAgent)) return 'tablet';
    return 'desktop';
  };

  // Progress tracking
  useEffect(() => {
    if (playerState.isPlaying && sessionIdRef.current) {
      progressUpdateRef.current = setInterval(() => {
        updateWatchProgress();
      }, 5000);
    } else {
      if (progressUpdateRef.current) {
        clearInterval(progressUpdateRef.current);
      }
    }

    return () => {
      if (progressUpdateRef.current) {
        clearInterval(progressUpdateRef.current);
      }
    };
  }, [playerState.isPlaying]);

  const updateWatchProgress = async () => {
    if (!sessionIdRef.current || !user) return;
    
    const now = Date.now();
    if (now - lastProgressUpdate.current < 4000) return; // Throttle updates
    
    try {
      await watchSessions.updateProgress(
        sessionIdRef.current,
        playerState.currentTime,
        playerState.duration
      );
      
      lastProgressUpdate.current = now;
      
      if (onProgressUpdate) {
        const progress = playerState.duration > 0 
          ? (playerState.currentTime / playerState.duration) * 100 
          : 0;
        onProgressUpdate(progress);
      }
    } catch (error) {
      console.error('Failed to update watch progress:', error);
    }
  };

  // Analytics logging
  const logAnalyticsEvent = useCallback(async (eventType: string, eventData?: Record<string, any>) => {
    if (!sessionIdRef.current) return;
    
    try {
      await streamingAnalytics.logEvent(
        sessionIdRef.current,
        eventType,
        eventData,
        {
          bufferHealth: getBufferHealth(),
          networkSpeed: 0, // Would be calculated in real implementation
          cpuUsage: 0,
          memoryUsage: 0
        }
      );
    } catch (error) {
      console.error('Failed to log analytics event:', error);
    }
  }, []);

  const getBufferHealth = (): number => {
    if (!videoRef.current) return 0;
    
    const buffered = videoRef.current.buffered;
    const currentTime = videoRef.current.currentTime;
    
    if (buffered.length === 0) return 0;
    
    for (let i = 0; i < buffered.length; i++) {
      if (buffered.start(i) <= currentTime && currentTime <= buffered.end(i)) {
        const bufferAhead = buffered.end(i) - currentTime;
        return Math.min(100, (bufferAhead / 30) * 100); // 30 seconds = 100%
      }
    }
    
    return 0;
  };

  // Player actions
  const playerActions: PlayerActions = {
    play: useCallback(() => {
      if (videoRef.current) {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setPlayerState(prev => ({ ...prev, isPlaying: true }));
              logAnalyticsEvent('play');
            })
            .catch(error => {
              console.error('Play failed:', error);
              if (onError) {
                onError('Failed to start playback');
              }
            });
        }
      }
    }, [logAnalyticsEvent, onError]),

    pause: useCallback(() => {
      if (videoRef.current) {
        videoRef.current.pause();
        setPlayerState(prev => ({ ...prev, isPlaying: false }));
        logAnalyticsEvent('pause');
      }
    }, [logAnalyticsEvent]),

    togglePlay: useCallback(() => {
      if (playerState.isPlaying) {
        playerActions.pause();
      } else {
        playerActions.play();
      }
    }, [playerState.isPlaying]),

    seek: useCallback((time: number) => {
      if (videoRef.current) {
        const clampedTime = Math.max(0, Math.min(time, playerState.duration));
        videoRef.current.currentTime = clampedTime;
        setPlayerState(prev => ({ ...prev, currentTime: clampedTime }));
        logAnalyticsEvent('seek', { 
          from: playerState.currentTime, 
          to: clampedTime 
        });
      }
    }, [playerState.currentTime, playerState.duration, logAnalyticsEvent]),

    setVolume: useCallback((volume: number) => {
      if (videoRef.current) {
        const clampedVolume = Math.max(0, Math.min(1, volume));
        videoRef.current.volume = clampedVolume;
        setPlayerState(prev => ({ 
          ...prev, 
          volume: clampedVolume,
          isMuted: clampedVolume === 0
        }));
      }
    }, []),

    toggleMute: useCallback(() => {
      if (videoRef.current) {
        const newMuted = !playerState.isMuted;
        videoRef.current.muted = newMuted;
        setPlayerState(prev => ({ ...prev, isMuted: newMuted }));
      }
    }, [playerState.isMuted]),

    toggleFullscreen: useCallback(async () => {
      if (!containerRef.current) return;

      try {
        if (!document.fullscreenElement) {
          await containerRef.current.requestFullscreen();
          setPlayerState(prev => ({ ...prev, isFullscreen: true }));
        } else {
          await document.exitFullscreen();
          setPlayerState(prev => ({ ...prev, isFullscreen: false }));
        }
      } catch (error) {
        console.error('Fullscreen toggle failed:', error);
      }
    }, []),

    changeQuality: useCallback((quality: VideoQuality) => {
      const currentTime = playerState.currentTime;
      const wasPlaying = playerState.isPlaying;
      
      setPlayerState(prev => ({ ...prev, selectedQuality: quality }));
      
      logAnalyticsEvent('quality_change', { 
        from: playerState.selectedQuality, 
        to: quality 
      });
      
      if (onQualityChange) {
        onQualityChange(quality);
      }

      // In a real implementation, you would switch video sources here
      // and restore playback position
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = currentTime;
          if (wasPlaying) {
            playerActions.play();
          }
        }
      }, 100);
    }, [playerState.currentTime, playerState.isPlaying, playerState.selectedQuality, logAnalyticsEvent, onQualityChange]),

    changeSubtitle: useCallback((subtitle: SubtitleTrack | null) => {
      setPlayerState(prev => ({ ...prev, selectedSubtitle: subtitle || undefined }));
      logAnalyticsEvent('subtitle_change', { 
        language: subtitle?.language || 'none' 
      });
    }, [logAnalyticsEvent]),

    setPlaybackRate: useCallback((rate: number) => {
      if (videoRef.current) {
        videoRef.current.playbackRate = rate;
        setPlayerState(prev => ({ ...prev, playbackRate: rate }));
      }
    }, []),

    togglePictureInPicture: useCallback(async () => {
      if (!videoRef.current) return;

      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
          setPlayerState(prev => ({ ...prev, isPictureInPicture: false }));
        } else {
          await videoRef.current.requestPictureInPicture();
          setPlayerState(prev => ({ ...prev, isPictureInPicture: true }));
        }
      } catch (error) {
        console.error('Picture-in-picture failed:', error);
      }
    }, []),

    skipIntro: useCallback(() => {
      if (episode.introEndSeconds) {
        playerActions.seek(episode.introEndSeconds);
      }
    }, [episode.introEndSeconds]),

    skipOutro: useCallback(() => {
      if (episode.outroStartSeconds) {
        playerActions.seek(episode.outroStartSeconds);
      }
    }, [episode.outroStartSeconds]),

    nextEpisode: useCallback(() => {
      if (onEpisodeEnd) {
        onEpisodeEnd(episode);
      }
    }, [episode, onEpisodeEnd]),

    previousEpisode: useCallback(() => {
      // This would be handled by the parent component
    }, [])
  };

  // Video event handlers
  const handleLoadedMetadata = useCallback(() => {
    if (!videoRef.current) return;
    
    setPlayerState(prev => ({
      ...prev,
      duration: videoRef.current!.duration
    }));
    setIsLoading(false);

    // Set start time if provided
    if (startTime > 0) {
      videoRef.current.currentTime = startTime;
    }

    // Auto-play if enabled
    if (autoPlay) {
      playerActions.play();
    }
  }, [startTime, autoPlay, playerActions]);

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    
    setPlayerState(prev => ({
      ...prev,
      currentTime: videoRef.current!.currentTime
    }));
  }, []);

  const handleEnded = useCallback(() => {
    setPlayerState(prev => ({ ...prev, isPlaying: false }));
    
    if (onEpisodeEnd) {
      onEpisodeEnd(episode);
    }
  }, [episode, onEpisodeEnd]);

  const handleError = useCallback((error: Event) => {
    const errorMessage = 'Failed to load video. Please try again.';
    setPlayerState(prev => ({ ...prev, error: errorMessage }));
    if (onError) {
      onError(errorMessage);
    }
  }, [onError]);

  const handleWaiting = useCallback(() => {
    setPlayerState(prev => ({ ...prev, isBuffering: true }));
  }, []);

  const handleCanPlay = useCallback(() => {
    setPlayerState(prev => ({ ...prev, isBuffering: false }));
  }, []);

  // Attach event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [handleLoadedMetadata, handleTimeUpdate, handleEnded, handleError, handleWaiting, handleCanPlay]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setPlayerState(prev => ({ 
        ...prev, 
        isFullscreen: !!document.fullscreenElement 
      }));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Picture-in-picture change listener
  useEffect(() => {
    const handlePipChange = () => {
      setPlayerState(prev => ({ 
        ...prev, 
        isPictureInPicture: !!document.pictureInPictureElement 
      }));
    };

    document.addEventListener('enterpictureinpicture', handlePipChange);
    document.addEventListener('leavepictureinpicture', handlePipChange);
    
    return () => {
      document.removeEventListener('enterpictureinpicture', handlePipChange);
      document.removeEventListener('leavepictureinpicture', handlePipChange);
    };
  }, []);

  return {
    playerState,
    playerActions,
    videoRef,
    containerRef,
    isLoading,
    sessionId: sessionIdRef.current
  };
}