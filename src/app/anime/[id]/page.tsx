'use client'

import type { Metadata } from 'next'
import { use } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAnimeDetails, useAnimeRecommendations } from '@/hooks/use-anime'
import { getAnimeTitle, formatAnimeStatus, formatAnimeFormat, getSeasonYear } from '@/hooks/use-anime'
import { AnimeCard } from '@/components/anime-card'
import { Button } from '@/components/ui/button'
import { WatchlistButton } from '@/components/watchlist-button'
import { CommentsSection } from '@/components/comments-section'
import { escapeHtml } from '@/lib/security'

interface AnimePageProps {
  params: Promise<{ id: string }>
}

// Metadata is handled by layout.tsx for client components

export default function AnimePage({ params }: AnimePageProps) {
  const { id } = use(params)
  const animeId = parseInt(id)
  
  const { data: anime, isLoading, error } = useAnimeDetails(animeId)
  const { data: recommendations } = useAnimeRecommendations(animeId)

  if (isLoading) {
    return (
      <div className="min-h-screen">
        {/* Hero Skeleton */}
        <div className="relative h-[60vh] bg-muted animate-pulse" />
        
        {/* Content Skeleton */}
        <div className="container mx-auto px-4 py-8 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-8 bg-muted rounded animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-6 bg-muted rounded animate-pulse" />
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-4 bg-muted rounded animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !anime) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl">😞</div>
          <h1 className="text-2xl font-bold">Anime not found</h1>
          <p className="text-muted-foreground">
            The anime you're looking for doesn't exist or couldn't be loaded.
          </p>
          <Button asChild>
            <Link href="/browse">Browse Anime</Link>
          </Button>
        </div>
      </div>
    )
  }

  const title = getAnimeTitle(anime)
  const status = formatAnimeStatus(anime.status)
  const format = formatAnimeFormat(anime.format)
  const seasonYear = getSeasonYear(anime)

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative h-[60vh] overflow-hidden">
        {/* Background Image */}
        <Image
          src={anime.bannerImage || anime.coverImage?.large}
          alt={title}
          fill
          sizes="100vw"
          className="object-cover"
          priority
          quality={85}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        
        {/* Content */}
        <div className="absolute inset-0 flex items-end">
          <div className="container mx-auto px-4 pb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              {/* Cover Image */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative aspect-[3/4] w-48 mx-auto md:mx-0"
              >
                <Image
                  src={anime.coverImage?.large}
                  alt={title}
                  fill
                  sizes="(max-width: 768px) 192px, 192px"
                  priority
                  className="object-cover rounded-lg shadow-2xl"
                />
              </motion.div>
              
              {/* Title and Basic Info */}
              <div className="md:col-span-3 space-y-4 text-center md:text-left">
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-3xl md:text-5xl font-bold text-white"
                >
                  {title}
                </motion.h1>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-white/90"
                >
                  {anime.averageScore && (
                    <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full font-medium">
                      ★ {anime.averageScore / 10}
                    </div>
                  )}
                  <span>{format}</span>
                  <span>{status}</span>
                  {anime.episodes && <span>{anime.episodes} episodes</span>}
                  <span>{seasonYear}</span>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-wrap gap-2 justify-center md:justify-start"
                >
                  {anime.genres.slice(0, 5).map((genre) => (
                    <span
                      key={genre}
                      className="bg-white/20 backdrop-blur-sm text-white text-sm px-3 py-1 rounded-full"
                    >
                      {genre}
                    </span>
                  ))}
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex gap-4 justify-center md:justify-start"
                >
                  <Button size="lg" className="bg-primary hover:bg-primary/90" asChild>
                    <Link href={`/watch/${anime.id}`}>Watch Now</Link>
                  </Button>
                  <WatchlistButton
                    anime={anime}
                    size="lg"
                    variant="outline"
                    className="border-white text-white hover:bg-white hover:text-black"
                  />
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            {anime.description && (
              <section className="space-y-4">
                <h2 className="text-2xl font-bold">Synopsis</h2>
                <div
                  className="text-muted-foreground leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: escapeHtml(anime.description).replace(/&lt;br\s*\/?&gt;/gi, '<br />')
                  }}
                />
              </section>
            )}

            {/* Trailer */}
            {anime.trailer && (
              <section className="space-y-4">
                <h2 className="text-2xl font-bold">Trailer</h2>
                <div className="aspect-video rounded-lg overflow-hidden">
                  <iframe
                    src={`https://www.youtube.com/embed/${anime.trailer.id}`}
                    title={`${title} Trailer`}
                    className="w-full h-full"
                    allowFullScreen
                  />
                </div>
              </section>
            )}

            {/* Related Anime */}
            {anime.relations.edges.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-2xl font-bold">Related Anime</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {anime.relations.edges.slice(0, 8).map((relation) => (
                    <Link
                      key={relation.node.id}
                      href={`/anime/${relation.node.id}`}
                      className="group space-y-2"
                    >
                      <div className="relative aspect-[3/4] overflow-hidden rounded-lg">
                        <Image
                          src={relation.node.coverImage?.medium}
                          alt={relation.node.title.romaji}
                          fill
                          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 16vw"
                          className="object-cover transition-transform group-hover:scale-105"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                          {relation.node.title.english || relation.node.title.romaji}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {relation.relationType.toLowerCase().replace('_', ' ')}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Information */}
            <div className="bg-card border rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-lg">Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Format</span>
                  <span>{format}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Episodes</span>
                  <span>{anime.episodes || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span>{anime.duration ? `${anime.duration} min` : 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span>{status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Season</span>
                  <span>{seasonYear}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Score</span>
                  <span>{anime.averageScore ? `${anime.averageScore / 10}/10` : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Popularity</span>
                  <span>#{anime.popularity.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Favorites</span>
                  <span>{anime.favourites.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Studios */}
            {anime.studios.nodes.length > 0 && (
              <div className="bg-card border rounded-lg p-6 space-y-4">
                <h3 className="font-semibold text-lg">Studios</h3>
                <div className="space-y-2">
                  {anime.studios.nodes
                    .filter(studio => studio.isAnimationStudio)
                    .map((studio, index) => (
                      <div key={`${studio.id}-${index}`} className="text-sm">
                        {studio.name}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Genres */}
            <div className="bg-card border rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-lg">Genres</h3>
              <div className="flex flex-wrap gap-2">
                {anime.genres.map((genre) => (
                  <Link
                    key={genre}
                    href={`/browse?genre=${encodeURIComponent(genre)}`}
                    className="bg-muted hover:bg-muted/80 text-sm px-3 py-1 rounded-full transition-colors"
                  >
                    {genre}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <section className="mt-12 space-y-6">
            <h2 className="text-2xl font-bold">Recommended</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {recommendations.slice(0, 12).map((rec) => (
                <AnimeCard
                  key={rec.mediaRecommendation.id}
                  anime={rec.mediaRecommendation as any}
                  variant="default"
                  showDetails={true}
                />
              ))}
            </div>
          </section>
        )}

        {/* Comments and Reviews */}
        <section className="mt-12 space-y-6">
          <CommentsSection animeId={anime.id} />
        </section>
      </div>
    </div>
  )
}
