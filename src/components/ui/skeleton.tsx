'use client'

import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  variant?: 'default' | 'card' | 'text' | 'avatar' | 'button'
  width?: string | number
  height?: string | number
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
  animated?: boolean
}

export function Skeleton({
  className,
  variant = 'default',
  width,
  height,
  rounded = 'md',
  animated = true,
  ...props
}: SkeletonProps) {
  const baseClasses = 'glass-card border border-white/10'
  
  const variantClasses = {
    default: '',
    card: 'aspect-[3/4]',
    text: 'h-4',
    avatar: 'w-10 h-10',
    button: 'h-10 px-4',
  }
  
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  }
  
  const animationClass = animated ? 'shimmer' : ''
  
  const style = {
    ...(width && { width: typeof width === 'number' ? `${width}px` : width }),
    ...(height && { height: typeof height === 'number' ? `${height}px` : height }),
  }
  
  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        roundedClasses[rounded],
        animationClass,
        className
      )}
      style={style}
      {...props}
    />
  )
}

// Specialized skeleton components
export function AnimeCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      <Skeleton variant="card" rounded="xl" />
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="60%" />
      <div className="flex gap-2">
        <Skeleton width={60} height={20} rounded="full" />
        <Skeleton width={40} height={20} rounded="full" />
      </div>
    </div>
  )
}

export function HeroSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('min-h-[80vh] glass-card rounded-xl p-8', className)}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div className="space-y-6">
          <Skeleton width="80%" height={48} />
          <Skeleton width="100%" height={24} />
          <Skeleton width="90%" height={24} />
          <div className="flex gap-4">
            <Skeleton variant="button" width={120} />
            <Skeleton variant="button" width={140} />
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} width={80} height={24} rounded="full" />
            ))}
          </div>
        </div>
        <Skeleton className="aspect-[3/4] max-w-sm mx-auto" rounded="xl" />
      </div>
    </div>
  )
}

export function EpisodeListSkeleton({ count = 12, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card p-4 rounded-lg border border-white/10 flex gap-4">
          <Skeleton width={120} height={68} rounded="lg" />
          <div className="flex-1 space-y-2">
            <Skeleton width="70%" height={20} />
            <Skeleton width="100%" height={16} />
            <Skeleton width="40%" height={14} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function VideoPlayerSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('aspect-video glass-card rounded-xl relative overflow-hidden', className)}>
      <Skeleton className="absolute inset-0" animated={false} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="glass-card p-6 rounded-full">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      </div>
    </div>
  )
}

export function NavigationSkeleton({ className }: { className?: string }) {
  return (
    <nav className={cn('glass-nav border-b border-white/10 h-16', className)}>
      <div className="container mx-auto px-4 h-full flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Skeleton width={40} height={40} rounded="xl" />
          <Skeleton width={80} height={24} />
        </div>
        
        <div className="hidden md:flex items-center space-x-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} width={60} height={20} />
          ))}
        </div>
        
        <div className="hidden md:block">
          <Skeleton width={300} height={40} rounded="lg" />
        </div>
        
        <div className="flex items-center space-x-2">
          <Skeleton width={60} height={32} rounded="lg" />
          <Skeleton width={80} height={32} rounded="lg" />
        </div>
      </div>
    </nav>
  )
}

export function SearchResultsSkeleton({ count = 24, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="glass-card p-6 rounded-xl border border-white/10">
        <Skeleton width="200px" height={32} />
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <AnimeCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

export function AnimeDetailsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-8', className)}>
      {/* Hero Section */}
      <div className="glass-card rounded-xl p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Skeleton className="aspect-[3/4]" rounded="xl" />
          <div className="lg:col-span-2 space-y-6">
            <Skeleton width="80%" height={40} />
            <div className="flex gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} width={80} height={24} rounded="full" />
              ))}
            </div>
            <Skeleton width="100%" height={20} />
            <Skeleton width="90%" height={20} />
            <Skeleton width="70%" height={20} />
            <div className="flex gap-4">
              <Skeleton variant="button" width={120} />
              <Skeleton variant="button" width={140} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Episodes Section */}
      <div className="glass-card rounded-xl p-6">
        <Skeleton width="150px" height={28} className="mb-6" />
        <EpisodeListSkeleton count={6} />
      </div>
    </div>
  )
}

// Loading states for specific pages
export function BrowsePageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="glass-card p-8 rounded-xl border border-white/10 space-y-4">
        <Skeleton width="200px" height={40} />
        <Skeleton width="400px" height={24} />
      </div>
      
      <div className="glass-card p-6 rounded-xl border border-white/10">
        <Skeleton width="100%" height={60} />
      </div>
      
      <SearchResultsSkeleton />
    </div>
  )
}

export function WatchPageSkeleton() {
  return (
    <div className="min-h-screen bg-black">
      <VideoPlayerSkeleton className="w-full" />
      
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-4">
              <Skeleton width="60%" height={24} />
              <Skeleton width="80%" height={36} />
              <Skeleton width="100%" height={20} />
              <Skeleton width="90%" height={20} />
            </div>
            
            <div className="glass-card rounded-lg p-4">
              <div className="flex items-center justify-between">
                <Skeleton variant="button" width={100} />
                <Skeleton width={80} height={20} />
                <Skeleton variant="button" width={100} />
              </div>
            </div>
          </div>
          
          <div className="glass-card rounded-lg p-4">
            <EpisodeListSkeleton count={8} />
          </div>
        </div>
      </div>
    </div>
  )
}
