import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getEnvConfig } from './env-validation'
import type { Database } from '@/types/database.types'

// Get validated environment configuration
const envConfig = getEnvConfig()

// Validate required Supabase configuration
if (!envConfig.supabase.url || !envConfig.supabase.anonKey) {
  throw new Error(
    'Missing required Supabase configuration. Please check your environment variables:\n' +
    '- NEXT_PUBLIC_SUPABASE_URL\n' +
    '- NEXT_PUBLIC_SUPABASE_ANON_KEY'
  )
}

const supabaseUrl = envConfig.supabase.url
const supabaseAnonKey = envConfig.supabase.anonKey

export const supabase = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

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
