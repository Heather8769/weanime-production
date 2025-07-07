import { 
  createEpisodeSchema,
  updateEpisodeSchema,
  createVideoSourceSchema,
  episodeQuerySchema,
  episodeIdParamSchema,
  updateProgressSchema,
  bulkEpisodeSchema
} from '../schemas/episode.js';
import { validateBody, validateQuery, validateParams } from './validate.js';

// Episode validation middleware
export const validateCreateEpisode = validateBody(createEpisodeSchema);
export const validateUpdateEpisode = validateBody(updateEpisodeSchema);
export const validateCreateVideoSource = validateBody(createVideoSourceSchema);
export const validateEpisodeQuery = validateQuery(episodeQuerySchema);
export const validateEpisodeIdParam = validateParams(episodeIdParamSchema);
export const validateUpdateProgress = validateBody(updateProgressSchema);
export const validateBulkEpisode = validateBody(bulkEpisodeSchema);