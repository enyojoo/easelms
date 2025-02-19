import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables")
}

class SupabaseClientSingleton {
  private static instance: ReturnType<typeof createClient<Database>> | null = null

  private constructor() {}

  public static getInstance(): ReturnType<typeof createClient<Database>> {
    if (!SupabaseClientSingleton.instance) {
      SupabaseClientSingleton.instance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    }

    return SupabaseClientSingleton.instance
  }
}

export const supabase = SupabaseClientSingleton.getInstance()

