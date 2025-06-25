import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

// Common validation schemas
export const schemas = {
  // ID validation (anime ID, episode ID, etc.)
  id: z.string().min(1, 'ID is required').max(100, 'ID too long'),
  
  // Numeric ID validation
  numericId: z.coerce.number().int().positive('ID must be a positive integer'),
  
  // Episode number validation
  episodeNumber: z.coerce.number().int().min(1, 'Episode number must be at least 1').max(9999, 'Episode number too large'),
  
  // Search query validation
  searchQuery: z.string()
    .min(1, 'Search query is required')
    .max(200, 'Search query too long')
    .regex(/^[a-zA-Z0-9\s\-_.!?]+$/, 'Search query contains invalid characters'),
  
  // Anime slug validation
  animeSlug: z.string()
    .min(1, 'Anime slug is required')
    .max(100, 'Anime slug too long')
    .regex(/^[a-zA-Z0-9\-_]+$/, 'Anime slug contains invalid characters'),
  
  // URL validation
  url: z.string().url('Invalid URL format').max(2000, 'URL too long'),
  
  // Quality validation
  quality: z.enum(['auto', '480p', '720p', '1080p', '1440p', '2160p']).optional(),
  
  // Pagination validation
  page: z.coerce.number().int().min(1, 'Page must be at least 1').max(1000, 'Page number too large').optional(),
  limit: z.coerce.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit too large').optional(),
  
  // Language validation
  language: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Invalid language code').optional(),
}

// Validation result types
export type ValidationResult<T> = {
  success: true
  data: T
} | {
  success: false
  error: string
  details?: z.ZodError
}

// Generic validation function
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      return {
        success: false,
        error: firstError?.message || 'Validation failed',
        details: error
      }
    }
    return {
      success: false,
      error: 'Validation failed'
    }
  }
}

// Helper function to validate search params
export function validateSearchParams(
  request: NextRequest,
  schema: z.ZodSchema
): ValidationResult<any> {
  const searchParams = request.nextUrl.searchParams
  const data = Object.fromEntries(searchParams.entries())
  return validate(schema, data)
}

// Helper function to validate JSON body
export async function validateJsonBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json()
    return validate(schema, body)
  } catch (error) {
    return {
      success: false,
      error: 'Invalid JSON body'
    }
  }
}

// Error response helper
export function validationErrorResponse(error: string, status: number = 400) {
  return NextResponse.json(
    {
      success: false,
      error: 'Validation Error',
      details: error,
      timestamp: new Date().toISOString()
    },
    { status }
  )
}

// Rate limiting validation
export function validateRateLimit(
  request: NextRequest,
  windowMs: number = 60000, // 1 minute
  maxRequests: number = 100
): boolean {
  // Simple in-memory rate limiting (in production, use Redis or similar)
  // Extract IP from headers since NextRequest doesn't have ip property
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            request.headers.get('x-real-ip') ||
            request.headers.get('cf-connecting-ip') ||
            'unknown'
  const key = `rate_limit_${ip}`
  
  // In a real app, you'd use a proper rate limiting store
  // For now, we'll just return true to allow requests
  return true
}

// Security header validation
export function validateSecurityHeaders(request: NextRequest): boolean {
  const userAgent = request.headers.get('user-agent')
  const referer = request.headers.get('referer')
  
  // Block requests without user agent (likely bots)
  if (!userAgent) {
    return false
  }
  
  // Block requests with suspicious user agents
  const suspiciousPatterns = [
    /curl/i,
    /wget/i,
    /python/i,
    /java/i,
    /bot/i,
    /crawler/i,
    /spider/i
  ]
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(userAgent)) {
      return false
    }
  }
  
  return true
}

// Sanitize string input
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>\"']/g, '') // Remove potentially dangerous characters
    .slice(0, 1000) // Limit length
}

// Common API route schemas
export const apiSchemas = {
  // Search API
  search: z.object({
    q: schemas.searchQuery,
    page: schemas.page.default(1),
    limit: schemas.limit.default(20)
  }),
  
  // Stream API
  stream: z.object({
    anime_slug: schemas.animeSlug,
    episode_number: schemas.episodeNumber
  }),
  
  // Download API
  download: z.object({
    anime_slug: schemas.animeSlug,
    episode_number: schemas.episodeNumber
  }),
  
  // Anime details API
  animeDetails: z.object({
    id: schemas.numericId
  }),
  
  // Episodes API
  episodes: z.object({
    animeId: schemas.numericId,
    page: schemas.page.default(1),
    limit: schemas.limit.default(50)
  }),
  
  // Watchlist API
  watchlist: z.object({
    animeId: schemas.numericId,
    action: z.enum(['add', 'remove', 'toggle'])
  })
}

// Middleware wrapper for API validation
export function withValidation<T>(
  schema: z.ZodSchema<T>,
  handler: (request: NextRequest, validatedData: T) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    // Security checks
    if (!validateSecurityHeaders(request)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }
    
    // Rate limiting
    if (!validateRateLimit(request)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      )
    }
    
    // Validate input
    const validation = validateSearchParams(request, schema)
    if (!validation.success) {
      return validationErrorResponse(validation.error)
    }
    
    try {
      return await handler(request, validation.data)
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('API handler error:', error)
      }
      
      return NextResponse.json(
        {
          success: false,
          error: 'Internal server error',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }
  }
}