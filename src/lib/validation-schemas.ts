/**
 * Input Validation Schemas for WeAnime API Routes
 * 
 * Provides comprehensive validation for all API endpoints to ensure
 * data integrity and security.
 */

import { z } from 'zod'

// Base validation helpers
const positiveInteger = z.number().int().positive()
const nonEmptyString = z.string().min(1).trim()
const optionalString = z.string().optional()
const email = z.string().email()
const url = z.string().url()

// Common parameter schemas
export const animeIdSchema = z.union([
  z.string().regex(/^\d+$/, 'Anime ID must be a numeric string'),
  positiveInteger
]).transform(val => typeof val === 'string' ? parseInt(val, 10) : val)

export const episodeNumberSchema = z.union([
  z.string().regex(/^\d+$/, 'Episode number must be a numeric string'),
  positiveInteger
]).transform(val => typeof val === 'string' ? parseInt(val, 10) : val)

export const qualitySchema = z.enum(['360p', '480p', '720p', '1080p', '1440p', '4k', 'auto'])
  .default('1080p')

export const languageSchema = z.enum(['sub', 'dub', 'raw']).default('sub')

// Authentication schemas
export const loginSchema = z.object({
  email: email,
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().optional().default(false)
})

export const registerSchema = z.object({
  email: email,
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  confirmPassword: z.string(),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores')
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

// Anime and episode schemas
export const animeSearchSchema = z.object({
  query: nonEmptyString.max(100, 'Search query too long'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(20),
  genre: optionalString,
  year: z.number().int().min(1900).max(new Date().getFullYear() + 2).optional(),
  status: z.enum(['airing', 'completed', 'upcoming', 'hiatus']).optional(),
  sort: z.enum(['popularity', 'rating', 'latest', 'alphabetical', 'year']).default('popularity')
})

export const streamingRequestSchema = z.object({
  animeId: animeIdSchema,
  episodeNumber: episodeNumberSchema,
  quality: qualitySchema,
  language: languageSchema,
  userId: z.string().uuid().optional() // For authenticated requests
})

export const episodeListSchema = z.object({
  animeId: animeIdSchema,
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50)
})

// Watchlist schemas
export const watchlistAddSchema = z.object({
  animeId: animeIdSchema,
  status: z.enum(['watching', 'completed', 'on-hold', 'dropped', 'plan-to-watch']).default('plan-to-watch'),
  currentEpisode: episodeNumberSchema.optional(),
  rating: z.number().min(0).max(10).optional(),
  notes: z.string().max(500).optional()
})

export const watchlistUpdateSchema = z.object({
  animeId: animeIdSchema,
  status: z.enum(['watching', 'completed', 'on-hold', 'dropped', 'plan-to-watch']).optional(),
  currentEpisode: episodeNumberSchema.optional(),
  rating: z.number().min(0).max(10).optional(),
  notes: z.string().max(500).optional()
}).refine(data => Object.keys(data).length > 1, {
  message: 'At least one field besides animeId must be provided'
})

export const watchlistRemoveSchema = z.object({
  animeId: animeIdSchema
})

// Progress tracking schemas
export const progressUpdateSchema = z.object({
  animeId: animeIdSchema,
  episodeId: z.string().min(1),
  episodeNumber: episodeNumberSchema,
  currentTime: z.number().min(0),
  duration: z.number().min(0),
  completed: z.boolean().default(false)
})

// Error reporting schemas
export const errorReportSchema = z.object({
  errorType: z.enum(['video_playback', 'authentication', 'api_error', 'ui_bug', 'other']),
  message: nonEmptyString.max(1000),
  userAgent: optionalString,
  url: optionalString,
  userId: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium')
})

// Admin schemas
export const healthCheckSchema = z.object({
  includeDetails: z.boolean().default(false),
  checkExternalServices: z.boolean().default(true)
})

export const performanceMetricsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day')
})

// Crunchyroll Bridge schemas
export const crunchyrollLoginSchema = z.object({
  username: nonEmptyString.max(100),
  password: nonEmptyString.max(100)
})

export const crunchyrollSearchSchema = z.object({
  query: nonEmptyString.max(100),
  sessionToken: z.string().uuid(),
  limit: z.number().int().min(1).max(50).default(20)
})

export const crunchyrollStreamSchema = z.object({
  episodeId: nonEmptyString,
  sessionToken: z.string().uuid(),
  quality: qualitySchema
})

export const crunchyrollEpisodesSchema = z.object({
  animeId: nonEmptyString,
  sessionToken: z.string().uuid()
})

// Video proxy schemas
export const videoProxySchema = z.object({
  url: url,
  quality: qualitySchema,
  referer: optionalString,
  userAgent: optionalString
})

// Subtitle schemas
export const subtitleRequestSchema = z.object({
  animeId: animeIdSchema,
  episodeNumber: episodeNumberSchema,
  language: z.string().min(2).max(5), // Language codes like 'en', 'ja', 'es-ES'
  format: z.enum(['vtt', 'srt', 'ass']).default('vtt')
})

// Rate limiting schemas
export const rateLimitConfigSchema = z.object({
  windowMs: z.number().int().min(1000).default(60000), // 1 minute default
  maxRequests: z.number().int().min(1).default(100),
  message: optionalString
})

// Export type inference helpers
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type AnimeSearchInput = z.infer<typeof animeSearchSchema>
export type StreamingRequestInput = z.infer<typeof streamingRequestSchema>
export type WatchlistAddInput = z.infer<typeof watchlistAddSchema>
export type WatchlistUpdateInput = z.infer<typeof watchlistUpdateSchema>
export type ProgressUpdateInput = z.infer<typeof progressUpdateSchema>
export type ErrorReportInput = z.infer<typeof errorReportSchema>
export type CrunchyrollLoginInput = z.infer<typeof crunchyrollLoginSchema>
export type CrunchyrollSearchInput = z.infer<typeof crunchyrollSearchSchema>

// Validation helper function
export function validateInput<T>(schema: z.ZodSchema<T>, input: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const result = schema.parse(input)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => {
        const path = err.path.length > 0 ? `${err.path.join('.')}: ` : ''
        return `${path}${err.message}`
      })
      return { success: false, errors }
    }
    return { success: false, errors: ['Unknown validation error'] }
  }
}

// Middleware helper for Next.js API routes
export function withValidation<T>(schema: z.ZodSchema<T>) {
  return function validationMiddleware(handler: (req: any, res: any, validatedData: T) => Promise<void>) {
    return async function(req: any, res: any) {
      const validation = validateInput(schema, req.body)
      
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.errors
        })
      }
      
      return handler(req, res, validation.data)
    }
  }
}