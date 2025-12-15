import { createBrowserClient } from '@supabase/ssr'
import { checkSupabaseEnv } from './env-check'

export function createClient() {
  // Check environment variables and provide helpful error
  const envCheck = checkSupabaseEnv()
  if (!envCheck.valid) {
    // In development, show helpful error
    if (process.env.NODE_ENV === 'development') {
      console.error(envCheck.message)
    }
    // Return a client with placeholder values to prevent crashes
    // The app will fall back to cookie-based auth
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder-key'
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

export function isSupabaseConfigured(): boolean {
  const envCheck = checkSupabaseEnv()
  return envCheck.valid
}

