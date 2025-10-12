/**
 * Supabase client exports
 * @file index.ts
 */

// Server-side exports
export { createServiceRoleClient, createClient } from './server';
export { createClient as createServerSupabaseClient } from './server'; // Alias for backwards compatibility

// Client-side exports
export { createClient as createClientSupabaseClient } from './client'; // For client components
export { createClient as createClientComponentClient } from './client'; // Alias for backwards compatibility

// For repositories - create client on demand
export async function getSupabaseClient() {
  const { createClient } = await import('./server');
  return createClient();
}