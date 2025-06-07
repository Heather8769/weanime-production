'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useWatchStore } from '@/lib/watch-store'
import { useAnimeDetails, getAnimeTitle } from '@/hooks/use-anime'
import { getRecentlyWatchedEpisodes } from '@/lib/episode-service'
import { cn } from '@/lib/utils'

// Helper functions
const formatTimeAgo = (date: Date) => {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  return date.toLocaleDateString()
}

const formatProgress = (currentTime: number, duration: number) => {
  if (duration === 0) return '0%'
  const percentage = (currentTime / duration) * 100
  return `${Math.round(percentage)}%`
}

interface WatchHistoryItem {
  animeId: number
  episodeId: string
  episodeNumber: number
  episodeTitle: string
  currentTime: number
  duration: number
  lastWatched: Date
  completed: boolean
}

interface WatchHistoryProps {
  limit?: number
  showTitle?: boolean
  className?: string
}

export function WatchHistory({ limit = 10, showTitle = true, className }: WatchHistoryProps) {
  const [historyItems, setHistoryItems] = useState<WatchHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const { watchProgress, loadProgress } = useWatchStore()

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setIsLoading(true)
        await loadProgress()
        
        const recentEpisodes = await getRecentlyWatchedEpisodes(watchProgress, limit)
        
        const items: WatchHistoryItem[] = recentEpisodes.map(({ episode, animeId, progress }) => ({
          animeId,
          episodeId: episode.id,
          episodeNumber: episode.number,
          episodeTitle: episode.title,
          currentTime: progress.currentTime,
          duration: progress.duration,
          lastWatched: new Date(progress.lastWatched),
          completed: progress.completed,
        }))
        
        setHistoryItems(items)
      } catch (error) {
        console.error('Failed to load watch history:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadHistory()
  }, [watchProgress, limit, loadProgress])



  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        {showTitle && <h3 className="text-xl font-semibold">Continue Watching</h3>}
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-4 bg-card rounded-lg border animate-pulse">
              <div className="w-20 h-12 bg-muted rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (historyItems.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        {showTitle && <h3 className="text-xl font-semibold">Continue Watching</h3>}
        <div className="text-center py-8 bg-card rounded-lg border">
          <div className="text-4xl mb-2">📺</div>
          <p className="text-muted-foreground">No watch history yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Start watching anime to see your progress here
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {showTitle && (
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Continue Watching</h3>
          {historyItems.length >= limit && (
            <Link 
              href="/history" 
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              View All
            </Link>
          )}
        </div>
      )}
      
      <div className="space-y-3">
        {historyItems.map((item, index) => (
          <WatchHistoryCard
            key={`${item.animeId}-${item.episodeId}`}
            item={item}
            index={index}
          />
        ))}
      </div>
    </div>
  )
}

interface WatchHistoryCardProps {
  item: WatchHistoryItem
  index: number
}

function WatchHistoryCard({ item, index }: WatchHistoryCardProps) {
  const { data: anime } = useAnimeDetails(item.animeId)
  const animeTitle = anime ? getAnimeTitle(anime) : 'Loading...'
  
  const progressPercentage = item.duration > 0 ? (item.currentTime / item.duration) * 100 : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Link href={`/watch/${item.animeId}?episode=${item.episodeId}`}>
        <div className="group flex items-center space-x-4 p-4 bg-card rounded-lg border hover:border-primary/50 transition-all">
          {/* Anime Cover */}
          <div className="relative w-20 h-12 flex-shrink-0 overflow-hidden rounded bg-muted">
            {anime?.coverImage && (
              <Image
                src={anime.coverImage.medium}
                alt={animeTitle}
                fill
                className="object-cover"
                sizes="80px"
              />
            )}
            
            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
              <div 
                className="h-full bg-primary transition-all"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            
            {/* Completion Badge */}
            {item.completed && (
              <div className="absolute top-1 right-1 w-3 h-3 bg-green-500 rounded-full" />
            )}
          </div>
          
          {/* Episode Info */}
          <div className="flex-1 min-w-0 space-y-1">
            <h4 className="font-medium truncate group-hover:text-primary transition-colors">
              {animeTitle}
            </h4>
            <p className="text-sm text-muted-foreground truncate">
              Episode {item.episodeNumber}: {item.episodeTitle}
            </p>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <span>{formatProgress(item.currentTime, item.duration)} watched</span>
              <span>•</span>
              <span>{formatTimeAgo(item.lastWatched)}</span>
            </div>
          </div>
          
          {/* Continue Button */}
          <div className="flex-shrink-0">
            <div className="bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground text-primary px-3 py-1 rounded-full text-sm font-medium transition-colors">
              {item.completed ? 'Rewatch' : 'Continue'}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
