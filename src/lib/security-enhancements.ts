/**
 * Enhanced Security System for WeAnime Production
 * Comprehensive security measures for authentication, authorization, and data protection
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes, timingSafeEqual } from 'crypto'
import { supabase } from './supabase'
import { errorCollector } from './error-collector'

export interface SecurityConfig {
  enableCSRF: boolean
  enableRateLimit: boolean
  enableInputSanitization: boolean
  enableAuditLogging: boolean
  sessionTimeout: number
  maxLoginAttempts: number
  passwordMinLength: number
}

export interface SecurityAuditLog {
  id: string
  userId?: string
  action: string
  resource: string
  ipAddress: string
  userAgent: string
  timestamp: string
  success: boolean
  details?: any
}

export interface RateLimitEntry {
  count: number
  resetTime: number
  blocked: boolean
}

class SecurityEnhancementSystem {
  private static instance: SecurityEnhancementSystem
  private config: SecurityConfig
  private rateLimitStore = new Map<string, RateLimitEntry>()
  private csrfTokens = new Map<string, { token: string; expires: number }>()
  private loginAttempts = new Map<string, { count: number; lastAttempt: number }>()
  private auditLogs: SecurityAuditLog[] = []

  private constructor() {
    this.config = {
      enableCSRF: true,
      enableRateLimit: true,
      enableInputSanitization: true,
      enableAuditLogging: true,
      sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
      maxLoginAttempts: 5,
      passwordMinLength: 8
    }

    // Cleanup expired entries every hour
    setInterval(() => {
      this.cleanupExpiredEntries()
    }, 60 * 60 * 1000)
  }

  static getInstance(): SecurityEnhancementSystem {
    if (!SecurityEnhancementSystem.instance) {
      SecurityEnhancementSystem.instance = new SecurityEnhancementSystem()
    }
    return SecurityEnhancementSystem.instance
  }

  // CSRF Protection
  generateCSRFToken(sessionId: string): string {
    const token = randomBytes(32).toString('hex')
    const expires = Date.now() + (60 * 60 * 1000) // 1 hour
    
    this.csrfTokens.set(sessionId, { token, expires })
    return token
  }

  validateCSRFToken(sessionId: string, providedToken: string): boolean {
    const stored = this.csrfTokens.get(sessionId)
    
    if (!stored || Date.now() > stored.expires) {
      this.csrfTokens.delete(sessionId)
      return false
    }

    // Use timing-safe comparison to prevent timing attacks
    const storedBuffer = Buffer.from(stored.token, 'hex')
    const providedBuffer = Buffer.from(providedToken, 'hex')
    
    if (storedBuffer.length !== providedBuffer.length) {
      return false
    }

    return timingSafeEqual(storedBuffer, providedBuffer)
  }

  // Rate Limiting
  checkRateLimit(identifier: string, windowMs: number, maxRequests: number): boolean {
    const now = Date.now()
    const entry = this.rateLimitStore.get(identifier)

    if (!entry || now > entry.resetTime) {
      // New window or expired entry
      this.rateLimitStore.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
        blocked: false
      })
      return true
    }

    if (entry.blocked) {
      return false
    }

    entry.count++

    if (entry.count > maxRequests) {
      entry.blocked = true
      this.auditLog({
        action: 'RATE_LIMIT_EXCEEDED',
        resource: identifier,
        ipAddress: identifier.split(':')[0] || 'unknown',
        userAgent: 'unknown',
        success: false,
        details: { count: entry.count, limit: maxRequests }
      })
      return false
    }

    return true
  }

  // Input Sanitization
  sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/javascript:/gi, '') // Remove javascript: URLs
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .trim()
    }

    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item))
    }

    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(input)) {
        sanitized[this.sanitizeInput(key)] = this.sanitizeInput(value)
      }
      return sanitized
    }

    return input
  }

  // Password Security
  validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (password.length < this.config.passwordMinLength) {
      errors.push(`Password must be at least ${this.config.passwordMinLength} characters long`)
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number')
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character')
    }

    // Check against common passwords
    const commonPasswords = [
      'password', '123456', 'password123', 'admin', 'qwerty',
      'letmein', 'welcome', 'monkey', '1234567890'
    ]

    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const actualSalt = salt || randomBytes(32).toString('hex')
    const hash = createHash('pbkdf2')
      .update(password + actualSalt)
      .digest('hex')
    
    return { hash, salt: actualSalt }
  }

  verifyPassword(password: string, hash: string, salt: string): boolean {
    const { hash: computedHash } = this.hashPassword(password, salt)
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'))
  }

  // Login Attempt Tracking
  recordLoginAttempt(identifier: string, success: boolean): boolean {
    const now = Date.now()
    const attempts = this.loginAttempts.get(identifier) || { count: 0, lastAttempt: 0 }

    // Reset if more than 15 minutes since last attempt
    if (now - attempts.lastAttempt > 15 * 60 * 1000) {
      attempts.count = 0
    }

    if (success) {
      this.loginAttempts.delete(identifier)
      return true
    }

    attempts.count++
    attempts.lastAttempt = now
    this.loginAttempts.set(identifier, attempts)

    if (attempts.count >= this.config.maxLoginAttempts) {
      this.auditLog({
        action: 'LOGIN_ATTEMPTS_EXCEEDED',
        resource: 'auth',
        ipAddress: identifier,
        userAgent: 'unknown',
        success: false,
        details: { attempts: attempts.count, maxAllowed: this.config.maxLoginAttempts }
      })
      return false
    }

    return true
  }

  isLoginBlocked(identifier: string): boolean {
    const attempts = this.loginAttempts.get(identifier)
    if (!attempts) return false

    const now = Date.now()
    
    // Unblock after 15 minutes
    if (now - attempts.lastAttempt > 15 * 60 * 1000) {
      this.loginAttempts.delete(identifier)
      return false
    }

    return attempts.count >= this.config.maxLoginAttempts
  }

  // Security Headers
  getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self' https://api.supabase.co wss://realtime.supabase.co",
        "media-src 'self' https:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; ')
    }
  }

  // Audit Logging
  auditLog(log: Omit<SecurityAuditLog, 'id' | 'timestamp'>): void {
    if (!this.config.enableAuditLogging) return

    const auditEntry: SecurityAuditLog = {
      id: randomBytes(16).toString('hex'),
      timestamp: new Date().toISOString(),
      ...log
    }

    this.auditLogs.push(auditEntry)

    // Keep only last 1000 logs in memory
    if (this.auditLogs.length > 1000) {
      this.auditLogs.shift()
    }

    // Store in database for persistence
    this.storeAuditLog(auditEntry)

    // Log critical security events
    if (['LOGIN_ATTEMPTS_EXCEEDED', 'RATE_LIMIT_EXCEEDED', 'CSRF_VALIDATION_FAILED'].includes(log.action)) {
      errorCollector.warn('SecuritySystem', `Security event: ${log.action}`, {
        resource: log.resource,
        ipAddress: log.ipAddress,
        details: log.details
      })
    }
  }

  private async storeAuditLog(log: SecurityAuditLog): Promise<void> {
    try {
      await supabase
        .from('security_audit_logs')
        .insert({
          id: log.id,
          user_id: log.userId,
          action: log.action,
          resource: log.resource,
          ip_address: log.ipAddress,
          user_agent: log.userAgent,
          success: log.success,
          details: log.details,
          created_at: log.timestamp
        })
    } catch (error) {
      errorCollector.error('SecuritySystem', 'Failed to store audit log', {
        logId: log.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  // Session Security
  validateSession(sessionToken: string): boolean {
    // This would integrate with your session management system
    // For now, basic validation
    return Boolean(sessionToken && sessionToken.length > 20)
  }

  // IP Validation
  isValidIP(ip: string): boolean {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip)
  }

  // Cleanup expired entries
  private cleanupExpiredEntries(): void {
    const now = Date.now()

    // Cleanup rate limit entries
    for (const [key, entry] of this.rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        this.rateLimitStore.delete(key)
      }
    }

    // Cleanup CSRF tokens
    for (const [key, entry] of this.csrfTokens.entries()) {
      if (now > entry.expires) {
        this.csrfTokens.delete(key)
      }
    }

    // Cleanup old login attempts
    for (const [key, entry] of this.loginAttempts.entries()) {
      if (now - entry.lastAttempt > 24 * 60 * 60 * 1000) { // 24 hours
        this.loginAttempts.delete(key)
      }
    }
  }

  // Get security metrics
  getSecurityMetrics(): {
    rateLimitEntries: number
    csrfTokens: number
    loginAttempts: number
    auditLogs: number
    blockedIPs: number
  } {
    return {
      rateLimitEntries: this.rateLimitStore.size,
      csrfTokens: this.csrfTokens.size,
      loginAttempts: this.loginAttempts.size,
      auditLogs: this.auditLogs.length,
      blockedIPs: Array.from(this.rateLimitStore.values()).filter(entry => entry.blocked).length
    }
  }

  // Get recent audit logs
  getRecentAuditLogs(limit: number = 50): SecurityAuditLog[] {
    return this.auditLogs
      .slice(-limit)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  // Update configuration
  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig }
    errorCollector.info('SecuritySystem', 'Configuration updated', { newConfig })
  }
}

// Export singleton instance
export const securityEnhancer = SecurityEnhancementSystem.getInstance()

// Middleware functions
export function withSecurity(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Rate limiting
    if (!securityEnhancer.checkRateLimit(`${ip}:${req.nextUrl.pathname}`, 60000, 60)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    // Add security headers
    const response = await handler(req)
    const securityHeaders = securityEnhancer.getSecurityHeaders()
    
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response
  }
}

export function withAuth(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const authHeader = req.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    if (!securityEnhancer.validateSession(token)) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      )
    }

    return handler(req)
  }
}
