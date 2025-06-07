// Mobile Performance Optimizations
'use client'

import { useEffect, useState, useCallback } from 'react'

// Device detection utilities
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

export function isTablet(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth > 768 && window.innerWidth <= 1024
}

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (isMobile()) return 'mobile'
  if (isTablet()) return 'tablet'
  return 'desktop'
}

// Network detection
export function getNetworkSpeed(): 'slow' | 'medium' | 'fast' {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return 'medium'
  }

  const connection = (navigator as any).connection
  const effectiveType = connection?.effectiveType

  switch (effectiveType) {
    case 'slow-2g':
    case '2g':
      return 'slow'
    case '3g':
      return 'medium'
    case '4g':
    default:
      return 'fast'
  }
}

// Memory detection
export function getDeviceMemory(): number {
  if (typeof navigator === 'undefined' || !('deviceMemory' in navigator)) {
    return 4 // Default assumption
  }
  return (navigator as any).deviceMemory || 4
}

// Battery detection
export function getBatteryLevel(): Promise<number> {
  if (typeof navigator === 'undefined' || !('getBattery' in navigator)) {
    return Promise.resolve(1) // Assume full battery
  }

  return (navigator as any).getBattery().then((battery: any) => battery.level)
}

// Performance monitoring hook
export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = useState({
    deviceType: 'desktop' as 'mobile' | 'tablet' | 'desktop',
    networkSpeed: 'medium' as 'slow' | 'medium' | 'fast',
    deviceMemory: 4,
    batteryLevel: 1,
    isLowPowerMode: false
  })

  useEffect(() => {
    const updateMetrics = async () => {
      const deviceType = getDeviceType()
      const networkSpeed = getNetworkSpeed()
      const deviceMemory = getDeviceMemory()
      const batteryLevel = await getBatteryLevel()
      const isLowPowerMode = batteryLevel < 0.2 || deviceMemory < 2

      setMetrics({
        deviceType,
        networkSpeed,
        deviceMemory,
        batteryLevel,
        isLowPowerMode
      })
    }

    updateMetrics()

    // Update on network change
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      connection?.addEventListener('change', updateMetrics)
      
      return () => {
        connection?.removeEventListener('change', updateMetrics)
      }
    }
  }, [])

  return metrics
}

// Adaptive image loading
export function getOptimalImageSize(
  originalWidth: number,
  originalHeight: number,
  deviceType: 'mobile' | 'tablet' | 'desktop',
  networkSpeed: 'slow' | 'medium' | 'fast'
): { width: number; height: number; quality: number } {
  let scaleFactor = 1
  let quality = 80

  // Adjust based on device type
  switch (deviceType) {
    case 'mobile':
      scaleFactor = 0.5
      quality = networkSpeed === 'slow' ? 60 : 70
      break
    case 'tablet':
      scaleFactor = 0.75
      quality = networkSpeed === 'slow' ? 70 : 80
      break
    case 'desktop':
      scaleFactor = 1
      quality = networkSpeed === 'slow' ? 80 : 90
      break
  }

  // Further adjust for slow networks
  if (networkSpeed === 'slow') {
    scaleFactor *= 0.8
    quality = Math.max(50, quality - 20)
  }

  return {
    width: Math.round(originalWidth * scaleFactor),
    height: Math.round(originalHeight * scaleFactor),
    quality
  }
}

// Adaptive video quality
export function getOptimalVideoQuality(
  availableQualities: string[],
  deviceType: 'mobile' | 'tablet' | 'desktop',
  networkSpeed: 'slow' | 'medium' | 'fast',
  batteryLevel: number
): string {
  const qualityPriority = ['2160p', '1440p', '1080p', '720p', '480p', '360p', '240p']
  
  let maxQuality: string

  // Determine max quality based on device and network
  if (deviceType === 'mobile') {
    if (networkSpeed === 'slow' || batteryLevel < 0.2) {
      maxQuality = '480p'
    } else if (networkSpeed === 'medium') {
      maxQuality = '720p'
    } else {
      maxQuality = '1080p'
    }
  } else if (deviceType === 'tablet') {
    if (networkSpeed === 'slow') {
      maxQuality = '720p'
    } else if (networkSpeed === 'medium') {
      maxQuality = '1080p'
    } else {
      maxQuality = '1440p'
    }
  } else {
    // Desktop
    if (networkSpeed === 'slow') {
      maxQuality = '1080p'
    } else {
      maxQuality = '2160p'
    }
  }

  // Find the best available quality that doesn't exceed our max
  const maxIndex = qualityPriority.indexOf(maxQuality)
  for (let i = maxIndex; i < qualityPriority.length; i++) {
    if (availableQualities.includes(qualityPriority[i])) {
      return qualityPriority[i]
    }
  }

  // Fallback to lowest available quality
  return availableQualities[availableQualities.length - 1] || '480p'
}

