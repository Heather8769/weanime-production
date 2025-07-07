import { 
  registerSchema, 
  loginSchema, 
  forgotPasswordSchema, 
  resetPasswordSchema, 
  refreshTokenSchema,
  changePasswordSchema 
} from '../schemas/auth.js';
import { validateBody } from './validate.js';

// Auth validation middleware
export const validateRegister = validateBody(registerSchema);
export const validateLogin = validateBody(loginSchema);
export const validateForgotPassword = validateBody(forgotPasswordSchema);
export const validateResetPassword = validateBody(resetPasswordSchema);
export const validateRefreshToken = validateBody(refreshTokenSchema);
export const validateChangePassword = validateBody(changePasswordSchema);