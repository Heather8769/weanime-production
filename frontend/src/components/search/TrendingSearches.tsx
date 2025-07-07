'use client';

import { motion } from 'framer-motion';
import { 
  FireIcon, 
  ArrowTrendingUpIcon as TrendingUpIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import { searchHistory } from '@/lib/supabase/client';

interface TrendingSearchesProps {
  onSearchSelect: (searchTerm: string) => void;
}

// Mock trending data - in a real app this would come from analytics
const MOCK_TRENDING = [
  { term: 'Attack on Titan', count: 1250, trend: 'up' },
  { term: 'Demon Slayer', count: 980, trend: 'up' },
  { term: 'Jujutsu Kaisen', count: 875, trend: 'stable' },
  { term: 'One Piece', count: 720, trend: 'down' },
  { term: 'Chainsaw Man', count: 650, trend: 'up' },
  { term: 'Spy x Family', count: 580, trend: 'up' },
  { term: 'Mob Psycho 100', count: 420, trend: 'stable' },
  { term: 'Tokyo Revengers', count: 380, trend: 'down' }
];

const SEASONAL_TRENDING = [
  'Winter 2024 anime',
  'Currently airing',
  'New releases',
  'Popular this week'
];

export default function TrendingSearches({ onSearchSelect }: TrendingSearchesProps) {
  // Fetch popular searches from the last week
  const { data: popularSearches, isLoading } = useQuery({
    queryKey: ['popular-searches'],
    queryFn: async () => {
      const { data, error } = await searchHistory.getPopular(8);
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    initialData: []
  });

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon className="w-3 h-3 text-green-400" />;
      case 'down':
        return <TrendingUpIcon className="w-3 h-3 text-red-400 rotate-180" />;
      default:
        return <div className="w-3 h-3 bg-ash-500 rounded-full" />;
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  return (
    <div className="space-y-6">
      {/* Trending Searches */}
      <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-xl p-6">
        <div className="flex items-center space-x-2 mb-4">
          <FireIcon className="w-4 h-4 text-orange-400" />
          <h3 className="text-white font-medium">Trending Searches</h3>
        </div>

        <div className="space-y-2">
          {MOCK_TRENDING.slice(0, 6).map((item, index) => (
            <button
              key={item.term}
              onClick={() => onSearchSelect(item.term)}
              className="w-full text-left px-3 py-2 hover:bg-white/10 rounded-lg transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-ash-400 text-xs font-mono w-4">
                    #{index + 1}
                  </span>
                  <span className="text-ash-300 group-hover:text-white transition-colors text-sm">
                    {item.term}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-ash-500 text-xs">
                    {formatCount(item.count)}
                  </span>
                  {getTrendIcon(item.trend)}
                  <MagnifyingGlassIcon className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-ash-400" />
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* View All Trending */}
        <button
          onClick={() => onSearchSelect('trending anime')}
          className="w-full mt-4 pt-3 border-t border-white/10 text-center text-ash-400 hover:text-purple-400 text-sm transition-colors"
        >
          View all trending →
        </button>
      </div>

      {/* Seasonal & Quick Searches */}
      <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-xl p-6">
        <div className="flex items-center space-x-2 mb-4">
          <TrendingUpIcon className="w-4 h-4 text-purple-400" />
          <h3 className="text-white font-medium">Quick Searches</h3>
        </div>

        <div className="space-y-2">
          {SEASONAL_TRENDING.map((term, index) => (
            <button
              key={term}
              onClick={() => onSearchSelect(term)}
              className="w-full text-left px-3 py-2 text-ash-300 hover:text-white hover:bg-white/10 rounded-lg transition-all text-sm group"
            >
              <div className="flex items-center justify-between">
                <span>{term}</span>
                <MagnifyingGlassIcon className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Popular Genres */}
      <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-xl p-6">
        <h3 className="text-white font-medium mb-4">Popular Genres</h3>
        
        <div className="grid grid-cols-2 gap-2">
          {['Action', 'Romance', 'Comedy', 'Drama', 'Fantasy', 'Sci-Fi'].map(genre => (
            <button
              key={genre}
              onClick={() => onSearchSelect(genre)}
              className="px-3 py-2 bg-ash-800/50 hover:bg-purple-500/20 text-ash-300 hover:text-purple-300 rounded-lg transition-all text-sm"
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* Search Tips */}
      <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-xl p-6">
        <h3 className="text-white font-medium mb-4">Search Tips</h3>
        
        <div className="space-y-3 text-sm text-ash-400">
          <div className="flex items-start space-x-2">
            <span className="text-purple-400 font-mono">•</span>
            <span>Use quotes for exact matches: "Attack on Titan"</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-purple-400 font-mono">•</span>
            <span>Search by studio: "Studio Ghibli"</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-purple-400 font-mono">•</span>
            <span>Find by year: "2023 anime"</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-purple-400 font-mono">•</span>
            <span>Combine terms: "action comedy anime"</span>
          </div>
        </div>
      </div>
    </div>
  );
}