'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { PlayIcon, ClockIcon, EyeIcon } from '@heroicons/react/24/solid';
import { EpisodeCardProps } from '@/lib/types/episodes';
import { episodeUtils } from '@/lib/supabase/episodes';

export default function EpisodeCard({
  episode,
  isCurrentEpisode = false,
  watchProgress = 0,
  onClick
}: EpisodeCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isCompleted = watchProgress >= 90;
  const isStarted = watchProgress > 0;

  const handleClick = () => {
    onClick(episode);
  };

  const formatDuration = (seconds: number) => {
    return episodeUtils.formatDuration(seconds);
  };

  return (
    <div 
      className={`relative bg-ash-800/50 backdrop-blur-sm rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:bg-ash-700/50 hover:scale-102 active:scale-98 ${
        isCurrentEpisode ? 'ring-2 ring-purple-500' : ''
      }`}
      onClick={handleClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-ash-700">
        {episode.thumbnailUrl && !imageError ? (
          <>
            <img
              src={episode.thumbnailUrl}
              alt={episode.title}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
            {!imageLoaded && (
              <div className="absolute inset-0 bg-ash-700 animate-pulse" />
            )}
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-ash-700 to-ash-800 flex items-center justify-center">
            <PlayIcon className="w-12 h-12 text-ash-400" />
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <PlayIcon className="w-8 h-8 text-white ml-1" />
          </div>
        </div>

        {/* Progress bar */}
        {isStarted && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
            <div
              className="h-full bg-purple-500 transition-all duration-300"
              style={{ width: `${Math.min(watchProgress, 100)}%` }}
            />
          </div>
        )}

        {/* Completion badge */}
        {isCompleted && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}

        {/* Current episode indicator */}
        {isCurrentEpisode && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-purple-500 rounded-md">
            <span className="text-white text-xs font-medium">Now Playing</span>
          </div>
        )}

        {/* Episode number */}
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 backdrop-blur-sm rounded-md">
          <span className="text-white text-sm font-medium">
            {episode.episodeNumber}
          </span>
        </div>

        {/* Duration */}
        {episode.durationSeconds && (
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 backdrop-blur-sm rounded-md flex items-center space-x-1">
            <ClockIcon className="w-3 h-3 text-ash-300" />
            <span className="text-ash-300 text-xs">
              {formatDuration(episode.durationSeconds)}
            </span>
          </div>
        )}
      </div>

      {/* Episode Info */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium text-sm truncate">
              {episode.title || `Episode ${episode.episodeNumber}`}
            </h3>
            {episode.description && (
              <p className="text-ash-300 text-xs mt-1 line-clamp-2">
                {episode.description}
              </p>
            )}
          </div>

          {/* View count */}
          {episode.viewCount > 0 && (
            <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
              <EyeIcon className="w-3 h-3 text-ash-400" />
              <span className="text-ash-400 text-xs">
                {episode.viewCount.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Air date */}
        {episode.airDate && (
          <div className="mt-2 text-ash-400 text-xs">
            Aired: {new Date(episode.airDate).toLocaleDateString()}
          </div>
        )}

        {/* Special indicators */}
        <div className="flex items-center space-x-2 mt-2">
          {episode.isSpecial && (
            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-md">
              Special
            </span>
          )}
          {episode.isFiller && (
            <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-md">
              Filler
            </span>
          )}
        </div>
      </div>
    </div>
  );
}