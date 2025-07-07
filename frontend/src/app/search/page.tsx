'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  Squares2X2Icon, 
  ListBulletIcon,
  ClockIcon,
  FireIcon,
  StarIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import SearchFilters from '@/components/search/SearchFilters';
import SearchResults from '@/components/search/SearchResults';
import SearchHistory from '@/components/search/SearchHistory';
import TrendingSearches from '@/components/search/TrendingSearches';
import DiscoveryFeeds from '@/components/search/DiscoveryFeeds';
import RecommendationEngine from '@/components/search/RecommendationEngine';
import { useAdvancedSearch } from '@/lib/hooks/useAdvancedSearch';
import { useAuth } from '@/lib/hooks/useAuth';

interface SearchFilters {
  genres: string[];
  year: string;
  status: string;
  format: string;
  sort: string;
  minScore: number;
  maxScore: number;
  minEpisodes: number;
  maxEpisodes: number;
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'discover' | 'recommendations'>('search');
  
  const [filters, setFilters] = useState<SearchFilters>({
    genres: [],
    year: '',
    status: '',
    format: '',
    sort: 'POPULARITY_DESC',
    minScore: 0,
    maxScore: 100,
    minEpisodes: 0,
    maxEpisodes: 999
  });

  // Use advanced search hook
  const {
    data: searchResults,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  } = useAdvancedSearch({
    searchTerm: searchTerm.trim(),
    filters,
    enabled: searchTerm.length > 0 || Object.values(filters).some(v => 
      Array.isArray(v) ? v.length > 0 : v !== '' && v !== 0 && v !== 999
    )
  });

