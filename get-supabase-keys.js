#!/usr/bin/env node
/**
 * Script to generate proper Supabase JWT tokens for local development
 * The placeholder keys in .env.local are not valid JWTs
 */

const jwt = require('jsonwebtoken');

// Default local Supabase JWT secret (this is the standard secret used by Supabase local)
const JWT_SECRET = 'your-super-secret-jwt-token-with-at-least-32-characters-long';

// Generate anon key
const anonToken = jwt.sign(
  {
    role: 'anon',
    iss: 'supabase',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60), // 10 years
  },
  JWT_SECRET
);

// Generate service role key
const serviceRoleToken = jwt.sign(
  {
    role: 'service_role',
    iss: 'supabase',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60), // 10 years
  },
  JWT_SECRET
);

console.log('\n=== Supabase Local Development Keys ===\n');
console.log('Add these to your sew4mi/apps/web/.env.local file:\n');
console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonToken}\n`);
console.log(`SUPABASE_SERVICE_ROLE_KEY=${serviceRoleToken}\n`);
console.log('=== Copy the above keys to .env.local ===\n');

