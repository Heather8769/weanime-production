'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useWatchlistStore, WatchStatus } from '@/lib/watchlist-store'
import { useAuth } from '@/lib/auth-context'
import { useAnimeDetails, getAnimeTitle } from '@/hooks/use-anime'
import { AnimeCard } from '@/components/anime-card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STATUS_TABS = [
  { key: 'all', label: 'All', icon: '📚' },
  { key: 'watching', label: 'Watching', icon: '👁️' },
  { key: 'completed', label: 'Completed', icon: '✅' },
  { key: 'plan_to_watch', label: 'Plan to Watch', icon: '📋' },
  { key: 'on_hold', label: 'On Hold', icon: '⏸️' },
  { key: 'dropped', label: 'Dropped', icon: '❌' },
  { key: 'favorites', label: 'Favorites', icon: '💖' },
]

const SORT_OPTIONS = [
  { key: 'updated', label: 'Last Updated' },
  { key: 'added', label: 'Date Added' },
  { key: 'title', label: 'Title' },
  { key: 'rating', label: 'Rating' },
  { key: 'progress', label: 'Progress' },
]

export default function WatchlistPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('all')
  const [sortBy, setSortBy] = useState('updated')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  const {
    watchlist,
    isLoading,
    error,
    loadWatchlist,
    getWatchlistByStatus,
    getFavorites,
    getWatchlistStats,
  } = useWatchlistStore()

  useEffect(() => {
    if (user) {
      loadWatchlist()
    }
  }, [user, loadWatchlist])

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold mb-2">Sign in Required</h1>
          <p className="text-muted-foreground mb-6">
            You need to sign in to view your watchlist.
          </p>
          <Button asChild>
            <a href="/auth/login">Sign In</a>
          </Button>
        </div>
      </div>
    )
  }

  const stats = getWatchlistStats()
  
  const getFilteredAnime = () => {
    let items = Array.from(watchlist.values())
    
    // Filter by status
    if (activeTab === 'favorites') {
      items = getFavorites()
    } else if (activeTab !== 'all') {
      items = getWatchlistByStatus(activeTab as WatchStatus)
    }
    
    // Sort items
    items.sort((a, b) => {
      switch (sortBy) {
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        case 'added':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'title':
          return a.animeId - b.animeId // Would need anime titles for proper sorting
        case 'rating':
          return (b.rating || 0) - (a.rating || 0)
        case 'progress':
          return b.progress - a.progress
        default:
          return 0
      }
    })
    
    return items
  }

  const filteredAnime = getFilteredAnime()

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Header Skeleton */}
          <div className="space-y-4">
            <div className="h-8 bg-muted rounded w-48 animate-pulse" />
            <div className="h-4 bg-muted rounded w-96 animate-pulse" />
          </div>
          
          {/* Stats Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border rounded-lg p-4 space-y-2">
                <div className="h-6 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded w-20 animate-pulse" />
              </div>
            ))}
          </div>
          
          {/* Content Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-[3/4] bg-muted rounded-lg animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold">My Watchlist</h1>
        <p className="text-muted-foreground text-lg">
          Track and manage your anime watching progress
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="text-2xl font-bold text-primary">{stats.totalAnime}</div>
          <div className="text-sm text-muted-foreground">Total Anime</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-500">{stats.watching}</div>
          <div className="text-sm text-muted-foreground">Watching</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
          <div className="text-sm text-muted-foreground">Completed</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-500">{stats.totalEpisodes}</div>
          <div className="text-sm text-muted-foreground">Episodes Watched</div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="space-y-4">
        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => {
            const count = tab.key === 'all' 
              ? stats.totalAnime 
              : tab.key === 'favorites' 
                ? getFavorites().length
                : getWatchlistByStatus(tab.key as WatchStatus).length
            
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  activeTab === tab.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                )}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span className="bg-background/20 px-2 py-0.5 rounded-full text-xs">
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Sort and View Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-background text-sm"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  Sort by {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex bg-muted rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded transition-colors',
                viewMode === 'grid' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
              )}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 11h5V5H4v6zm0 7h5v-6H4v6zm6 0h5v-6h-5v6zm6-6v6h5v-6h-5zm-6-7h5V5h-5v6zm6-6v6h5V5h-5z"/>
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded transition-colors',
                viewMode === 'list' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
              )}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {filteredAnime.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📺</div>
          <h3 className="text-xl font-semibold mb-2">
            {activeTab === 'all' ? 'No anime in watchlist' : `No ${activeTab.replace('_', ' ')} anime`}
          </h3>
          <p className="text-muted-foreground mb-6">
            {activeTab === 'all' 
              ? 'Start building your watchlist by adding anime you want to watch'
              : `You haven't added any anime to ${activeTab.replace('_', ' ')} yet`
            }
          </p>
          <Button asChild>
            <a href="/browse">Browse Anime</a>
          </Button>
        </div>
      ) : (
        <div className={cn(
          viewMode === 'grid' 
            ? 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4'
            : 'space-y-4'
        )}>
          {filteredAnime.map((item, index) => (
            <WatchlistAnimeCard
              key={item.animeId}
              item={item}
              index={index}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface WatchlistAnimeCardProps {
  item: any
  index: number
  viewMode: 'grid' | 'list'
}

function WatchlistAnimeCard({ item, index, viewMode }: WatchlistAnimeCardProps) {
  const { data: anime } = useAnimeDetails(item.animeId)
  
  if (!anime) {
    return (
      <div className={cn(
        'animate-pulse',
        viewMode === 'grid' ? 'space-y-2' : 'flex items-center space-x-4 p-4 bg-card rounded-lg border'
      )}>
        {viewMode === 'grid' ? (
          <>
            <div className="aspect-[3/4] bg-muted rounded-lg" />
            <div className="h-4 bg-muted rounded" />
            <div className="h-3 bg-muted rounded w-2/3" />
          </>
        ) : (
          <>
            <div className="w-16 h-20 bg-muted rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <AnimeCard
        anime={anime}
        variant={viewMode === 'list' ? 'compact' : 'default'}
        showDetails={true}
      />
    </motion.div>
  )
}
