#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'DATABASE_URL',
];

const OPTIONAL_ENV_VARS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_BUSINESS_ID',
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
  'HUBTEL_CLIENT_ID',
  'HUBTEL_CLIENT_SECRET',
  'HUBTEL_MERCHANT_ACCOUNT_ID',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'TWILIO_WHATSAPP_NUMBER',
  'MTN_MOMO_API_KEY',
  'MTN_MOMO_API_SECRET',
  'MTN_MOMO_SUBSCRIPTION_KEY',
  'OPENAI_API_KEY',
  'OPENAI_ORGANIZATION_ID',
  'GOOGLE_MAPS_API_KEY',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'WEBHOOK_BASE_URL',
  'NEXT_PUBLIC_APP_URL',
  'NEXTAUTH_URL',
  'JWT_SECRET',
  'SENTRY_DSN',
  'NEXT_PUBLIC_SENTRY_DSN',
  'NEXT_PUBLIC_GA_MEASUREMENT_ID',
];

function validateEnv() {
  console.log('🔍 Validating environment variables...\n');
  
  const envPath = path.join(process.cwd(), '.env.local');
  const examplePath = path.join(process.cwd(), '.env.example');
  
  if (!fs.existsSync(envPath)) {
    console.log('⚠️  .env.local file not found!');
    console.log('💡 Copy .env.example to .env.local and fill in your values.');
    console.log(`   cp ${examplePath} ${envPath}\n`);
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  let hasErrors = false;
  const missing = [];
  const empty = [];
  
  console.log('Required Variables:');
  REQUIRED_ENV_VARS.forEach(varName => {
    if (!envVars[varName]) {
      missing.push(varName);
      console.log(`  ❌ ${varName}: Missing`);
      hasErrors = true;
    } else if (envVars[varName].includes('_here')) {
      empty.push(varName);
      console.log(`  ⚠️  ${varName}: Using placeholder value`);
      hasErrors = true;
    } else {
      console.log(`  ✅ ${varName}: Set`);
    }
  });
  
  console.log('\nOptional Variables:');
  OPTIONAL_ENV_VARS.forEach(varName => {
    if (!envVars[varName]) {
      console.log(`  ⚪ ${varName}: Not set (optional)`);
    } else if (envVars[varName].includes('_here')) {
      console.log(`  ⚠️  ${varName}: Using placeholder value`);
    } else {
      console.log(`  ✅ ${varName}: Set`);
    }
  });
  
  if (hasErrors) {
    console.log('\n❌ Environment validation failed!');
    if (missing.length > 0) {
      console.log('\nMissing required variables:');
      missing.forEach(v => console.log(`  - ${v}`));
    }
    if (empty.length > 0) {
      console.log('\nVariables with placeholder values:');
      empty.forEach(v => console.log(`  - ${v}`));
    }
    console.log('\n💡 Update your .env.local file with the correct values.');
    process.exit(1);
  } else {
    console.log('\n✅ Environment validation passed!');
  }
}

if (require.main === module) {
  validateEnv();
}

module.exports = { validateEnv };