// Lazy loading with intersection observer
export function useLazyLoading(threshold = 0.1) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [ref, setRef] = useState<Element | null>(null)

  const refCallback = useCallback((node: Element | null) => {
    setRef(node)
  }, [])

  useEffect(() => {
    if (!ref) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting)
      },
      { threshold }
    )

    observer.observe(ref)

    return () => {
      observer.disconnect()
    }
  }, [ref, threshold])

  return [refCallback, isIntersecting] as const
}

// Preload critical resources
export function preloadCriticalResources() {
  if (typeof window === 'undefined') return

  const deviceType = getDeviceType()
  const networkSpeed = getNetworkSpeed()

  // Only preload on fast networks and non-mobile devices
  if (networkSpeed === 'fast' && deviceType !== 'mobile') {
    // Preload critical fonts
    const fontLink = document.createElement('link')
    fontLink.rel = 'preload'
    fontLink.href = '/fonts/inter-var.woff2'
    fontLink.as = 'font'
    fontLink.type = 'font/woff2'
    fontLink.crossOrigin = 'anonymous'
    document.head.appendChild(fontLink)

    // Preload critical images
    const heroImage = new Image()
    heroImage.src = '/images/hero-bg.webp'

    // Preload critical API endpoints
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        // Cache critical API responses
        fetch('/api/trending?limit=6').catch(() => {})
        fetch('/api/seasonal?limit=6').catch(() => {})
      })
    }
  }
}

// Adaptive loading strategy
export function useAdaptiveLoading() {
  const metrics = usePerformanceMonitoring()
  
  const shouldReduceAnimations = metrics.isLowPowerMode || metrics.deviceType === 'mobile'
  const shouldLazyLoad = metrics.networkSpeed === 'slow' || metrics.deviceType === 'mobile'
  const shouldPreload = metrics.networkSpeed === 'fast' && metrics.deviceType === 'desktop'
  const shouldUseWebP = 'WebP' in window || CSS.supports('image-rendering', 'pixelated')

  return {
    ...metrics,
    shouldReduceAnimations,
    shouldLazyLoad,
    shouldPreload,
    shouldUseWebP,
    imageQuality: metrics.networkSpeed === 'slow' ? 60 : 80,
    maxImageWidth: metrics.deviceType === 'mobile' ? 400 : metrics.deviceType === 'tablet' ? 800 : 1200
  }
}

// Touch gesture optimization
export function useTouchOptimization() {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    setTouchEnd(null)
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    })
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    })
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return

    const distanceX = touchStart.x - touchEnd.x
    const distanceY = touchStart.y - touchEnd.y
    const isLeftSwipe = distanceX > 50
    const isRightSwipe = distanceX < -50
    const isUpSwipe = distanceY > 50
    const isDownSwipe = distanceY < -50

    return {
      isLeftSwipe,
      isRightSwipe,
      isUpSwipe,
      isDownSwipe,
      distanceX,
      distanceY
    }
  }, [touchStart, touchEnd])

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  }
}

// Viewport optimization
export function useViewportOptimization() {
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
    orientation: typeof window !== 'undefined' && window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
  })

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
        orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
      })
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [])

  return viewport
}

// Memory management
export function useMemoryManagement() {
  const [memoryPressure, setMemoryPressure] = useState<'low' | 'medium' | 'high'>('low')

  useEffect(() => {
    const checkMemoryPressure = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        const usedRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit

        if (usedRatio > 0.8) {
          setMemoryPressure('high')
        } else if (usedRatio > 0.6) {
          setMemoryPressure('medium')
        } else {
          setMemoryPressure('low')
        }
      }
    }

    const interval = setInterval(checkMemoryPressure, 10000) // Check every 10 seconds
    checkMemoryPressure()

    return () => clearInterval(interval)
  }, [])

  const cleanupMemory = useCallback(() => {
    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc()
    }

    // Clear unused images
    const images = document.querySelectorAll('img[data-loaded="true"]')
    images.forEach((img) => {
      const rect = img.getBoundingClientRect()
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        img.removeAttribute('src')
        img.removeAttribute('data-loaded')
      }
    })
  }, [])

  return {
    memoryPressure,
    cleanupMemory,
    shouldReduceQuality: memoryPressure === 'high',
    shouldLimitConcurrentLoads: memoryPressure !== 'low'
  }
}
