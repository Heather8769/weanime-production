import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  return (
    <div
      className={cn(
        'border-4 border-primary border-t-transparent rounded-full animate-spin',
        sizeClasses[size],
        className
      )}
    />
  )
}

interface LoadingCardProps {
  className?: string
}

export function LoadingCard({ className }: LoadingCardProps) {
  return (
    <div className={cn('glass-card p-6 rounded-xl space-y-4', className)}>
      <div className="shimmer h-4 bg-white/10 rounded w-3/4" />
      <div className="shimmer h-3 bg-white/10 rounded w-1/2" />
      <div className="shimmer h-20 bg-white/10 rounded" />
      <div className="flex gap-2">
        <div className="shimmer h-8 bg-white/10 rounded w-16" />
        <div className="shimmer h-8 bg-white/10 rounded w-20" />
      </div>
    </div>
  )
}

interface LoadingGridProps {
  count?: number
  className?: string
}

export function LoadingGrid({ count = 6, className }: LoadingGridProps) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <LoadingCard key={i} />
      ))}
    </div>
  )
}

interface LoadingOverlayProps {
  message?: string
  className?: string
}

export function LoadingOverlay({ message = 'Loading...', className }: LoadingOverlayProps) {
  return (
    <div className={cn(
      'absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm',
      className
    )}>
      <div className="flex items-center space-x-3 text-white">
        <LoadingSpinner />
        <span>{message}</span>
      </div>
    </div>
  )
}

interface LoadingPageProps {
  message?: string
}

export function LoadingPage({ message = 'Loading page...' }: LoadingPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-white/80">{message}</p>
      </div>
    </div>
  )
}

// Skeleton components for specific content types
export function AnimeCardSkeleton() {
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="shimmer aspect-[3/4] bg-white/10" />
      <div className="p-4 space-y-2">
        <div className="shimmer h-4 bg-white/10 rounded w-3/4" />
        <div className="shimmer h-3 bg-white/10 rounded w-1/2" />
      </div>
    </div>
  )
}

export function EpisodeListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="glass-card p-4 rounded-lg flex items-center gap-4">
          <div className="shimmer w-16 h-10 bg-white/10 rounded" />
          <div className="flex-1 space-y-2">
            <div className="shimmer h-4 bg-white/10 rounded w-3/4" />
            <div className="shimmer h-3 bg-white/10 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function VideoPlayerSkeleton() {
  return (
    <div className="aspect-video glass-card rounded-xl flex items-center justify-center">
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-white/80">Loading video player...</p>
      </div>
    </div>
  )
}
