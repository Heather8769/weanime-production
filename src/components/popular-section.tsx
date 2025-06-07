'use client'

import Link from 'next/link'
import { useSeasonalAnime } from '@/hooks/use-anime'
import { FeaturedAnimeCard } from '@/components/anime-card'
import { Button } from '@/components/ui/button'

export function PopularSection() {
  const { data, isLoading, error } = useSeasonalAnime()

  const seasonalAnime = (data?.pages[0] as any)?.Page.media.slice(0, 6) || []

  if (error) {
    return (
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">Popular This Season</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Failed to load seasonal anime</p>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Popular This Season</h2>
        <Button variant="ghost" asChild>
          <Link href="/seasonal">View All</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <div className="aspect-[16/9] bg-muted rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {seasonalAnime.map((anime: any) => (
            <FeaturedAnimeCard
              key={anime.id}
              anime={anime}
            />
          ))}
        </div>
      )}
    </section>
  )
}
