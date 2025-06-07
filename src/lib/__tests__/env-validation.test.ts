import { describe, it, expect, beforeEach, afterEach } from '@jest/jest-globals'
import { getValidatedEnv, checkRequiredEnvVars, checkStreamingProviders, getEnvConfig } from '../env-validation'

describe('Environment Validation', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('checkRequiredEnvVars', () => {
    it('should return valid when all required vars are set', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

      const result = checkRequiredEnvVars()
      expect(result.valid).toBe(true)
      expect(result.missing).toHaveLength(0)
    })

    it('should return invalid when required vars are missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      const result = checkRequiredEnvVars()
      expect(result.valid).toBe(false)
      expect(result.missing).toContain('NEXT_PUBLIC_SUPABASE_URL')
      expect(result.missing).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    })
  })

  describe('checkStreamingProviders', () => {
    it('should detect configured streaming providers', () => {
      process.env.CRUNCHYROLL_API_URL = 'https://api.crunchyroll.com'
      process.env.CRUNCHYROLL_API_KEY = 'test-key'
      process.env.YOUTUBE_API_KEY = 'youtube-key'

      const result = checkStreamingProviders()
      expect(result.configured).toContain('Crunchyroll')
      expect(result.configured).toContain('YouTube')
      expect(result.hasLegalProviders).toBe(true)
    })

    it('should return empty when no providers configured', () => {
      const result = checkStreamingProviders()
      expect(result.configured).toHaveLength(0)
      expect(result.hasLegalProviders).toBe(false)
    })
  })

  describe('getEnvConfig', () => {
    it('should return proper configuration object', () => {
      process.env.NODE_ENV = 'development'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
      process.env.YOUTUBE_API_KEY = 'youtube-key'

      const config = getEnvConfig()
      expect(config.isDevelopment).toBe(true)
      expect(config.supabase.url).toBe('https://test.supabase.co')
      expect(config.streaming.youtube.enabled).toBe(true)
    })

    it('should handle missing optional environment variables', () => {
      process.env.NODE_ENV = 'test'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

      const config = getEnvConfig()
      expect(config.streaming.crunchyroll.enabled).toBe(false)
      expect(config.streaming.funimation.enabled).toBe(false)
    })
  })

  describe('getValidatedEnv', () => {
    it('should validate environment successfully with valid vars', () => {
      process.env.NODE_ENV = 'development'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

      expect(() => getValidatedEnv()).not.toThrow()
    })

    it('should throw in production with invalid environment', () => {
      process.env.NODE_ENV = 'production'
      delete process.env.NEXT_PUBLIC_SUPABASE_URL

      expect(() => getValidatedEnv()).toThrow('Environment validation failed in production')
    })

    it('should not throw in development with invalid environment', () => {
      process.env.NODE_ENV = 'development'
      delete process.env.NEXT_PUBLIC_SUPABASE_URL

      // Should not throw but log warnings
      expect(() => getValidatedEnv()).not.toThrow()
    })
  })
})
