'use client'

import { useState } from 'react'
import { useSearchAnime } from '@/hooks/use-anime'
import { AdvancedSearch } from '@/components/advanced-search'
import { AnimeCard } from '@/components/anime-card'
import { Button } from '@/components/ui/button'

interface SearchFilters {
  search: string
  genre: string
  year: number | null
  season: string
  format: string
  status: string
  sort: string
}

export default function BrowsePage() {
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    search: '',
    genre: '',
    year: null,
    season: '',
    format: '',
    status: '',
    sort: 'POPULARITY_DESC',
  })

  const [hasSearched, setHasSearched] = useState(false)

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSearchAnime({
    search: searchFilters.search || undefined,
    genre: searchFilters.genre || undefined,
    year: searchFilters.year || undefined,
    season: searchFilters.season || undefined,
    format: searchFilters.format || undefined,
    status: searchFilters.status || undefined,
    sort: [searchFilters.sort],
  })

  const handleSearch = (filters: SearchFilters) => {
    setSearchFilters(filters)
    setHasSearched(true)
  }

  const allAnime = data?.pages.flatMap((page: any) => page.Page.media) || []
  const totalResults = (data?.pages[0] as any)?.Page.pageInfo.total || 0

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Enhanced Header */}
      <div className="glass-card p-8 rounded-xl border border-white/10 space-y-4">
        <h1 className="text-4xl font-bold text-white hero-text">Browse Anime</h1>
        <p className="text-white/80 text-lg">
          Discover your next favorite anime with our advanced search and filtering options.
        </p>
      </div>

      {/* Search Component */}
      <AdvancedSearch onSearch={handleSearch} isLoading={isLoading} />

      {/* Results */}
      {hasSearched && (
        <div className="space-y-6">
          {/* Enhanced Results Header */}
          {!isLoading && !error && (
            <div className="glass-card p-6 rounded-xl border border-white/10">
              <h2 className="text-2xl font-semibold text-white">
                Search Results
                {totalResults > 0 && (
                  <span className="text-white/70 font-normal ml-2">
                    ({totalResults.toLocaleString()} results)
                  </span>
                )}
              </h2>
            </div>
          )}

          {/* Enhanced Loading State */}
          {isLoading && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="aspect-[3/4] glass-card rounded-xl shimmer" />
                  <div className="h-4 glass-card rounded shimmer" />
                  <div className="h-3 glass-card rounded shimmer w-2/3" />
                </div>
              ))}
            </div>
          )}

          {/* Enhanced Error State */}
          {error && (
            <div className="glass-card p-12 rounded-xl border border-white/10 text-center">
              <div className="space-y-4">
                <div className="text-6xl">😞</div>
                <h3 className="text-xl font-semibold text-white">Something went wrong</h3>
                <p className="text-white/70">
                  Failed to load anime results. Please try again.
                </p>
                <Button
                  onClick={() => handleSearch(searchFilters)}
                  className="anime-gradient hover:opacity-90 glow-effect-hover"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Enhanced No Results */}
          {!isLoading && !error && allAnime.length === 0 && (
            <div className="glass-card p-12 rounded-xl border border-white/10 text-center">
              <div className="space-y-4">
                <div className="text-6xl">🔍</div>
                <h3 className="text-xl font-semibold text-white">No anime found</h3>
                <p className="text-white/70">
                  Try adjusting your search criteria or filters.
                </p>
              </div>
            </div>
          )}

          {/* Results Grid */}
          {!isLoading && !error && allAnime.length > 0 && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {allAnime.map((anime) => (
                  <AnimeCard
                    key={anime.id}
                    anime={anime}
                    variant="default"
                    showDetails={true}
                  />
                ))}
              </div>

              {/* Enhanced Load More Button */}
              {hasNextPage && (
                <div className="text-center pt-8">
                  <Button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="glass-card border border-white/20 text-white hover:bg-white/10 glow-effect-hover"
                    size="lg"
                  >
                    {isFetchingNextPage ? 'Loading...' : 'Load More'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Default State - Show Popular Genres */}
      {!hasSearched && (
        <div className="space-y-8">
          <div className="glass-card p-8 rounded-xl border border-white/10 text-center space-y-4">
            <h2 className="text-2xl font-semibold text-white">Popular Genres</h2>
            <p className="text-white/80">
              Start by exploring these popular anime genres
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { name: 'Action', color: 'from-red-500 to-orange-500' },
              { name: 'Romance', color: 'from-pink-500 to-rose-500' },
              { name: 'Comedy', color: 'from-yellow-500 to-amber-500' },
              { name: 'Drama', color: 'from-purple-500 to-violet-500' },
              { name: 'Fantasy', color: 'from-blue-500 to-cyan-500' },
              { name: 'Sci-Fi', color: 'from-green-500 to-emerald-500' },
              { name: 'Slice of Life', color: 'from-teal-500 to-cyan-500' },
              { name: 'Sports', color: 'from-orange-500 to-red-500' },
            ].map((genre) => (
              <button
                key={genre.name}
                onClick={() => handleSearch({ ...searchFilters, genre: genre.name })}
                className={`relative glass-card p-6 rounded-xl bg-gradient-to-br ${genre.color} text-white font-semibold text-lg hover:scale-105 transition-all duration-300 glow-effect-hover border border-white/20`}
              >
                {genre.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
