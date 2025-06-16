'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface AnimeImageProps {
  src: string | null | undefined
  alt: string
  width?: number
  height?: number
  fill?: boolean
  className?: string
  fallbackSrc?: string
  priority?: boolean
  sizes?: string
  quality?: number
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
}

// Default fallback images for different types
const DEFAULT_FALLBACKS = {
  cover: '/images/fallback-cover.svg',
  banner: '/images/fallback-banner.svg',
  thumbnail: '/images/fallback-thumbnail.svg',
  avatar: '/images/fallback-avatar.svg',
}

// Generate a placeholder image URL - use local SVG instead of external service
function generatePlaceholderUrl(width: number = 400, height: number = 600, text: string = 'Anime'): string {
  // Use local fallback images instead of external placeholder services
  return '/images/fallback-cover.svg'
}

// Create a blur data URL for loading states
function createBlurDataURL(width: number = 8, height: number = 12): string {
  return `data:image/svg+xml;base64,${Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1a1a1a;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#2a2a2a;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)" />
    </svg>`
  ).toString('base64')}`
}

export function AnimeImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className,
  fallbackSrc,
  priority = false,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  quality = 75,
  placeholder = 'blur',
  blurDataURL,
  ...props
}: AnimeImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src)
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Determine the best fallback image
  const getFallbackSrc = useCallback(() => {
    if (fallbackSrc) return fallbackSrc
    
    // Try to determine image type from alt text or dimensions
    if (alt.toLowerCase().includes('banner') || (width && height && width > height * 1.5)) {
      return DEFAULT_FALLBACKS.banner
    }
    if (alt.toLowerCase().includes('avatar') || alt.toLowerCase().includes('profile')) {
      return DEFAULT_FALLBACKS.avatar
    }
    if (alt.toLowerCase().includes('thumbnail')) {
      return DEFAULT_FALLBACKS.thumbnail
    }
    
    return DEFAULT_FALLBACKS.cover
  }, [fallbackSrc, alt, width, height])

  // Handle image load error
  const handleError = useCallback(() => {
    console.log(`Image failed to load: ${currentSrc || src}`)
    if (!hasError) {
      setHasError(true)
      const fallback = getFallbackSrc()
      console.log(`Trying fallback: ${fallback}`)

      // If the fallback is different from current src, try it
      if (fallback !== currentSrc) {
        setCurrentSrc(fallback)
        return
      }

      // If fallback also fails, use placeholder
      if (width && height) {
        const placeholder = generatePlaceholderUrl(width, height, alt)
        console.log(`Using placeholder: ${placeholder}`)
        setCurrentSrc(placeholder)
      }
    }
  }, [hasError, getFallbackSrc, currentSrc, src, width, height, alt])

  // Handle successful load
  const handleLoad = useCallback(() => {
    setIsLoading(false)
  }, [])

  // Get the blur data URL
  const getBlurDataURL = useCallback(() => {
    if (blurDataURL) return blurDataURL
    if (placeholder === 'blur') {
      const w = width || 400
      const h = height || 600
      return createBlurDataURL(Math.min(w / 50, 8), Math.min(h / 50, 12))
    }
    return undefined
  }, [blurDataURL, placeholder, width, height])

  // If no src provided, show fallback immediately
  if (!src && !currentSrc) {
    const fallback = getFallbackSrc()
    return (
      <div className={cn(
        'relative overflow-hidden bg-muted',
        fill && 'w-full h-full',
        !fill && width && height && `w-[${width}px] h-[${height}px]`,
        className
      )}>
        <Image
          src={fallback}
          alt={alt}
          width={width}
          height={height}
          fill={fill}
          priority={priority}
          sizes={sizes}
          quality={quality}
          placeholder={placeholder}
          blurDataURL={getBlurDataURL()}
          className="object-cover"
          onLoad={handleLoad}
          {...props}
        />
        {isLoading && (
          <div className="absolute inset-0 bg-muted animate-pulse" />
        )}
      </div>
    )
  }

  return (
    <div className={cn(
      'relative overflow-hidden bg-muted',
      fill && 'w-full h-full min-h-[200px]', // Ensure minimum height for fill images
      !fill && width && height && `w-[${width}px] h-[${height}px]`,
      className
    )}>
      <Image
        src={currentSrc || src || getFallbackSrc()}
        alt={alt}
        width={width}
        height={height}
        fill={fill}
        priority={priority}
        sizes={sizes}
        quality={quality}
        placeholder={placeholder}
        blurDataURL={getBlurDataURL()}
        className="object-cover transition-opacity duration-300"
        onError={handleError}
        onLoad={handleLoad}
        {...props}
      />
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      
      {/* Error state overlay */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
          <div className="text-center text-muted-foreground">
            <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
            </svg>
            <p className="text-xs">Image unavailable</p>
          </div>
        </div>
      )}
    </div>
  )
}

// Specialized components for different image types
export function AnimeCoverImage(props: Omit<AnimeImageProps, 'fallbackSrc'>) {
  return <AnimeImage {...props} fallbackSrc={DEFAULT_FALLBACKS.cover} />
}

export function AnimeBannerImage(props: Omit<AnimeImageProps, 'fallbackSrc'>) {
  return <AnimeImage {...props} fallbackSrc={DEFAULT_FALLBACKS.banner} />
}

export function AnimeThumbnailImage(props: Omit<AnimeImageProps, 'fallbackSrc'>) {
  return <AnimeImage {...props} fallbackSrc={DEFAULT_FALLBACKS.thumbnail} />
}

export function AnimeAvatarImage(props: Omit<AnimeImageProps, 'fallbackSrc'>) {
  return <AnimeImage {...props} fallbackSrc={DEFAULT_FALLBACKS.avatar} />
}
