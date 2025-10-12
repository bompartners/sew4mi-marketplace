import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@sew4mi/shared/types/database'
import { DatabaseError, mapSupabaseError } from './errors'

// For API routes and server components - creates a client that reads from cookies
export async function createClient() {
  const cookieStore = await cookies()
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
    return createServerClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            // DO NOT set cookies in API routes - this causes the auth cookie to be cleared
            // Cookies are only managed by the client-side Supabase client
            // This method is required by the interface but should be a no-op in API routes
          },
        },
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