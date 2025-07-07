import { z } from 'zod';

// Genre enum for validation
export const genreEnum = z.enum([
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 
  'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller',
  'Mecha', 'Historical', 'Musical', 'Psychological', 'Seinen', 'Shoujo',
  'Shounen', 'Josei', 'Ecchi', 'Harem', 'Isekai', 'Military', 'School',
  'Magic', 'Demons', 'Vampires', 'Game', 'Parody', 'Police', 'Space'
]);

// Anime status enum
export const animeStatusEnum = z.enum([
  'ongoing', 'completed', 'upcoming', 'on_hiatus', 'cancelled'
]);

// Anime type enum
export const animeTypeEnum = z.enum([
  'TV', 'Movie', 'OVA', 'ONA', 'Special', 'Music'
]);

// Rating enum
export const ratingEnum = z.enum([
  'G', 'PG', 'PG-13', 'R', 'R+'
]);

// Create anime schema (Admin only)
export const createAnimeSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters'),
  title_english: z.string()
    .max(200, 'English title must be at most 200 characters')
    .optional(),
  title_japanese: z.string()
    .max(200, 'Japanese title must be at most 200 characters')
    .optional(),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be at most 2000 characters'),
  synopsis: z.string()
    .max(5000, 'Synopsis must be at most 5000 characters')
    .optional(),
  genres: z.array(genreEnum)
    .min(1, 'At least one genre is required')
    .max(10, 'Maximum 10 genres allowed'),
  type: animeTypeEnum,
  status: animeStatusEnum,
  year: z.number()
    .min(1900, 'Year must be 1900 or later')
    .max(new Date().getFullYear() + 5, 'Year cannot be more than 5 years in the future'),
  season: z.enum(['Winter', 'Spring', 'Summer', 'Fall']).optional(),
  total_episodes: z.number()
    .min(1, 'Total episodes must be at least 1')
    .max(10000, 'Total episodes cannot exceed 10000')
    .optional(),
  episode_duration: z.number()
    .min(1, 'Episode duration must be at least 1 minute')
    .max(300, 'Episode duration cannot exceed 300 minutes')
    .optional(),
  rating: ratingEnum.optional(),
  score: z.number()
    .min(0, 'Score must be between 0 and 10')
    .max(10, 'Score must be between 0 and 10')
    .optional(),
  poster_url: z.string()
    .url('Invalid poster URL')
    .optional(),
  banner_url: z.string()
    .url('Invalid banner URL')
    .optional(),
  trailer_url: z.string()
    .url('Invalid trailer URL')
    .optional(),
  mal_id: z.number()
    .positive('MAL ID must be positive')
    .optional(),
  anilist_id: z.number()
    .positive('AniList ID must be positive')
    .optional(),
  studio: z.string()
    .max(100, 'Studio name must be at most 100 characters')
    .optional(),
  source: z.enum(['Original', 'Manga', 'Light Novel', 'Visual Novel', 'Game', 'Other'])
    .optional()
});

// Update anime schema (Admin only)
export const updateAnimeSchema = createAnimeSchema.partial();

// Anime query/filter schema
export const animeQuerySchema = z.object({
  search: z.string()
    .max(100, 'Search query must be at most 100 characters')
    .optional(),
  genres: z.string()
    .transform(val => val ? val.split(',').map(g => g.trim()) : [])
    .pipe(z.array(genreEnum))
    .optional(),
  type: animeTypeEnum.optional(),
  status: animeStatusEnum.optional(),
  year: z.string()
    .regex(/^\d{4}$/, 'Year must be a 4-digit number')
    .transform(val => parseInt(val))
    .optional(),
  season: z.enum(['Winter', 'Spring', 'Summer', 'Fall']).optional(),
  sort_by: z.enum(['title', 'year', 'score', 'created_at', 'updated_at'])
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
    .transform(val => Math.min(50, Math.max(1, parseInt(val))))
    .optional()
    .default('20')
});

// Anime ID parameter validation
export const animeIdParamSchema = z.object({
  id: z.string()
    .uuid('Invalid anime ID format')
    .min(1, 'Anime ID is required')
});

// Export types
export type CreateAnimeRequest = z.infer<typeof createAnimeSchema>;
export type UpdateAnimeRequest = z.infer<typeof updateAnimeSchema>;
export type AnimeQuery = z.infer<typeof animeQuerySchema>;
export type AnimeIdParam = z.infer<typeof animeIdParamSchema>;
export type Genre = z.infer<typeof genreEnum>;
export type AnimeStatus = z.infer<typeof animeStatusEnum>;
export type AnimeType = z.infer<typeof animeTypeEnum>;
export type Rating = z.infer<typeof ratingEnum>;