import bcrypt from 'bcryptjs'
import { NextRequest } from 'next/server'

// Security configuration
export const SECURITY_CONFIG = {
  BCRYPT_SALT_ROUNDS: 12,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_COMPLEXITY: {
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    minSpecialChars: 1
  },
  RATE_LIMIT: {
    AUTH_ATTEMPTS: 5,
    AUTH_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    LOGIN_ATTEMPTS: 5,
    REGISTER_ATTEMPTS: 3
  },
  TOKEN_CONFIG: {
    ENTROPY_BYTES: 32,
    SESSION_DURATION_MS: 24 * 60 * 60 * 1000 // 24 hours
  }
} as const

// Security event types for logging
export enum SecurityEventType {
  PASSWORD_HASHED = 'PASSWORD_HASHED',
  PASSWORD_VERIFIED = 'PASSWORD_VERIFIED',
  PASSWORD_VERIFICATION_FAILED = 'PASSWORD_VERIFICATION_FAILED',
  WEAK_PASSWORD_REJECTED = 'WEAK_PASSWORD_REJECTED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_LOGIN_PATTERN = 'SUSPICIOUS_LOGIN_PATTERN',
  SECURE_TOKEN_GENERATED = 'SECURE_TOKEN_GENERATED',
  AUTHENTICATION_SUCCESS = 'AUTHENTICATION_SUCCESS',
  AUTHENTICATION_FAILURE = 'AUTHENTICATION_FAILURE',
  BRUTE_FORCE_DETECTED = 'BRUTE_FORCE_DETECTED'
}

// Security logger interface
interface SecurityLogEntry {
  timestamp: string
  event: SecurityEventType
  clientIP: string
  userAgent?: string
  email?: string
  userId?: string
  details?: Record<string, any>
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

// In-memory security event store (in production, use proper logging service)
const securityEvents: SecurityLogEntry[] = []

/**
 * Log security events with proper context
 */
export function logSecurityEvent(
  event: SecurityEventType,
  req: NextRequest,
  details: {
    email?: string
    userId?: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    additionalData?: Record<string, any>
  }
) {
  const logEntry: SecurityLogEntry = {
    timestamp: new Date().toISOString(),
    event,
    clientIP: getClientIP(req),
    userAgent: req.headers.get('user-agent') || 'Unknown',
    email: details.email,
    userId: details.userId,
    details: details.additionalData,
    severity: details.severity
  }

  securityEvents.push(logEntry)

  // Console logging for development
  console.log(`[SECURITY] ${details.severity}: ${event}`, {
    ip: logEntry.clientIP,
    email: details.email,
    timestamp: logEntry.timestamp,
    details: details.additionalData
  })

  // Keep only last 1000 events to prevent memory issues
  if (securityEvents.length > 1000) {
    securityEvents.shift()
  }

  // Alert on critical events
  if (details.severity === 'CRITICAL') {
    console.error(`🚨 CRITICAL SECURITY EVENT: ${event}`, logEntry)
  }
}

/**
 * Get recent security events for monitoring
 */
export function getRecentSecurityEvents(limit: number = 100): SecurityLogEntry[] {
  return securityEvents.slice(-limit).reverse()
}

/**
 * Get client IP address from request
 */
export function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIP = req.headers.get('x-real-ip')
  const remoteAddr = req.headers.get('x-vercel-forwarded-for')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  if (realIP) {
    return realIP
  }
  if (remoteAddr) {
    return remoteAddr
  }
  
  return 'unknown'
}

/**
 * Securely hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const hash = await bcrypt.hash(password, SECURITY_CONFIG.BCRYPT_SALT_ROUNDS)
    return hash
  } catch (error) {
    console.error('Password hashing failed:', error)
    throw new Error('Password hashing failed')
  }
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash)
  } catch (error) {
    console.error('Password verification failed:', error)
    return false
  }
}

/**
 * Validate password complexity
 */
