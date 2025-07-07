import { z } from 'zod';

// Episode type enum
export const episodeTypeEnum = z.enum([
  'regular', 'special', 'ova', 'movie', 'recap', 'preview'
]);

// Video quality enum
export const videoQualityEnum = z.enum([
  '720p', '1080p', '4K'
]);

// Create episode schema (Admin/Moderator only)
export const createEpisodeSchema = z.object({
  anime_id: z.string()
    .uuid('Invalid anime ID format')
    .min(1, 'Anime ID is required'),
  title: z.string()
    .min(1, 'Episode title is required')
    .max(200, 'Episode title must be at most 200 characters'),
  title_english: z.string()
    .max(200, 'English title must be at most 200 characters')
    .optional(),
  title_japanese: z.string()
    .max(200, 'Japanese title must be at most 200 characters')
    .optional(),
  episode_number: z.number()
    .min(0, 'Episode number must be non-negative')
    .max(10000, 'Episode number cannot exceed 10000'),
  season_number: z.number()
    .min(1, 'Season number must be at least 1')
    .max(100, 'Season number cannot exceed 100')
    .optional()
    .default(1),
  description: z.string()
    .max(1000, 'Description must be at most 1000 characters')
    .optional(),
  synopsis: z.string()
    .max(2000, 'Synopsis must be at most 2000 characters')
    .optional(),
  duration: z.number()
    .min(1, 'Duration must be at least 1 second')
    .max(18000, 'Duration cannot exceed 5 hours (18000 seconds)'),
  type: episodeTypeEnum.optional().default('regular'),
  air_date: z.string()
    .datetime('Invalid air date format')
    .optional(),
  thumbnail_url: z.string()
    .url('Invalid thumbnail URL')
    .optional(),
  is_filler: z.boolean().optional().default(false),
  is_recap: z.boolean().optional().default(false)
});

// Update episode schema
export const updateEpisodeSchema = createEpisodeSchema.partial().omit({ anime_id: true });

// Video source schema (for episode video files)
export const createVideoSourceSchema = z.object({
  episode_id: z.string()
    .uuid('Invalid episode ID format')
    .min(1, 'Episode ID is required'),
  quality: videoQualityEnum,
  video_url: z.string()
    .url('Invalid video URL'),
  subtitle_url: z.string()
    .url('Invalid subtitle URL')
    .optional(),
  size_bytes: z.number()
    .min(0, 'File size must be non-negative')
    .optional(),
  duration: z.number()
    .min(1, 'Video duration must be at least 1 second')
    .max(18000, 'Video duration cannot exceed 5 hours'),
  codec: z.string()
    .max(50, 'Codec name must be at most 50 characters')
    .optional(),
  bitrate: z.number()
    .min(0, 'Bitrate must be non-negative')
    .optional()
});

// Episode query/filter schema
export const episodeQuerySchema = z.object({
  anime_id: z.string()
    .uuid('Invalid anime ID format')
    .optional(),
  season: z.string()
    .regex(/^\d+$/, 'Season must be a positive number')
    .transform(val => parseInt(val))
    .optional(),
  type: episodeTypeEnum.optional(),
  sort_by: z.enum(['episode_number', 'air_date', 'created_at', 'title'])
    .optional()
    .default('episode_number'),
  order: z.enum(['asc', 'desc'])
    .optional()
    .default('asc'),
  page: z.string()
    .regex(/^\d+$/, 'Page must be a positive number')
    .transform(val => Math.max(1, parseInt(val)))
    .optional()
    .default('1'),
  limit: z.string()
    .regex(/^\d+$/, 'Limit must be a positive number')
    .transform(val => Math.min(100, Math.max(1, parseInt(val))))
    .optional()
    .default('50')
});

// Episode ID parameter validation
export const episodeIdParamSchema = z.object({
  id: z.string()
    .uuid('Invalid episode ID format')
    .min(1, 'Episode ID is required')
});

// Progress tracking schema
export const updateProgressSchema = z.object({
  watched_duration: z.number()
    .min(0, 'Watched duration must be non-negative')
    .max(18000, 'Watched duration cannot exceed 5 hours'),
  total_duration: z.number()
    .min(1, 'Total duration must be positive')
    .max(18000, 'Total duration cannot exceed 5 hours'),
  is_completed: z.boolean().optional(),
  quality: videoQualityEnum.optional(),
  subtitle_language: z.string()
    .max(10, 'Subtitle language code must be at most 10 characters')
    .optional()
});

// Bulk episode operations
export const bulkEpisodeSchema = z.object({
  episode_ids: z.array(z.string().uuid('Invalid episode ID format'))
    .min(1, 'At least one episode ID is required')
    .max(100, 'Maximum 100 episodes can be processed at once')
});

// Export types
export type CreateEpisodeRequest = z.infer<typeof createEpisodeSchema>;
export type UpdateEpisodeRequest = z.infer<typeof updateEpisodeSchema>;
export type CreateVideoSourceRequest = z.infer<typeof createVideoSourceSchema>;
export type EpisodeQuery = z.infer<typeof episodeQuerySchema>;
export type EpisodeIdParam = z.infer<typeof episodeIdParamSchema>;
export type UpdateProgressRequest = z.infer<typeof updateProgressSchema>;
export type BulkEpisodeRequest = z.infer<typeof bulkEpisodeSchema>;
export type EpisodeType = z.infer<typeof episodeTypeEnum>;
export type VideoQuality = z.infer<typeof videoQualityEnum>;