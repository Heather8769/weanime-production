import { 
  createAnimeSchema,
  updateAnimeSchema,
  animeQuerySchema,
  animeIdParamSchema
} from '../schemas/anime.js';
import { validateBody, validateQuery, validateParams } from './validate.js';

// Anime validation middleware
export const validateCreateAnime = validateBody(createAnimeSchema);
export const validateUpdateAnime = validateBody(updateAnimeSchema);
export const validateAnimeQuery = validateQuery(animeQuerySchema);
export const validateAnimeIdParam = validateParams(animeIdParamSchema);