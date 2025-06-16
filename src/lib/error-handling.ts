// Comprehensive error handling system
import { getEnvConfig } from './env-validation'

export enum ErrorCode {
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  
  // API errors
  API_ERROR = 'API_ERROR',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  API_UNAUTHORIZED = 'API_UNAUTHORIZED',
  API_FORBIDDEN = 'API_FORBIDDEN',
  API_NOT_FOUND = 'API_NOT_FOUND',
  API_SERVER_ERROR = 'API_SERVER_ERROR',
  
  // Authentication errors
  AUTH_ERROR = 'AUTH_ERROR',
  AUTH_EXPIRED = 'AUTH_EXPIRED',
  AUTH_INVALID = 'AUTH_INVALID',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Streaming errors
  STREAMING_ERROR = 'STREAMING_ERROR',
  NO_LEGAL_SOURCE = 'NO_LEGAL_SOURCE',
  CONTENT_UNAVAILABLE = 'CONTENT_UNAVAILABLE',
  NO_CONTENT = 'NO_CONTENT',
  RATE_LIMITED = 'RATE_LIMITED',
  NO_RESULTS = 'NO_RESULTS',
  EPISODES_UNAVAILABLE = 'EPISODES_UNAVAILABLE',
  STREAM_UNAVAILABLE = 'STREAM_UNAVAILABLE',
  SEARCH_UNAVAILABLE = 'SEARCH_UNAVAILABLE',
  
  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  SUPABASE_ERROR = 'SUPABASE_ERROR',
  
  // Unknown errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface AppError {
  code: ErrorCode
  message: string
  details?: any
  timestamp: Date
  userMessage?: string
  retryable?: boolean
  statusCode?: number
}

export class WeAnimeError extends Error {
  public readonly code: ErrorCode
  public readonly details?: any
  public readonly timestamp: Date
  public readonly userMessage?: string
  public readonly retryable: boolean
  public readonly statusCode?: number
  public readonly cause?: Error

  constructor(
    code: ErrorCode,
    message: string,
    options: {
      details?: any
      userMessage?: string
      retryable?: boolean
      statusCode?: number
      cause?: Error
    } = {}
  ) {
    super(message)
    this.name = 'WeAnimeError'
    this.code = code
    this.details = options.details
    this.timestamp = new Date()
    this.userMessage = options.userMessage || this.getDefaultUserMessage(code)
    this.retryable = options.retryable ?? this.isRetryableByDefault(code)
    this.statusCode = options.statusCode
    
    if (options.cause) {
      this.cause = options.cause
    }
  }

  private getDefaultUserMessage(code: ErrorCode): string {
    switch (code) {
      case ErrorCode.NETWORK_ERROR:
        return 'Network connection failed. Please check your internet connection.'
      case ErrorCode.TIMEOUT_ERROR:
        return 'Request timed out. Please try again.'
      case ErrorCode.API_RATE_LIMIT:
        return 'Too many requests. Please wait a moment and try again.'
      case ErrorCode.AUTH_EXPIRED:
        return 'Your session has expired. Please log in again.'
      case ErrorCode.NO_LEGAL_SOURCE:
        return 'This content is not available through legal streaming sources.'
      case ErrorCode.CONTENT_UNAVAILABLE:
        return 'This content is currently unavailable.'
      default:
        return 'An unexpected error occurred. Please try again.'
    }
  }

  private isRetryableByDefault(code: ErrorCode): boolean {
    const retryableCodes = [
      ErrorCode.NETWORK_ERROR,
      ErrorCode.TIMEOUT_ERROR,
      ErrorCode.CONNECTION_ERROR,
      ErrorCode.API_SERVER_ERROR
    ]
    return retryableCodes.includes(code)
  }

  toJSON(): AppError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      userMessage: this.userMessage,
      retryable: this.retryable,
      statusCode: this.statusCode
    }
  }
}

// Error factory functions
export function createNetworkError(message: string, cause?: Error): WeAnimeError {
  return new WeAnimeError(ErrorCode.NETWORK_ERROR, message, {
    cause,
    retryable: true,
    statusCode: 0
  })
}

