'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayIcon, XMarkIcon, ClockIcon } from '@heroicons/react/24/solid';
import { Episode } from '@/lib/types/episodes';

interface AutoPlayNextProps {
  currentEpisode: Episode;
  nextEpisode: Episode | null;
  isVisible: boolean;
  autoPlayDelay?: number; // seconds
  onPlayNext: (episode: Episode) => void;
  onCancel: () => void;
  onSkipToNext?: () => void;
}

export default function AutoPlayNext({
  currentEpisode,
  nextEpisode,
  isVisible,
  autoPlayDelay = 10,
  onPlayNext,
  onCancel,
  onSkipToNext
}: AutoPlayNextProps) {
  const [countdown, setCountdown] = useState(autoPlayDelay);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isVisible && nextEpisode) {
      setShowPreview(true);
      // Start countdown after a brief delay to show the preview
      setTimeout(() => {
        setIsCountingDown(true);
        startCountdown();
      }, 2000);
    } else {
      resetCountdown();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isVisible, nextEpisode]);

  const startCountdown = () => {
    setCountdown(autoPlayDelay);
    
    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          handleAutoPlay();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const resetCountdown = () => {
    setIsCountingDown(false);
    setShowPreview(false);
    setCountdown(autoPlayDelay);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const handleAutoPlay = () => {
    if (nextEpisode) {
      onPlayNext(nextEpisode);
    }
    resetCountdown();
  };

  const handleCancel = () => {
    onCancel();
    resetCountdown();
  };

  const handlePlayNow = () => {
    if (nextEpisode) {
      onPlayNext(nextEpisode);
    }
    resetCountdown();
  };

  if (!nextEpisode) {
    return null;
  }

  return (
    <AnimatePresence>
      {showPreview && (
        <div className="fixed bottom-6 right-6 glass backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl p-6 max-w-sm z-50 shadow-2xl">
          {/* Close button */}
          <button
            onClick={handleCancel}
            className="absolute top-3 right-3 w-6 h-6 text-ash-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>

          {/* Episode preview */}
          <div className="flex items-start space-x-4 mb-4">
            <div className="relative flex-shrink-0">
              <img
                src={nextEpisode.thumbnailUrl || '/placeholder-episode.jpg'}
                alt={nextEpisode.title}
                className="w-20 h-12 object-cover rounded-lg"
              />
              <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                <PlayIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="text-ash-300 text-xs mb-1">Up Next</div>
              <h4 className="text-white font-medium text-sm leading-tight">
                Episode {nextEpisode.episodeNumber}
                {nextEpisode.title && `: ${nextEpisode.title}`}
              </h4>
              {nextEpisode.durationSeconds && (
                <div className="text-ash-400 text-xs mt-1">
                  {Math.floor(nextEpisode.durationSeconds / 60)} min
                </div>
              )}
            </div>
          </div>

          {/* Episode description */}
          {nextEpisode.description && (
            <p className="text-ash-300 text-xs mb-4 line-clamp-2 leading-relaxed">
              {nextEpisode.description}
            </p>
          )}

          {/* Countdown and actions */}
          <div className="space-y-3">
            {isCountingDown && (
              <div className="flex items-center justify-center space-x-2 text-sm">
                <ClockIcon className="w-4 h-4 text-purple-400" />
                <span className="text-ash-300">
                  Playing in{' '}
                  <span className="text-white font-medium">{countdown}</span>
                  {countdown === 1 ? ' second' : ' seconds'}
                </span>
              </div>
            )}

            {/* Progress bar */}
            {isCountingDown && (
              <div className="w-full bg-ash-700 rounded-full h-1">
                <div 
                  className="bg-purple-500 h-1 rounded-full transition-all"
                  style={{ width: isCountingDown ? '0%' : '100%' }}
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex space-x-2">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2 text-ash-300 hover:text-white text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePlayNow}
                className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <PlayIcon className="w-4 h-4" />
                <span>Play Now</span>
              </button>
            </div>
          </div>

          {/* Additional episode info */}
          <div className="mt-4 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between text-xs text-ash-400">
              <span>Season {nextEpisode.seasonNumber}</span>
              {nextEpisode.airDate && (
                <span>
                  Aired {new Date(nextEpisode.airDate).toLocaleDateString()}
                </span>
              )}
            </div>
            
            {/* Episode tags */}
            <div className="flex items-center space-x-2 mt-2">
              {nextEpisode.isSpecial && (
                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                  Special
                </span>
              )}
              {nextEpisode.isFiller && (
                <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded">
                  Filler
                </span>
              )}
            </div>
          </div>

          {/* Skip to next episode option */}
          {onSkipToNext && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <button
                onClick={onSkipToNext}
                className="w-full text-center text-xs text-ash-400 hover:text-ash-300 transition-colors"
              >
                Skip to next episode without watching
              </button>
            </div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}