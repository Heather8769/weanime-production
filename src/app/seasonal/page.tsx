'use client'

import { useState } from 'react'
import { useSeasonalAnime } from '@/hooks/use-anime'
import { AnimeCard } from '@/components/anime-card'
import { Button } from '@/components/ui/button'

const SEASONS = [
  { value: 'WINTER', label: 'Winter' },
  { value: 'SPRING', label: 'Spring' },
  { value: 'SUMMER', label: 'Summer' },
  { value: 'FALL', label: 'Fall' },
]

function getCurrentSeason(): string {
  const month = new Date().getMonth() + 1
  if (month >= 12 || month <= 2) return 'WINTER'
  if (month >= 3 && month <= 5) return 'SPRING'
  if (month >= 6 && month <= 8) return 'SUMMER'
  if (month >= 9 && month <= 11) return 'FALL'
  return 'SPRING'
}

export default function SeasonalPage() {
  const currentYear = new Date().getFullYear()
  const currentSeason = getCurrentSeason()
  
  const [selectedSeason, setSelectedSeason] = useState(currentSeason)
  const [selectedYear, setSelectedYear] = useState(currentYear)

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSeasonalAnime(selectedSeason, selectedYear)

  const allAnime = data?.pages.flatMap((page: any) => page.Page.media) || []
  const totalResults = (data?.pages[0] as any)?.Page.pageInfo.total || 0

  const years = Array.from({ length: 10 }, (_, i) => currentYear - i)

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="space-y-4">
            <div className="text-6xl">😞</div>
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="text-muted-foreground">
              Failed to load seasonal anime. Please try again.
            </p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold">Seasonal Anime</h1>
        <p className="text-muted-foreground text-lg">
          Explore anime by season and discover what's airing when.
        </p>
      </div>

      {/* Season and Year Selector */}
      <div className="bg-card border rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold">Select Season</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Season Selector */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Season</label>
            <div className="grid grid-cols-2 gap-2">
              {SEASONS.map((season) => (
                <button
                  key={season.value}
                  onClick={() => setSelectedSeason(season.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedSeason === season.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {season.label}
                </button>
              ))}
            </div>
          </div>

          {/* Year Selector */}
          <div className="md:col-span-2">
            <label htmlFor="year" className="block text-sm font-medium mb-2">
              Year
            </label>
            <select
              id="year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Current Selection Display */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-lg font-medium">
            {SEASONS.find(s => s.value === selectedSeason)?.label} {selectedYear}
            {selectedSeason === currentSeason && selectedYear === currentYear && (
              <span className="ml-2 text-sm bg-primary text-primary-foreground px-2 py-1 rounded-full">
                Current
              </span>
            )}
          </div>
          {!isLoading && totalResults > 0 && (
            <div className="text-sm text-muted-foreground">
              {totalResults} anime found
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <section className="space-y-6">
        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-[3/4] bg-muted rounded-lg animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {!isLoading && allAnime.length === 0 && (
          <div className="text-center py-12">
            <div className="space-y-4">
              <div className="text-6xl">📺</div>
              <h3 className="text-xl font-semibold">No anime found</h3>
              <p className="text-muted-foreground">
                No anime found for {SEASONS.find(s => s.value === selectedSeason)?.label} {selectedYear}.
                Try selecting a different season or year.
              </p>
            </div>
          </div>
        )}

        {/* Anime Grid */}
        {!isLoading && allAnime.length > 0 && (
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

            {/* Load More Button */}
            {hasNextPage && (
              <div className="text-center pt-8">
                <Button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  variant="outline"
                  size="lg"
                >
                  {isFetchingNextPage ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Season Statistics */}
      {!isLoading && allAnime.length > 0 && (
        <section className="bg-card border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            {SEASONS.find(s => s.value === selectedSeason)?.label} {selectedYear} Statistics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="space-y-2">
              <div className="text-2xl font-bold text-primary">
                {allAnime.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Anime
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-primary">
                {allAnime.filter(anime => anime.status === 'RELEASING').length}
              </div>
              <div className="text-sm text-muted-foreground">
                Currently Airing
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-primary">
                {allAnime.filter(anime => anime.format === 'TV').length}
              </div>
              <div className="text-sm text-muted-foreground">
                TV Series
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-primary">
                {Math.round(
                  allAnime.reduce((acc, anime) => acc + (anime.averageScore || 0), 0) / 
                  allAnime.filter(anime => anime.averageScore).length / 10 * 10
                ) / 10 || 0}
              </div>
              <div className="text-sm text-muted-foreground">
                Average Score
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Popular Genres This Season */}
      {!isLoading && allAnime.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-xl font-semibold">
            Popular Genres in {SEASONS.find(s => s.value === selectedSeason)?.label} {selectedYear}
          </h3>
          <div className="flex flex-wrap gap-2">
            {(Array.from(
              allAnime
                .flatMap(anime => anime.genres)
                .reduce((acc, genre) => {
                  acc.set(genre, (acc.get(genre) || 0) + 1)
                  return acc
                }, new Map<string, number>())
            ) as [string, number][])
              .sort(([, a], [, b]) => b - a)
              .slice(0, 12)
              .map(([genre, count]) => (
                <div
                  key={genre}
                  className="bg-muted hover:bg-muted/80 px-4 py-2 rounded-full text-sm transition-colors cursor-pointer"
                  title={`${count} anime`}
                >
                  {genre} ({count})
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  )
}
