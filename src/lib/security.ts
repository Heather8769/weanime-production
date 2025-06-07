// Security utilities and configurations

// Rate limiting configuration
export const RATE_LIMITS = {
  API_CALLS: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
  AUTH_ATTEMPTS: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 auth attempts per windowMs
  },
  SEARCH: {
    windowMs: 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 search requests per minute
  },
  COMMENTS: {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 comments per minute
  },
}

// Content Security Policy
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for Next.js
    "'unsafe-eval'", // Required for development
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for styled-components and CSS-in-JS
    'https://fonts.googleapis.com',
  ],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https://s4.anilist.co',
    'https://img1.ak.crunchyroll.com',
    'https://cdn.myanimelist.net',
    'https://commondatastorage.googleapis.com',
    'https://i.ytimg.com',
  ],
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com',
  ],
  'connect-src': [
    "'self'",
    'https://graphql.anilist.co',
    'https://*.supabase.co',
    'https://www.google-analytics.com',
  ],
  'media-src': [
    "'self'",
    'blob:',
    'https://commondatastorage.googleapis.com',
  ],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': [],
}

// Generate CSP header string
export function generateCSPHeader(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => {
      if (sources.length === 0) {
        return directive
      }
      return `${directive} ${sources.join(' ')}`
    })
    .join('; ')
}

// Input sanitization
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .slice(0, 1000) // Limit length
}

// Email validation
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

// Password strength validation
export function validatePasswordStrength(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  if (password.length > 128) {
    errors.push('Password must be less than 128 characters long')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  // Check for common passwords
  const commonPasswords = [
    'password', '123456', '123456789', 'qwerty', 'abc123',
    'password123', 'admin', 'letmein', 'welcome', 'monkey'
  ]

  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}



// XSS protection
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// SQL injection protection (for raw queries)
export function escapeSqlString(str: string): string {
  return str.replace(/'/g, "''")
}

// Check if request is from allowed origin
export function isAllowedOrigin(origin: string): boolean {
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    'http://localhost:3000',
    'https://localhost:3000',
  ].filter(Boolean)

  return allowedOrigins.includes(origin)
}


// Validate JWT token structure (basic validation)
export function isValidJWTStructure(token: string): boolean {
  const parts = token.split('.')
  return parts.length === 3 && parts.every(part => part.length > 0)
}

// Security headers for API routes
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
}

// Apply security headers to response
export function applySecurityHeaders(headers: Headers): void {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    headers.set(key, value)
  })
  
  headers.set('Content-Security-Policy', generateCSPHeader())
}

// Rate limiting store (in-memory for development, use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string,
  limit: { windowMs: number; max: number }
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const key = identifier
  const window = limit.windowMs
  const maxRequests = limit.max

  const record = rateLimitStore.get(key)
  
  if (!record || now > record.resetTime) {
    // New window
    const resetTime = now + window
    rateLimitStore.set(key, { count: 1, resetTime })
    return { allowed: true, remaining: maxRequests - 1, resetTime }
  }

  if (record.count >= maxRequests) {
    // Rate limit exceeded
    return { allowed: false, remaining: 0, resetTime: record.resetTime }
  }

  // Increment count
  record.count++
  rateLimitStore.set(key, record)
  
  return { 
    allowed: true, 
    remaining: maxRequests - record.count, 
    resetTime: record.resetTime 
  }
}

// Clean up expired rate limit records
setInterval(() => {
  const now = Date.now()
  const keysToDelete: string[] = []

  rateLimitStore.forEach((record, key) => {
    if (now > record.resetTime) {
      keysToDelete.push(key)
    }
  })

  keysToDelete.forEach(key => {
    rateLimitStore.delete(key)
  })
}, 60000) // Clean up every minute
