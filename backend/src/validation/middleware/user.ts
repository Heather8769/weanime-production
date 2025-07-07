import { 
  updateProfileSchema,
  createBookmarkSchema,
  paginationSchema,
  createWatchSessionSchema,
  userUserIdParamSchema,
  userAnimeIdParamSchema
} from '../schemas/user.js';
import { validateBody, validateQuery, validateParams } from './validate.js';

// User validation middleware
export const validateUpdateProfile = validateBody(updateProfileSchema);
export const validateCreateBookmark = validateBody(createBookmarkSchema);
export const validatePagination = validateQuery(paginationSchema);
export const validateCreateWatchSession = validateBody(createWatchSessionSchema);
export const validateUserUserIdParam = validateParams(userUserIdParamSchema);
export const validateUserAnimeIdParam = validateParams(userAnimeIdParamSchema);