export function createAPIError(
  statusCode: number,
  message: string,
  details?: any
): WeAnimeError {
  let code: ErrorCode
  let retryable = false

  switch (statusCode) {
    case 401:
      code = ErrorCode.API_UNAUTHORIZED
      break
    case 403:
      code = ErrorCode.API_FORBIDDEN
      break
    case 404:
      code = ErrorCode.API_NOT_FOUND
      break
    case 429:
      code = ErrorCode.API_RATE_LIMIT
      retryable = true
      break
    case 500:
    case 502:
    case 503:
    case 504:
      code = ErrorCode.API_SERVER_ERROR
      retryable = true
      break
    default:
      code = ErrorCode.API_ERROR
  }

  return new WeAnimeError(code, message, {
    details,
    retryable,
    statusCode
  })
}

export function createStreamingError(
  message: string,
  hasLegalSources: boolean = false
): WeAnimeError {
  const code = hasLegalSources ? ErrorCode.CONTENT_UNAVAILABLE : ErrorCode.NO_LEGAL_SOURCE
  return new WeAnimeError(code, message, {
    retryable: false,
    userMessage: hasLegalSources 
      ? 'This content is temporarily unavailable.'
      : 'This content requires a valid streaming license.'
  })
}

export function createValidationError(message: string, details?: any): WeAnimeError {
  return new WeAnimeError(ErrorCode.VALIDATION_ERROR, message, {
    details,
    retryable: false,
    statusCode: 400
  })
}

// Error handling utilities
export function handleFetchError(error: any, url: string): WeAnimeError {
  if (error instanceof WeAnimeError) {
    return error
  }

  if (error.name === 'AbortError') {
    return new WeAnimeError(ErrorCode.TIMEOUT_ERROR, `Request to ${url} was aborted`, {
      details: { url },
      retryable: true
    })
  }

  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return createNetworkError(`Failed to fetch from ${url}`, error)
  }

  return new WeAnimeError(ErrorCode.UNKNOWN_ERROR, error.message || 'Unknown error', {
    details: { url, originalError: error },
    cause: error
  })
}

export function handleSupabaseError(error: any): WeAnimeError {
  if (error instanceof WeAnimeError) {
    return error
  }

  const message = error.message || 'Database operation failed'
  const code = error.code || 'UNKNOWN'

  return new WeAnimeError(ErrorCode.SUPABASE_ERROR, message, {
    details: { supabaseCode: code, originalError: error },
    retryable: ['PGRST301', 'PGRST302'].includes(code), // Connection errors
    cause: error
  })
}

// Retry logic
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number
    delay?: number
    backoff?: boolean
    shouldRetry?: (error: WeAnimeError) => boolean
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = true,
    shouldRetry = (error) => error.retryable
  } = options

  let lastError: WeAnimeError

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      const appError = error instanceof WeAnimeError
        ? error
        : new WeAnimeError(ErrorCode.UNKNOWN_ERROR, error instanceof Error ? error.message : 'Unknown error', { cause: error instanceof Error ? error : undefined })

      lastError = appError

      if (attempt === maxAttempts || !shouldRetry(appError)) {
        throw appError
      }

      const waitTime = backoff ? delay * Math.pow(2, attempt - 1) : delay
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }

  throw lastError!
}

// Error reporting
export function reportError(error: WeAnimeError, context?: any): void {
  const envConfig = getEnvConfig()
  
  // Log to console in development
  if (envConfig.isDevelopment) {
    console.error('WeAnime Error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      context,
      stack: error.stack
    })
  }

  // In production, you would send to error reporting service
  if (envConfig.isProduction) {
    // Example: Send to Sentry, LogRocket, etc.
    // sentry.captureException(error, { extra: { context } })
  }
}

// Global error handler
export function setupGlobalErrorHandling(): void {
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error 
        ? new WeAnimeError(ErrorCode.UNKNOWN_ERROR, event.reason.message, { cause: event.reason })
        : new WeAnimeError(ErrorCode.UNKNOWN_ERROR, 'Unhandled promise rejection')
      
      reportError(error, { type: 'unhandledrejection' })
    })

    window.addEventListener('error', (event) => {
      const error = new WeAnimeError(ErrorCode.UNKNOWN_ERROR, event.message, {
        details: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        },
        cause: event.error
      })
      
      reportError(error, { type: 'error' })
    })
  }
}
