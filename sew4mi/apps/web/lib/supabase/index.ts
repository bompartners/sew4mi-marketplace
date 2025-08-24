/**
 * Supabase client exports
 * @file index.ts
 */

export { createServerSupabaseClient, createServiceRoleClient, createClient } from './server';
export { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// For repositories - create client on demand
export async function getSupabaseClient() {
  const { createServerSupabaseClient } = await import('./server');
  return createServerSupabaseClient();
}