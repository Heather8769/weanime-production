import { jwtVerify, SignJWT } from 'jose'
import { NextRequest } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-development-secret-change-in-production'
const secret = new TextEncoder().encode(JWT_SECRET)

export interface JWTPayload {
  sub: string // user ID
  email: string
  role?: 'user' | 'admin'
  exp?: number
  iat?: number
}

/**
 * Verify and decode a JWT token
 */
export async function verifyJWT(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, secret)
    
    // Validate payload has required fields
    if (!payload.sub || typeof payload.sub !== 'string') {
      throw new Error('Invalid token: missing user ID')
    }
    
    // Type-safe conversion with validation
    const validatedPayload: JWTPayload = {
      sub: payload.sub,
      email: (payload.email as string) || '',
      role: (payload.role as 'user' | 'admin') || 'user',
      exp: payload.exp,
      iat: payload.iat
    }
    
    return validatedPayload
  } catch (error) {
    throw new Error('Invalid or expired token')
  }
}

/**
 * Sign a new JWT token
 */
export async function signJWT(payload: Omit<JWTPayload, 'exp' | 'iat'>): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret)
}

/**
 * Extract JWT token from request headers
 */
export function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  
  // Also check for token in cookies as fallback
  const tokenCookie = request.cookies.get('auth-token')
  return tokenCookie?.value || null
}

/**
 * Verify user has required role
 */
export function hasRole(userRole: string | undefined, requiredRole: 'user' | 'admin'): boolean {
  if (requiredRole === 'admin') {
    return userRole === 'admin'
  }
  return userRole === 'user' || userRole === 'admin'
}

/**
 * Create auth response headers with user information
 */
export function createAuthHeaders(user: JWTPayload) {
  return {
    'x-user-id': user.sub,
    'x-user-email': user.email,
    'x-user-role': user.role || 'user'
  }
}