'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAnimeDetails, getAnimeTitle } from '@/hooks/use-anime'
import { useWatchStore } from '@/lib/watch-store'
import type { Episode } from '@/lib/watch-store'
import { getAnimeEpisodes, getNextEpisodeToWatch, getEpisodeWithVideoSources } from '@/lib/episode-service'
import { VideoPlayer } from '@/components/video-player'
import { EpisodeList } from '@/components/episode-list'
import { Button } from '@/components/ui/button'

interface WatchPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ episode?: string }>
}

export default function WatchPage({ params, searchParams }: WatchPageProps) {
  const { id } = use(params)
  const { episode: episodeParam } = use(searchParams)
  const router = useRouter()

  // Handle both numeric IDs and string slugs
  const isNumericId = !isNaN(parseInt(id)) && parseInt(id).toString() === id
  const animeId = isNumericId ? parseInt(id) : null
  
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEpisodeList, setShowEpisodeList] = useState(false)
  const [resolvedAnimeId, setResolvedAnimeId] = useState<number | null>(animeId)

  const { data: anime } = useAnimeDetails(resolvedAnimeId || 0)
  const {
    setCurrentAnime,
    setCurrentEpisode: setStoreCurrentEpisode,
    setEpisodes: setStoreEpisodes,
    watchProgress,
    loadProgress,
    syncProgress,
  } = useWatchStore()

  // Handle slug-to-ID conversion
  useEffect(() => {
    const resolveSlugToId = async () => {
      if (animeId) {
        // Already a numeric ID, no conversion needed
        setResolvedAnimeId(animeId)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // This is a slug, try to convert it to an AniList ID
        // First, search the backend for the slug
        const backendResponse = await fetch(`/api/backend/search?q=${encodeURIComponent(id)}`)

        if (!backendResponse.ok) {
          throw new Error('Failed to search backend')
        }

        const backendData = await backendResponse.json()

        if (!backendData.success || !backendData.data.results || backendData.data.results.length === 0) {
          throw new Error('Anime not found in backend')
        }

        // Get the anime title from backend results
        const animeTitle = backendData.data.results[0].title || id

        // Search AniList for this anime
        const anilistResponse = await fetch('/api/anilist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `
              query ($search: String) {
                Page(page: 1, perPage: 5) {
                  media(search: $search, type: ANIME) {
                    id
                    title {
                      romaji
                      english
                      native
                    }
                  }
                }
              }
            `,
            variables: {
              search: animeTitle
            }
          })
        })

        if (!anilistResponse.ok) {
          throw new Error('Failed to search AniList')
        }

        const anilistData = await anilistResponse.json()

        if (!anilistData.data?.Page?.media || anilistData.data.Page.media.length === 0) {
          throw new Error('Anime not found in AniList')
        }

        // Use the first match
        const resolvedId = anilistData.data.Page.media[0].id
        setResolvedAnimeId(resolvedId)

        // Update the URL to use the resolved ID
        const newUrl = episodeParam
          ? `/watch/${resolvedId}?episode=${episodeParam}`
          : `/watch/${resolvedId}`

        router.replace(newUrl)

      } catch (err) {
        console.error('Error resolving slug to ID:', err)
        setError(err instanceof Error ? err.message : 'Failed to resolve anime')
        setIsLoading(false)
      }
    }

    resolveSlugToId()
  }, [id, animeId, episodeParam, router])

  // Load episodes and set current episode
  useEffect(() => {
    const loadEpisodes = async () => {
      if (!resolvedAnimeId) return

      try {
        setIsLoading(true)
        setError(null)

        // Load watch progress first
        await loadProgress()

        // Get episodes for this anime - try backend first, then fallback
        let animeEpisodes: Episode[] = []

        // Use the episode service to get episodes (it will handle backend integration)
        console.log('Watch page: Getting episodes from episode service...')
        animeEpisodes = await getAnimeEpisodes(resolvedAnimeId, anime?.episodes || undefined)
        setEpisodes(animeEpisodes)
        setStoreEpisodes(animeEpisodes)
        setCurrentAnime(resolvedAnimeId)

        // Determine which episode to play
        let episodeToPlay: Episode | null = null

        if (episodeParam) {
          // Play specific episode from URL parameter
          episodeToPlay = animeEpisodes.find(ep => ep.id === episodeParam) || null
        } else {
          // Find next episode to watch based on progress
          episodeToPlay = await getNextEpisodeToWatch(resolvedAnimeId, watchProgress)
        }

        // Fallback to first episode if none found
        if (!episodeToPlay && animeEpisodes.length > 0) {
          episodeToPlay = animeEpisodes[0]
        }

        if (episodeToPlay) {
          // Get enhanced video sources for the episode to play
          try {
            console.log('Getting enhanced episode for:', resolvedAnimeId, episodeToPlay.number)
            const enhancedEpisode = await getEpisodeWithVideoSources(resolvedAnimeId, episodeToPlay.number)
            console.log('Enhanced episode result:', enhancedEpisode ? {
              id: enhancedEpisode.id,
              title: enhancedEpisode.title,
              sourcesCount: enhancedEpisode.sources?.length || 0,
              sources: enhancedEpisode.sources
            } : 'null')
            const finalEpisode = enhancedEpisode || episodeToPlay

            setCurrentEpisode(finalEpisode)
            setStoreCurrentEpisode(finalEpisode)

            // Update URL if needed
            if (!episodeParam || episodeParam !== finalEpisode.id) {
              router.replace(`/watch/${resolvedAnimeId}?episode=${finalEpisode.id}`, { scroll: false })
            }
          } catch (error) {
            console.error('Error loading enhanced episode:', error)
            // Fallback to basic episode
            setCurrentEpisode(episodeToPlay)
            setStoreCurrentEpisode(episodeToPlay)

            if (!episodeParam || episodeParam !== episodeToPlay.id) {
              router.replace(`/watch/${resolvedAnimeId}?episode=${episodeToPlay.id}`, { scroll: false })
            }
          }
        } else {
          setError('No episodes available for this anime')
        }
      } catch (err) {
        console.error('Failed to load episodes:', err)
        setError('Failed to load episodes')
      } finally {
        setIsLoading(false)
      }
    }

    if (resolvedAnimeId) {
      loadEpisodes()
    }
  }, [resolvedAnimeId, anime?.episodes, episodeParam, loadProgress, router, setCurrentAnime, setStoreCurrentEpisode, setStoreEpisodes, watchProgress])

  // Sync progress periodically
  useEffect(() => {
    const interval = setInterval(() => {
      syncProgress()
    }, 30000) // Sync every 30 seconds

    return () => clearInterval(interval)
  }, [syncProgress])

  const handleEpisodeSelect = async (episode: Episode) => {
    try {
      setIsLoading(true)

      // Get episode with enhanced video sources
      const enhancedEpisode = await getEpisodeWithVideoSources(resolvedAnimeId!, episode.number)

      if (enhancedEpisode) {
        setCurrentEpisode(enhancedEpisode)
        setStoreCurrentEpisode(enhancedEpisode)
        router.push(`/watch/${resolvedAnimeId}?episode=${enhancedEpisode.id}`, { scroll: false })
      } else {
        // Fallback to basic episode
        setCurrentEpisode(episode)
        setStoreCurrentEpisode(episode)
        router.push(`/watch/${resolvedAnimeId}?episode=${episode.id}`, { scroll: false })
      }

      setShowEpisodeList(false)
    } catch (error) {
      console.error('Error loading episode:', error)
      // Fallback to basic episode
      setCurrentEpisode(episode)
      setStoreCurrentEpisode(episode)
      router.push(`/watch/${resolvedAnimeId}?episode=${episode.id}`, { scroll: false })
      setShowEpisodeList(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleNextEpisode = () => {
    if (!currentEpisode) return
    
    const currentIndex = episodes.findIndex(ep => ep.id === currentEpisode.id)
    const nextEpisode = episodes[currentIndex + 1]
    
    if (nextEpisode) {
      handleEpisodeSelect(nextEpisode)
    }
  }

  const handlePreviousEpisode = () => {
    if (!currentEpisode) return
    
    const currentIndex = episodes.findIndex(ep => ep.id === currentEpisode.id)
    const previousEpisode = episodes[currentIndex - 1]
    
    if (previousEpisode) {
      handleEpisodeSelect(previousEpisode)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white">Loading episode...</p>
        </div>
      </div>
    )
  }

  if (error || !currentEpisode) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4 text-white">
          <div className="text-6xl">😞</div>
          <h1 className="text-2xl font-bold">Unable to load episode</h1>
          <p className="text-white/80">{error || 'Episode not found'}</p>
          <div className="flex gap-4 justify-center">
            <Button asChild variant="outline">
              <Link href={`/anime/${animeId}`}>Back to Anime</Link>
            </Button>
            <Button asChild>
              <Link href="/browse">Browse Anime</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const title = anime ? getAnimeTitle(anime) : 'Loading...'

  return (
    <div className="min-h-screen bg-black">
      {/* Video Player */}
      <div className="relative">
        <VideoPlayer
          episode={currentEpisode}
          animeId={resolvedAnimeId || 0}
          className="w-full"
        />
        
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute top-4 left-4 z-10"
        >
          <Button
            variant="outline"
            size="sm"
            className="bg-black/50 border-white/20 text-white hover:bg-black/70"
            asChild
          >
            <Link href={`/anime/${resolvedAnimeId}`}>
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
              Back
            </Link>
          </Button>
        </motion.div>

        {/* Episode List Toggle */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute top-4 right-4 z-10"
        >
          <Button
            variant="outline"
            size="sm"
            className="bg-black/50 border-white/20 text-white hover:bg-black/70"
            onClick={() => setShowEpisodeList(!showEpisodeList)}
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
            </svg>
            Episodes
          </Button>
        </motion.div>
      </div>

      {/* Episode Information */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Episode Header */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <Link 
                  href={`/anime/${animeId}`}
                  className="hover:text-primary transition-colors"
                >
                  {title}
                </Link>
                <span>•</span>
                <span>Episode {currentEpisode.number}</span>
              </div>
              
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {currentEpisode.title}
              </h1>
              
              {currentEpisode.description && (
                <p className="text-gray-300 leading-relaxed">
                  {currentEpisode.description}
                </p>
              )}
            </div>

            {/* Episode Navigation */}
            <div className="flex items-center justify-between bg-gray-900 rounded-lg p-4">
              <Button
                variant="outline"
                onClick={handlePreviousEpisode}
                disabled={episodes.findIndex(ep => ep.id === currentEpisode.id) === 0}
                className="border-gray-700 text-white hover:bg-gray-800"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                </svg>
                Previous
              </Button>
              
              <div className="text-center text-white">
                <p className="text-sm text-gray-400">Episode</p>
                <p className="font-semibold">
                  {currentEpisode.number} of {episodes.length}
                </p>
              </div>
              
              <Button
                variant="outline"
                onClick={handleNextEpisode}
                disabled={episodes.findIndex(ep => ep.id === currentEpisode.id) === episodes.length - 1}
                className="border-gray-700 text-white hover:bg-gray-800"
              >
                Next
                <svg className="w-4 h-4 ml-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                </svg>
              </Button>
            </div>
          </div>

          {/* Episode List Sidebar */}
          <div className={`lg:block ${showEpisodeList ? 'block' : 'hidden'}`}>
            <div className="bg-gray-900 rounded-lg p-4 max-h-[600px] overflow-y-auto">
              <EpisodeList
                episodes={episodes}
                animeId={resolvedAnimeId || 0}
                currentEpisode={currentEpisode}
                onEpisodeSelect={handleEpisodeSelect}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Episode List Overlay */}
      {showEpisodeList && (
        <div className="lg:hidden fixed inset-0 bg-black/80 z-50 flex items-end">
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="w-full bg-gray-900 rounded-t-lg max-h-[80vh] overflow-y-auto"
          >
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Episodes</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEpisodeList(false)}
                className="text-white hover:bg-gray-800"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </Button>
            </div>
            <div className="p-4">
              <EpisodeList
                episodes={episodes}
                animeId={resolvedAnimeId || 0}
                currentEpisode={currentEpisode}
                onEpisodeSelect={handleEpisodeSelect}
              />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
