import { z } from 'zod';

// User registration schema
export const registerSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .min(1, 'Email is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  display_name: z.string()
    .min(1, 'Display name is required')
    .max(50, 'Display name must be at most 50 characters')
    .optional()
});

// User login schema
export const loginSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .min(1, 'Email is required'),
  password: z.string()
    .min(1, 'Password is required')
});

// Password reset request schema
export const forgotPasswordSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .min(1, 'Email is required')
});

// Password reset schema
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number')
});

// Token refresh schema
export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required')
});

// Change password schema
export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number')
});

// Export types
export type RegisterRequest = z.infer<typeof registerSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;