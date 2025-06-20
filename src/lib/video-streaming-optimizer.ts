/**
 * Video Streaming Performance Optimizer
 * Enhances video playback performance with adaptive streaming, preloading, and quality optimization
 */

import { performanceMonitor } from './performance-monitor'
import { getOptimalVideoQuality } from './mobile-optimizations'

export interface VideoStreamingMetrics {
  bufferHealth: number
  playbackQuality: string
  droppedFrames: number
  bandwidth: number
  latency: number
  rebufferingEvents: number
  startupTime: number
}

export interface StreamingOptimizationConfig {
  enableAdaptiveQuality: boolean
  enablePreloading: boolean
  bufferSize: number
  maxRetries: number
  qualitySteps: string[]
  bandwidthThresholds: Record<string, number>
}

export class VideoStreamingOptimizer {
  private static instance: VideoStreamingOptimizer
  private config: StreamingOptimizationConfig
  private metrics: VideoStreamingMetrics
  private qualityHistory: string[] = []
  private bandwidthHistory: number[] = []
  private rebufferCount = 0
  private startTime = 0

  private constructor() {
    this.config = {
      enableAdaptiveQuality: true,
      enablePreloading: true,
      bufferSize: 30, // seconds
      maxRetries: 3,
      qualitySteps: ['240p', '360p', '480p', '720p', '1080p', '1440p', '2160p'],
      bandwidthThresholds: {
        '240p': 0.5,   // 0.5 Mbps
        '360p': 1,     // 1 Mbps
        '480p': 2,     // 2 Mbps
        '720p': 4,     // 4 Mbps
        '1080p': 8,    // 8 Mbps
        '1440p': 16,   // 16 Mbps
        '2160p': 32    // 32 Mbps
      }
    }

    this.metrics = {
      bufferHealth: 0,
      playbackQuality: '1080p',
      droppedFrames: 0,
      bandwidth: 0,
      latency: 0,
      rebufferingEvents: 0,
      startupTime: 0
    }

    this.initializeNetworkMonitoring()
  }

  static getInstance(): VideoStreamingOptimizer {
    if (!VideoStreamingOptimizer.instance) {
      VideoStreamingOptimizer.instance = new VideoStreamingOptimizer()
    }
    return VideoStreamingOptimizer.instance
  }

  private initializeNetworkMonitoring() {
    if (typeof window === 'undefined') return

    // Monitor network changes
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      if (connection) {
        connection.addEventListener('change', () => {
          this.handleNetworkChange()
        })
      }
    }

