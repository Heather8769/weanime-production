import { 
  updateUserRoleSchema,
  updateUserStatusSchema,
  bulkUserActionSchema,
  moderateContentSchema,
  updateSystemSettingSchema,
  analyticsQuerySchema,
  maintenanceActionSchema,
  backupRequestSchema,
  cacheActionSchema,
  adminUserQuerySchema
} from '../schemas/admin.js';
import { validateBody, validateQuery } from './validate.js';

// Admin validation middleware
export const validateUpdateUserRole = validateBody(updateUserRoleSchema);
export const validateUpdateUserStatus = validateBody(updateUserStatusSchema);
export const validateBulkUserAction = validateBody(bulkUserActionSchema);
export const validateModerateContent = validateBody(moderateContentSchema);
export const validateUpdateSystemSetting = validateBody(updateSystemSettingSchema);
export const validateAnalyticsQuery = validateQuery(analyticsQuerySchema);
export const validateMaintenanceAction = validateBody(maintenanceActionSchema);
export const validateBackupRequest = validateBody(backupRequestSchema);
export const validateCacheAction = validateBody(cacheActionSchema);
export const validateAdminUserQuery = validateQuery(adminUserQuerySchema);