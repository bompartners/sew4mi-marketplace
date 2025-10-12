import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@sew4mi/shared/types/database'
import { DatabaseError } from './errors'
import type { SupabaseClient } from '@supabase/supabase-js'

// Singleton instance for browser (client-side only)
let browserClient: SupabaseClient<Database> | null = null

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new DatabaseError(
      'Missing Supabase environment variables',
      'CONNECTION_FAILED' as any,
      undefined,
      false
    )
  }

  // Return existing client if in browser and already initialized
  if (typeof window !== 'undefined' && browserClient) {
    return browserClient
  }

  try {
    // Use createBrowserClient from @supabase/ssr for cookie-based sessions
    // This ensures client and middleware share the same session storage (cookies)
    const client = createBrowserClient<Database>(
      supabaseUrl,
      supabaseAnonKey
    )

    // Cache the client for browser only (not for server-side)
    if (typeof window !== 'undefined') {
      browserClient = client
    }

    return client
  } catch (error) {
    throw new DatabaseError(
      error instanceof Error ? error.message : 'Failed to create Supabase client',
      'CONNECTION_FAILED' as any,
      error,
      false
    )
  }
}

// Backwards compatibility aliases
export { createClient as createClientSupabaseClient };
export { createClient as createClientComponentClient };