import { z } from 'zod';

// User profile update schema
export const updateProfileSchema = z.object({
  display_name: z.string()
    .min(1, 'Display name is required')
    .max(50, 'Display name must be at most 50 characters')
    .optional(),
  bio: z.string()
    .max(500, 'Bio must be at most 500 characters')
    .optional(),
  avatar_url: z.string()
    .url('Invalid avatar URL')
    .optional()
    .or(z.literal('')),
  preferences: z.object({
    language: z.string().optional(),
    subtitles: z.boolean().optional(),
    auto_play: z.boolean().optional(),
    quality: z.enum(['720p', '1080p', '4K']).optional(),
    notifications: z.object({
      new_episodes: z.boolean().optional(),
      bookmarks: z.boolean().optional(),
      recommendations: z.boolean().optional()
    }).optional()
  }).optional()
});

// Bookmark creation schema
export const createBookmarkSchema = z.object({
  anime_id: z.string()
    .uuid('Invalid anime ID format')
    .min(1, 'Anime ID is required')
});

// Pagination query schema
export const paginationSchema = z.object({
  page: z.string()
    .regex(/^\d+$/, 'Page must be a positive number')
    .transform(val => Math.max(1, parseInt(val)))
    .optional()
    .default('1'),
  limit: z.string()
    .regex(/^\d+$/, 'Limit must be a positive number')
    .transform(val => Math.min(50, Math.max(1, parseInt(val))))
    .optional()
    .default('20')
});

// Watch session tracking schema
export const createWatchSessionSchema = z.object({
  episode_id: z.string()
    .uuid('Invalid episode ID format')
    .min(1, 'Episode ID is required'),
  watched_duration: z.number()
    .min(0, 'Watched duration must be non-negative')
    .max(86400, 'Watched duration cannot exceed 24 hours'),
  total_duration: z.number()
    .min(1, 'Total duration must be positive')
    .max(86400, 'Total duration cannot exceed 24 hours'),
  quality: z.enum(['720p', '1080p', '4K']).optional(),
  subtitle_language: z.string().optional(),
  is_completed: z.boolean().optional().default(false)
});

// User ID parameter validation
export const userUserIdParamSchema = z.object({
  userId: z.string()
    .uuid('Invalid user ID format')
    .min(1, 'User ID is required')
});

// Anime ID parameter validation for user routes
export const userAnimeIdParamSchema = z.object({
  animeId: z.string()
    .uuid('Invalid anime ID format')
    .min(1, 'Anime ID is required')
});

// Export types
export type UpdateProfileRequest = z.infer<typeof updateProfileSchema>;
export type CreateBookmarkRequest = z.infer<typeof createBookmarkSchema>;
export type PaginationQuery = z.infer<typeof paginationSchema>;
export type CreateWatchSessionRequest = z.infer<typeof createWatchSessionSchema>;
export type UserUserIdParam = z.infer<typeof userUserIdParamSchema>;
export type UserAnimeIdParam = z.infer<typeof userAnimeIdParamSchema>;