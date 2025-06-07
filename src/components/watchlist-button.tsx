'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useWatchlistStore, WatchStatus } from '@/lib/watchlist-store'
import { useAuth } from '@/lib/auth-context'
import { AniListAnime } from '@/lib/anilist'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface WatchlistButtonProps {
  anime: AniListAnime
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
  showStatus?: boolean
  className?: string
}

const STATUS_CONFIG = {
  watching: {
    label: 'Watching',
    icon: '👁️',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  completed: {
    label: 'Completed',
    icon: '✅',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  plan_to_watch: {
    label: 'Plan to Watch',
    icon: '📋',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  dropped: {
    label: 'Dropped',
    icon: '❌',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  on_hold: {
    label: 'On Hold',
    icon: '⏸️',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
}

export function WatchlistButton({ 
  anime, 
  variant = 'default', 
  size = 'default',
  showStatus = true,
  className 
}: WatchlistButtonProps) {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const {
    watchlist,
    isInWatchlist,
    getWatchlistItem,
    addToWatchlist,
    removeFromWatchlist,
    updateStatus,
    loadWatchlist,
  } = useWatchlistStore()

  const watchlistItem = getWatchlistItem(anime.id)
  const inWatchlist = isInWatchlist(anime.id)

  // Load watchlist on mount
  useEffect(() => {
    if (user) {
      loadWatchlist()
    }
  }, [user, loadWatchlist])

  const handleAddToWatchlist = async (status: WatchStatus = 'plan_to_watch') => {
    if (!user) return
    
    setIsLoading(true)
    try {
      await addToWatchlist(anime, status)
    } catch (error) {
      console.error('Failed to add to watchlist:', error)
    } finally {
      setIsLoading(false)
      setIsOpen(false)
    }
  }

  const handleRemoveFromWatchlist = async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      await removeFromWatchlist(anime.id)
    } catch (error) {
      console.error('Failed to remove from watchlist:', error)
    } finally {
      setIsLoading(false)
      setIsOpen(false)
    }
  }

  const handleStatusChange = async (status: WatchStatus) => {
    if (!user || !inWatchlist) return
    
    setIsLoading(true)
    try {
      await updateStatus(anime.id, status)
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setIsLoading(false)
      setIsOpen(false)
    }
  }

  if (!user) {
    return (
      <Button variant={variant} size={size} className={className} disabled>
        Sign in to add to watchlist
      </Button>
    )
  }

  if (isLoading) {
    return (
      <Button variant={variant} size={size} className={className} disabled>
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
        Loading...
      </Button>
    )
  }

  if (!inWatchlist) {
    return (
      <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenu.Trigger asChild>
          <Button variant={variant} size={size} className={className}>
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            Add to Watchlist
          </Button>
        </DropdownMenu.Trigger>
        
        <DropdownMenu.Portal>
          <DropdownMenu.Content 
            className="bg-popover border border-border rounded-lg shadow-lg p-2 space-y-1 z-50"
            sideOffset={5}
          >
            {Object.entries(STATUS_CONFIG).map(([status, config]) => (
              <DropdownMenu.Item
                key={status}
                onClick={() => handleAddToWatchlist(status as WatchStatus)}
                className="flex items-center gap-3 px-3 py-2 text-sm rounded cursor-pointer hover:bg-muted transition-colors"
              >
                <span className="text-lg">{config.icon}</span>
                <span>{config.label}</span>
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    )
  }

  const currentStatus = watchlistItem?.status
  const statusConfig = currentStatus ? STATUS_CONFIG[currentStatus] : null

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu.Trigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className={cn(
            'relative',
            statusConfig && showStatus && statusConfig.bgColor,
            statusConfig && showStatus && statusConfig.color,
            className
          )}
        >
          {statusConfig && showStatus && (
            <>
              <span className="mr-2">{statusConfig.icon}</span>
              {statusConfig.label}
            </>
          )}
          {(!showStatus || !statusConfig) && (
            <>
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              In Watchlist
            </>
          )}
          <svg className="w-3 h-3 ml-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </Button>
      </DropdownMenu.Trigger>
      
      <DropdownMenu.Portal>
        <DropdownMenu.Content 
          className="bg-popover border border-border rounded-lg shadow-lg p-2 space-y-1 z-50"
          sideOffset={5}
        >
          {/* Status Options */}
          <div className="px-3 py-1 text-xs font-medium text-muted-foreground">
            Change Status
          </div>
          
          {Object.entries(STATUS_CONFIG).map(([status, config]) => (
            <DropdownMenu.Item
              key={status}
              onClick={() => handleStatusChange(status as WatchStatus)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm rounded cursor-pointer transition-colors",
                currentStatus === status 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-muted"
              )}
            >
              <span className="text-lg">{config.icon}</span>
              <span>{config.label}</span>
              {currentStatus === status && (
                <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              )}
            </DropdownMenu.Item>
          ))}
          
          <DropdownMenu.Separator className="h-px bg-border my-1" />
          
          {/* Additional Options */}
          <DropdownMenu.Item
            onClick={() => {/* TODO: Open rating dialog */}}
            className="flex items-center gap-3 px-3 py-2 text-sm rounded cursor-pointer hover:bg-muted transition-colors"
          >
            <span className="text-lg">⭐</span>
            <span>Rate Anime</span>
          </DropdownMenu.Item>
          
          <DropdownMenu.Item
            onClick={() => {/* TODO: Toggle favorite */}}
            className="flex items-center gap-3 px-3 py-2 text-sm rounded cursor-pointer hover:bg-muted transition-colors"
          >
            <span className="text-lg">{watchlistItem?.favorite ? '💖' : '🤍'}</span>
            <span>{watchlistItem?.favorite ? 'Remove from Favorites' : 'Add to Favorites'}</span>
          </DropdownMenu.Item>
          
          <DropdownMenu.Separator className="h-px bg-border my-1" />
          
          {/* Remove Option */}
          <DropdownMenu.Item
            onClick={handleRemoveFromWatchlist}
            className="flex items-center gap-3 px-3 py-2 text-sm rounded cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            <span className="text-lg">🗑️</span>
            <span>Remove from Watchlist</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

// Compact version for cards
export function WatchlistButtonCompact({ anime, className }: { anime: AniListAnime; className?: string }) {
  const { user } = useAuth()
  const { isInWatchlist, getWatchlistItem, addToWatchlist, removeFromWatchlist } = useWatchlistStore()
  const [isLoading, setIsLoading] = useState(false)

  const inWatchlist = isInWatchlist(anime.id)
  const watchlistItem = getWatchlistItem(anime.id)

  const handleToggle = async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      if (inWatchlist) {
        await removeFromWatchlist(anime.id)
      } else {
        await addToWatchlist(anime, 'plan_to_watch')
      }
    } catch (error) {
      console.error('Failed to toggle watchlist:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) return null

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={handleToggle}
      disabled={isLoading}
      className={cn(
        'p-2 rounded-full transition-colors',
        inWatchlist 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-black/50 text-white hover:bg-black/70',
        className
      )}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : inWatchlist ? (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
      )}
    </motion.button>
  )
}
