'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { AverageRating } from '@/components/rating-system'
import { cn } from '@/lib/utils'

interface Comment {
  id: string
  userId: string
  animeId: number
  content: string
  rating: number | null
  spoiler: boolean
  likes: number
  createdAt: Date
  updatedAt: Date
  user: {
    email: string
    displayName?: string
  }
}

interface CommentsSectionProps {
  animeId: number
  className?: string
}

export function CommentsSection({ animeId, className }: CommentsSectionProps) {
  const { user } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [newRating, setNewRating] = useState<number | null>(null)
  const [isSpoiler, setIsSpoiler] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'rating' | 'likes'>('newest')

  const loadComments = useCallback(async () => {
    setIsLoading(true)
    try {
      // For now, use mock data since Supabase tables might not be set up
      // In production, this would query the actual database
      const mockComments: Comment[] = [
        {
          id: '1',
          userId: 'user1',
          animeId: animeId,
          content: 'Amazing anime! The character development is incredible and the animation quality is top-notch. Highly recommend watching this series.',
          rating: 9,
          likes: 15,
          spoiler: false,
          createdAt: new Date(Date.now() - 86400000), // 1 day ago
          updatedAt: new Date(Date.now() - 86400000),
          user: {
            email: 'anime_fan@example.com',
            displayName: 'AnimeFan2024',
          },
        },
        {
          id: '2',
          userId: 'user2',
          animeId: animeId,
          content: 'Good story but the pacing could be better. Some episodes feel a bit slow, but overall worth watching.',
          rating: 7,
          likes: 8,
          spoiler: false,
          createdAt: new Date(Date.now() - 172800000), // 2 days ago
          updatedAt: new Date(Date.now() - 172800000),
          user: {
            email: 'reviewer@example.com',
            displayName: 'CriticalReviewer',
          },
        },
        {
          id: '3',
          userId: 'user3',
          animeId: animeId,
          content: 'The ending was unexpected! I won\'t spoil it but definitely watch until the end.',
          rating: 8,
          likes: 12,
          spoiler: true,
          createdAt: new Date(Date.now() - 259200000), // 3 days ago
          updatedAt: new Date(Date.now() - 259200000),
          user: {
            email: 'spoiler_user@example.com',
            displayName: 'SpoilerAlert',
          },
        },
      ]

      // Apply sorting to mock data
      let sortedComments = [...mockComments]
      switch (sortBy) {
        case 'newest':
          sortedComments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          break
        case 'oldest':
          sortedComments.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
          break
        case 'rating':
          sortedComments.sort((a, b) => (b.rating || 0) - (a.rating || 0))
          break
        case 'likes':
          sortedComments.sort((a, b) => b.likes - a.likes)
          break
      }

      setComments(sortedComments)
    } catch (error) {
      console.error('Failed to load comments:', error)
      setComments([]) // Set empty array on error
    } finally {
      setIsLoading(false)
    }
  }, [animeId, sortBy])

  useEffect(() => {
    loadComments()
  }, [loadComments])

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          user_id: user.id,
          anime_id: animeId,
          content: newComment.trim(),
          rating: newRating,
          spoiler: isSpoiler,
          likes: 0,
        })

      if (error) throw error

      // Reset form
      setNewComment('')
      setNewRating(null)
      setIsSpoiler(false)

      // Reload comments
      await loadComments()
    } catch (error) {
      console.error('Failed to submit comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLikeComment = async (commentId: string) => {
    if (!user) return

    try {
      // In a real app, you'd check if user already liked and toggle
      const comment = comments.find(c => c.id === commentId)
      if (!comment) return

      const { error } = await supabase
        .from('comments')
        .update({ likes: comment.likes + 1 })
        .eq('id', commentId)

      if (error) throw error

      // Update local state
      setComments(prev => prev.map(c => 
        c.id === commentId ? { ...c, likes: c.likes + 1 } : c
      ))
    } catch (error) {
      console.error('Failed to like comment:', error)
    }
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">
          Reviews & Comments ({comments.length})
        </h3>
        
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-3 py-2 border border-border rounded-lg bg-background text-sm"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="rating">Highest Rated</option>
          <option value="likes">Most Liked</option>
        </select>
      </div>

      {/* Comment Form */}
      {user && (
        <div className="bg-card border rounded-lg p-4 space-y-4">
          <h4 className="font-medium">Write a Review</h4>
          
          {/* Rating */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Your Rating (Optional)</label>
            <div className="flex items-center gap-1">
              {Array.from({ length: 10 }, (_, i) => {
                const starRating = i + 1
                const isFilled = newRating ? starRating <= newRating : false
                
                return (
                  <button
                    key={i}
                    onClick={() => setNewRating(newRating === starRating ? null : starRating)}
                    className="transition-all duration-200 hover:scale-110"
                  >
                    <svg
                      className={cn(
                        'w-5 h-5 transition-colors duration-200',
                        isFilled ? 'text-yellow-400 fill-current' : 'text-gray-300 fill-current'
                      )}
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </button>
                )
              })}
              {newRating && (
                <span className="ml-2 text-sm text-muted-foreground">
                  {newRating}/10
                </span>
              )}
            </div>
          </div>
          
          {/* Comment Text */}
          <div className="space-y-2">
            <label htmlFor="comment" className="text-sm font-medium">
              Your Review
            </label>
            <textarea
              id="comment"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts about this anime..."
              className="w-full px-3 py-2 border border-border rounded-lg resize-none h-24 text-sm"
            />
          </div>
          
          {/* Options */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isSpoiler}
                onChange={(e) => setIsSpoiler(e.target.checked)}
                className="rounded"
              />
              Contains spoilers
            </label>
            
            <Button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || isSubmitting}
              size="sm"
            >
              {isSubmitting ? 'Posting...' : 'Post Review'}
            </Button>
          </div>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card border rounded-lg p-4 space-y-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted rounded-full" />
                <div className="space-y-1">
                  <div className="h-4 bg-muted rounded w-24" />
                  <div className="h-3 bg-muted rounded w-16" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-3/4" />
              </div>
            </div>
          ))
        ) : comments.length === 0 ? (
          <div className="text-center py-8 bg-card border rounded-lg">
            <div className="text-4xl mb-2">💬</div>
            <p className="text-muted-foreground">No reviews yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Be the first to share your thoughts!
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {comments.map((comment, index) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-card border rounded-lg p-4 space-y-3"
              >
                {/* Comment Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">
                      {comment.user.displayName?.[0] || comment.user.email[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        {comment.user.displayName || comment.user.email}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTimeAgo(comment.createdAt)}
                      </div>
                    </div>
                  </div>
                  
                  {comment.rating && (
                    <AverageRating rating={comment.rating} size="sm" />
                  )}
                </div>
                
                {/* Comment Content */}
                <div className="space-y-2">
                  {comment.spoiler && (
                    <div className="text-xs text-orange-500 font-medium">
                      ⚠️ Contains Spoilers
                    </div>
                  )}
                  <p className="text-sm leading-relaxed">{comment.content}</p>
                </div>
                
                {/* Comment Actions */}
                <div className="flex items-center gap-4 pt-2">
                  <button
                    onClick={() => handleLikeComment(comment.id)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    {comment.likes}
                  </button>
                  
                  <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Reply
                  </button>
                  
                  <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Report
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
