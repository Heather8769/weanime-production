'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FireIcon, 
  StarIcon, 
  CalendarIcon,
  TrophyIcon,
  ClockIcon,
  SparklesIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import AnimeCard from '@/components/AnimeCard';
import { useTrendingAnime, usePopularAnime, useAnimeByGenre } from '@/lib/hooks/useAnime';

interface DiscoverySection {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
}

const DISCOVERY_SECTIONS: DiscoverySection[] = [
  {
    id: 'trending',
    title: 'Trending Now',
    description: 'Most popular anime this week',
    icon: FireIcon,
    color: 'text-orange-400'
  },
  {
    id: 'top-rated',
    title: 'Top Rated',
    description: 'Highest rated anime of all time',
    icon: StarIcon,
    color: 'text-yellow-400'
  },
  {
    id: 'seasonal',
    title: 'This Season',
    description: 'Currently airing anime',
    icon: CalendarIcon,
    color: 'text-blue-400'
  },
  {
    id: 'action',
    title: 'Action Packed',
    description: 'High-octane action anime',
    icon: TrophyIcon,
    color: 'text-red-400'
  },
  {
    id: 'romance',
    title: 'Romance',
    description: 'Heartwarming romantic stories',
    icon: SparklesIcon,
    color: 'text-pink-400'
  },
  {
    id: 'recent',
    title: 'Recently Added',
    description: 'Latest additions to our catalog',
    icon: ClockIcon,
    color: 'text-green-400'
  }
];

export default function DiscoveryFeeds() {
  const [activeSection, setActiveSection] = useState('trending');
  const router = useRouter();

  // Fetch data for different sections
  const { data: trendingData, isLoading: trendingLoading } = useTrendingAnime(1, 12);
  const { data: popularData, isLoading: popularLoading } = usePopularAnime(1, 12);
  const { data: actionData, isLoading: actionLoading } = useAnimeByGenre('Action', 1, 12);
  const { data: romanceData, isLoading: romanceLoading } = useAnimeByGenre('Romance', 1, 12);

  const getSectionData = (sectionId: string) => {
    switch (sectionId) {
      case 'trending':
        return { data: trendingData, isLoading: trendingLoading };
      case 'top-rated':
        return { data: popularData, isLoading: popularLoading };
      case 'seasonal':
        return { data: trendingData, isLoading: trendingLoading }; // Mock with trending for now
      case 'action':
        return { data: actionData, isLoading: actionLoading };
      case 'romance':
        return { data: romanceData, isLoading: romanceLoading };
      case 'recent':
        return { data: popularData, isLoading: popularLoading }; // Mock with popular for now
      default:
        return { data: null, isLoading: false };
    }
  };

  const handleAnimeClick = (anime: any) => {
    router.push(`/anime/${anime.id}`);
  };

  const activeData = getSectionData(activeSection);
  const currentSection = DISCOVERY_SECTIONS.find(s => s.id === activeSection);

  return (
    <div className="space-y-8">
      {/* Section Navigation */}
      <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Discover Anime</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DISCOVERY_SECTIONS.map((section) => {
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
                  <ChevronRightIcon className={`w-4 h-4 ml-auto transition-transform ${
                    isActive ? 'rotate-90 text-purple-400' : 'text-ash-400'
                  }`} />
                </div>
                <p className={`text-sm ${isActive ? 'text-ash-300' : 'text-ash-400'}`}>
                  {section.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Section Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Section Header */}
          {currentSection && (
            <div className="flex items-center space-x-3 mb-6">
              <currentSection.icon className={`w-6 h-6 ${currentSection.color}`} />
              <div>
                <h3 className="text-xl font-bold text-white">{currentSection.title}</h3>
                <p className="text-ash-400 text-sm">{currentSection.description}</p>
              </div>
            </div>
          )}

          {/* Content */}
          {activeData.isLoading ? (
            /* Loading State */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-xl overflow-hidden animate-pulse"
                >
                  <div className="aspect-[3/4] bg-ash-700" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-ash-700 rounded" />
                    <div className="h-3 bg-ash-700 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : activeData.data?.anime?.length ? (
            /* Anime Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {activeData.data.anime.map((anime: any, index: number) => (
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
            /* Empty State */
            <div className="text-center py-12">
              <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-xl p-8 max-w-md mx-auto">
                {currentSection && (
                  <currentSection.icon className={`w-16 h-16 ${currentSection.color} mx-auto mb-4`} />
                )}
                <h3 className="text-xl font-medium text-white mb-2">
                  No Content Available
                </h3>
                <p className="text-ash-400">
                  We're working on adding more content to this section. Check back soon!
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Featured Collections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Seasonal Highlights */}
        <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-xl p-6">
          <div className="flex items-center space-x-2 mb-4">
            <CalendarIcon className="w-5 h-5 text-blue-400" />
            <h3 className="text-white font-medium">Seasonal Highlights</h3>
          </div>
          
          <div className="space-y-3">
            {[
              { title: 'Winter 2024 Premieres', count: 45, color: 'bg-blue-500/20 text-blue-400' },
              { title: 'Continuing Series', count: 23, color: 'bg-green-500/20 text-green-400' },
              { title: 'Season Finales', count: 18, color: 'bg-orange-500/20 text-orange-400' }
            ].map(item => (
              <button
                key={item.title}
                onClick={() => setActiveSection('seasonal')}
                className="w-full flex items-center justify-between p-3 bg-ash-800/30 hover:bg-ash-700/50 rounded-lg transition-all"
              >
                <span className="text-ash-300">{item.title}</span>
                <span className={`px-2 py-1 rounded text-xs ${item.color}`}>
                  {item.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Genre Spotlight */}
        <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-xl p-6">
          <div className="flex items-center space-x-2 mb-4">
            <SparklesIcon className="w-5 h-5 text-purple-400" />
            <h3 className="text-white font-medium">Genre Spotlight</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {[
              { genre: 'Isekai', color: 'bg-purple-500/20 text-purple-400' },
              { genre: 'Slice of Life', color: 'bg-green-500/20 text-green-400' },
              { genre: 'Psychological', color: 'bg-red-500/20 text-red-400' },
              { genre: 'Sports', color: 'bg-blue-500/20 text-blue-400' },
              { genre: 'Music', color: 'bg-pink-500/20 text-pink-400' },
              { genre: 'Historical', color: 'bg-yellow-500/20 text-yellow-400' }
            ].map(item => (
              <button
                key={item.genre}
                onClick={() => {
                  // In a real app, you'd filter by this genre
                  setActiveSection('trending');
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 ${item.color}`}
              >
                {item.genre}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-xl p-6">
        <h3 className="text-white font-medium mb-4">Platform Statistics</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Anime', value: '15,000+', icon: FireIcon, color: 'text-orange-400' },
            { label: 'Episodes', value: '500k+', icon: ClockIcon, color: 'text-blue-400' },
            { label: 'Genres', value: '30+', icon: SparklesIcon, color: 'text-purple-400' },
            { label: 'Studios', value: '200+', icon: StarIcon, color: 'text-yellow-400' }
          ].map(stat => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="text-center">
                <Icon className={`w-6 h-6 ${stat.color} mx-auto mb-2`} />
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-ash-400 text-sm">{stat.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}