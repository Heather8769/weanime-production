import {
  WeAnimeError,
  ErrorCode,
  createNetworkError,
  createAPIError,
  createStreamingError,
  createValidationError,
  handleFetchError,
  handleSupabaseError,
  withRetry,
  reportError,
} from '../error-handling'

describe('Error Handling System', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock console methods
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('WeAnimeError Class', () => {
    it('should create error with required fields', () => {
      const error = new WeAnimeError(ErrorCode.NETWORK_ERROR, 'Network failed')
      
      expect(error.code).toBe(ErrorCode.NETWORK_ERROR)
      expect(error.message).toBe('Network failed')
      expect(error.timestamp).toBeInstanceOf(Date)
      expect(error.userMessage).toBe('Network connection failed. Please check your internet connection.')
      expect(error.retryable).toBe(true)
    })

    it('should create error with custom options', () => {
      const details = { url: 'https://api.example.com' }
      const cause = new Error('Original error')
      
      const error = new WeAnimeError(ErrorCode.API_ERROR, 'API failed', {
        details,
        userMessage: 'Custom message',
        retryable: false,
        statusCode: 500,
        cause
      })
      
      expect(error.details).toBe(details)
      expect(error.userMessage).toBe('Custom message')
      expect(error.retryable).toBe(false)
      expect(error.statusCode).toBe(500)
      expect(error.cause).toBe(cause)
    })

    it('should convert to JSON correctly', () => {
      const error = new WeAnimeError(ErrorCode.VALIDATION_ERROR, 'Invalid input', {
        details: { field: 'email' },
        statusCode: 400
      })
      
      const json = error.toJSON()
      
      expect(json.code).toBe(ErrorCode.VALIDATION_ERROR)
      expect(json.message).toBe('Invalid input')
      expect(json.details).toEqual({ field: 'email' })
      expect(json.statusCode).toBe(400)
      expect(json.timestamp).toBeInstanceOf(Date)
    })

    it('should determine retryable status correctly', () => {
      const networkError = new WeAnimeError(ErrorCode.NETWORK_ERROR, 'Network failed')
      const validationError = new WeAnimeError(ErrorCode.VALIDATION_ERROR, 'Invalid input')
      
      expect(networkError.retryable).toBe(true)
      expect(validationError.retryable).toBe(false)
    })
  })

  describe('Error Factory Functions', () => {
    describe('createNetworkError', () => {
      it('should create network error with correct properties', () => {
        const cause = new Error('Connection refused')
        const error = createNetworkError('Failed to connect', cause)
        
        expect(error.code).toBe(ErrorCode.NETWORK_ERROR)
        expect(error.message).toBe('Failed to connect')
        expect(error.retryable).toBe(true)
        expect(error.statusCode).toBe(0)
        expect(error.cause).toBe(cause)
      })
    })

    describe('createAPIError', () => {
      it('should create 401 error correctly', () => {
        const error = createAPIError(401, 'Unauthorized', { endpoint: '/api/user' })
        
        expect(error.code).toBe(ErrorCode.API_UNAUTHORIZED)
        expect(error.statusCode).toBe(401)
        expect(error.retryable).toBe(false)
        expect(error.details).toEqual({ endpoint: '/api/user' })
      })

      it('should create 429 rate limit error as retryable', () => {
        const error = createAPIError(429, 'Rate limited')
        
        expect(error.code).toBe(ErrorCode.API_RATE_LIMIT)
        expect(error.retryable).toBe(true)
      })

      it('should create 500 server error as retryable', () => {
        const error = createAPIError(500, 'Internal server error')
        
        expect(error.code).toBe(ErrorCode.API_SERVER_ERROR)
        expect(error.retryable).toBe(true)
      })

      it('should handle unknown status codes', () => {
        const error = createAPIError(418, "I'm a teapot")
        
        expect(error.code).toBe(ErrorCode.API_ERROR)
        expect(error.retryable).toBe(false)
      })
    })

    describe('createStreamingError', () => {
      it('should create no legal source error', () => {
        const error = createStreamingError('Content not available', false)
        
        expect(error.code).toBe(ErrorCode.NO_LEGAL_SOURCE)
        expect(error.userMessage).toBe('This content requires a valid streaming license.')
        expect(error.retryable).toBe(false)
      })

      it('should create content unavailable error', () => {
        const error = createStreamingError('Temporarily unavailable', true)
        
        expect(error.code).toBe(ErrorCode.CONTENT_UNAVAILABLE)
        expect(error.userMessage).toBe('This content is temporarily unavailable.')
        expect(error.retryable).toBe(false)
      })
    })

    describe('createValidationError', () => {
      it('should create validation error', () => {
        const details = { field: 'email', reason: 'invalid format' }
        const error = createValidationError('Email is invalid', details)
        
        expect(error.code).toBe(ErrorCode.VALIDATION_ERROR)
        expect(error.statusCode).toBe(400)
        expect(error.retryable).toBe(false)
        expect(error.details).toBe(details)
      })
    })
  })

  describe('Error Handling Utilities', () => {
    describe('handleFetchError', () => {
      it('should return WeAnimeError as-is', () => {
        const originalError = new WeAnimeError(ErrorCode.API_ERROR, 'API failed')
        const result = handleFetchError(originalError, 'https://api.example.com')
        
        expect(result).toBe(originalError)
      })

      it('should handle AbortError', () => {
        const abortError = { name: 'AbortError', message: 'Request aborted' }
        const result = handleFetchError(abortError, 'https://api.example.com')
        
        expect(result.code).toBe(ErrorCode.TIMEOUT_ERROR)
        expect(result.retryable).toBe(true)
        expect(result.details.url).toBe('https://api.example.com')
      })

      it('should handle TypeError with fetch', () => {
        const typeError = { name: 'TypeError', message: 'fetch failed' }
        const result = handleFetchError(typeError, 'https://api.example.com')
        
        expect(result.code).toBe(ErrorCode.NETWORK_ERROR)
        expect(result.retryable).toBe(true)
      })

      it('should handle unknown errors', () => {
        const unknownError = { message: 'Something went wrong' }
        const result = handleFetchError(unknownError, 'https://api.example.com')
        
        expect(result.code).toBe(ErrorCode.UNKNOWN_ERROR)
        expect(result.details.url).toBe('https://api.example.com')
        expect(result.details.originalError).toBe(unknownError)
      })
    })

    describe('handleSupabaseError', () => {
      it('should return WeAnimeError as-is', () => {
        const originalError = new WeAnimeError(ErrorCode.DATABASE_ERROR, 'DB failed')
        const result = handleSupabaseError(originalError)
        
        expect(result).toBe(originalError)
      })

      it('should handle Supabase error with code', () => {
        const supabaseError = { 
          message: 'Connection failed', 
          code: 'PGRST301' 
        }
        const result = handleSupabaseError(supabaseError)
        
        expect(result.code).toBe(ErrorCode.SUPABASE_ERROR)
        expect(result.message).toBe('Connection failed')
        expect(result.retryable).toBe(true) // PGRST301 is connection error
        expect(result.details.supabaseCode).toBe('PGRST301')
      })

      it('should handle unknown Supabase error', () => {
        const supabaseError = { 
          message: 'Unknown error', 
          code: 'UNKNOWN_CODE' 
        }
        const result = handleSupabaseError(supabaseError)
        
        expect(result.retryable).toBe(false)
      })
    })
  })

  describe('Retry Logic', () => {
    describe('withRetry', () => {
      it('should succeed on first attempt', async () => {
        const operation = jest.fn().mockResolvedValue('success')
        
        const result = await withRetry(operation)
        
        expect(result).toBe('success')
        expect(operation).toHaveBeenCalledTimes(1)
      })

      it('should retry on retryable error', async () => {
        const operation = jest.fn()
          .mockRejectedValueOnce(new WeAnimeError(ErrorCode.NETWORK_ERROR, 'Network failed'))
          .mockResolvedValue('success')
        
        const result = await withRetry(operation, { maxAttempts: 3, delay: 10 })
        
        expect(result).toBe('success')
        expect(operation).toHaveBeenCalledTimes(2)
      })

      it('should not retry on non-retryable error', async () => {
        const operation = jest.fn()
          .mockRejectedValue(new WeAnimeError(ErrorCode.VALIDATION_ERROR, 'Invalid input'))
        
        await expect(withRetry(operation)).rejects.toThrow('Invalid input')
        expect(operation).toHaveBeenCalledTimes(1)
      })

      it('should respect maxAttempts', async () => {
        const operation = jest.fn()
          .mockRejectedValue(new WeAnimeError(ErrorCode.NETWORK_ERROR, 'Network failed'))
        
        await expect(withRetry(operation, { maxAttempts: 2, delay: 10 })).rejects.toThrow('Network failed')
        expect(operation).toHaveBeenCalledTimes(2)
      })

      it('should use custom shouldRetry function', async () => {
        const operation = jest.fn()
          .mockRejectedValue(new WeAnimeError(ErrorCode.API_UNAUTHORIZED, 'Unauthorized'))
        
        const shouldRetry = jest.fn().mockReturnValue(true)
        
        await expect(withRetry(operation, { maxAttempts: 2, delay: 10, shouldRetry })).rejects.toThrow('Unauthorized')
        expect(operation).toHaveBeenCalledTimes(2)
        expect(shouldRetry).toHaveBeenCalled()
      })

      it('should handle backoff delay', async () => {
        const operation = jest.fn()
          .mockRejectedValue(new WeAnimeError(ErrorCode.NETWORK_ERROR, 'Network failed'))
        
        const startTime = Date.now()
        await expect(withRetry(operation, { maxAttempts: 2, delay: 50, backoff: true })).rejects.toThrow()
        const endTime = Date.now()
        
        // Should have waited at least 50ms (first retry delay)
        expect(endTime - startTime).toBeGreaterThan(45)
        expect(operation).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Error Reporting', () => {
    describe('reportError', () => {
      beforeEach(() => {
        // Mock environment config
        jest.doMock('../env-validation', () => ({
          getEnvConfig: () => ({ isDevelopment: true, isProduction: false })
        }))
      })

      it('should log error in development', () => {
        const error = new WeAnimeError(ErrorCode.API_ERROR, 'API failed', {
          details: { endpoint: '/api/test' }
        })
        const context = { userId: '123' }
        
        reportError(error, context)
        
        expect(console.error).toHaveBeenCalledWith('WeAnime Error:', {
          code: ErrorCode.API_ERROR,
          message: 'API failed',
          details: { endpoint: '/api/test' },
          context,
          stack: error.stack
        })
      })
    })
  })

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle null/undefined errors gracefully', () => {
      const result1 = handleFetchError(null, 'https://api.example.com')
      const result2 = handleFetchError(undefined, 'https://api.example.com')
      
      expect(result1.code).toBe(ErrorCode.UNKNOWN_ERROR)
      expect(result2.code).toBe(ErrorCode.UNKNOWN_ERROR)
    })

    it('should handle errors without message', () => {
      const errorWithoutMessage = { name: 'CustomError' }
      const result = handleFetchError(errorWithoutMessage, 'https://api.example.com')
      
      expect(result.code).toBe(ErrorCode.UNKNOWN_ERROR)
      expect(result.message).toBe('Unknown error')
    })

    it('should handle circular reference in error details', () => {
      const circularObj: any = { prop: 'value' }
      circularObj.self = circularObj
      
      const error = new WeAnimeError(ErrorCode.API_ERROR, 'API failed', {
        details: circularObj
      })
      
      // Should not throw when converting to JSON
      expect(() => error.toJSON()).not.toThrow()
    })
  })
})