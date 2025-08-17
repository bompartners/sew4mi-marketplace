import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@sew4mi/shared/types/database'
import { DatabaseError, mapSupabaseError } from './errors'

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

  try {
    const client = createSupabaseClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        },
        global: {
          headers: {
            'x-application-name': 'sew4mi-web',
          },
          fetch: async (url, options = {}) => {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

            try {
              const response = await fetch(url, {
                ...options,
                signal: controller.signal,
              })

              clearTimeout(timeoutId)

              if (!response.ok) {
                throw new DatabaseError(
                  `HTTP ${response.status}: ${response.statusText}`,
                  'SERVER_ERROR' as any,
                  undefined,
                  response.status >= 500,
                  response.status
                )
              }

              return response
            } catch (error: any) {
              clearTimeout(timeoutId)
              
              if (error.name === 'AbortError') {
                throw new DatabaseError(
                  'Request timeout after 30 seconds',
                  'TIMEOUT' as any,
                  error,
                  true
                )
              }
              
              if (error instanceof DatabaseError) {
                throw error
              }
              
              throw mapSupabaseError(error)
            }
          }
        }
      }
    )

    return client
  } catch (error) {
    throw mapSupabaseError(error)
  }
}