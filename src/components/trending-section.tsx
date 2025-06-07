'use client'

import Link from 'next/link'
import { useTrendingAnime } from '@/hooks/use-anime'
import { AnimeCard } from '@/components/anime-card'
import { Button } from '@/components/ui/button'

export function TrendingSection() {
  const { data, isLoading, error } = useTrendingAnime()

  const trendingAnime = (data?.pages[0] as any)?.Page.media.slice(0, 12) || []

  if (error) {
    return (
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">Trending Now</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Failed to load trending anime</p>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Trending Now</h2>
        <Button variant="ghost" asChild>
          <Link href="/trending">View All</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-[3/4] bg-muted rounded-lg animate-pulse" />
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {trendingAnime.map((anime: any) => (
            <AnimeCard
              key={anime.id}
              anime={anime}
              variant="default"
              showDetails={true}
            />
          ))}
        </div>
      )}
    </section>
  )
}
