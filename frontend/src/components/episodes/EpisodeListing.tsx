'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FunnelIcon, 
  MagnifyingGlassIcon, 
  Squares2X2Icon, 
  ListBulletIcon,
  PlayIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import EpisodeCard from './EpisodeCard';
import { Episode } from '@/lib/types/episodes';

interface EpisodeListingProps {
  animeId: string;
  episodes: Episode[];
  currentEpisode?: Episode;
  onEpisodeSelect: (episode: Episode) => void;
  watchProgress?: Record<string, number>; // episodeId -> progress percentage
}

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'unwatched' | 'watching' | 'completed';
type SortType = 'episode' | 'date' | 'duration' | 'title';

export default function EpisodeListing({
  animeId,
  episodes,
  currentEpisode,
  onEpisodeSelect,
  watchProgress = {}
}: EpisodeListingProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('episode');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeason, setSelectedSeason] = useState<number | 'all'>('all');

  // Get unique seasons
  const seasons = useMemo(() => {
    const seasonSet = new Set(episodes.map(ep => ep.seasonNumber));
    return Array.from(seasonSet).sort((a, b) => a - b);
  }, [episodes]);

  // Filter and sort episodes
  const filteredEpisodes = useMemo(() => {
    let filtered = episodes;

    // Season filter
    if (selectedSeason !== 'all') {
      filtered = filtered.filter(ep => ep.seasonNumber === selectedSeason);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ep => 
        ep.title?.toLowerCase().includes(query) ||
        ep.description?.toLowerCase().includes(query) ||
        ep.episodeNumber.toString().includes(query)
      );
    }

    // Watch status filter
    if (filter !== 'all') {
      filtered = filtered.filter(ep => {
        const progress = watchProgress[ep.id] || 0;
        switch (filter) {
          case 'unwatched':
            return progress === 0;
          case 'watching':
            return progress > 0 && progress < 90;
          case 'completed':
            return progress >= 90;
          default:
            return true;
        }
      });
    }

    // Sort episodes
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'episode':
          if (a.seasonNumber !== b.seasonNumber) {
            return a.seasonNumber - b.seasonNumber;
          }
          return a.episodeNumber - b.episodeNumber;
        case 'date':
          if (!a.airDate || !b.airDate) return 0;
          return new Date(b.airDate).getTime() - new Date(a.airDate).getTime();
        case 'duration':
          return (b.durationSeconds || 0) - (a.durationSeconds || 0);
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [episodes, selectedSeason, searchQuery, filter, sortBy, watchProgress]);

  // Get filter counts
  const filterCounts = useMemo(() => {
    const counts = {
      all: episodes.length,
      unwatched: 0,
      watching: 0,
      completed: 0
    };

    episodes.forEach(ep => {
      const progress = watchProgress[ep.id] || 0;
      if (progress === 0) counts.unwatched++;
      else if (progress < 90) counts.watching++;
      else counts.completed++;
    });

    return counts;
  }, [episodes, watchProgress]);

  const handleEpisodeClick = (episode: Episode) => {
    onEpisodeSelect(episode);
  };

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Title and stats */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Episodes</h2>
            <div className="flex items-center space-x-4 text-sm text-ash-300">
              <span>{filteredEpisodes.length} episodes</span>
              {seasons.length > 1 && (
                <span>• {seasons.length} seasons</span>
              )}
              <span>• {filterCounts.completed} completed</span>
            </div>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center space-x-2">
            <div className="glass backdrop-blur-[14px] bg-white/5 border border-white/10 rounded-lg p-1 flex">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-all ${
                  viewMode === 'grid'
                    ? 'bg-purple-500 text-white'
                    : 'text-ash-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Squares2X2Icon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-all ${
                  viewMode === 'list'
                    ? 'bg-purple-500 text-white'
                    : 'text-ash-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <ListBulletIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Filters and search */}
        <div className="mt-6 flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-ash-400" />
            <input
              type="text"
              placeholder="Search episodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-ash-800/50 border border-white/10 rounded-lg text-white placeholder-ash-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Season selector */}
          {seasons.length > 1 && (
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="px-4 py-2 bg-ash-800/50 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Seasons</option>
              {seasons.map(season => (
                <option key={season} value={season}>
                  Season {season}
                </option>
              ))}
            </select>
          )}

          {/* Filter tabs */}
          <div className="flex space-x-1 bg-ash-800/30 rounded-lg p-1">
            {(['all', 'unwatched', 'watching', 'completed'] as FilterType[]).map((filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center space-x-2 ${
                  filter === filterType
                    ? 'bg-purple-500 text-white'
                    : 'text-ash-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {filterType === 'unwatched' && <ClockIcon className="w-4 h-4" />}
                {filterType === 'watching' && <PlayIcon className="w-4 h-4" />}
                {filterType === 'completed' && <CheckCircleIcon className="w-4 h-4" />}
                <span className="capitalize">{filterType}</span>
                <span className="text-xs opacity-75">
                  ({filterCounts[filterType]})
                </span>
              </button>
            ))}
          </div>

          {/* Sort selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortType)}
            className="px-4 py-2 bg-ash-800/50 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="episode">Episode Number</option>
            <option value="date">Air Date</option>
            <option value="duration">Duration</option>
            <option value="title">Title</option>
          </select>
        </div>
      </div>

      {/* Episodes grid/list */}
      <AnimatePresence mode="wait">
        {filteredEpisodes.length > 0 ? (
          <div 
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'space-y-4'
            }
          >
            {filteredEpisodes.map((episode, index) => (
              <div key={episode.id}>
                {viewMode === 'grid' ? (
                  <EpisodeCard
                    episode={episode}
                    isCurrentEpisode={currentEpisode?.id === episode.id}
                    watchProgress={watchProgress[episode.id] || 0}
                    onClick={handleEpisodeClick}
                  />
                ) : (
                  <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-xl p-4 hover:bg-white/15 transition-all cursor-pointer"
                       onClick={() => handleEpisodeClick(episode)}>
                    <div className="flex items-center space-x-4">
                      {/* Thumbnail */}
                      <div className="relative w-32 h-18 bg-ash-700 rounded-lg overflow-hidden flex-shrink-0">
                        {episode.thumbnailUrl ? (
                          <img
                            src={episode.thumbnailUrl}
                            alt={episode.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-ash-700 to-ash-800 flex items-center justify-center">
                            <PlayIcon className="w-6 h-6 text-ash-400" />
                          </div>
                        )}
                        
                        {/* Progress bar */}
                        {watchProgress[episode.id] > 0 && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                            <div
                              className="h-full bg-purple-500"
                              style={{ width: `${Math.min(watchProgress[episode.id], 100)}%` }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Episode info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-white font-medium text-lg">
                              Episode {episode.episodeNumber}
                              {episode.title && `: ${episode.title}`}
                            </h3>
                            {episode.description && (
                              <p className="text-ash-300 text-sm mt-1 line-clamp-2">
                                {episode.description}
                              </p>
                            )}
                            <div className="flex items-center space-x-4 mt-2 text-xs text-ash-400">
                              {episode.durationSeconds && (
                                <span>{Math.floor(episode.durationSeconds / 60)} min</span>
                              )}
                              {episode.airDate && (
                                <span>{new Date(episode.airDate).toLocaleDateString()}</span>
                              )}
                              {episode.isSpecial && (
                                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">
                                  Special
                                </span>
                              )}
                              {episode.isFiller && (
                                <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded">
                                  Filler
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Status indicator */}
                          <div className="flex items-center space-x-2 ml-4">
                            {watchProgress[episode.id] >= 90 && (
                              <CheckCircleIcon className="w-5 h-5 text-green-500" />
                            )}
                            {currentEpisode?.id === episode.id && (
                              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="glass backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl p-12 text-center">
            <FunnelIcon className="w-12 h-12 text-ash-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">No episodes found</h3>
            <p className="text-ash-300">
              Try adjusting your filters or search query to find episodes.
            </p>
            <button
              onClick={() => {
                setFilter('all');
                setSearchQuery('');
                setSelectedSeason('all');
              }}
              className="mt-4 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}