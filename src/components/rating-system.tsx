'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import * as Dialog from '@radix-ui/react-dialog'
import { useWatchlistStore } from '@/lib/watchlist-store'
import { AniListAnime } from '@/lib/anilist'
import { getAnimeTitle } from '@/hooks/use-anime'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Database function for saving reviews
async function saveReviewToDatabase(animeId: number, rating: number, review: string): Promise<void> {
  const response = await fetch('/api/reviews', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      animeId,
      rating,
      review,
      createdAt: new Date().toISOString()
    })
  })
  
  if (!response.ok) {
    throw new Error('Failed to save review to database')
  }
}

interface RatingSystemProps {
  anime: AniListAnime
  currentRating?: number | null
  onRatingChange?: (rating: number | null) => void
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean
  showLabel?: boolean
  className?: string
}

export function RatingSystem({
  anime,
  currentRating,
  onRatingChange,
  size = 'md',
  interactive = true,
  showLabel = true,
  className,
}: RatingSystemProps) {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null)
  const { updateRating, getWatchlistItem } = useWatchlistStore()
  
  const watchlistItem = getWatchlistItem(anime.id)
  const rating = currentRating ?? watchlistItem?.rating ?? null

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  const handleRatingClick = async (newRating: number) => {
    if (!interactive) return
    
    const finalRating = rating === newRating ? null : newRating
    
    try {
      if (watchlistItem) {
        await updateRating(anime.id, finalRating)
      }
      onRatingChange?.(finalRating)
    } catch (error) {
      console.error('Failed to update rating:', error)
    }
  }

  const displayRating = hoveredRating ?? rating

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex items-center gap-1">
        {Array.from({ length: 10 }, (_, i) => {
          const starRating = i + 1
          const isFilled = displayRating ? starRating <= displayRating : false
          const isHovered = hoveredRating ? starRating <= hoveredRating : false
          
          return (
            <button
              key={i}
              onClick={() => handleRatingClick(starRating)}
              onMouseEnter={() => interactive && setHoveredRating(starRating)}
              onMouseLeave={() => interactive && setHoveredRating(null)}
              disabled={!interactive}
              className={cn(
                'transition-all duration-200',
                interactive && 'hover:scale-110 cursor-pointer',
                !interactive && 'cursor-default'
              )}
            >
              <svg
                className={cn(
                  sizeClasses[size],
                  'transition-colors duration-200',
                  isFilled || isHovered
                    ? 'text-yellow-400 fill-current'
                    : 'text-gray-300 fill-current'
                )}
                viewBox="0 0 24 24"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
          )
        })}
      </div>
      
      {showLabel && (
        <span className="text-sm text-muted-foreground min-w-[3rem]">
          {displayRating ? `${displayRating}/10` : 'Not rated'}
        </span>
      )}
    </div>
  )
}

// Rating Dialog Component
interface RatingDialogProps {
  anime: AniListAnime
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function RatingDialog({ anime, isOpen, onOpenChange }: RatingDialogProps) {
  const [rating, setRating] = useState<number | null>(null)
  const [review, setReview] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { updateRating, getWatchlistItem } = useWatchlistStore()
  const watchlistItem = getWatchlistItem(anime.id)
  const title = getAnimeTitle(anime)

  const handleSubmit = async () => {
    if (!rating) return
    
    setIsSubmitting(true)
    try {
      await updateRating(anime.id, rating)
      
      // Save rating and review to database
      if (review.trim()) {
        await saveReviewToDatabase(anime.id, rating, review.trim())
      }
      
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to submit rating:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background border border-border rounded-lg p-6 w-full max-w-md z-50">
          <Dialog.Title className="text-xl font-semibold mb-4">
            Rate {title}
          </Dialog.Title>
          
          <div className="space-y-6">
            {/* Rating Stars */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Rating</label>
              <RatingSystem
                anime={anime}
                currentRating={rating}
                onRatingChange={setRating}
                size="lg"
                showLabel={true}
              />
            </div>
            
            {/* Review Text */}
            <div className="space-y-2">
              <label htmlFor="review" className="text-sm font-medium">
                Review (Optional)
              </label>
              <textarea
                id="review"
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Share your thoughts about this anime..."
                className="w-full px-3 py-2 border border-border rounded-lg resize-none h-24 text-sm"
              />
            </div>
            
            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!rating || isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Rating'}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// Quick Rating Component for cards
export function QuickRating({ anime, className }: { anime: AniListAnime; className?: string }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { getWatchlistItem } = useWatchlistStore()
  
  const watchlistItem = getWatchlistItem(anime.id)
  const hasRating = watchlistItem?.rating !== null && watchlistItem?.rating !== undefined

  return (
    <>
      <button
        onClick={() => setIsDialogOpen(true)}
        className={cn(
          'flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors',
          hasRating
            ? 'bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500/30'
            : 'bg-muted hover:bg-muted/80 text-muted-foreground',
          className
        )}
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        {hasRating ? `${watchlistItem.rating}/10` : 'Rate'}
      </button>
      
      <RatingDialog
        anime={anime}
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </>
  )
}

// Average Rating Display
export function AverageRating({ 
  rating, 
  size = 'md', 
  showCount = false, 
  count = 0,
  className 
}: { 
  rating: number
  size?: 'sm' | 'md' | 'lg'
  showCount?: boolean
  count?: number
  className?: string 
}) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <svg className={cn(sizeClasses[size], 'text-yellow-400 fill-current')} viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
      <span className={cn(textSizeClasses[size], 'font-medium')}>
        {rating.toFixed(1)}
      </span>
      {showCount && count > 0 && (
        <span className={cn(textSizeClasses[size], 'text-muted-foreground')}>
          ({count.toLocaleString()})
        </span>
      )}
    </div>
  )
}
