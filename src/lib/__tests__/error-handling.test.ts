import { describe, it, expect, jest, beforeEach } from '@jest/jest-globals'
import { 
  WeAnimeError, 
  ErrorCode, 
  createAPIError, 
  createStreamingError, 
  createNetworkError,
  handleFetchError,
  withRetry
} from '../error-handling'

describe('Error Handling', () => {
  describe('WeAnimeError', () => {
    it('should create error with correct properties', () => {
      const error = new WeAnimeError(ErrorCode.API_ERROR, 'Test error', {
        details: { test: true },
        userMessage: 'Custom user message',
        retryable: true,
        statusCode: 500
      })

      expect(error.code).toBe(ErrorCode.API_ERROR)
      expect(error.message).toBe('Test error')
      expect(error.details).toEqual({ test: true })
      expect(error.userMessage).toBe('Custom user message')
      expect(error.retryable).toBe(true)
      expect(error.statusCode).toBe(500)
      expect(error.timestamp).toBeInstanceOf(Date)
    })

    it('should use default user message when not provided', () => {
      const error = new WeAnimeError(ErrorCode.NETWORK_ERROR, 'Network failed')
      expect(error.userMessage).toBe('Network connection failed. Please check your internet connection.')
    })

    it('should determine retryable status by default', () => {
      const networkError = new WeAnimeError(ErrorCode.NETWORK_ERROR, 'Network failed')
      const validationError = new WeAnimeError(ErrorCode.VALIDATION_ERROR, 'Invalid input')
      
      expect(networkError.retryable).toBe(true)
      expect(validationError.retryable).toBe(false)
    })

    it('should serialize to JSON correctly', () => {
      const error = new WeAnimeError(ErrorCode.API_ERROR, 'Test error')
      const json = error.toJSON()

      expect(json).toHaveProperty('code', ErrorCode.API_ERROR)
      expect(json).toHaveProperty('message', 'Test error')
      expect(json).toHaveProperty('timestamp')
      expect(json).toHaveProperty('userMessage')
      expect(json).toHaveProperty('retryable')
    })
  })

  describe('Error Factory Functions', () => {
    it('should create API error with correct status code mapping', () => {
      const unauthorizedError = createAPIError(401, 'Unauthorized')
      const rateLimitError = createAPIError(429, 'Rate limited')
      const serverError = createAPIError(500, 'Server error')

      expect(unauthorizedError.code).toBe(ErrorCode.API_UNAUTHORIZED)
      expect(unauthorizedError.retryable).toBe(false)

      expect(rateLimitError.code).toBe(ErrorCode.API_RATE_LIMIT)
      expect(rateLimitError.retryable).toBe(true)

      expect(serverError.code).toBe(ErrorCode.API_SERVER_ERROR)
      expect(serverError.retryable).toBe(true)
    })

    it('should create streaming error with correct type', () => {
      const noLegalSourceError = createStreamingError('No legal source', false)
      const unavailableError = createStreamingError('Content unavailable', true)

      expect(noLegalSourceError.code).toBe(ErrorCode.NO_LEGAL_SOURCE)
      expect(unavailableError.code).toBe(ErrorCode.CONTENT_UNAVAILABLE)
    })

    it('should create network error', () => {
      const originalError = new Error('Connection failed')
      const networkError = createNetworkError('Network failed', originalError)

      expect(networkError.code).toBe(ErrorCode.NETWORK_ERROR)
      expect(networkError.retryable).toBe(true)
      expect(networkError.cause).toBe(originalError)
    })
  })

  describe('handleFetchError', () => {
    it('should handle AbortError', () => {
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'

      const result = handleFetchError(abortError, 'https://api.example.com')
      expect(result.code).toBe(ErrorCode.TIMEOUT_ERROR)
      expect(result.retryable).toBe(true)
    })

    it('should handle TypeError for fetch failures', () => {
      const fetchError = new TypeError('Failed to fetch')
      
      const result = handleFetchError(fetchError, 'https://api.example.com')
      expect(result.code).toBe(ErrorCode.NETWORK_ERROR)
    })

    it('should pass through WeAnimeError unchanged', () => {
      const originalError = new WeAnimeError(ErrorCode.API_ERROR, 'API failed')
      
      const result = handleFetchError(originalError, 'https://api.example.com')
      expect(result).toBe(originalError)
    })
  })

  describe('withRetry', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success')
      
      const result = await withRetry(operation)
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should retry on retryable errors', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new WeAnimeError(ErrorCode.NETWORK_ERROR, 'Network failed'))
        .mockResolvedValue('success')
      
      const result = await withRetry(operation, { maxAttempts: 2, delay: 10 })
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('should not retry on non-retryable errors', async () => {
      const operation = jest.fn()
        .mockRejectedValue(new WeAnimeError(ErrorCode.VALIDATION_ERROR, 'Invalid input'))
      
      await expect(withRetry(operation)).rejects.toThrow('Invalid input')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should respect maxAttempts', async () => {
      const operation = jest.fn()
        .mockRejectedValue(new WeAnimeError(ErrorCode.NETWORK_ERROR, 'Network failed'))
      
      await expect(withRetry(operation, { maxAttempts: 3, delay: 10 })).rejects.toThrow('Network failed')
      expect(operation).toHaveBeenCalledTimes(3)
    })

    it('should use custom shouldRetry function', async () => {
      const operation = jest.fn()
        .mockRejectedValue(new WeAnimeError(ErrorCode.API_ERROR, 'API failed'))
      
      const shouldRetry = jest.fn().mockReturnValue(false)
      
      await expect(withRetry(operation, { shouldRetry })).rejects.toThrow('API failed')
      expect(operation).toHaveBeenCalledTimes(1)
      expect(shouldRetry).toHaveBeenCalledWith(expect.any(WeAnimeError))
    })
  })
})