    // Monitor page visibility for optimization
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseOptimizations()
      } else {
        this.resumeOptimizations()
      }
    })
  }

  private handleNetworkChange() {
    const connection = (navigator as any).connection
    if (connection) {
      const bandwidth = connection.downlink || 10 // Mbps
      this.updateBandwidth(bandwidth)
      
      // Trigger quality adaptation
      if (this.config.enableAdaptiveQuality) {
        this.adaptQualityToBandwidth(bandwidth)
      }
    }
  }

  private updateBandwidth(bandwidth: number) {
    this.bandwidthHistory.push(bandwidth)
    if (this.bandwidthHistory.length > 10) {
      this.bandwidthHistory.shift()
    }
    
    // Calculate average bandwidth
    this.metrics.bandwidth = this.bandwidthHistory.reduce((a, b) => a + b, 0) / this.bandwidthHistory.length
  }

  private adaptQualityToBandwidth(bandwidth: number): string {
    const { qualitySteps, bandwidthThresholds } = this.config
    
    // Find the highest quality that fits the bandwidth
    for (let i = qualitySteps.length - 1; i >= 0; i--) {
      const quality = qualitySteps[i]
      const threshold = bandwidthThresholds[quality]
      
      if (bandwidth >= threshold * 1.2) { // 20% buffer for stability
        this.metrics.playbackQuality = quality
        this.qualityHistory.push(quality)
        
        if (this.qualityHistory.length > 5) {
          this.qualityHistory.shift()
        }
        
        return quality
      }
    }
    
    return '480p' // Fallback quality
  }

  // Optimize video player configuration
  getOptimizedPlayerConfig(videoElement?: HTMLVideoElement) {
    const deviceType = this.getDeviceType()
    const networkSpeed = this.getNetworkSpeed()
    
    return {
      preload: this.config.enablePreloading && networkSpeed !== 'slow' ? 'metadata' : 'none',
      crossOrigin: 'anonymous',
      playsInline: true,
      controls: false, // Custom controls for better UX
      
      // HLS.js configuration for adaptive streaming
      hlsConfig: {
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: this.config.bufferSize,
        maxMaxBufferLength: 600,
        maxBufferSize: 60 * 1000 * 1000, // 60MB
        maxBufferHole: 0.5,
        highBufferWatchdogPeriod: 2,
        nudgeOffset: 0.1,
        nudgeMaxRetry: 3,
        maxFragLookUpTolerance: 0.25,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
        enableSoftwareAES: true,
        manifestLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: 1,
        manifestLoadingRetryDelay: 1000,
        levelLoadingTimeOut: 10000,
        levelLoadingMaxRetry: 4,
        levelLoadingRetryDelay: 1000,
        fragLoadingTimeOut: 20000,
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 1000,
        startLevel: this.getStartLevel(),
        testBandwidth: true,
        progressive: false,
        optimizeBufferStalling: true
      }
    }
  }

  private getStartLevel(): number {
    const quality = this.metrics.playbackQuality
    const qualityIndex = this.config.qualitySteps.indexOf(quality)
    return qualityIndex >= 0 ? qualityIndex : 3 // Default to 720p
  }

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    if (typeof window === 'undefined') return 'desktop'
    
    const width = window.innerWidth
    if (width < 768) return 'mobile'
    if (width < 1024) return 'tablet'
    return 'desktop'
  }

  private getNetworkSpeed(): 'slow' | 'medium' | 'fast' {
    if (this.metrics.bandwidth < 2) return 'slow'
    if (this.metrics.bandwidth < 8) return 'medium'
    return 'fast'
  }

  // Monitor video performance
  monitorVideoPerformance(videoElement: HTMLVideoElement) {
    if (!videoElement) return

    const startTime = Date.now()
    this.startTime = startTime

    // Monitor buffer health
    const updateBufferHealth = () => {
      if (videoElement.buffered.length > 0) {
        const currentTime = videoElement.currentTime
        const bufferedEnd = videoElement.buffered.end(videoElement.buffered.length - 1)
        this.metrics.bufferHealth = bufferedEnd - currentTime
      }
    }

    // Monitor dropped frames (if supported)
    const updateDroppedFrames = () => {
      if ('getVideoPlaybackQuality' in videoElement) {
        const quality = (videoElement as any).getVideoPlaybackQuality()
        this.metrics.droppedFrames = quality.droppedVideoFrames || 0
      }
    }

    // Event listeners
    videoElement.addEventListener('loadstart', () => {
      this.startTime = Date.now()
    })

    videoElement.addEventListener('canplay', () => {
      this.metrics.startupTime = Date.now() - this.startTime
      performanceMonitor.recordMetric('video-startup-time', this.metrics.startupTime)
    })

    videoElement.addEventListener('waiting', () => {
      this.rebufferCount++
      this.metrics.rebufferingEvents = this.rebufferCount
      performanceMonitor.recordMetric('video-rebuffer-count', this.rebufferCount)
    })

    videoElement.addEventListener('timeupdate', () => {
      updateBufferHealth()
      updateDroppedFrames()
    })

    // Periodic monitoring
    const monitoringInterval = setInterval(() => {
      updateBufferHealth()
      updateDroppedFrames()
      
      // Record metrics
      performanceMonitor.recordMetric('video-buffer-health', this.metrics.bufferHealth)
      performanceMonitor.recordMetric('video-dropped-frames', this.metrics.droppedFrames)
    }, 1000)

    // Cleanup
    videoElement.addEventListener('ended', () => {
      clearInterval(monitoringInterval)
    })

    return () => clearInterval(monitoringInterval)
  }

  // Preload next episode for seamless playback
  preloadNextEpisode(nextEpisodeUrl: string) {
    if (!this.config.enablePreloading || this.getNetworkSpeed() === 'slow') {
      return
    }

    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = nextEpisodeUrl
    link.as = 'video'
    document.head.appendChild(link)

    // Remove after 5 minutes to avoid memory leaks
    setTimeout(() => {
      if (link.parentNode) {
        link.parentNode.removeChild(link)
      }
    }, 5 * 60 * 1000)
  }

  // Get current metrics
  getMetrics(): VideoStreamingMetrics {
    return { ...this.metrics }
  }

  // Update configuration
  updateConfig(newConfig: Partial<StreamingOptimizationConfig>) {
    this.config = { ...this.config, ...newConfig }
  }

  private pauseOptimizations() {
    // Reduce quality when tab is not visible
    if (this.config.enableAdaptiveQuality) {
      this.adaptQualityToBandwidth(this.metrics.bandwidth * 0.5)
    }
  }

  private resumeOptimizations() {
    // Restore quality when tab becomes visible
    this.handleNetworkChange()
  }

  // Generate performance report
  generatePerformanceReport() {
    return {
      timestamp: new Date().toISOString(),
      metrics: this.getMetrics(),
      qualityHistory: [...this.qualityHistory],
      bandwidthHistory: [...this.bandwidthHistory],
      config: { ...this.config },
      recommendations: this.generateRecommendations()
    }
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = []
    
    if (this.metrics.rebufferingEvents > 3) {
      recommendations.push('Consider reducing video quality due to frequent rebuffering')
    }
    
    if (this.metrics.startupTime > 3000) {
      recommendations.push('Video startup time is slow - check network connection')
    }
    
    if (this.metrics.droppedFrames > 50) {
      recommendations.push('High dropped frame count - device may be struggling with current quality')
    }
    
    if (this.metrics.bufferHealth < 5) {
      recommendations.push('Low buffer health - consider preloading more content')
    }
    
    return recommendations
  }
}

// Export singleton instance
export const videoStreamingOptimizer = VideoStreamingOptimizer.getInstance()

// Convenience functions
export function optimizeVideoPlayer(videoElement: HTMLVideoElement) {
  return videoStreamingOptimizer.monitorVideoPerformance(videoElement)
}

export function getOptimizedPlayerConfig() {
  return videoStreamingOptimizer.getOptimizedPlayerConfig()
}

export function preloadNextEpisode(url: string) {
  videoStreamingOptimizer.preloadNextEpisode(url)
}
