'use client';

import Navigation from '@/components/Navigation';
import HeroSection from '@/components/HeroSection';
import AnimeCarousel from '@/components/AnimeCarousel';
import QueryProvider from '@/lib/providers/QueryProvider';
import { useMultipleGenres } from '@/lib/hooks/useAnime';

function HomePage() {
  const { trending, popular, action, comedy, featured, isLoading, isError } = useMultipleGenres();

  if (isError) {
    return (
      <div className="min-h-screen bg-ash-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Something went wrong</h1>
          <p className="text-ash-400">Failed to load anime data. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ash-900">
      {/* Navigation */}
      <Navigation />

      {/* Hero Section */}
      <HeroSection featuredAnime={featured.data} isLoading={featured.isLoading} />

      {/* Content Sections */}
      <div className="relative z-10 bg-ash-900 -mt-32 pt-32">
        {/* Trending Anime */}
        {trending.data?.anime && (
          <AnimeCarousel 
            title="Trending Now" 
            animeList={trending.data.anime} 
            isLoading={trending.isLoading}
          />
        )}

        {/* Popular Anime */}
        {popular.data?.anime && (
          <AnimeCarousel 
            title="Popular This Season" 
            animeList={popular.data.anime}
            isLoading={popular.isLoading}
          />
        )}

        {/* Action Anime */}
        {action.data?.anime && (
          <AnimeCarousel 
            title="Action & Adventure" 
            animeList={action.data.anime}
            isLoading={action.isLoading}
          />
        )}

        {/* Comedy Anime */}
        {comedy.data?.anime && (
          <AnimeCarousel 
            title="Comedy" 
            animeList={comedy.data.anime}
            isLoading={comedy.isLoading}
          />
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-20">
            <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-lg p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
              <p className="text-white mt-4 text-center">Loading anime data...</p>
            </div>
          </div>
        )}

        {/* Footer Spacing */}
        <div className="h-20" />
      </div>
    </div>
  );
}

// Wrap the component with QueryProvider
export default function HomePageWithProvider() {
  return (
    <QueryProvider>
      <HomePage />
    </QueryProvider>
  );
}