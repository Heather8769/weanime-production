// Environment variable validation and configuration
import { z } from 'zod'

// Define environment variable schema
const envSchema = z.object({
  // Next.js Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  // Supabase Configuration (Required in production, optional in development)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL').optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required').optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required').optional(),

  // Legal Streaming Providers (Optional)
  CRUNCHYROLL_API_URL: z.string().url().optional(),
  CRUNCHYROLL_API_KEY: z.string().optional(),
  CRUNCHYROLL_EMAIL: z.string().email().optional(),
  CRUNCHYROLL_PASSWORD: z.string().optional(),
  CRUNCHYROLL_LOCALE: z.string().optional(),
  CRUNCHYROLL_BRIDGE_URL: z.string().url().default('http://localhost:8081'),
  FUNIMATION_API_URL: z.string().url().optional(),
  FUNIMATION_API_KEY: z.string().optional(),
  YOUTUBE_API_KEY: z.string().optional(),

  // WeAnime Backend Configuration
  NEXT_PUBLIC_BACKEND_URL: z.string().url().default('http://localhost:8000'),
  WEANIME_BACKEND_URL: z.string().url().default('http://localhost:8000'),
  WEANIME_BACKEND_FALLBACK_URLS: z.string().optional(),
  BACKEND_API_KEY: z.string().optional(),

  // External APIs
  ANILIST_API_URL: z.string().url().default('https://graphql.anilist.co'),
  JIKAN_API_URL: z.string().url().default('https://api.jikan.moe/v4'),

  // Security Configuration
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters').optional(),
  ENCRYPTION_KEY: z.string().min(32, 'Encryption key must be at least 32 characters').optional(),

  // File Upload Configuration
  MAX_FILE_SIZE: z.string().transform(Number).pipe(z.number().positive()).default('10485760'),
  ALLOWED_FILE_TYPES: z.string().default('image/jpeg,image/png,image/webp'),

  // Rate Limiting
  REDIS_URL: z.string().url().optional().or(z.literal('')),
  REDIS_PASSWORD: z.string().optional(),

  // Analytics and Monitoring
  GOOGLE_ANALYTICS_ID: z.string().optional(),
  SENTRY_DSN: z.string().url().optional().or(z.literal('')),

  // Email Configuration
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).pipe(z.number().positive()).optional(),
  SMTP_USER: z.string().email().optional().or(z.literal('')),
  SMTP_PASS: z.string().optional(),

  // Feature Flags
  NEXT_PUBLIC_ENABLE_COMMENTS: z.string().transform(val => val === 'true').default('true'),
  NEXT_PUBLIC_ENABLE_RATINGS: z.string().transform(val => val === 'true').default('true'),
  NEXT_PUBLIC_ENABLE_SOCIAL_FEATURES: z.string().transform(val => val === 'true').default('true'),

  // Development Settings
  NEXT_TELEMETRY_DISABLED: z.string().transform(val => val === '1').default('1'),
})

// Validate environment variables
function validateEnv() {
  try {
    const env = envSchema.parse(process.env)
    return { success: true, data: env, errors: null }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
      return { success: false, data: null, errors }
    }
    return { 
      success: false, 
      data: null, 
      errors: [{ field: 'unknown', message: 'Unknown validation error', code: 'unknown' }] 
    }
  }
}

// Get validated environment variables
export function getValidatedEnv() {
  const result = validateEnv()
  
  if (!result.success) {
    console.error('❌ Environment validation failed:')
    result.errors?.forEach(error => {
      console.error(`  - ${error.field}: ${error.message}`)
    })
    
    if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PHASE) {
      // Only throw in production runtime, not during build
      throw new Error('Environment validation failed in production')
    }
    
    console.warn('⚠️ Continuing with invalid environment in development mode')
    return process.env as any
  }
  
  console.log('✅ Environment validation passed')
  return result.data
}

// Check if required environment variables are set
export function checkRequiredEnvVars(): { valid: boolean; missing: string[] } {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ]
  
  const missing = required.filter(key => !process.env[key])
  
  return {
    valid: missing.length === 0,
    missing
  }
}

// Check if streaming providers are configured
export function checkStreamingProviders(): { 
  configured: string[]
  available: string[]
  hasLegalProviders: boolean 
} {
  const providers = [
    { name: 'Crunchyroll', url: 'CRUNCHYROLL_API_URL', key: 'CRUNCHYROLL_API_KEY' },
    { name: 'Funimation', url: 'FUNIMATION_API_URL', key: 'FUNIMATION_API_KEY' },
    { name: 'YouTube', key: 'YOUTUBE_API_KEY' }
  ]
  
  const configured = providers
    .filter(provider => {
      if (provider.url) {
        return process.env[provider.url] && process.env[provider.key]
      }
      return process.env[provider.key]
    })
    .map(provider => provider.name)
  
  return {
    configured,
    available: providers.map(p => p.name),
    hasLegalProviders: configured.length > 0
  }
}

// Get environment-specific configuration
export function getEnvConfig() {
  const env = getValidatedEnv()
  
  return {
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
    
    supabase: {
      url: env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY
    },
    
    streaming: {
      crunchyroll: {
        enabled: !!(env.CRUNCHYROLL_EMAIL && env.CRUNCHYROLL_PASSWORD),
        url: env.CRUNCHYROLL_API_URL,
        key: env.CRUNCHYROLL_API_KEY,
        email: env.CRUNCHYROLL_EMAIL,
        password: env.CRUNCHYROLL_PASSWORD,
        locale: env.CRUNCHYROLL_LOCALE,
        bridgeUrl: env.CRUNCHYROLL_BRIDGE_URL
      },
      funimation: {
        enabled: !!(env.FUNIMATION_API_URL && env.FUNIMATION_API_KEY),
        url: env.FUNIMATION_API_URL,
        key: env.FUNIMATION_API_KEY
      },
      youtube: {
        enabled: !!env.YOUTUBE_API_KEY,
        key: env.YOUTUBE_API_KEY
      }
    },
    
    backend: {
      url: env.NEXT_PUBLIC_BACKEND_URL,
      weAnimeUrl: env.WEANIME_BACKEND_URL,
      fallbackUrls: env.WEANIME_BACKEND_FALLBACK_URLS ? env.WEANIME_BACKEND_FALLBACK_URLS.split(',') : [],
      apiKey: env.BACKEND_API_KEY
    },
    
    apis: {
      anilist: env.ANILIST_API_URL,
      jikan: env.JIKAN_API_URL
    },
    
    security: {
      jwtSecret: env.JWT_SECRET,
      encryptionKey: env.ENCRYPTION_KEY
    },
    
    upload: {
      maxFileSize: env.MAX_FILE_SIZE,
      allowedTypes: env.ALLOWED_FILE_TYPES ? env.ALLOWED_FILE_TYPES.split(',') : ['image/jpeg', 'image/png', 'image/webp']
    },
    
    features: {
      comments: env.NEXT_PUBLIC_ENABLE_COMMENTS,
      ratings: env.NEXT_PUBLIC_ENABLE_RATINGS,
      social: env.NEXT_PUBLIC_ENABLE_SOCIAL_FEATURES
    }
  }
}

// Validate environment on module load
const envValidation = validateEnv()
if (!envValidation.success && process.env.NODE_ENV === 'production' && !process.env.NEXT_PHASE) {
  // Only throw in production runtime, not during build
  throw new Error('Environment validation failed in production')
}

export const env = getValidatedEnv()
export default env
