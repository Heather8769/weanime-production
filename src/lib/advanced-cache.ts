// Advanced caching system with multiple storage backends
export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  accessCount: number
  lastAccessed: number
  tags: string[]
}

export interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  maxSize?: number // Maximum number of entries
  tags?: string[] // Tags for cache invalidation
  serialize?: boolean // Whether to serialize data for storage
  storage?: 'memory' | 'localStorage' | 'sessionStorage' | 'indexedDB'
}

export class AdvancedCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>()
  private accessOrder: string[] = []
  private maxSize: number
  private defaultTTL: number
  private storage: 'memory' | 'localStorage' | 'sessionStorage' | 'indexedDB'
  private storagePrefix: string

  constructor(
    name: string,
    options: CacheOptions = {}
  ) {
    this.maxSize = options.maxSize || 1000
    this.defaultTTL = options.ttl || 5 * 60 * 1000 // 5 minutes
    this.storage = options.storage || 'memory'
    this.storagePrefix = `cache_${name}_`

    if (this.storage !== 'memory') {
      this.loadFromStorage()
    }

    // Cleanup expired entries periodically
    setInterval(() => this.cleanup(), 60000) // Every minute
  }

  private async loadFromStorage() {
    if (typeof window === 'undefined') return

    try {
      switch (this.storage) {
        case 'localStorage':
          this.loadFromWebStorage(localStorage)
          break
        case 'sessionStorage':
          this.loadFromWebStorage(sessionStorage)
          break
        case 'indexedDB':
          await this.loadFromIndexedDB()
          break
      }
    } catch (error) {
      console.warn('Failed to load cache from storage:', error)
    }
  }

  private loadFromWebStorage(storage: Storage) {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key?.startsWith(this.storagePrefix)) {
        const cacheKey = key.replace(this.storagePrefix, '')
        const data = storage.getItem(key)
        if (data) {
          try {
            const entry: CacheEntry<T> = JSON.parse(data)
            if (this.isValid(entry)) {
              this.cache.set(cacheKey, entry)
              this.accessOrder.push(cacheKey)
            }
          } catch (error) {
            console.warn('Failed to parse cache entry:', error)
          }
        }
      }
    }
  }

  private async loadFromIndexedDB() {
    // IndexedDB not currently used, fallback to memory storage
    return
  }

  private async saveToStorage(key: string, entry: CacheEntry<T>) {
    if (typeof window === 'undefined' || this.storage === 'memory') return

    try {
      const storageKey = this.storagePrefix + key
      const serialized = JSON.stringify(entry)

      switch (this.storage) {
        case 'localStorage':
          localStorage.setItem(storageKey, serialized)
          break
        case 'sessionStorage':
          sessionStorage.setItem(storageKey, serialized)
          break
        case 'indexedDB':
          await this.saveToIndexedDB(storageKey, entry)
          break
      }
    } catch (error) {
      console.warn('Failed to save cache to storage:', error)
    }
  }

  private async saveToIndexedDB(key: string, entry: CacheEntry<T>) {
    // IndexedDB not currently used
    return
  }

  private removeFromStorage(key: string) {
    if (typeof window === 'undefined' || this.storage === 'memory') return

    try {
      const storageKey = this.storagePrefix + key

      switch (this.storage) {
        case 'localStorage':
          localStorage.removeItem(storageKey)
          break
        case 'sessionStorage':
          sessionStorage.removeItem(storageKey)
          break
        case 'indexedDB':
          // IndexedDB removal would go here
          break
      }
    } catch (error) {
      console.warn('Failed to remove cache from storage:', error)
    }
  }

  private isValid(entry: CacheEntry<T>): boolean {
    const now = Date.now()
    return now - entry.timestamp < entry.ttl
  }

  private updateAccessOrder(key: string) {
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
    this.accessOrder.push(key)
  }

  private evictLRU() {
    if (this.accessOrder.length === 0) return

    const lruKey = this.accessOrder.shift()!
    this.cache.delete(lruKey)
    this.removeFromStorage(lruKey)
  }

  async set(key: string, data: T, options: CacheOptions = {}): Promise<void> {
    const now = Date.now()
    const ttl = options.ttl || this.defaultTTL
    const tags = options.tags || []

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl,
      accessCount: 0,
      lastAccessed: now,
      tags,
    }

    // Evict if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictLRU()
    }

    this.cache.set(key, entry)
    this.updateAccessOrder(key)
    await this.saveToStorage(key, entry)
  }

  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (!this.isValid(entry)) {
      this.delete(key)
      return null
    }

    // Update access statistics
    entry.accessCount++
    entry.lastAccessed = Date.now()
    this.updateAccessOrder(key)

    return entry.data
  }

  async getOrSet<U = T>(
    key: string,
    factory: () => Promise<U> | U,
    options: CacheOptions = {}
  ): Promise<U> {
    const cached = this.get(key) as U
    if (cached !== null) {
      return cached
    }

    const data = await factory()
    await this.set(key, data as any, options)
    return data
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    if (!this.isValid(entry)) {
      this.delete(key)
      return false
    }

    return true
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key)
    if (deleted) {
      const index = this.accessOrder.indexOf(key)
      if (index > -1) {
        this.accessOrder.splice(index, 1)
      }
      this.removeFromStorage(key)
    }
    return deleted
  }

  clear(): void {
    this.cache.clear()
    this.accessOrder = []

    // Clear from storage
    if (typeof window !== 'undefined' && this.storage !== 'memory') {
      try {
        switch (this.storage) {
          case 'localStorage':
            this.clearWebStorage(localStorage)
            break
          case 'sessionStorage':
            this.clearWebStorage(sessionStorage)
            break
        }
      } catch (error) {
        console.warn('Failed to clear cache from storage:', error)
      }
    }
  }

  private clearWebStorage(storage: Storage) {
    const keysToRemove: string[] = []
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key?.startsWith(this.storagePrefix)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => storage.removeItem(key))
  }

  invalidateByTag(tag: string): number {
    let count = 0
    const entries = Array.from(this.cache.entries())
    for (const [key, entry] of entries) {
      if (entry.tags.includes(tag)) {
        this.delete(key)
        count++
      }
    }
    return count
  }

  cleanup(): number {
    let count = 0
    const entries = Array.from(this.cache.entries())
    for (const [key, entry] of entries) {
      if (!this.isValid(entry)) {
        this.delete(key)
        count++
      }
    }
    return count
  }

  getStats() {
    const entries = Array.from(this.cache.values())
    const now = Date.now()

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.calculateHitRate(),
      averageAge: entries.reduce((sum, entry) => sum + (now - entry.timestamp), 0) / entries.length || 0,
      totalAccesses: entries.reduce((sum, entry) => sum + entry.accessCount, 0),
      memoryUsage: this.estimateMemoryUsage(),
    }
  }

  private calculateHitRate(): number {
    // This would require tracking hits/misses
    // For now, return a placeholder
    return 0
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of memory usage
    let size = 0
    const entries = Array.from(this.cache.entries())
    for (const [key, entry] of entries) {
      size += key.length * 2 // UTF-16 characters
      size += JSON.stringify(entry).length * 2
    }
    return size
  }

  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  values(): T[] {
    return Array.from(this.cache.values())
      .filter(entry => this.isValid(entry))
      .map(entry => entry.data)
  }

  entries(): [string, T][] {
    const cacheEntries = Array.from(this.cache.entries())
    return cacheEntries
      .filter(([, entry]) => this.isValid(entry))
      .map(([key, entry]) => [key, entry.data])
  }
}

// Global cache instances
export const animeCache = new AdvancedCache('anime', {
  maxSize: 500,
  ttl: 10 * 60 * 1000, // 10 minutes
  storage: 'localStorage',
})

export const episodeCache = new AdvancedCache('episodes', {
  maxSize: 1000,
  ttl: 30 * 60 * 1000, // 30 minutes
  storage: 'localStorage',
})

export const searchCache = new AdvancedCache('search', {
  maxSize: 100,
  ttl: 5 * 60 * 1000, // 5 minutes
  storage: 'sessionStorage',
})

export const imageCache = new AdvancedCache('images', {
  maxSize: 2000,
  ttl: 60 * 60 * 1000, // 1 hour
  storage: 'localStorage',
})

// Cache utilities
export function createCacheKey(...parts: (string | number)[]): string {
  return parts.join(':')
}

export function withCache<T>(
  cache: AdvancedCache<T>,
  key: string,
  factory: () => Promise<T> | T,
  options?: CacheOptions
): Promise<T> {
  return cache.getOrSet(key, factory, options)
}