  // Update URL when search term changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) {
      params.set('q', searchTerm);
    }
    
    const newUrl = `/search${params.toString() ? `?${params.toString()}` : ''}`;
    router.replace(newUrl, { scroll: false });
  }, [searchTerm, router]);

  // Initialize search term from URL
  useEffect(() => {
    const urlSearchTerm = searchParams.get('q');
    if (urlSearchTerm && urlSearchTerm !== searchTerm) {
      setSearchTerm(urlSearchTerm);
    }
  }, [searchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setActiveTab('search');
    }
  };

  const handleFilterChange = (newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({
      genres: [],
      year: '',
      status: '',
      format: '',
      sort: 'POPULARITY_DESC',
      minScore: 0,
      maxScore: 100,
      minEpisodes: 0,
      maxEpisodes: 999
    });
  };

  const hasActiveFilters = Object.values(filters).some(v => 
    Array.isArray(v) ? v.length > 0 : v !== '' && v !== 0 && v !== 999
  );

  const totalResults: number = searchResults?.pages.reduce((total: number, page: any) => total + page.anime.length, 0) || 0;

  return (
    <div className="min-h-screen bg-ash-900 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Discover Anime
          </h1>
          
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-ash-800/30 rounded-lg p-1 mb-6">
            {[
              { id: 'search', label: 'Search', icon: MagnifyingGlassIcon },
              { id: 'discover', label: 'Discover', icon: FireIcon },
              { id: 'recommendations', label: 'For You', icon: StarIcon }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-md text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-purple-500 text-white'
                      : 'text-ash-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <AnimatePresence>
            {activeTab === 'search' && (
              <div className="glass backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl p-6">
                <form onSubmit={handleSearchSubmit} className="space-y-4">
                  {/* Main Search Input */}
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-ash-400" />
                    <input
                      type="text"
                      placeholder="Search for anime titles, genres, studios..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-ash-800/50 border border-white/10 rounded-lg text-white placeholder-ash-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
                    />
                  </div>

                  {/* Search Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Filter Toggle */}
                      <button
                        type="button"
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                          showFilters || hasActiveFilters
                            ? 'bg-purple-500 text-white'
                            : 'bg-ash-800/50 text-ash-300 hover:text-white hover:bg-ash-700/50'
                        }`}
                      >
                        <FunnelIcon className="w-4 h-4" />
                        <span>Filters</span>
                        {hasActiveFilters && (
                          <span className="bg-white/20 text-xs px-2 py-1 rounded-full">
                            Active
                          </span>
                        )}
                      </button>

                      {/* Clear Filters */}
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="text-ash-400 hover:text-white text-sm transition-colors"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center space-x-2">
                      <div className="glass backdrop-blur-[14px] bg-white/5 border border-white/10 rounded-lg p-1 flex">
                        <button
                          type="button"
                          onClick={() => setViewMode('grid')}
                          className={`p-2 rounded-md transition-all ${
                            viewMode === 'grid'
                              ? 'bg-purple-500 text-white'
                              : 'text-ash-300 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <Squares2X2Icon className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode('list')}
                          className={`p-2 rounded-md transition-all ${
                            viewMode === 'list'
                              ? 'bg-purple-500 text-white'
                              : 'text-ash-300 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <ListBulletIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </form>

                {/* Advanced Filters */}
                <AnimatePresence>
                  {showFilters && (
                    <div className="mt-6 pt-6 border-t border-white/10">
                      <SearchFilters
                        filters={filters}
                        onFiltersChange={handleFilterChange}
                        onClear={clearFilters}
                      />
                    </div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'search' && (
              <>
                {searchTerm || hasActiveFilters ? (
                  <>
                    {/* Results Header */}
                    {totalResults > 0 && (
                      <div className="mb-6 flex items-center justify-between">
                        <div className="text-ash-300">
                          <span className="text-white font-medium">{totalResults}</span> results
                          {searchTerm && (
                            <span> for "<span className="text-white">{searchTerm}</span>"</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Search Results */}
                    <SearchResults
                      results={searchResults}
                      isLoading={isLoading}
                      isError={isError}
                      viewMode={viewMode}
                      hasNextPage={hasNextPage}
                      fetchNextPage={fetchNextPage}
                      isFetchingNextPage={isFetchingNextPage}
                      searchTerm={searchTerm}
                    />
                  </>
                ) : (
                  /* Empty Search State */
                  <div className="text-center py-12">
                    <MagnifyingGlassIcon className="w-16 h-16 text-ash-400 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-white mb-2">
                      Start your anime discovery
                    </h3>
                    <p className="text-ash-400 mb-6">
                      Search for anime titles, explore genres, or use filters to find your next favorite series.
                    </p>
                    
                    {/* Quick Search Suggestions */}
                    <div className="flex flex-wrap justify-center gap-2">
                      {['Attack on Titan', 'Demon Slayer', 'One Piece', 'Jujutsu Kaisen', 'Naruto'].map(suggestion => (
                        <button
                          key={suggestion}
                          onClick={() => setSearchTerm(suggestion)}
                          className="px-4 py-2 bg-ash-800/50 hover:bg-ash-700/50 text-ash-300 hover:text-white rounded-lg transition-all text-sm"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'discover' && (
              <DiscoveryFeeds />
            )}

            {activeTab === 'recommendations' && (
              <RecommendationEngine userId={user?.id} />
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Search History */}
            {user && activeTab === 'search' && (
              <SearchHistory
                userId={user.id}
                onSearchSelect={setSearchTerm}
              />
            )}

            {/* Trending Searches */}
            <TrendingSearches
              onSearchSelect={setSearchTerm}
            />

            {/* Quick Filters */}
            <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-xl p-6">
              <h3 className="text-white font-medium mb-4 flex items-center space-x-2">
                <CalendarIcon className="w-4 h-4" />
                <span>Quick Filters</span>
              </h3>
              <div className="space-y-2">
                {[
                  { label: 'Currently Airing', filter: { status: 'RELEASING' } },
                  { label: 'Completed Series', filter: { status: 'FINISHED' } },
                  { label: 'Movies', filter: { format: 'MOVIE' } },
                  { label: 'High Rated (8.0+)', filter: { minScore: 80 } },
                  { label: 'Short Series (≤12 eps)', filter: { maxEpisodes: 12 } }
                ].map(quickFilter => (
                  <button
                    key={quickFilter.label}
                    onClick={() => {
                      handleFilterChange(quickFilter.filter);
                      setActiveTab('search');
                    }}
                    className="w-full text-left px-3 py-2 text-ash-300 hover:text-white hover:bg-white/10 rounded-lg transition-all text-sm"
                  >
                    {quickFilter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-ash-900 pt-20 flex items-center justify-center">
        <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-xl p-8">
          <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-white text-center">Loading search...</p>
        </div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}