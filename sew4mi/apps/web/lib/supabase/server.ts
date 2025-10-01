import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@sew4mi/shared/types/database'
import { DatabaseError, mapSupabaseError } from './errors'
// import { withRetry, DEFAULT_RETRY_OPTIONS } from './retry' // TODO: Use when implementing retry logic

// For API routes - creates a client with environment variables
export function createClient() {
  return createServerSupabaseClient();
}

// Export raw client creation function for explicit usage
export { createSupabaseClient }

export function createServerSupabaseClient(): ReturnType<typeof createSupabaseClient<Database>> {
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
    return createSupabaseClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
          global: {
            fetch: async (url, options = {}) => {
              const controller = new AbortController()
              const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s timeout for server

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
                    'Request timeout after 15 seconds',
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
  } catch (error) {
    throw mapSupabaseError(error)
  }
}

export function createServiceRoleClient(): ReturnType<typeof createSupabaseClient<Database>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new DatabaseError(
      'Missing Supabase service role environment variables',
      'CONNECTION_FAILED' as any,
      undefined,
      false
    )
  }

  try {
    return createSupabaseClient<Database>(
      supabaseUrl,
      supabaseServiceKey,
      {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
          global: {
            fetch: async (url, options = {}) => {
              const controller = new AbortController()
              const timeoutId = setTimeout(() => controller.abort(), 20000) // 20s timeout for service role

              try {
                const response = await fetch(url, {
                  ...options,
                  signal: controller.signal,
                })

                clearTimeout(timeoutId)

                if (!response.ok) {
                  throw new DatabaseError(
                    `Service role request failed: HTTP ${response.status}`,
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
                    'Service role request timeout after 20 seconds',
                    'TIMEOUT' as any,
                    error,
                    true
                  )
                }
                
                throw mapSupabaseError(error)
              }
            }
          }
        }
      )
  } catch (error) {
    throw mapSupabaseError(error)
  }
}