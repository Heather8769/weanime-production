import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getEnvConfig } from './env-validation'
import type { Database } from '@/types/database.types'

// Get validated environment configuration
const envConfig = getEnvConfig()

// Use fallback values for development if Supabase is not configured
const supabaseUrl = envConfig.supabase.url || 'https://placeholder.supabase.co'
const supabaseAnonKey = envConfig.supabase.anonKey || 'placeholder-anon-key'

// Check if Supabase is properly configured
const isSupabaseConfigured = !!(envConfig.supabase.url && envConfig.supabase.anonKey)

if (!isSupabaseConfigured && process.env.NODE_ENV === 'production') {
  throw new Error(
    'Missing required Supabase configuration in production. Please check your environment variables:\n' +
    '- NEXT_PUBLIC_SUPABASE_URL\n' +
    '- NEXT_PUBLIC_SUPABASE_ANON_KEY'
  )
}

export const supabase = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Helper function to check if Supabase is properly configured
export function isSupabaseAvailable(): boolean {
  return isSupabaseConfigured
}

// Export createClient function for API routes
export function createClient() {
  return createSupabaseClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    }
  )
}

// Export createServiceClient for server-side operations
export function createServiceClient() {
  if (!envConfig.supabase.serviceRoleKey) {
    throw new Error('Service role key not configured')
  }

  return createSupabaseClient<Database>(
    supabaseUrl,
    envConfig.supabase.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Import database types from separate file
export type { Database } from '@/types/database.types'
