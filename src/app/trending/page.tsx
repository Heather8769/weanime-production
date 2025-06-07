'use client'

import { useTrendingAnime } from '@/hooks/use-anime'
import { AnimeCard, FeaturedAnimeCard } from '@/components/anime-card'
import { Button } from '@/components/ui/button'

export default function TrendingPage() {
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTrendingAnime()

  const allAnime = data?.pages.flatMap((page: any) => page.Page.media) || []
  const featuredAnime = allAnime[0]
  const gridAnime = allAnime.slice(1)

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="space-y-4">
            <div className="text-6xl">😞</div>
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="text-muted-foreground">
              Failed to load trending anime. Please try again.
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
        <h1 className="text-4xl font-bold">Trending Anime</h1>
        <p className="text-muted-foreground text-lg">
          Discover the most popular anime that everyone is talking about right now.
        </p>
      </div>

      {/* Featured Anime */}
      {!isLoading && featuredAnime && (
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">Most Trending</h2>
          <FeaturedAnimeCard anime={featuredAnime} />
        </section>
      )}

      {/* Trending Grid */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">
          {featuredAnime ? 'More Trending' : 'Trending Now'}
        </h2>

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

        {/* Anime Grid */}
        {!isLoading && gridAnime.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {gridAnime.map((anime, index) => (
                <div key={anime.id} className="relative">
                  {/* Trending Rank */}
                  <div className="absolute top-2 left-2 z-10 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full">
                    #{index + 2}
                  </div>
                  <AnimeCard
                    anime={anime}
                    variant="default"
                    showDetails={true}
                  />
                </div>
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

      {/* Trending Stats */}
      {!isLoading && allAnime.length > 0 && (
        <section className="bg-card border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Trending Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="space-y-2">
              <div className="text-2xl font-bold text-primary">
                {allAnime.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Trending Anime
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-primary">
                {Math.round(
                  allAnime.reduce((acc, anime) => acc + (anime.averageScore || 0), 0) / 
                  allAnime.filter(anime => anime.averageScore).length / 10 * 10
                ) / 10}
              </div>
              <div className="text-sm text-muted-foreground">
                Average Score
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
                {new Set(allAnime.flatMap(anime => anime.genres)).size}
              </div>
              <div className="text-sm text-muted-foreground">
                Unique Genres
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Popular Genres from Trending */}
      {!isLoading && allAnime.length > 0 && (
        <section className="space-y-6">
          <h3 className="text-xl font-semibold">Popular Genres in Trending</h3>
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
              .slice(0, 10)
              .map(([genre, count]) => (
                <div
                  key={genre}
                  className="bg-muted hover:bg-muted/80 px-4 py-2 rounded-full text-sm transition-colors cursor-pointer"
                  title={`${count} anime`}
                >
                  {genre}
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  )
}
