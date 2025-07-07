import { z } from 'zod';

// Common UUID validation
export const uuidSchema = z.string().uuid('Invalid UUID format');

// Common pagination schema
export const commonPaginationSchema = z.object({
  page: z.string()
    .regex(/^\d+$/, 'Page must be a positive number')
    .transform(val => Math.max(1, parseInt(val)))
    .optional()
    .default('1'),
  limit: z.string()
    .regex(/^\d+$/, 'Limit must be a positive number')
    .transform(val => Math.min(100, Math.max(1, parseInt(val))))
    .optional()
    .default('20'),
  sort_by: z.string()
    .max(50, 'Sort field must be at most 50 characters')
    .optional(),
  order: z.enum(['asc', 'desc'])
    .optional()
    .default('desc')
});

// Common search schema
export const searchSchema = z.object({
  query: z.string()
    .min(1, 'Search query is required')
    .max(100, 'Search query must be at most 100 characters'),
  filters: z.record(z.unknown()).optional()
});

// Common date range schema
export const dateRangeSchema = z.object({
  start_date: z.string()
    .datetime('Invalid start date format')
    .optional(),
  end_date: z.string()
    .datetime('Invalid end date format')
    .optional()
}).refine(data => {
  if (data.start_date && data.end_date) {
    return new Date(data.start_date) <= new Date(data.end_date);
  }
  return true;
}, {
  message: 'Start date must be before or equal to end date'
});

// File upload schema
export const fileUploadSchema = z.object({
  filename: z.string()
    .min(1, 'Filename is required')
    .max(255, 'Filename must be at most 255 characters'),
  mimetype: z.string()
    .min(1, 'MIME type is required'),
  size: z.number()
    .min(1, 'File size must be greater than 0')
    .max(100 * 1024 * 1024, 'File size cannot exceed 100MB'), // 100MB limit
  encoding: z.string().optional()
});

// Common error response schema
export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
  timestamp: z.string().datetime().optional()
});

// Common success response schema
export const successResponseSchema = z.object({
  message: z.string(),
  data: z.unknown().optional(),
  timestamp: z.string().datetime().optional()
});

// ID parameter schemas
export const idParamSchema = z.object({
  id: uuidSchema
});

export const commonUserIdParamSchema = z.object({
  userId: uuidSchema
});

export const commonAnimeIdParamSchema = z.object({
  animeId: uuidSchema
});

export const commonEpisodeIdParamSchema = z.object({
  episodeId: uuidSchema
});

// Common status response
export const statusResponseSchema = z.object({
  status: z.enum(['success', 'error', 'pending']),
  message: z.string().optional(),
  data: z.unknown().optional()
});

// Environment validation
export const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('4000'),
  SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required'),
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  FRONTEND_URL: z.string().url('Invalid frontend URL').optional(),
  DATABASE_URL: z.string().url('Invalid database URL').optional(),
  REDIS_URL: z.string().url('Invalid Redis URL').optional(),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_REGION: z.string().optional(),
  CDN_URL: z.string().url('Invalid CDN URL').optional()
});

// Health check response schema
export const healthCheckSchema = z.object({
  status: z.literal('OK'),
  timestamp: z.string().datetime(),
  version: z.string(),
  environment: z.string(),
  services: z.object({
    database: z.enum(['healthy', 'unhealthy', 'degraded']),
    cache: z.enum(['healthy', 'unhealthy', 'degraded']).optional(),
    storage: z.enum(['healthy', 'unhealthy', 'degraded']).optional()
  }).optional()
});

// API versioning schema
export const apiVersionSchema = z.object({
  version: z.string().regex(/^v\d+$/, 'Version must be in format v1, v2, etc.')
});

// Rate limiting configuration schema
export const rateLimitSchema = z.object({
  windowMs: z.number().min(1000).default(15 * 60 * 1000), // 15 minutes
  max: z.number().min(1).default(100), // 100 requests per window
  message: z.string().optional(),
  standardHeaders: z.boolean().default(true),
  legacyHeaders: z.boolean().default(false)
});

// Export types
export type UUID = z.infer<typeof uuidSchema>;
export type CommonPagination = z.infer<typeof commonPaginationSchema>;
export type Search = z.infer<typeof searchSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;
export type FileUpload = z.infer<typeof fileUploadSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type SuccessResponse = z.infer<typeof successResponseSchema>;
export type IdParam = z.infer<typeof idParamSchema>;
export type CommonUserIdParam = z.infer<typeof commonUserIdParamSchema>;
export type CommonAnimeIdParam = z.infer<typeof commonAnimeIdParamSchema>;
export type CommonEpisodeIdParam = z.infer<typeof commonEpisodeIdParamSchema>;
export type StatusResponse = z.infer<typeof statusResponseSchema>;
export type Environment = z.infer<typeof environmentSchema>;
export type HealthCheck = z.infer<typeof healthCheckSchema>;
export type ApiVersion = z.infer<typeof apiVersionSchema>;
export type RateLimit = z.infer<typeof rateLimitSchema>;