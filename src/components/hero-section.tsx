'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useTrendingAnime, getAnimeTitle } from '@/hooks/use-anime'
import { AnimeBannerImage, AnimeCoverImage } from '@/components/ui/anime-image'
import { Button } from '@/components/ui/button'

export function HeroSection() {
  const { data, isLoading } = useTrendingAnime()
  const featuredAnime = (data?.pages[0] as any)?.Page.media[0]

  if (isLoading || !featuredAnime) {
    return (
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        {/* Enhanced Background gradient */}
        <div className="absolute inset-0 anime-gradient opacity-95" />

        {/* Glass overlay */}
        <div className="absolute inset-0 glass-card opacity-30" />

        {/* Background pattern */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />

        {/* Content */}
        <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
          >
            Stream, Track, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-400">
              Discover
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl md:text-2xl mb-8 text-white/90 max-w-2xl mx-auto"
          >
            Your ultimate anime destination. Watch thousands of episodes, track your progress,
            and discover your next favorite series.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Button size="lg" className="glass-card border border-white/20 text-white hover:bg-white hover:text-black text-lg px-8 py-3 glow-effect-hover" asChild>
              <Link href="/browse">Start Watching</Link>
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="glass-card border-white/30 text-white hover:bg-white hover:text-black text-lg px-8 py-3 backdrop-blur-md"
              asChild
            >
              <Link href="/trending">Browse Trending</Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-center"
          >
            <div className="glass-card rounded-xl p-6 border border-white/10 glow-effect-hover">
              <h3 className="text-2xl font-bold mb-2 text-white">10,000+</h3>
              <p className="text-white/80">Anime Episodes</p>
            </div>

            <div className="glass-card rounded-xl p-6 border border-white/10 glow-effect-hover">
              <h3 className="text-2xl font-bold mb-2 text-white">HD Quality</h3>
              <p className="text-white/80">Crystal Clear Streaming</p>
            </div>

            <div className="glass-card rounded-xl p-6 border border-white/10 glow-effect-hover">
              <h3 className="text-2xl font-bold mb-2 text-white">Ad-Free</h3>
              <p className="text-white/80">Uninterrupted Experience</p>
            </div>
          </motion.div>
        </div>

        {/* Floating elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-pink-400/20 rounded-full blur-xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 right-20 w-16 h-16 bg-yellow-400/20 rounded-full blur-xl animate-pulse delay-500" />
      </section>
    )
  }

  const title = getAnimeTitle(featuredAnime)

  return (
    <section className="relative min-h-[80vh] overflow-hidden">
      {/* Enhanced Background Image */}
      <div className="absolute inset-0">
        <AnimeBannerImage
          src={featuredAnime.bannerImage || featuredAnime.coverImage.large}
          alt={title}
          fill
          priority
        />
        {/* Enhanced Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/40" />
        {/* Glass overlay */}
        <div className="absolute inset-0 glass-card opacity-20" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center min-h-[80vh]">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Text Content */}
            <div className="space-y-6 text-white">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <p className="text-primary font-medium">Featured Anime</p>
                <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                  {title}
                </h1>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-4 text-white/90"
              >
                {featuredAnime.averageScore && (
                  <div className="glass-card border border-yellow-400/30 text-yellow-400 px-3 py-1 rounded-full font-medium backdrop-blur-md">
                    ★ {featuredAnime.averageScore / 10}
                  </div>
                )}
                <span>{featuredAnime.format}</span>
                {featuredAnime.episodes && <span>{featuredAnime.episodes} episodes</span>}
                {featuredAnime.startDate?.year && <span>{featuredAnime.startDate.year}</span>}
              </motion.div>

              {featuredAnime.description && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-lg text-white/90 max-w-2xl line-clamp-3"
                >
                  {featuredAnime.description.replace(/<[^>]*>/g, '')}
                </motion.p>
              )}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap gap-2"
              >
                {featuredAnime.genres.slice(0, 4).map((genre: string) => (
                  <span
                    key={genre}
                    className="glass-card border border-white/20 text-white text-sm px-3 py-1 rounded-full backdrop-blur-md"
                  >
                    {genre}
                  </span>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Button size="lg" className="anime-gradient hover:opacity-90 text-white text-lg px-8 py-3 glow-effect-hover" asChild>
                  <Link href={`/anime/${featuredAnime.id}`}>Watch Now</Link>
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="glass-card border-white/30 text-white hover:bg-white hover:text-black text-lg px-8 py-3 backdrop-blur-md"
                  asChild
                >
                  <Link href="/trending">More Trending</Link>
                </Button>
              </motion.div>
            </div>

            {/* Enhanced Cover Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="relative aspect-[3/4] max-w-sm mx-auto lg:max-w-none"
            >
              <div className="glass-card rounded-xl p-2 glow-effect">
                <AnimeCoverImage
                  src={featuredAnime.coverImage.large}
                  alt={title}
                  fill
                  className="rounded-lg"
                  priority
                />
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Floating elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-32 h-32 bg-pink-400/20 rounded-full blur-xl animate-pulse delay-1000" />
      <div className="absolute top-1/2 right-20 w-16 h-16 bg-yellow-400/20 rounded-full blur-xl animate-pulse delay-500" />
    </section>
  )
}
