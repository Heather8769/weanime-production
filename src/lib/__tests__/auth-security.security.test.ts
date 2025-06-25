import { NextRequest } from 'next/server'
import * as authSecurity from '../auth-security'

// Mock crypto for testing
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: jest.fn().mockReturnValue(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))
  }
})

describe('Authentication Security System', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Password Security', () => {
    it('should enforce minimum password requirements', () => {
      const weakPasswords = [
        '123',
        'password',
        'abc123',
        '12345678', // too simple
        'PASSWORD', // no lowercase
        'password', // no uppercase
        'Password', // no numbers
        'Pass123'   // too short
      ]

      for (const password of weakPasswords) {
        const result = authSecurity.validatePasswordComplexity(password)
        expect(result.isValid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
        expect(result.strength).toBe('WEAK')
      }
    })

    it('should accept strong passwords', () => {
      const strongPasswords = [
        'MySecureP@ssw0rd123',
        'C0mpl3x!P@ssword',
        'Str0ng#Security99',
        'MyApp2023!Secure'
      ]

      for (const password of strongPasswords) {
        const result = authSecurity.validatePasswordComplexity(password)
        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
        expect(['MEDIUM', 'STRONG']).toContain(result.strength)
      }
    })

    it('should categorize password strength correctly', () => {
      const mediumPassword = 'Password123!'
      const strongPassword = 'MyVerySecurePassword123!'

      const mediumResult = authSecurity.validatePasswordComplexity(mediumPassword)
      const strongResult = authSecurity.validatePasswordComplexity(strongPassword)

      expect(mediumResult.strength).toBe('MEDIUM')
      expect(strongResult.strength).toBe('STRONG')
    })

    it('should hash passwords securely', async () => {
      const password = 'MySecurePassword123!'
      const hash1 = await authSecurity.hashPassword(password)
      const hash2 = await authSecurity.hashPassword(password)

      // Hashes should be different (due to salt)
      expect(hash1).not.toBe(hash2)
      expect(hash1).toMatch(/^\$2[aby]\$\d+\$/)
      expect(hash2).toMatch(/^\$2[aby]\$\d+\$/)

      // Both should verify correctly
      expect(await authSecurity.verifyPassword(password, hash1)).toBe(true)
      expect(await authSecurity.verifyPassword(password, hash2)).toBe(true)
    })

    it('should reject incorrect passwords', async () => {
      const password = 'MySecurePassword123!'
      const hash = await authSecurity.hashPassword(password)

      expect(await authSecurity.verifyPassword('wrongpassword', hash)).toBe(false)
      expect(await authSecurity.verifyPassword('', hash)).toBe(false)
      expect(await authSecurity.verifyPassword('MySecurePassword123', hash)).toBe(false)
    })

    it('should handle password hashing errors gracefully', async () => {
      // Mock bcrypt to throw an error
      const bcrypt = require('bcryptjs')
      bcrypt.hash = jest.fn().mockRejectedValue(new Error('Hashing failed'))

      await expect(authSecurity.hashPassword('test')).rejects.toThrow('Password hashing failed')
    })

    it('should handle password verification errors gracefully', async () => {
      const bcrypt = require('bcryptjs')
      bcrypt.compare = jest.fn().mockRejectedValue(new Error('Comparison failed'))

      const result = await authSecurity.verifyPassword('test', 'hash')
      expect(result).toBe(false)
    })
  })

  describe('Token Generation', () => {
    it('should generate secure tokens', () => {
      const token1 = authSecurity.generateSecureToken()
      const token2 = authSecurity.generateSecureToken()

      expect(token1).not.toBe(token2)
      expect(token1).toMatch(/^[0-9a-f]+$/)
      expect(token1.length).toBe(64) // 32 bytes * 2 chars per byte
    })

    it('should generate session tokens with metadata', () => {
      const userId = 'user123'
      const email = 'test@example.com'
      
      const sessionToken = authSecurity.generateSessionToken(userId, email)

      expect(sessionToken.token).toMatch(/^secure_[0-9a-f]+$/)
      expect(sessionToken.expiresAt).toBeGreaterThan(Date.now())
      expect(sessionToken.metadata.userId).toBe(userId)
      expect(sessionToken.metadata.email).toBe(email)
      expect(sessionToken.metadata.tokenType).toBe('session')
      expect(sessionToken.metadata.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })
  })

  describe('Security Logging', () => {
    it('should log security events correctly', () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'user-agent': 'Mozilla/5.0 Test Browser',
          'x-forwarded-for': '192.168.1.1'
        }
      })

      authSecurity.logSecurityEvent(
        authSecurity.SecurityEventType.AUTHENTICATION_FAILURE,
        mockRequest,
        {
          email: 'test@example.com',
          userId: 'user123',
          severity: 'HIGH',
          additionalData: { reason: 'invalid_password' }
        }
      )

      const recentEvents = authSecurity.getRecentSecurityEvents(1)
      expect(recentEvents).toHaveLength(1)
      expect(recentEvents[0].event).toBe(authSecurity.SecurityEventType.AUTHENTICATION_FAILURE)
      expect(recentEvents[0].email).toBe('test@example.com')
      expect(recentEvents[0].severity).toBe('HIGH')
    })

    it('should limit stored security events', () => {
      const mockRequest = new NextRequest('http://localhost:3000/test')

      // Log more than 1000 events to test the limit
      for (let i = 0; i < 1005; i++) {
        authSecurity.logSecurityEvent(
          authSecurity.SecurityEventType.AUTHENTICATION_FAILURE,
          mockRequest,
          { severity: 'LOW' }
        )
      }

      const recentEvents = authSecurity.getRecentSecurityEvents(2000)
      expect(recentEvents.length).toBeLessThanOrEqual(1000)
    })
  })

  describe('Suspicious Activity Detection', () => {
    it('should detect suspicious activity patterns', () => {
      const clientIP = '192.168.1.100'
      const email = 'suspicious@example.com'
      const mockRequest = new NextRequest('http://localhost:3000/api/auth/login', {
        headers: { 'x-forwarded-for': clientIP }
      })

      // Log multiple failed attempts
      for (let i = 0; i < 4; i++) {
        authSecurity.logSecurityEvent(
          authSecurity.SecurityEventType.AUTHENTICATION_FAILURE,
          mockRequest,
          { email, severity: 'MEDIUM' }
        )
      }

      const result = authSecurity.detectSuspiciousActivity(clientIP, email)
      expect(result.isSuspicious).toBe(true)
      expect(result.recentAttempts).toBe(4)
      expect(result.reason).toContain('failed authentication attempts')
    })

    it('should not flag normal activity as suspicious', () => {
      const clientIP = '192.168.1.200'
      const email = 'normal@example.com'

      const result = authSecurity.detectSuspiciousActivity(clientIP, email)
      expect(result.isSuspicious).toBe(false)
      expect(result.recentAttempts).toBe(0)
    })

    it('should respect time window for suspicious activity detection', () => {
      const clientIP = '192.168.1.300'
      const email = 'timetest@example.com'

      // Test with a very short time window (1ms)
      const result = authSecurity.detectSuspiciousActivity(clientIP, email, 1)
      expect(result.isSuspicious).toBe(false)
    })
  })

  describe('Client IP Extraction', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = new NextRequest('http://localhost:3000', {
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' }
      })

      const ip = authSecurity.getClientIP(request)
      expect(ip).toBe('192.168.1.1')
    })

    it('should extract IP from x-real-ip header', () => {
      const request = new NextRequest('http://localhost:3000', {
        headers: { 'x-real-ip': '192.168.1.2' }
      })

      const ip = authSecurity.getClientIP(request)
      expect(ip).toBe('192.168.1.2')
    })

    it('should extract IP from x-vercel-forwarded-for header', () => {
      const request = new NextRequest('http://localhost:3000', {
        headers: { 'x-vercel-forwarded-for': '192.168.1.3' }
      })

      const ip = authSecurity.getClientIP(request)
      expect(ip).toBe('192.168.1.3')
    })

    it('should return unknown when no IP headers are present', () => {
      const request = new NextRequest('http://localhost:3000')

      const ip = authSecurity.getClientIP(request)
      expect(ip).toBe('unknown')
    })
  })

  describe('Security Metrics', () => {
    it('should provide security metrics', () => {
      const mockRequest = new NextRequest('http://localhost:3000', {
        headers: { 'x-forwarded-for': '192.168.1.50' }
      })

      // Log some events
      authSecurity.logSecurityEvent(
        authSecurity.SecurityEventType.AUTHENTICATION_SUCCESS,
        mockRequest,
        { severity: 'LOW' }
      )
      
      authSecurity.logSecurityEvent(
        authSecurity.SecurityEventType.BRUTE_FORCE_DETECTED,
        mockRequest,
        { severity: 'CRITICAL' }
      )

      const metrics = authSecurity.getSecurityMetrics()

      expect(metrics.totalEvents).toBeGreaterThan(0)
      expect(metrics.recentEvents).toBeGreaterThan(0)
      expect(metrics.eventsByType).toHaveProperty(authSecurity.SecurityEventType.AUTHENTICATION_SUCCESS)
      expect(metrics.eventsBySeverity).toHaveProperty('LOW')
      expect(metrics.eventsBySeverity).toHaveProperty('CRITICAL')
      expect(metrics.topIPs).toContainEqual({ ip: '192.168.1.50', count: expect.any(Number) })
      expect(metrics.suspiciousActivity).toBeGreaterThan(0)
    })
  })

  describe('Security Configuration', () => {
    it('should have secure default configuration', () => {
      expect(authSecurity.SECURITY_CONFIG.BCRYPT_SALT_ROUNDS).toBeGreaterThanOrEqual(12)
      expect(authSecurity.SECURITY_CONFIG.PASSWORD_MIN_LENGTH).toBeGreaterThanOrEqual(8)
      expect(authSecurity.SECURITY_CONFIG.PASSWORD_COMPLEXITY.requireUppercase).toBe(true)
      expect(authSecurity.SECURITY_CONFIG.PASSWORD_COMPLEXITY.requireLowercase).toBe(true)
      expect(authSecurity.SECURITY_CONFIG.PASSWORD_COMPLEXITY.requireNumbers).toBe(true)
      expect(authSecurity.SECURITY_CONFIG.PASSWORD_COMPLEXITY.requireSpecialChars).toBe(true)
    })

    it('should have appropriate rate limiting configuration', () => {
      expect(authSecurity.SECURITY_CONFIG.RATE_LIMIT.AUTH_ATTEMPTS).toBeLessThanOrEqual(10)
      expect(authSecurity.SECURITY_CONFIG.RATE_LIMIT.AUTH_WINDOW_MS).toBeGreaterThan(0)
      expect(authSecurity.SECURITY_CONFIG.RATE_LIMIT.LOGIN_ATTEMPTS).toBeLessThanOrEqual(10)
    })

    it('should have secure token configuration', () => {
      expect(authSecurity.SECURITY_CONFIG.TOKEN_CONFIG.ENTROPY_BYTES).toBeGreaterThanOrEqual(32)
      expect(authSecurity.SECURITY_CONFIG.TOKEN_CONFIG.SESSION_DURATION_MS).toBeGreaterThan(0)
    })
  })

  describe('Security Messages', () => {
    it('should provide standardized security messages', () => {
      expect(authSecurity.SECURITY_MESSAGES.INVALID_CREDENTIALS).toBe('Invalid email or password')
      expect(authSecurity.SECURITY_MESSAGES.RATE_LIMIT_EXCEEDED).toBe('Too many attempts. Please try again later')
      expect(authSecurity.SECURITY_MESSAGES.WEAK_PASSWORD).toBe('Password does not meet security requirements')
      expect(authSecurity.SECURITY_MESSAGES.REGISTRATION_FAILED).toBe('Registration failed. Please try again')
      expect(authSecurity.SECURITY_MESSAGES.AUTHENTICATION_REQUIRED).toBe('Authentication required')
      expect(authSecurity.SECURITY_MESSAGES.ACCESS_DENIED).toBe('Access denied')
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty passwords', () => {
      const result = authSecurity.validatePasswordComplexity('')
      expect(result.isValid).toBe(false)
      expect(result.strength).toBe('WEAK')
      expect(result.errors).toContain(expect.stringContaining('at least'))
    })

    it('should handle very long passwords', () => {
      const longPassword = 'A'.repeat(1000) + '1!'
      const result = authSecurity.validatePasswordComplexity(longPassword)
      expect(result.isValid).toBe(true)
      expect(result.strength).toBe('STRONG')
    })

    it('should handle special characters in passwords', () => {
      const specialChars = '!@#$%^&*(),.?":{}|<>'
      for (const char of specialChars) {
        const password = `Password123${char}`
        const result = authSecurity.validatePasswordComplexity(password)
        expect(result.isValid).toBe(true)
      }
    })
  })
})