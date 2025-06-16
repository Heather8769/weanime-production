'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { AniListAnime } from '@/lib/anilist'
import { getAnimeTitle, formatAnimeStatus, formatAnimeFormat } from '@/hooks/use-anime'
import { WatchlistButtonCompact } from '@/components/watchlist-button'
import { AnimeCoverImage, AnimeBannerImage } from '@/components/ui/anime-image'
import { cn } from '@/lib/utils'

interface AnimeCardProps {
  anime: AniListAnime
  variant?: 'default' | 'large' | 'compact'
  showDetails?: boolean
  className?: string
}

export function AnimeCard({ 
  anime, 
  variant = 'default', 
  showDetails = true,
  className 
}: AnimeCardProps) {
  const title = getAnimeTitle(anime)
  const status = formatAnimeStatus(anime.status)
  const format = formatAnimeFormat(anime.format)

  const cardVariants = {
    default: 'w-full aspect-[3/4]',
    large: 'w-full aspect-[16/9]',
    compact: 'w-24 md:w-32 aspect-[3/4]',
  }

  const imageVariants = {
    default: 'w-full h-full object-cover',
    large: 'w-full h-full object-cover',
    compact: 'w-full h-full object-cover',
  }

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={cn('group cursor-pointer', className)}
    >
      <Link href={`/anime/${anime.id}`}>
        <div className={cn(
          'relative overflow-hidden rounded-xl glass-card glow-effect-hover glass-3d',
          cardVariants[variant]
        )}>
          {/* Cover Image */}
          <div className={cn('relative overflow-hidden', imageVariants[variant])}>
            <AnimeCoverImage
              src={anime.coverImage.large || anime.coverImage.medium}
              alt={title}
              fill
              className="transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              priority={variant === 'large'}
            />
            
            {/* Enhanced Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Glass overlay on hover */}
            <div className="absolute inset-0 glass-card opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
            
            {/* Enhanced Score Badge */}
            {anime.averageScore && (
              <div className="absolute top-3 right-3 glass-card text-white text-xs px-3 py-1.5 rounded-full font-medium backdrop-blur-md">
                <span className="text-yellow-400">★</span> {anime.averageScore / 10}
              </div>
            )}
            
            {/* Enhanced Status Badge */}
            <div className={cn(
              "absolute top-3 left-3 text-xs px-3 py-1.5 rounded-full font-medium glass-card backdrop-blur-md",
              anime.status === 'RELEASING'
                ? 'text-green-400 border border-green-400/30'
                : anime.status === 'FINISHED'
                ? 'text-blue-400 border border-blue-400/30'
                : 'text-gray-400 border border-gray-400/30'
            )}>
              {status}
            </div>

            {/* Watchlist Button */}
            <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <WatchlistButtonCompact anime={anime} />
            </div>

            {/* Enhanced Play Button Overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="glass-card rounded-full p-4 glow-effect">
                <svg className="w-8 h-8 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Enhanced Content */}
          {showDetails && variant !== 'compact' && (
            <div className="p-4 space-y-3 glass-card border-t border-white/10">
              <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors duration-300 text-white">
                {title}
              </h3>
              
              <div className="flex items-center justify-between text-xs text-white/70">
                <span className="font-medium">{format}</span>
                {anime.episodes && (
                  <span className="glass-card px-2 py-1 rounded-full">{anime.episodes} eps</span>
                )}
              </div>

              {anime.genres && anime.genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {anime.genres.slice(0, 2).map((genre) => (
                    <span
                      key={genre}
                      className="text-xs glass-card px-2.5 py-1 rounded-full text-white/80 border border-white/10"
                    >
                      {genre}
                    </span>
                  ))}
                  {anime.genres.length > 2 && (
                    <span className="text-xs text-white/60 self-center">
                      +{anime.genres.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Compact variant title */}
          {variant === 'compact' && showDetails && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
              <p className="text-white text-xs font-medium line-clamp-2">
                {title}
              </p>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  )
}

// Large featured anime card for hero sections
export function FeaturedAnimeCard({ anime, className }: { anime: AniListAnime; className?: string }) {
  const title = getAnimeTitle(anime)
  
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className={cn('group cursor-pointer', className)}
    >
      <Link href={`/anime/${anime.id}`}>
        <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-muted">
          {/* Background Image */}
          <AnimeBannerImage
            src={anime.bannerImage || anime.coverImage.large}
            alt={title}
            fill
            className="transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
            priority
          />
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
          
          {/* Content */}
          <div className="absolute inset-0 flex items-end p-6 md:p-8">
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center space-x-4">
                {anime.averageScore && (
                  <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                    ★ {anime.averageScore / 10}
                  </div>
                )}
                <span className="text-white/80 text-sm">
                  {formatAnimeFormat(anime.format)}
                </span>
                {anime.episodes && (
                  <span className="text-white/80 text-sm">
                    {anime.episodes} episodes
                  </span>
                )}
              </div>
              
              <h2 className="text-2xl md:text-4xl font-bold text-white group-hover:text-primary transition-colors">
                {title}
              </h2>
              
              {anime.description && (
                <p className="text-white/90 text-sm md:text-base line-clamp-3 max-w-xl">
                  {anime.description.replace(/<[^>]*>/g, '')}
                </p>
              )}
              
              {anime.genres && anime.genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {anime.genres.slice(0, 4).map((genre) => (
                    <span
                      key={genre}
                      className="bg-white/20 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
