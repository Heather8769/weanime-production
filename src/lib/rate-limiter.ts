// Advanced Rate Limiting System with Multiple Strategies
import { NextRequest, NextResponse } from 'next/server'

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  keyGenerator?: (req: NextRequest) => string
  onLimitReached?: (req: NextRequest) => void
  whitelist?: string[]
  blacklist?: string[]
}

interface RateLimitEntry {
  count: number
  resetTime: number
  firstRequest: number
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>()
  public config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = {
      keyGenerator: (req) => this.getClientIP(req),
      ...config
    }

    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000)
  }

  protected getClientIP(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for')
    const realIP = req.headers.get('x-real-ip')
    const remoteAddr = req.headers.get('x-vercel-forwarded-for')
    
    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }
    if (realIP) {
      return realIP
    }
    if (remoteAddr) {
      return remoteAddr
    }
    
    return 'unknown'
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key)
      }
    }
  }

  public async checkLimit(req: NextRequest): Promise<{
    allowed: boolean
    limit: number
    remaining: number
    resetTime: number
    retryAfter?: number
  }> {
    const key = this.config.keyGenerator!(req)
    const now = Date.now()

    // Check whitelist
    if (this.config.whitelist?.includes(key)) {
      return {
        allowed: true,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests,
        resetTime: now + this.config.windowMs
      }
    }

    // Check blacklist
    if (this.config.blacklist?.includes(key)) {
      return {
        allowed: false,
        limit: this.config.maxRequests,
        remaining: 0,
        resetTime: now + this.config.windowMs,
        retryAfter: this.config.windowMs
      }
    }

    let entry = this.store.get(key)

    // Create new entry if doesn't exist or window has expired
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + this.config.windowMs,
        firstRequest: now
      }
      this.store.set(key, entry)
    }

    // Increment counter
    entry.count++

    const allowed = entry.count <= this.config.maxRequests
    const remaining = Math.max(0, this.config.maxRequests - entry.count)

    if (!allowed && this.config.onLimitReached) {
      this.config.onLimitReached(req)
    }

    return {
      allowed,
      limit: this.config.maxRequests,
      remaining,
      resetTime: entry.resetTime,
      retryAfter: allowed ? undefined : entry.resetTime - now
    }
  }

  public getStats(): {
    totalEntries: number
    activeClients: number
    topClients: Array<{ key: string; count: number; resetTime: number }>
  } {
    const entries = Array.from(this.store.entries())
    const now = Date.now()
    
    const activeEntries = entries.filter(([, entry]) => now <= entry.resetTime)
    const topClients = activeEntries
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([key, entry]) => ({
        key: key.substring(0, 8) + '...', // Anonymize IP
        count: entry.count,
        resetTime: entry.resetTime
      }))

    return {
      totalEntries: this.store.size,
      activeClients: activeEntries.length,
      topClients
    }
  }

  public reset(key?: string) {
    if (key) {
      this.store.delete(key)
    } else {
      this.store.clear()
    }
  }
}

// Predefined rate limiters for different endpoints
export const rateLimiters = {
  // General API rate limiter
  api: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    onLimitReached: (req) => {
      console.warn(`Rate limit exceeded for API: ${req.url}`)
    }
  }),

  // Authentication endpoints (stricter)
  auth: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    onLimitReached: (req) => {
      console.warn(`Auth rate limit exceeded: ${req.url}`)
    }
  }),

  // Search endpoints (moderate)
  search: new RateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 30,
    onLimitReached: (req) => {
      console.warn(`Search rate limit exceeded: ${req.url}`)
    }
  }),

  // Video streaming (generous)
  streaming: new RateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 60,
    onLimitReached: (req) => {
      console.warn(`Streaming rate limit exceeded: ${req.url}`)
    }
  }),

  // Error reporting (very generous)
  monitoring: new RateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 100,
    onLimitReached: (req) => {
      console.warn(`Monitoring rate limit exceeded: ${req.url}`)
    }
  })
}

// Middleware factory
export function createRateLimitMiddleware(limiter: RateLimiter) {
  return async function rateLimitMiddleware(req: NextRequest) {
    const result = await limiter.checkLimit(req)

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: result.retryAfter
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
            'Retry-After': Math.ceil((result.retryAfter || 0) / 1000).toString()
          }
        }
      )
    }

    // Add rate limit headers to successful responses
    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Limit', result.limit.toString())
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
    response.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString())

    return response
  }
}

// Utility function to apply rate limiting to API routes
export function withRateLimit(
  handler: (req: NextRequest) => Promise<Response> | Response,
  limiter: RateLimiter = rateLimiters.api
) {
  return async function rateLimitedHandler(req: NextRequest) {
    const rateLimitResult = await limiter.checkLimit(req)

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: rateLimitResult.retryAfter
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
            'Retry-After': Math.ceil((rateLimitResult.retryAfter || 0) / 1000).toString()
          }
        }
      )
    }

    try {
      const response = await handler(req)
      
      // Add rate limit headers to response
      if (response instanceof NextResponse) {
        response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString())
        response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
        response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString())
      }

      return response
    } catch (error) {
      // Don't count failed requests against rate limit if configured
      if (limiter.config?.skipFailedRequests) {
        // This would require more complex implementation to rollback the count
      }
      throw error
    }
  }
}

// Advanced rate limiting with different strategies
export class AdaptiveRateLimiter extends RateLimiter {
  private suspiciousIPs = new Set<string>()
  private trustedIPs = new Set<string>()

  constructor(config: RateLimitConfig) {
    super(config)
  }

  public markSuspicious(ip: string) {
    this.suspiciousIPs.add(ip)
    // Reduce rate limit for suspicious IPs
    setTimeout(() => this.suspiciousIPs.delete(ip), 60 * 60 * 1000) // 1 hour
  }

  public markTrusted(ip: string) {
    this.trustedIPs.add(ip)
  }

  public async checkLimit(req: NextRequest) {
    const result = await super.checkLimit(req)
    const ip = this.getClientIPForAdaptive(req)

    // Adjust limits based on IP reputation
    if (this.suspiciousIPs.has(ip)) {
      result.limit = Math.floor(result.limit * 0.5) // Reduce limit by 50%
      result.remaining = Math.max(0, result.limit - (this.config.maxRequests - result.remaining))
      result.allowed = result.remaining > 0
    } else if (this.trustedIPs.has(ip)) {
      result.limit = Math.floor(result.limit * 1.5) // Increase limit by 50%
      result.remaining = Math.min(result.limit, result.remaining + Math.floor(this.config.maxRequests * 0.5))
      result.allowed = true
    }

    return result
  }

  protected getClientIPForAdaptive(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for')
    const realIP = req.headers.get('x-real-ip')

    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }
    if (realIP) {
      return realIP
    }

    return 'unknown'
  }
}

// Export default rate limiter
export const defaultRateLimiter = rateLimiters.api
