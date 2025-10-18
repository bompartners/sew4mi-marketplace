/**
 * Supabase client exports
 * @file index.ts
 * 
 * IMPORTANT: This barrel file ONLY exports client-side Supabase code to prevent
 * server-only imports (like 'next/headers') from contaminating client bundles.
 * 
 * Import Guidelines:
 * - Client Components: import from '@/lib/supabase' or '@/lib/supabase/client'
 * - Server Components/API Routes: import directly from '@/lib/supabase/server'
 * - Never import server code through this barrel file
 */

// Client-side exports only
export { createClient as createClientSupabaseClient } from './client';
export { createClient as createClientComponentClient } from './client'; // Alias for backwards compatibility
export { createClient } from './client'; // Default export for convenience