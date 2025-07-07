import { Request } from 'express';

/**
 * User role types
 */
export type UserRole = 'user' | 'moderator' | 'admin';

/**
 * JWT payload interface
 */
export interface JWTPayload {
  sub: string; // User ID
  email: string;
  role: UserRole;
  iat: number; // Issued at
  exp: number; // Expires at
  aud?: string; // Audience
  iss?: string; // Issuer
}

/**
 * User profile interface from Supabase
 */
export interface UserProfile {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  role: UserRole;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  permissions?: string[];
  preferences?: Record<string, any>;
}

/**
 * Authentication context attached to requests
 */
export interface AuthContext {
  user: UserProfile;
  token: JWTPayload;
  permissions: string[];
  roles: UserRole[];
}

/**
 * Extended Express request with authentication context
 */
export interface AuthenticatedRequest extends Request {
  auth?: AuthContext;
  validatedBody?: any;
  validatedParams?: any;
  validatedQuery?: any;
}

/**
 * Custom authentication error
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Custom authorization error
 */
export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Login request body
 */
export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

/**
 * Register request body
 */
export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
  display_name: string;
}

/**
 * Token refresh request
 */
export interface RefreshTokenRequest {
  refresh_token: string;
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Password update request
 */
export interface PasswordUpdateRequest {
  current_password: string;
  new_password: string;
}

/**
 * Authentication response
 */
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
  user: UserProfile;
}

/**
 * Email verification request
 */
export interface EmailVerificationRequest {
  token: string;
}

/**
 * Profile update request
 */
export interface ProfileUpdateRequest {
  display_name?: string;
  avatar_url?: string;
  preferences?: Record<string, any>;
}