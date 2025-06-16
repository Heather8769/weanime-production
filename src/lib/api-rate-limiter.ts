// API Rate Limiter Service
// Prevents API rate limiting issues and implements circuit breaker pattern

interface RateLimitConfig {
  minInterval: number // Minimum time between requests in ms
  maxFailures: number // Max failures before circuit opens
  resetTime: number   // Time to reset circuit in ms
}

interface ApiState {
  lastCall: number
  failures: number
  circuitOpen: boolean
  lastFailure: number
}

class ApiRateLimiter {
  private apiStates: Map<string, ApiState> = new Map()
  private configs: Map<string, RateLimitConfig> = new Map()

  constructor() {
    // Default configurations for common APIs
    this.configs.set('jikan', {
      minInterval: 1000,    // 1 second between calls
      maxFailures: 3,       // Open circuit after 3 failures
      resetTime: 300000     // Reset after 5 minutes
    })

    this.configs.set('kitsu', {
      minInterval: 500,     // 0.5 seconds between calls
      maxFailures: 3,
      resetTime: 300000
    })

    this.configs.set('anilist', {
      minInterval: 250,     // 0.25 seconds between calls
      maxFailures: 5,
      resetTime: 180000     // Reset after 3 minutes
    })

    this.configs.set('crunchyroll', {
      minInterval: 100,     // 0.1 seconds between calls
      maxFailures: 5,
      resetTime: 600000     // Reset after 10 minutes
    })
  }

  // Get or create API state
  private getApiState(apiName: string): ApiState {
    if (!this.apiStates.has(apiName)) {
      this.apiStates.set(apiName, {
        lastCall: 0,
        failures: 0,
        circuitOpen: false,
        lastFailure: 0
      })
    }
    return this.apiStates.get(apiName)!
  }

  // Check if circuit should be reset
  private shouldResetCircuit(apiName: string, state: ApiState): boolean {
    const config = this.configs.get(apiName)
    if (!config || !state.circuitOpen) return false

    const timeSinceLastFailure = Date.now() - state.lastFailure
    return timeSinceLastFailure > config.resetTime
  }

  // Check if API is available (circuit not open)
  isApiAvailable(apiName: string): boolean {
    const state = this.getApiState(apiName)
    
    if (this.shouldResetCircuit(apiName, state)) {
      state.circuitOpen = false
      state.failures = 0
      console.log(`🔄 Circuit reset for ${apiName}`)
    }

    return !state.circuitOpen
  }

  // Wait for rate limit if needed
  async waitForRateLimit(apiName: string): Promise<void> {
    const state = this.getApiState(apiName)
    const config = this.configs.get(apiName)
    
    if (!config) {
      console.warn(`No rate limit config for ${apiName}`)
      return
    }

    if (!this.isApiAvailable(apiName)) {
      throw new Error(`${apiName} API circuit is open - temporarily unavailable`)
    }

    const now = Date.now()
    const timeSinceLastCall = now - state.lastCall
    const waitTime = config.minInterval - timeSinceLastCall

    if (waitTime > 0) {
      console.log(`⏳ Rate limiting ${apiName}: waiting ${waitTime}ms`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }

    state.lastCall = Date.now()
  }

  // Record successful API call
  recordSuccess(apiName: string): void {
    const state = this.getApiState(apiName)
    state.failures = 0
    state.circuitOpen = false
    console.log(`✅ ${apiName} API call successful`)
  }

  // Record failed API call
  recordFailure(apiName: string, error?: Error): void {
    const state = this.getApiState(apiName)
    const config = this.configs.get(apiName)
    
    if (!config) return

    state.failures++
    state.lastFailure = Date.now()

    console.warn(`❌ ${apiName} API failure ${state.failures}/${config.maxFailures}: ${error?.message || 'Unknown error'}`)

    if (state.failures >= config.maxFailures) {
      state.circuitOpen = true
      console.error(`🚨 Circuit opened for ${apiName} - too many failures`)
    }
  }

  // Get API status for monitoring
  getApiStatus(apiName: string): {
    available: boolean
    failures: number
    circuitOpen: boolean
    lastCall: number
    lastFailure: number
  } {
    const state = this.getApiState(apiName)
    return {
      available: this.isApiAvailable(apiName),
      failures: state.failures,
      circuitOpen: state.circuitOpen,
      lastCall: state.lastCall,
      lastFailure: state.lastFailure
    }
  }

  // Get status of all APIs
  getAllApiStatus(): Record<string, ReturnType<typeof this.getApiStatus>> {
    const status: Record<string, ReturnType<typeof this.getApiStatus>> = {}
    
    for (const apiName of this.configs.keys()) {
      status[apiName] = this.getApiStatus(apiName)
    }

    return status
  }

  // Force reset circuit for an API
  resetCircuit(apiName: string): void {
    const state = this.getApiState(apiName)
    state.circuitOpen = false
    state.failures = 0
    state.lastFailure = 0
    console.log(`🔄 Manually reset circuit for ${apiName}`)
  }

  // Add or update rate limit configuration
  setConfig(apiName: string, config: RateLimitConfig): void {
    this.configs.set(apiName, config)
    console.log(`⚙️ Updated rate limit config for ${apiName}:`, config)
  }

  // Execute API call with automatic rate limiting and circuit breaker
  async executeApiCall<T>(
    apiName: string,
    apiCall: () => Promise<T>,
    retries: number = 1
  ): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        await this.waitForRateLimit(apiName)
        const result = await apiCall()
        this.recordSuccess(apiName)
        return result
      } catch (error) {
        lastError = error as Error
        this.recordFailure(apiName, lastError)

        // If this is a rate limit error, wait longer before retry
        if (lastError.message.includes('429') || lastError.message.includes('rate limit')) {
          const backoffTime = Math.min(5000 * Math.pow(2, attempt), 30000)
          console.log(`⏳ Rate limit backoff: waiting ${backoffTime}ms before retry`)
          await new Promise(resolve => setTimeout(resolve, backoffTime))
        }

        // If circuit is now open, don't retry
        if (!this.isApiAvailable(apiName)) {
          break
        }

        // Wait before retry
        if (attempt < retries) {
          const retryDelay = 1000 * (attempt + 1)
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        }
      }
    }

    throw lastError || new Error(`${apiName} API call failed after ${retries + 1} attempts`)
  }
}

// Export singleton instance
export const apiRateLimiter = new ApiRateLimiter()

// Helper function for common API patterns
export async function withRateLimit<T>(
  apiName: string,
  apiCall: () => Promise<T>,
  retries: number = 1
): Promise<T> {
  return apiRateLimiter.executeApiCall(apiName, apiCall, retries)
}

// Export types for external use
export type { RateLimitConfig, ApiState }
