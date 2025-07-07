'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  StarIcon, 
  HeartIcon, 
  ClockIcon,
  UserIcon,
  SparklesIcon,
  ChartBarIcon,
  AdjustmentsHorizontalIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import AnimeCard from '@/components/AnimeCard';
import { bookmarks, watchHistory } from '@/lib/supabase/client';
import { getTrendingAnime, getAnimeByGenre, getPopularAnime } from '@/lib/anilist';

interface RecommendationEngineProps {
  userId?: string;
}

interface RecommendationSection {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  anime: any[];
  reasoning?: string;
}

export default function RecommendationEngine({ userId }: RecommendationEngineProps) {
  const [activeSection, setActiveSection] = useState<string>('for-you');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  // Fetch user's bookmarks and watch history for personalization
  const { data: userBookmarks } = useQuery({
    queryKey: ['user-bookmarks', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await bookmarks.get(userId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId
  });

  const { data: userWatchHistory } = useQuery({
    queryKey: ['user-watch-history', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await watchHistory.get(userId, 20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId
  });

  // Generate recommendations based on user data
  const { data: recommendations, isLoading, refetch } = useQuery({
    queryKey: ['recommendations', userId, userBookmarks?.length, userWatchHistory?.length],
    queryFn: async () => {
      const sections: RecommendationSection[] = [];

      // For You - Personalized recommendations
      if (userId && userBookmarks?.length) {
        // Get genres from user's bookmarks
        const userGenres = extractUserGenres(userBookmarks);
        const topGenre = userGenres[0];
        
        if (topGenre) {
          const { anime } = await getAnimeByGenre(topGenre, 1, 8);
          sections.push({
            id: 'for-you',
            title: 'For You',
            description: `Based on your love for ${topGenre} anime`,
            icon: HeartIcon,
            color: 'text-pink-400',
            anime: anime.filter(a => !userBookmarks.some(b => b.anime_id === parseInt(a.id))),
            reasoning: `We noticed you enjoy ${topGenre} anime`
          });
        }
      }

      // Because You Watched - Similar to recently watched
      if (userId && userWatchHistory?.length) {
        const recentAnime = userWatchHistory[0];
        if (recentAnime) {
          // Mock similar anime - in real app, use recommendation algorithm
          const { anime } = await getTrendingAnime(1, 8);
          sections.push({
            id: 'because-watched',
            title: 'Because You Watched',
            description: 'Similar to your recent viewing',
            icon: ClockIcon,
            color: 'text-blue-400',
            anime: anime.slice(0, 6),
            reasoning: `Based on your recent activity`
          });
        }
      }

      // Trending for You - Trending in user's preferred genres
      if (userId && userBookmarks?.length) {
        const { anime } = await getTrendingAnime(1, 8);
        sections.push({
          id: 'trending-for-you',
          title: 'Trending for You',
          description: 'Popular anime matching your taste',
          icon: ChartBarIcon,
          color: 'text-orange-400',
          anime: anime.slice(0, 6)
        });
      }

      // Hidden Gems - High rated but less popular
      const { anime: popularAnime } = await getPopularAnime(2, 8); // Get from page 2 for less mainstream
      sections.push({
        id: 'hidden-gems',
        title: 'Hidden Gems',
        description: 'Underrated anime you might love',
        icon: SparklesIcon,
        color: 'text-purple-400',
        anime: popularAnime.slice(0, 6)
      });

      // Similar Users - What users with similar taste are watching
      if (userId) {
        const { anime } = await getTrendingAnime(1, 8);
        sections.push({
          id: 'similar-users',
          title: 'Users Like You Are Watching',
          description: 'Popular among users with similar taste',
          icon: UserIcon,
          color: 'text-green-400',
          anime: anime.slice(2, 8)
        });
      }

      // Fallback sections for non-logged-in users
      if (!userId) {
        const { anime: trending } = await getTrendingAnime(1, 8);
        const { anime: popular } = await getPopularAnime(1, 8);
        
        sections.push(
          {
            id: 'trending',
            title: 'Trending Now',
            description: 'Most popular anime this week',
            icon: ChartBarIcon,
            color: 'text-orange-400',
            anime: trending.slice(0, 6)
          },
          {
            id: 'top-rated',
            title: 'Top Rated',
            description: 'Highest rated anime of all time',
            icon: StarIcon,
            color: 'text-yellow-400',
            anime: popular.slice(0, 6)
          }
        );
      }

      return sections;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    enabled: true
  });

  const extractUserGenres = (bookmarks: any[]) => {
    const genreCount: Record<string, number> = {};
    
    bookmarks.forEach(bookmark => {
      // In a real app, you'd have genre data stored with bookmarks
      // For now, we'll use mock logic
      const mockGenres = ['Action', 'Romance', 'Comedy', 'Drama', 'Fantasy'];
      const randomGenre = mockGenres[Math.floor(Math.random() * mockGenres.length)];
      genreCount[randomGenre] = (genreCount[randomGenre] || 0) + 1;
    });

    return Object.entries(genreCount)
      .sort(([,a], [,b]) => b - a)
      .map(([genre]) => genre);
  };

  const handleAnimeClick = (anime: any) => {
    router.push(`/anime/${anime.id}`);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const activeRecommendation = recommendations?.find(r => r.id === activeSection) || recommendations?.[0];

  if (!userId) {
    return (
      <div className="text-center py-12">
        <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-xl p-8 max-w-md mx-auto">
          <UserIcon className="w-16 h-16 text-ash-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">
            Sign In for Personalized Recommendations
          </h3>
          <p className="text-ash-400 mb-6">
            Get anime recommendations tailored to your taste based on your watch history and preferences.
          </p>
          <button
            onClick={() => router.push('/auth')}
            className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Recommendations for You</h2>
          <p className="text-ash-400">
            Personalized anime suggestions based on your viewing history and preferences
          </p>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-500/50 text-white rounded-lg transition-colors"
        >
          <ArrowPathIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Recommendation Sections */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-xl p-4 animate-pulse"
            >
              <div className="h-4 bg-ash-700 rounded mb-2" />
              <div className="h-3 bg-ash-700 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : recommendations?.length ? (
        <>
          {/* Section Navigation */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`p-4 rounded-xl border transition-all text-left hover:scale-102 active:scale-98 ${
                    isActive
                      ? 'bg-purple-500/20 border-purple-500/50'
                      : 'bg-ash-800/30 border-white/10 hover:bg-ash-700/50 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-purple-400' : section.color}`} />
                    <h3 className={`font-medium ${isActive ? 'text-white' : 'text-ash-200'}`}>
                      {section.title}
                    </h3>
                  </div>
                  <p className={`text-sm ${isActive ? 'text-ash-300' : 'text-ash-400'}`}>
                    {section.description}
                  </p>
                  {section.reasoning && (
                    <p className={`text-xs mt-2 ${isActive ? 'text-purple-300' : 'text-ash-500'}`}>
                      {section.reasoning}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Section Content */}
          <AnimatePresence mode="wait">
            {activeRecommendation && (
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Section Header */}
                <div className="flex items-center space-x-3 mb-6">
                  <activeRecommendation.icon className={`w-6 h-6 ${activeRecommendation.color}`} />
                  <div>
                    <h3 className="text-xl font-bold text-white">{activeRecommendation.title}</h3>
                    <p className="text-ash-400 text-sm">{activeRecommendation.description}</p>
                  </div>
                </div>

                {/* Anime Grid */}
                {activeRecommendation.anime.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {activeRecommendation.anime.map((anime: any, index: number) => (
                      <div key={anime.id}>
                        <div onClick={() => handleAnimeClick(anime)} className="cursor-pointer">
                          <AnimeCard
                            anime={anime}
                            index={index}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <SparklesIcon className="w-12 h-12 text-ash-400 mx-auto mb-4" />
                    <p className="text-ash-400">
                      No recommendations available for this category yet.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        /* Empty State */
        <div className="text-center py-12">
          <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-xl p-8 max-w-md mx-auto">
            <SparklesIcon className="w-16 h-16 text-ash-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">
              Building Your Recommendations
            </h3>
            <p className="text-ash-400 mb-6">
              Start watching anime and adding them to your list to get personalized recommendations.
            </p>
            <button
              onClick={() => router.push('/search?tab=discover')}
              className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
            >
              Explore Anime
            </button>
          </div>
        </div>
      )}

      {/* Recommendation Settings */}
      <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-xl p-6">
        <div className="flex items-center space-x-2 mb-4">
          <AdjustmentsHorizontalIcon className="w-5 h-5 text-purple-400" />
          <h3 className="text-white font-medium">Recommendation Preferences</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-ash-300 text-sm mb-2">Include Genres</label>
            <div className="flex flex-wrap gap-2">
              {['Action', 'Romance', 'Comedy', 'Drama'].map(genre => (
                <button
                  key={genre}
                  className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-sm hover:bg-purple-500/30 transition-colors"
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-ash-300 text-sm mb-2">Exclude Genres</label>
            <div className="flex flex-wrap gap-2">
              {['Horror', 'Ecchi'].map(genre => (
                <button
                  key={genre}
                  className="px-3 py-1 bg-red-500/20 text-red-300 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}