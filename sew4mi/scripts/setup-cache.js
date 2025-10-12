#!/usr/bin/env node

/**
 * Interactive script to configure Redis or Vercel KV caching
 * Run: node scripts/setup-cache.js
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   Sew4Mi Cache Configuration Setup                     ║');
  console.log('║   Story 4.3: Reorder and Favorites                     ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  console.log('This script will help you configure caching for your application.\n');

  console.log('Choose your caching backend:');
  console.log('1. Vercel KV (Recommended for Vercel deployments)');
  console.log('2. Redis (Self-hosted or managed service)');
  console.log('3. Skip (Use in-memory cache - development only)\n');

  const choice = await question('Enter your choice (1-3): ');

  if (choice === '1') {
    await setupVercelKV();
  } else if (choice === '2') {
    await setupRedis();
  } else if (choice === '3') {
    console.log('\n✓ Skipping cache configuration. Using in-memory cache for development.\n');
  } else {
    console.log('\n✗ Invalid choice. Exiting.\n');
    rl.close();
    return;
  }

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║   Configuration Complete!                              ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  console.log('Next steps:');
  console.log('1. Restart your development server');
  console.log('2. Test the cache: Check application logs for cache HIT/MISS');
  console.log('3. Deploy to production\n');

  console.log('Documentation:');
  console.log('- Setup Guide: docs/deployment/redis-vercel-kv-setup.md');
  console.log('- Cache Strategy: docs/architecture/cache-invalidation-strategy.md\n');

  rl.close();
}

async function setupVercelKV() {
  console.log('\n═══ Vercel KV Configuration ═══\n');

  console.log('To get your Vercel KV credentials:');
  console.log('1. Go to https://vercel.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Navigate to Storage → Create Database → KV');
  console.log('4. Copy the credentials from the dashboard\n');

  const kvUrl = await question('Enter KV_REST_API_URL: ');
  const kvToken = await question('Enter KV_REST_API_TOKEN: ');
  const kvReadOnlyToken = await question('Enter KV_REST_API_READ_ONLY_TOKEN (optional, press Enter to skip): ');

  if (!kvUrl || !kvToken) {
    console.log('\n✗ KV_REST_API_URL and KV_REST_API_TOKEN are required.');
    return;
  }

  // Update .env.local
  const envPath = path.join(__dirname, '..', '.env.local');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    // Remove existing KV config
    envContent = envContent.replace(/KV_REST_API_URL=.*/g, '');
    envContent = envContent.replace(/KV_REST_API_TOKEN=.*/g, '');
    envContent = envContent.replace(/KV_REST_API_READ_ONLY_TOKEN=.*/g, '');
  }

  envContent += `\n# Vercel KV (Added by setup-cache.js on ${new Date().toISOString()})\n`;
  envContent += `KV_REST_API_URL=${kvUrl}\n`;
  envContent += `KV_REST_API_TOKEN=${kvToken}\n`;
  if (kvReadOnlyToken) {
    envContent += `KV_REST_API_READ_ONLY_TOKEN=${kvReadOnlyToken}\n`;
  }

  fs.writeFileSync(envPath, envContent.trim() + '\n');

  console.log('\n✓ Vercel KV configured successfully!');
  console.log(`✓ Configuration saved to: ${envPath}`);

  // Test connection
  console.log('\n⚙️  Testing connection...');
  try {
    const { kv } = await import('@vercel/kv');
    await kv.set('test-key', 'Hello from Sew4Mi!', { ex: 60 });
    const value = await kv.get('test-key');
    await kv.del('test-key');
    console.log('✓ Connection successful:', value);
  } catch (error) {
    console.log('✗ Connection test failed:', error.message);
    console.log('  Please verify your credentials and try again.');
  }
}

async function setupRedis() {
  console.log('\n═══ Redis Configuration ═══\n');

  console.log('Choose Redis provider:');
  console.log('1. Upstash (Serverless Redis)');
  console.log('2. Railway');
  console.log('3. Custom Redis URL');
  console.log('4. Manual configuration (host, port, password)\n');

  const provider = await question('Enter your choice (1-4): ');

  let redisUrl = '';

  if (provider === '1') {
    console.log('\nUpstash Redis:');
    console.log('1. Go to https://console.upstash.com');
    console.log('2. Create a database');
    console.log('3. Copy the REST URL or Redis URL\n');
    redisUrl = await question('Enter Redis URL (redis://...): ');
  } else if (provider === '2') {
    console.log('\nRailway Redis:');
    console.log('1. Go to https://railway.app');
    console.log('2. Create a new project → Add Redis');
    console.log('3. Copy REDIS_URL from Variables tab\n');
    redisUrl = await question('Enter Redis URL (redis://...): ');
  } else if (provider === '3') {
    console.log('\nCustom Redis:');
    redisUrl = await question('Enter Redis URL (redis://[user]:[password]@[host]:[port]): ');
  } else if (provider === '4') {
    console.log('\nManual Redis Configuration:');
    const host = await question('Enter Redis host (default: localhost): ') || 'localhost';
    const port = await question('Enter Redis port (default: 6379): ') || '6379';
    const password = await question('Enter Redis password (press Enter if none): ');
    const db = await question('Enter Redis database number (default: 0): ') || '0';

    if (password) {
      redisUrl = `redis://:${password}@${host}:${port}/${db}`;
    } else {
      redisUrl = `redis://${host}:${port}/${db}`;
    }
  } else {
    console.log('\n✗ Invalid choice.');
    return;
  }

  if (!redisUrl) {
    console.log('\n✗ Redis URL is required.');
    return;
  }

  // Update .env.local
  const envPath = path.join(__dirname, '..', '.env.local');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    // Remove existing Redis config
    envContent = envContent.replace(/REDIS_URL=.*/g, '');
    envContent = envContent.replace(/USE_REDIS=.*/g, '');
  }

  envContent += `\n# Redis (Added by setup-cache.js on ${new Date().toISOString()})\n`;
  envContent += `REDIS_URL=${redisUrl}\n`;
  envContent += `USE_REDIS=true\n`;

  fs.writeFileSync(envPath, envContent.trim() + '\n');

  console.log('\n✓ Redis configured successfully!');
  console.log(`✓ Configuration saved to: ${envPath}`);

  // Test connection
  console.log('\n⚙️  Testing connection...');
  try {
    const Redis = require('ioredis');
    const redis = new Redis(redisUrl);

    await redis.set('test-key', 'Hello from Sew4Mi!', 'EX', 60);
    const value = await redis.get('test-key');
    await redis.del('test-key');
    await redis.quit();

    console.log('✓ Connection successful:', value);
  } catch (error) {
    console.log('✗ Connection test failed:', error.message);
    console.log('  Please verify your credentials and try again.');
  }
}

// Run the script
main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