export function validatePasswordComplexity(password: string): {
  isValid: boolean
  errors: string[]
  strength: 'WEAK' | 'MEDIUM' | 'STRONG'
} {
  const errors: string[] = []
  const config = SECURITY_CONFIG.PASSWORD_COMPLEXITY

  // Length check
  if (password.length < SECURITY_CONFIG.PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${SECURITY_CONFIG.PASSWORD_MIN_LENGTH} characters long`)
  }

  // Complexity checks
  if (config.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (config.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (config.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (config.requireSpecialChars) {
    const specialChars = /[!@#$%^&*(),.?":{}|<>]/g
    const matches = password.match(specialChars)
    if (!matches || matches.length < config.minSpecialChars) {
      errors.push(`Password must contain at least ${config.minSpecialChars} special character(s)`)
    }
  }

  // Calculate strength
  let strength: 'WEAK' | 'MEDIUM' | 'STRONG' = 'WEAK'
  if (errors.length === 0) {
    if (password.length >= 12 && /[A-Z]/.test(password) && /[a-z]/.test(password) && 
        /[0-9]/.test(password) && /[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      strength = 'STRONG'
    } else {
      strength = 'MEDIUM'
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength
  }
}

/**
 * Generate cryptographically secure token
 */
export function generateSecureToken(): string {
  // Use crypto.randomBytes for secure token generation
  const bytes = new Uint8Array(SECURITY_CONFIG.TOKEN_CONFIG.ENTROPY_BYTES)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate secure session token with metadata
 */
export function generateSessionToken(userId: string, email: string): {
  token: string
  expiresAt: number
  metadata: {
    userId: string
    email: string
    createdAt: string
    tokenType: 'session'
  }
} {
  const token = `secure_${generateSecureToken()}`
  const expiresAt = Date.now() + SECURITY_CONFIG.TOKEN_CONFIG.SESSION_DURATION_MS

  return {
    token,
    expiresAt,
    metadata: {
      userId,
      email,
      createdAt: new Date().toISOString(),
      tokenType: 'session'
    }
  }
}

/**
 * Standardized error messages to prevent user enumeration
 */
export const SECURITY_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  RATE_LIMIT_EXCEEDED: 'Too many attempts. Please try again later',
  WEAK_PASSWORD: 'Password does not meet security requirements',
  REGISTRATION_FAILED: 'Registration failed. Please try again',
  AUTHENTICATION_REQUIRED: 'Authentication required',
  ACCESS_DENIED: 'Access denied'
} as const

/**
 * Check for suspicious login patterns
 */
export function detectSuspiciousActivity(
  clientIP: string,
  email: string,
  timeWindow: number = 5 * 60 * 1000 // 5 minutes
): {
  isSuspicious: boolean
  reason?: string
  recentAttempts: number
} {
  const now = Date.now()
  const recentEvents = securityEvents.filter(event => 
    event.clientIP === clientIP &&
    event.email === email &&
    (event.event === SecurityEventType.AUTHENTICATION_FAILURE ||
     event.event === SecurityEventType.PASSWORD_VERIFICATION_FAILED) &&
    (now - new Date(event.timestamp).getTime()) < timeWindow
  )

  const recentAttempts = recentEvents.length

  // Flag as suspicious if more than 3 failed attempts in time window
  if (recentAttempts >= 3) {
    return {
      isSuspicious: true,
      reason: `${recentAttempts} failed authentication attempts in ${timeWindow / 60000} minutes`,
      recentAttempts
    }
  }

  return {
    isSuspicious: false,
    recentAttempts
  }
}

/**
 * Security metrics for monitoring
 */
export function getSecurityMetrics(): {
  totalEvents: number
  recentEvents: number
  eventsByType: Record<string, number>
  eventsBySeverity: Record<string, number>
  topIPs: Array<{ ip: string; count: number }>
  suspiciousActivity: number
} {
  const now = Date.now()
  const last24Hours = now - (24 * 60 * 60 * 1000)

  const recentEvents = securityEvents.filter(event => 
    new Date(event.timestamp).getTime() > last24Hours
  )

  const eventsByType: Record<string, number> = {}
  const eventsBySeverity: Record<string, number> = {}
  const ipCounts: Record<string, number> = {}

  recentEvents.forEach(event => {
    eventsByType[event.event] = (eventsByType[event.event] || 0) + 1
    eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1
    ipCounts[event.clientIP] = (ipCounts[event.clientIP] || 0) + 1
  })

  const topIPs = Object.entries(ipCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([ip, count]) => ({ ip, count }))

  const suspiciousActivity = recentEvents.filter(event => 
    event.severity === 'CRITICAL' || event.severity === 'HIGH'
  ).length

  return {
    totalEvents: securityEvents.length,
    recentEvents: recentEvents.length,
    eventsByType,
    eventsBySeverity,
    topIPs,
    suspiciousActivity
  }
}