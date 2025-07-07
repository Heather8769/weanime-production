// Episode and Video Streaming Type Definitions

export interface Episode {
  id: string;
  animeId: number;
  episodeNumber: number;
  seasonNumber: number;
  title: string;
  description?: string;
  airDate?: Date;
  durationSeconds: number;
  thumbnailUrl?: string;
  previewUrl?: string;
  introStartSeconds?: number;
  introEndSeconds?: number;
  outroStartSeconds?: number;
  isSpecial: boolean;
  isFiller: boolean;
  viewCount: number;
  ratingAverage?: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
  videoSources: VideoSource[];
  subtitleTracks: SubtitleTrack[];
}

export interface VideoSource {
  id: string;
  episodeId: string;
  quality: VideoQuality;
  format: VideoFormat;
  url: string;
  fileSize?: number;
  bitrate?: number;
  codec?: string;
  language: string;
  audioType: AudioType;
  cdnProvider?: string;
  isPrimary: boolean;
  createdAt: Date;
}

export interface SubtitleTrack {
  id: string;
  episodeId: string;
  language: string;
  label: string;
  url: string;
  format: SubtitleFormat;
  isDefault: boolean;
  isForced: boolean;
  createdAt: Date;
}

export interface WatchSession {
  id: string;
  userId?: string;
  episodeId: string;
  sessionStart: Date;
  sessionEnd?: Date;
  watchedDuration: number;
  totalDuration: number;
  progressPercentage: number;
  lastPosition: number;
  qualityWatched?: string;
  deviceType?: DeviceType;
  ipAddress?: string;
  userAgent?: string;
  completed: boolean;
  pauseCount: number;
  seekCount: number;
  qualityChanges: number;
  bufferEvents: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlayerSettings {
  id: string;
  userId: string;
  defaultQuality: VideoQuality | 'auto';
  autoPlayNext: boolean;
  skipIntro: boolean;
  skipOutro: boolean;
  defaultSubtitleLanguage?: string;
  playbackSpeed: number;
  volume: number;
  theme: PlayerTheme;
  keyboardShortcuts: boolean;
  pictureInPicture: boolean;
  notifications: boolean;
  analyticsConsent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EpisodeThumbnail {
  id: string;
  episodeId: string;
  timestampSeconds: number;
  thumbnailUrl: string;
  width?: number;
  height?: number;
  generatedAt: Date;
}

export interface StreamingAnalytics {
  id: string;
  sessionId?: string;
  eventType: AnalyticsEventType;
  eventData?: Record<string, any>;
  timestampSeconds?: number;
  bufferHealth?: number;
  networkSpeed?: number;
  cpuUsage?: number;
  memoryUsage?: number;
  createdAt: Date;
}

// Enums and Union Types
export type VideoQuality = '480p' | '720p' | '1080p' | '4K';
export type VideoFormat = 'mp4' | 'hls' | 'dash';
export type AudioType = 'sub' | 'dub';
export type SubtitleFormat = 'vtt' | 'srt' | 'ass';
export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'tv';
export type PlayerTheme = 'dark' | 'light' | 'auto';
export type AnalyticsEventType = 'play' | 'pause' | 'seek' | 'quality_change' | 'buffer' | 'error' | 'complete';

// Player State Types
export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  selectedQuality: VideoQuality;
  selectedSubtitle?: SubtitleTrack;
  playbackRate: number;
  isBuffering: boolean;
  showControls: boolean;
  isPictureInPicture: boolean;
  error?: string;
}

export interface PlayerActions {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleFullscreen: () => void;
  changeQuality: (quality: VideoQuality) => void;
  changeSubtitle: (subtitle: SubtitleTrack | null) => void;
  setPlaybackRate: (rate: number) => void;
  togglePictureInPicture: () => void;
  skipIntro: () => void;
  skipOutro: () => void;
  nextEpisode: () => void;
  previousEpisode: () => void;
}

// Component Props Types
export interface VideoPlayerProps {
  episode: Episode;
  animeId: string;
  autoPlay?: boolean;
  startTime?: number;
  onProgressUpdate?: (progress: number) => void;
  onEpisodeEnd?: (episode: Episode) => void;
  onQualityChange?: (quality: VideoQuality) => void;
  onError?: (error: string) => void;
}

export interface EpisodeListProps {
  animeId: string;
  episodes: Episode[];
  currentEpisode?: Episode;
  onEpisodeSelect: (episode: Episode) => void;
  viewMode?: 'grid' | 'list';
}

export interface EpisodeCardProps {
  episode: Episode;
  isCurrentEpisode?: boolean;
  watchProgress?: number;
  onClick: (episode: Episode) => void;
}

export interface PlayerControlsProps {
  playerState: PlayerState;
  playerActions: PlayerActions;
  episode: Episode;
  isVisible: boolean;
  isMobile?: boolean;
}

// Utility Types
export interface EpisodeProgress {
  episodeId: string;
  progressPercentage: number;
  lastPosition: number;
  completed: boolean;
  lastWatched: Date;
}

export interface ContinueWatching {
  episode: Episode;
  progress: EpisodeProgress;
  anime: {
    id: number;
    title: string;
    coverImage: string;
  };
}

export interface NextEpisodeInfo {
  episode: Episode;
  hasNext: boolean;
  autoPlayCountdown?: number;
}

// API Response Types
export interface EpisodesResponse {
  episodes: Episode[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface WatchProgressResponse {
  progress: EpisodeProgress[];
  totalWatchTime: number;
  completedEpisodes: number;
}

// Error Types
export interface VideoError {
  code: string;
  message: string;
  recoverable: boolean;
  details?: Record<string, any>;
}

export interface StreamingError extends VideoError {
  quality?: VideoQuality;
  source?: VideoSource;
  networkStatus?: 'online' | 'offline' | 'slow';
}

// Settings and Preferences
export interface VideoPreferences {
  preferredQuality: VideoQuality | 'auto';
  preferredSubtitleLanguage?: string;
  autoPlayNext: boolean;
  skipIntro: boolean;
  skipOutro: boolean;
  playbackSpeed: number;
  volume: number;
}

export interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
}

// Analytics Types
export interface PlaybackMetrics {
  sessionId: string;
  episodeId: string;
  totalWatchTime: number;
  bufferEvents: number;
  qualityChanges: number;
  seekOperations: number;
  averageBufferHealth: number;
  completionRate: number;
  averageQuality: VideoQuality;
  errors: VideoError[];
}

export interface UserEngagementMetrics {
  userId: string;
  totalWatchTime: number;
  episodesWatched: number;
  averageSessionDuration: number;
  preferredGenres: string[];
  preferredQuality: VideoQuality;
  deviceUsage: Record<DeviceType, number>;
  peakWatchingHours: number[];
}