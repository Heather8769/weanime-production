import { z } from 'zod';

// User role enum
export const userRoleEnum = z.enum(['user', 'moderator', 'admin']);

// User management schemas (Admin only)
export const updateUserRoleSchema = z.object({
  user_id: z.string()
    .uuid('Invalid user ID format')
    .min(1, 'User ID is required'),
  role: userRoleEnum
});

export const updateUserStatusSchema = z.object({
  user_id: z.string()
    .uuid('Invalid user ID format')
    .min(1, 'User ID is required'),
  is_active: z.boolean()
});

export const bulkUserActionSchema = z.object({
  user_ids: z.array(z.string().uuid('Invalid user ID format'))
    .min(1, 'At least one user ID is required')
    .max(100, 'Maximum 100 users can be processed at once'),
  action: z.enum(['activate', 'deactivate', 'delete']),
  reason: z.string()
    .max(500, 'Reason must be at most 500 characters')
    .optional()
});

// Content moderation schemas
export const moderateContentSchema = z.object({
  content_type: z.enum(['anime', 'episode', 'user_review', 'user_comment']),
  content_id: z.string()
    .uuid('Invalid content ID format')
    .min(1, 'Content ID is required'),
  action: z.enum(['approve', 'reject', 'flag', 'hide']),
  reason: z.string()
    .max(500, 'Moderation reason must be at most 500 characters')
    .optional(),
  moderator_notes: z.string()
    .max(1000, 'Moderator notes must be at most 1000 characters')
    .optional()
});

// System settings schemas
export const updateSystemSettingSchema = z.object({
  key: z.string()
    .min(1, 'Setting key is required')
    .max(100, 'Setting key must be at most 100 characters')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Setting key can only contain letters, numbers, dots, dashes, and underscores'),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.object({}).passthrough()
  ]),
  description: z.string()
    .max(500, 'Description must be at most 500 characters')
    .optional()
});

// Analytics query schemas
export const analyticsQuerySchema = z.object({
  metric: z.enum([
    'user_registrations', 'user_activity', 'content_views', 'popular_anime', 
    'watch_time', 'server_performance', 'api_usage', 'error_rates'
  ]),
  period: z.enum(['hour', 'day', 'week', 'month', 'year']),
  start_date: z.string()
    .datetime('Invalid start date format')
    .optional(),
  end_date: z.string()
    .datetime('Invalid end date format')
    .optional(),
  group_by: z.enum(['hour', 'day', 'week', 'month'])
    .optional(),
  filters: z.object({
    user_role: userRoleEnum.optional(),
    anime_genre: z.string().optional(),
    content_type: z.string().optional()
  }).optional()
});

// Server maintenance schemas
export const maintenanceActionSchema = z.object({
  action: z.enum(['start', 'stop', 'schedule']),
  duration_minutes: z.number()
    .min(1, 'Maintenance duration must be at least 1 minute')
    .max(1440, 'Maintenance duration cannot exceed 24 hours')
    .optional(),
  scheduled_time: z.string()
    .datetime('Invalid scheduled time format')
    .optional(),
  message: z.string()
    .max(500, 'Maintenance message must be at most 500 characters')
    .optional(),
  affected_services: z.array(z.enum(['api', 'streaming', 'uploads', 'database']))
    .optional()
});

// Backup and restore schemas
export const backupRequestSchema = z.object({
  type: z.enum(['full', 'incremental', 'database_only', 'media_only']),
  include_media: z.boolean().optional().default(false),
  compression: z.enum(['none', 'gzip', 'bzip2']).optional().default('gzip'),
  retention_days: z.number()
    .min(1, 'Retention period must be at least 1 day')
    .max(365, 'Retention period cannot exceed 365 days')
    .optional()
    .default(30)
});

// Cache management schemas
export const cacheActionSchema = z.object({
  action: z.enum(['clear', 'warm', 'invalidate']),
  cache_type: z.enum(['all', 'anime', 'episodes', 'users', 'api_responses']),
  specific_keys: z.array(z.string())
    .optional()
});

// User query schema for admin panel
export const adminUserQuerySchema = z.object({
  search: z.string()
    .max(100, 'Search query must be at most 100 characters')
    .optional(),
  role: userRoleEnum.optional(),
  is_active: z.boolean().optional(),
  email_verified: z.boolean().optional(),
  registration_date_start: z.string()
    .datetime('Invalid start date format')
    .optional(),
  registration_date_end: z.string()
    .datetime('Invalid end date format')
    .optional(),
  last_login_start: z.string()
    .datetime('Invalid start date format')
    .optional(),
  last_login_end: z.string()
    .datetime('Invalid end date format')
    .optional(),
  sort_by: z.enum(['created_at', 'last_login_at', 'email', 'username', 'role'])
    .optional()
    .default('created_at'),
  order: z.enum(['asc', 'desc'])
    .optional()
    .default('desc'),
  page: z.string()
    .regex(/^\d+$/, 'Page must be a positive number')
    .transform(val => Math.max(1, parseInt(val)))
    .optional()
    .default('1'),
  limit: z.string()
    .regex(/^\d+$/, 'Limit must be a positive number')
    .transform(val => Math.min(100, Math.max(1, parseInt(val))))
    .optional()
    .default('20')
});

// Export types
export type UpdateUserRoleRequest = z.infer<typeof updateUserRoleSchema>;
export type UpdateUserStatusRequest = z.infer<typeof updateUserStatusSchema>;
export type BulkUserActionRequest = z.infer<typeof bulkUserActionSchema>;
export type ModerateContentRequest = z.infer<typeof moderateContentSchema>;
export type UpdateSystemSettingRequest = z.infer<typeof updateSystemSettingSchema>;
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
export type MaintenanceActionRequest = z.infer<typeof maintenanceActionSchema>;
export type BackupRequest = z.infer<typeof backupRequestSchema>;
export type CacheActionRequest = z.infer<typeof cacheActionSchema>;
export type AdminUserQuery = z.infer<typeof adminUserQuerySchema>;
export type UserRole = z.infer<typeof userRoleEnum>;