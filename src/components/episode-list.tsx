'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useWatchStore, Episode } from '@/lib/watch-store'
import { cn } from '@/lib/utils'

interface EpisodeListProps {
  episodes: Episode[]
  animeId: number
  currentEpisode?: Episode
  onEpisodeSelect: (episode: Episode) => void
  className?: string
}

export function EpisodeList({ 
  episodes, 
  animeId, 
  currentEpisode, 
  onEpisodeSelect, 
  className 
}: EpisodeListProps) {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  
  const { getProgress } = useWatchStore()

  const sortedEpisodes = [...episodes].sort((a, b) => {
    return sortOrder === 'asc' ? a.number - b.number : b.number - a.number
  })

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m`
  }

  const getProgressPercentage = (episode: Episode) => {
    const progress = getProgress(animeId, episode.id)
    if (!progress || progress.duration === 0) return 0
    return (progress.currentTime / progress.duration) * 100
  }

  const isEpisodeCompleted = (episode: Episode) => {
    const progress = getProgress(animeId, episode.id)
    return progress?.completed || false
  }

  const isEpisodeWatched = (episode: Episode) => {
    const progress = getProgress(animeId, episode.id)
    return progress && progress.currentTime > 30 // Watched if more than 30 seconds
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">
          Episodes ({episodes.length})
        </h3>
        
        <div className="flex items-center space-x-2">
          {/* Sort Order */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
          >
            <svg 
              className={cn('w-4 h-4 transition-transform', sortOrder === 'desc' && 'rotate-180')} 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M7 14l5-5 5 5z"/>
            </svg>
          </button>

          {/* View Mode Toggle */}
          <div className="flex bg-muted rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1 rounded transition-colors',
                viewMode === 'list' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
              )}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
              </svg>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1 rounded transition-colors',
                viewMode === 'grid' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
              )}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 11h5V5H4v6zm0 7h5v-6H4v6zm6 0h5v-6h-5v6zm6 0h5v-6h-5v6zm-6-7h5V5h-5v6zm6-6v6h5V5h-5z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Episodes */}
      <div className={cn(
        viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
          : 'space-y-2'
      )}>
        {sortedEpisodes.map((episode, index) => {
          const isActive = currentEpisode?.id === episode.id
          const isCompleted = isEpisodeCompleted(episode)
          const isWatched = isEpisodeWatched(episode)
          const progressPercentage = getProgressPercentage(episode)

          return (
            <motion.div
              key={episode.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'group cursor-pointer rounded-lg border transition-all',
                isActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              )}
              onClick={() => onEpisodeSelect(episode)}
            >
              {viewMode === 'grid' ? (
                // Grid View
                <div className="p-4 space-y-3">
                  {/* Thumbnail */}
                  {episode.thumbnail && (
                    <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                      <Image
                        src={episode.thumbnail}
                        alt={episode.title}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                      
                      {/* Progress Bar */}
                      {progressPercentage > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                          <div 
                            className="h-full bg-primary transition-all"
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                      )}
                      
                      {/* Play Icon */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-black/50 rounded-full p-3">
                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                      </div>
                      
                      {/* Status Badges */}
                      <div className="absolute top-2 right-2 flex gap-1">
                        {isCompleted && (
                          <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                            ✓
                          </div>
                        )}
                        {isWatched && !isCompleted && (
                          <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                            ●
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Episode Info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-primary">
                        Episode {episode.number}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(episode.duration)}
                      </span>
                    </div>
                    
                    <h4 className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
                      {episode.title}
                    </h4>
                    
                    {episode.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {episode.description}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                // List View
                <div className="flex items-center p-4 space-x-4">
                  {/* Episode Number */}
                  <div className={cn(
                    'flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center font-semibold',
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground'
                  )}>
                    {episode.number}
                  </div>
                  
                  {/* Thumbnail */}
                  {episode.thumbnail && (
                    <div className="relative w-20 h-12 flex-shrink-0 overflow-hidden rounded bg-muted">
                      <Image
                        src={episode.thumbnail}
                        alt={episode.title}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                      
                      {/* Progress Bar */}
                      {progressPercentage > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/50">
                          <div 
                            className="h-full bg-primary transition-all"
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Episode Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <h4 className={cn(
                      'font-medium truncate transition-colors',
                      isActive ? 'text-primary' : 'group-hover:text-primary'
                    )}>
                      {episode.title}
                    </h4>
                    
                    {episode.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {episode.description}
                      </p>
                    )}
                  </div>
                  
                  {/* Duration and Status */}
                  <div className="flex-shrink-0 flex items-center space-x-3">
                    <span className="text-sm text-muted-foreground">
                      {formatDuration(episode.duration)}
                    </span>
                    
                    <div className="flex items-center space-x-1">
                      {isCompleted && (
                        <div className="w-2 h-2 bg-green-500 rounded-full" title="Completed" />
                      )}
                      {isWatched && !isCompleted && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full" title="In Progress" />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Empty State */}
      {episodes.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📺</div>
          <h3 className="text-lg font-semibold mb-2">Loading Episodes</h3>
          <p className="text-muted-foreground">
            Fetching episode information from Crunchyroll...
          </p>
        </div>
      )}
    </div>
  )
}
