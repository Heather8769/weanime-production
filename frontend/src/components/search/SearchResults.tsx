'use client';

import { Fragment } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  MagnifyingGlassIcon, 
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import AnimeCard from '@/components/AnimeCard';
import { useAuth } from '@/lib/hooks/useAuth';
import { searchHistory } from '@/lib/supabase/client';

interface SearchResultsProps {
  results: any;
  isLoading: boolean;
  isError: boolean;
  viewMode: 'grid' | 'list';
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  isFetchingNextPage?: boolean;
  searchTerm: string;
}

export default function SearchResults({
  results,
  isLoading,
  isError,
  viewMode,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  searchTerm
}: SearchResultsProps) {
  const router = useRouter();
  const { user } = useAuth();

  const handleAnimeClick = async (anime: any) => {
    // Log search click for analytics
    try {
      if (searchTerm) {
        await searchHistory.add(
          user?.id || null, 
          searchTerm, 
          results?.pages?.[0]?.anime?.length || 0, 
          anime.id
        );
      }
    } catch (error) {
      console.log('Search click logging failed:', error);
    }
    
    router.push(`/anime/${anime.id}`);
  };

  // Loading state
  if (isLoading && !results?.pages?.length) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6'
            : 'space-y-4'
        }>
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className={
                viewMode === 'grid'
                  ? 'glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-xl overflow-hidden animate-pulse'
                  : 'glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-xl p-4 animate-pulse'
              }
            >
              {viewMode === 'grid' ? (
                <>
                  <div className="aspect-[3/4] bg-ash-700" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-ash-700 rounded" />
                    <div className="h-3 bg-ash-700 rounded w-3/4" />
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-20 bg-ash-700 rounded" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-ash-700 rounded" />
                    <div className="h-3 bg-ash-700 rounded w-3/4" />
                    <div className="h-3 bg-ash-700 rounded w-1/2" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="text-center py-12">
        <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-xl p-8 max-w-md mx-auto">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">
            Search Error
          </h3>
          <p className="text-ash-400 mb-6">
            Something went wrong while searching. Please try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors mx-auto"
          >
            <ArrowPathIcon className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  // No results
  if (!results?.pages?.length || results.pages.every((page: any) => !page.anime?.length)) {
    return (
      <div className="text-center py-12">
        <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-xl p-8 max-w-md mx-auto">
          <MagnifyingGlassIcon className="w-16 h-16 text-ash-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">
            No Results Found
          </h3>
          <p className="text-ash-400 mb-6">
            {searchTerm 
              ? `No anime found for "${searchTerm}". Try different keywords or adjust your filters.`
              : 'No anime match your current filters. Try adjusting your search criteria.'
            }
          </p>
          
          {/* Search suggestions */}
          <div className="space-y-3">
            <p className="text-ash-500 text-sm">Suggestions:</p>
            <ul className="text-ash-400 text-sm space-y-1">
              <li>• Check your spelling</li>
              <li>• Try more general terms</li>
              <li>• Remove some filters</li>
              <li>• Browse popular anime instead</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Results
  const allAnime = results.pages.flatMap((page: any) => page.anime || []);

  return (
    <div className="space-y-6">
      {/* Results Grid/List */}
      <div className={
        viewMode === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6'
          : 'space-y-4'
      }>
        {allAnime.map((anime: any, index: number) => (
          <motion.div
            key={`${anime.id}-${index}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            {viewMode === 'grid' ? (
              <div onClick={() => handleAnimeClick(anime)} className="cursor-pointer">
                <AnimeCard
                  anime={anime}
                  index={index}
                />
              </div>
            ) : (
              /* List View */
              <div
                onClick={() => handleAnimeClick(anime)}
                className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-xl p-4 hover:bg-white/15 transition-all cursor-pointer"
              >
                <div className="flex items-center space-x-4">
                  {/* Thumbnail */}
                  <div className="relative w-16 h-20 bg-ash-700 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={anime.image}
                      alt={anime.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder-anime.jpg';
                      }}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium text-lg truncate">
                      {anime.title}
                    </h3>
                    
                    <div className="flex items-center space-x-4 mt-1 text-sm text-ash-400">
                      <span>{anime.year}</span>
                      <span>•</span>
                      <span>{anime.episodes} episodes</span>
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span>{anime.rating?.toFixed(1)}</span>
                      </div>
                    </div>

                    {/* Genres */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {anime.genres?.slice(0, 3).map((genre: string) => (
                        <span
                          key={genre}
                          className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded"
                        >
                          {genre}
                        </span>
                      ))}
                      {anime.genres?.length > 3 && (
                        <span className="px-2 py-1 bg-ash-700/50 text-ash-400 text-xs rounded">
                          +{anime.genres.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {anime.description && (
                      <p className="text-ash-400 text-sm mt-2 line-clamp-2">
                        {anime.description.replace(/<[^>]*>/g, '')}
                      </p>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="flex-shrink-0">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      anime.status === 'SUB' 
                        ? 'bg-blue-500/20 text-blue-400'
                        : anime.status === 'BOTH'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-purple-500/20 text-purple-400'
                    }`}>
                      {anime.status}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Load More Button */}
      {hasNextPage && (
        <div className="text-center pt-8">
          <button
            onClick={fetchNextPage}
            disabled={isFetchingNextPage}
            className="flex items-center space-x-2 px-6 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-500/50 text-white rounded-lg transition-colors mx-auto"
          >
            {isFetchingNextPage ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                <span>Loading...</span>
              </>
            ) : (
              <>
                <ArrowPathIcon className="w-4 h-4" />
                <span>Load More</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}