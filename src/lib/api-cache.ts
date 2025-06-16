// API Caching System to handle rate limits and improve performance

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

class APICache {
  private cache = new Map<string, CacheEntry<any>>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes
  private readonly LONG_TTL = 30 * 60 * 1000 // 30 minutes for stable data

  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now()
    const expiresAt = now + (ttl || this.DEFAULT_TTL)
    
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }

  clear(): void {
    this.cache.clear()
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
      }
    }
  }

  // Get cache stats
  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        age: Date.now() - entry.timestamp,
        ttl: entry.expiresAt - Date.now()
      }))
    }
  }
}

// Global cache instance
export const apiCache = new APICache()

// Cache key generators
export const cacheKeys = {
  trending: () => 'trending-anime',
  seasonal: (season: string, year: number) => `seasonal-${season}-${year}`,
  animeEpisodes: (animeId: string) => `episodes-${animeId}`,
  animeDetails: (animeId: string) => `anime-${animeId}`,
  streaming: (animeId: string, episode: string) => `stream-${animeId}-${episode}`
}

// Rate limiting helper
export class RateLimiter {
  private requests = new Map<string, number[]>()
  private readonly WINDOW_MS = 60 * 1000 // 1 minute
  private readonly MAX_REQUESTS = 30 // 30 requests per minute

  canMakeRequest(key: string): boolean {
    const now = Date.now()
    const windowStart = now - this.WINDOW_MS
    
    // Get existing requests for this key
    const keyRequests = this.requests.get(key) || []
    
    // Filter out old requests
    const recentRequests = keyRequests.filter(time => time > windowStart)
    
    // Update the requests array
    this.requests.set(key, recentRequests)
    
    return recentRequests.length < this.MAX_REQUESTS
  }

  recordRequest(key: string): void {
    const now = Date.now()
    const keyRequests = this.requests.get(key) || []
    keyRequests.push(now)
    this.requests.set(key, keyRequests)
  }

  getRequestCount(key: string): number {
    const now = Date.now()
    const windowStart = now - this.WINDOW_MS
    const keyRequests = this.requests.get(key) || []
    return keyRequests.filter(time => time > windowStart).length
  }
}

export const rateLimiter = new RateLimiter()

// Enhanced fetch with caching and rate limiting
export async function cachedFetch<T>(
  url: string,
  cacheKey: string,
  options: {
    ttl?: number
    rateLimitKey?: string
    timeout?: number
  } = {}
): Promise<T> {
  const { ttl, rateLimitKey = url, timeout = 15000 } = options

  // Check cache first
  const cached = apiCache.get<T>(cacheKey)
  if (cached) {
    console.log(`Cache hit for ${cacheKey}`)
    return cached
  }

  // Check rate limit
  if (!rateLimiter.canMakeRequest(rateLimitKey)) {
    throw new Error(`Rate limit exceeded for ${rateLimitKey}. Try again later.`)
  }

  // Record the request
  rateLimiter.recordRequest(rateLimitKey)

  try {
    console.log(`Making API request to ${url}`)
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    
    // Cache the successful response
    apiCache.set(cacheKey, data, ttl)
    
    return data
  } catch (error) {
    console.error(`API request failed for ${url}:`, error)
    throw error
  }
}

// Cleanup function to run periodically
export function startCacheCleanup() {
  setInterval(() => {
    apiCache.cleanup()
  }, 5 * 60 * 1000) // Clean every 5 minutes
}
