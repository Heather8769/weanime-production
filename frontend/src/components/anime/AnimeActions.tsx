'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AnimeDetail } from '@/lib/anilist-extended';
import { UserBookmark } from '@/lib/supabase/types';
import { useBookmarkMutations } from '@/lib/hooks/useAnimeDetail';
import { useAuth } from '@/lib/hooks/useAuth';

interface AnimeActionsProps {
  anime: AnimeDetail;
  bookmark?: UserBookmark | null;
  continueWatching?: {
    episodeNumber: number;
    progressSeconds: number;
  } | null;
}

export default function AnimeActions({ anime, bookmark, continueWatching }: AnimeActionsProps) {
  const { user } = useAuth();
  const [showWatchStatusMenu, setShowWatchStatusMenu] = useState(false);
  
  const {
    addBookmark,
    removeBookmark,
    updateBookmarkStatus,
    toggleFavorite
  } = useBookmarkMutations(anime.id.toString());

  const isBookmarked = !!bookmark;
  const isFavorite = bookmark?.is_favorite || false;
  const watchStatus = bookmark?.watch_status || 'plan_to_watch';

  const handleBookmarkToggle = async () => {
    if (!user) return;

    try {
      if (isBookmarked) {
        await removeBookmark.mutateAsync();
      } else {
        await addBookmark.mutateAsync({
          title: anime.title.english || anime.title.romaji,
          image: anime.coverImage.large,
          episodes: anime.episodes,
          watchStatus: 'plan_to_watch'
        });
      }
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
    }
  };

  const handleWatchStatusChange = async (status: typeof watchStatus) => {
    if (!user || !isBookmarked) return;

    try {
      await updateBookmarkStatus.mutateAsync(status);
      setShowWatchStatusMenu(false);
    } catch (error) {
      console.error('Failed to update watch status:', error);
    }
  };

  const handleFavoriteToggle = async () => {
    if (!user || !isBookmarked) return;

    try {
      await toggleFavorite.mutateAsync();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const watchStatusLabels = {
    watching: 'Watching',
    completed: 'Completed',
    plan_to_watch: 'Plan to Watch',
    on_hold: 'On Hold',
    dropped: 'Dropped'
  };

  const watchStatusColors = {
    watching: 'from-green-600 to-green-700',
    completed: 'from-blue-600 to-blue-700',
    plan_to_watch: 'from-purple-600 to-purple-700',
    on_hold: 'from-yellow-600 to-yellow-700',
    dropped: 'from-red-600 to-red-700'
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Watch/Continue Button */}
      {continueWatching ? (
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <button className="flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
            <span>Continue Ep {continueWatching.episodeNumber}</span>
          </button>
        </motion.div>
      ) : (
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <button className="flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
            <span>Watch Now</span>
          </button>
        </motion.div>
      )}

      {/* Watch Status Button */}
      {user && (
        <div className="relative">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <button
              onClick={() => setShowWatchStatusMenu(!showWatchStatusMenu)}
              className={`flex items-center space-x-2 px-4 py-3 bg-gradient-to-r ${
                isBookmarked ? watchStatusColors[watchStatus] : 'from-ash-700 to-ash-800'
              } hover:opacity-90 text-white font-medium rounded-lg transition-all duration-200 shadow-lg`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>{isBookmarked ? watchStatusLabels[watchStatus] : 'Add to List'}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </motion.div>

          {/* Watch Status Menu */}
          {showWatchStatusMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="absolute top-full left-0 mt-2 w-48 glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-lg overflow-hidden shadow-xl z-10">
              {Object.entries(watchStatusLabels).map(([status, label]) => (
                <button
                  key={status}
                  onClick={() => {
                    if (!isBookmarked) {
                      handleBookmarkToggle();
                    }
                    handleWatchStatusChange(status as typeof watchStatus);
                  }}
                  className="w-full text-left px-4 py-3 text-ash-200 hover:text-white hover:bg-white/10 transition-colors"
                >
                  {label}
                </button>
              ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Favorite Button */}
      {user && isBookmarked && (
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <button
            onClick={handleFavoriteToggle}
            className={`p-3 ${
              isFavorite 
                ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white' 
                : 'glass backdrop-blur-[14px] bg-white/10 border border-white/20 text-ash-300 hover:text-white'
            } rounded-lg transition-all duration-200 shadow-lg`}
          >
            <svg className="w-5 h-5" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </motion.div>
      )}

      {/* Share Button */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <button className="p-3 glass backdrop-blur-[14px] bg-white/10 border border-white/20 text-ash-300 hover:text-white rounded-lg transition-all duration-200 shadow-lg">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
          </svg>
        </button>
      </motion.div>

      {/* Click outside to close menu */}
      {showWatchStatusMenu && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setShowWatchStatusMenu(false)}
        />
      )}
    </div>
  );
}