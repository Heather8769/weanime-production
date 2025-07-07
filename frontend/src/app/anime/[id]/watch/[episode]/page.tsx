'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeftIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  ListBulletIcon,
  ShareIcon,
  HeartIcon,
  BookmarkIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon, BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import VideoPlayer from '@/components/video/VideoPlayer';
import EpisodeListing from '@/components/episodes/EpisodeListing';
import { Episode } from '@/lib/types/episodes';
import { useAuth } from '@/lib/hooks/useAuth';
import { episodes, watchSessions } from '@/lib/supabase/episodes';
import { useQuery } from '@tanstack/react-query';

interface NextEpisodeCountdownProps {
  nextEpisode: Episode;
  countdown: number;
  onPlayNext: () => void;
  onCancel: () => void;
}

function NextEpisodeCountdown({ nextEpisode, countdown, onPlayNext, onCancel }: NextEpisodeCountdownProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-ash-800/95 backdrop-blur-sm border border-white/20 rounded-xl p-6 max-w-sm">
      <div className="flex items-center space-x-4 mb-4">
        <img
          src={nextEpisode.thumbnailUrl || '/placeholder-episode.jpg'}
          alt={nextEpisode.title}
          className="w-16 h-10 object-cover rounded-lg"
        />
        <div className="flex-1">
          <h4 className="text-white font-medium text-sm">Next Episode</h4>
          <p className="text-ash-300 text-xs">
            Episode {nextEpisode.episodeNumber}: {nextEpisode.title}
          </p>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-ash-300 text-sm">
          Playing in {countdown}s
        </span>
        <div className="flex space-x-2">
          <button
            onClick={onCancel}
            className="px-3 py-1 text-ash-300 hover:text-white text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onPlayNext}
            className="px-4 py-1 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded-lg transition-colors"
          >
            Play Now
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EpisodeWatchPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const animeId = params.id as string;
  const episodeParam = params.episode as string;
  
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const [showNextEpisodeCountdown, setShowNextEpisodeCountdown] = useState(false);
  const [nextEpisodeCountdown, setNextEpisodeCountdown] = useState(10);
  const [nextEpisode, setNextEpisode] = useState<Episode | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [watchProgress, setWatchProgress] = useState<Record<string, number>>({});

  // Fetch all episodes for this anime
  const { data: allEpisodes = [], isLoading: episodesLoading } = useQuery({
    queryKey: ['episodes', animeId],
    queryFn: async () => {
      const { data } = await episodes.getByAnime(Number(animeId));
      return data || [];
    },
    enabled: !!animeId
  });

  // Fetch watch progress for user
  const { data: progressData } = useQuery({
    queryKey: ['watch-progress', animeId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await watchSessions.getAnimeProgress(user.id, Number(animeId));
      return data;
    },
    enabled: !!user && !!animeId
  });

  // Set current episode based on URL parameter
  useEffect(() => {
    if (allEpisodes.length > 0) {
      const episode = allEpisodes.find(ep => 
        ep.episodeNumber === Number(episodeParam) || ep.id === episodeParam
      );
      if (episode) {
        setCurrentEpisode(episode);
        // Find next episode
        const nextEp = allEpisodes.find(ep => 
          ep.seasonNumber === episode.seasonNumber && 
          ep.episodeNumber === episode.episodeNumber + 1
        );
        setNextEpisode(nextEp || null);
      }
    }
  }, [allEpisodes, episodeParam]);

  // Process watch progress data
  useEffect(() => {
    if (progressData) {
      const progressMap: Record<string, number> = {};
      progressData.forEach((session: any) => {
        progressMap[session.episode_id] = session.progress_percentage || 0;
      });
      setWatchProgress(progressMap);
    }
  }, [progressData]);

  const handleEpisodeSelect = (episode: Episode) => {
    setCurrentEpisode(episode);
    setShowEpisodeList(false);
    router.push(`/anime/${animeId}/watch/${episode.episodeNumber}`);
  };

  const handleProgressUpdate = (progress: number) => {
    if (currentEpisode) {
      setWatchProgress(prev => ({
        ...prev,
        [currentEpisode.id]: progress
      }));
    }
  };

  const handleEpisodeEnd = (episode: Episode) => {
    if (nextEpisode) {
      setShowNextEpisodeCountdown(true);
      const timer = setInterval(() => {
        setNextEpisodeCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handlePlayNextEpisode();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handlePlayNextEpisode = () => {
    if (nextEpisode) {
      setShowNextEpisodeCountdown(false);
      setNextEpisodeCountdown(10);
      handleEpisodeSelect(nextEpisode);
    }
  };

  const handleCancelAutoPlay = () => {
    setShowNextEpisodeCountdown(false);
    setNextEpisodeCountdown(10);
  };

  const handlePreviousEpisode = () => {
    if (!currentEpisode) return;
    
    const prevEpisode = allEpisodes.find(ep => 
      ep.seasonNumber === currentEpisode.seasonNumber && 
      ep.episodeNumber === currentEpisode.episodeNumber - 1
    );
    
    if (prevEpisode) {
      handleEpisodeSelect(prevEpisode);
    }
  };

  const handleNextEpisode = () => {
    if (nextEpisode) {
      handleEpisodeSelect(nextEpisode);
    }
  };

  const handleShare = async () => {
    if (currentEpisode) {
      try {
        await navigator.share({
          title: `${currentEpisode.title} - Episode ${currentEpisode.episodeNumber}`,
          url: window.location.href
        });
      } catch (error) {
        // Fallback to clipboard
        navigator.clipboard.writeText(window.location.href);
      }
    }
  };

  const toggleLike = () => {
    setIsLiked(!isLiked);
    // TODO: Implement like functionality with backend
  };

  const toggleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    // TODO: Implement bookmark functionality with backend
  };

  if (episodesLoading || !currentEpisode) {
    return (
      <div className="min-h-screen bg-ash-900 flex items-center justify-center">
        <div className="glass backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl p-8">
          <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-white text-center">Loading episode...</p>
        </div>
      </div>
    );
  }

  const hasPreviousEpisode = allEpisodes.some(ep => 
    ep.seasonNumber === currentEpisode.seasonNumber && 
    ep.episodeNumber === currentEpisode.episodeNumber - 1
  );

  return (
    <div className="min-h-screen bg-ash-900">
      {/* Header */}
      <div className="glass backdrop-blur-sm bg-white/10 border-b border-white/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all"
              >
                <ArrowLeftIcon className="w-5 h-5 text-white" />
              </button>
              
              <div>
                <h1 className="text-white font-medium">
                  Episode {currentEpisode.episodeNumber}
                  {currentEpisode.title && `: ${currentEpisode.title}`}
                </h1>
                <p className="text-ash-400 text-sm">
                  Season {currentEpisode.seasonNumber}
                </p>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-2">
              {/* Episode Navigation */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={handlePreviousEpisode}
                  disabled={!hasPreviousEpisode}
                  className="w-8 h-8 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-all"
                >
                  <ChevronLeftIcon className="w-4 h-4 text-white" />
                </button>
                
                <button
                  onClick={handleNextEpisode}
                  disabled={!nextEpisode}
                  className="w-8 h-8 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-all"
                >
                  <ChevronRightIcon className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* Actions */}
              <button
                onClick={() => setShowEpisodeList(!showEpisodeList)}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-all"
              >
                <ListBulletIcon className="w-4 h-4 text-white" />
              </button>

              <button
                onClick={toggleLike}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-all"
              >
                {isLiked ? (
                  <HeartSolidIcon className="w-4 h-4 text-red-500" />
                ) : (
                  <HeartIcon className="w-4 h-4 text-white" />
                )}
              </button>

              <button
                onClick={toggleBookmark}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-all"
              >
                {isBookmarked ? (
                  <BookmarkSolidIcon className="w-4 h-4 text-purple-500" />
                ) : (
                  <BookmarkIcon className="w-4 h-4 text-white" />
                )}
              </button>

              <button
                onClick={handleShare}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-all"
              >
                <ShareIcon className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-3">
            <VideoPlayer
              episode={currentEpisode}
              animeId={animeId}
              autoPlay={true}
              startTime={watchProgress[currentEpisode.id] ? 
                (watchProgress[currentEpisode.id] / 100) * (currentEpisode.durationSeconds || 0) : 
                0
              }
              onProgressUpdate={handleProgressUpdate}
              onEpisodeEnd={handleEpisodeEnd}
              onError={(error) => console.error('Video player error:', error)}
            />

            {/* Episode Info */}
            <div className="mt-6 glass backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Episode {currentEpisode.episodeNumber}
                    {currentEpisode.title && `: ${currentEpisode.title}`}
                  </h2>
                  
                  {currentEpisode.description && (
                    <p className="text-ash-300 mb-4 leading-relaxed">
                      {currentEpisode.description}
                    </p>
                  )}

                  <div className="flex items-center space-x-4 text-sm text-ash-400">
                    {currentEpisode.durationSeconds && (
                      <span>{Math.floor(currentEpisode.durationSeconds / 60)} minutes</span>
                    )}
                    {currentEpisode.airDate && (
                      <span>Aired: {new Date(currentEpisode.airDate).toLocaleDateString()}</span>
                    )}
                    {currentEpisode.viewCount > 0 && (
                      <span>{currentEpisode.viewCount.toLocaleString()} views</span>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="flex items-center space-x-2 mt-4">
                    {currentEpisode.isSpecial && (
                      <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm rounded-full">
                        Special Episode
                      </span>
                    )}
                    {currentEpisode.isFiller && (
                      <span className="px-3 py-1 bg-orange-500/20 text-orange-400 text-sm rounded-full">
                        Filler Episode
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Episode List Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <EpisodeListing
                animeId={animeId}
                episodes={allEpisodes}
                currentEpisode={currentEpisode}
                onEpisodeSelect={handleEpisodeSelect}
                watchProgress={watchProgress}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Episode List Modal */}
      <AnimatePresence>
        {showEpisodeList && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
               onClick={() => setShowEpisodeList(false)}>
          
            <div className="glass backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto"
                 onClick={(e) => e.stopPropagation()}>
            
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">All Episodes</h2>
                <button
                  onClick={() => setShowEpisodeList(false)}
                  className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-all"
                >
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              
              <EpisodeListing
                animeId={animeId}
                episodes={allEpisodes}
                currentEpisode={currentEpisode}
                onEpisodeSelect={handleEpisodeSelect}
                watchProgress={watchProgress}
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Next Episode Countdown */}
      <AnimatePresence>
        {showNextEpisodeCountdown && nextEpisode && (
          <NextEpisodeCountdown
            nextEpisode={nextEpisode}
            countdown={nextEpisodeCountdown}
            onPlayNext={handlePlayNextEpisode}
            onCancel={handleCancelAutoPlay}
          />
        )}
      </AnimatePresence>
    </div>
  );
}