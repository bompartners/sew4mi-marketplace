/**
 * Quick test to verify Hubtel environment variables are loaded
 * Run: node test-hubtel-setup.js
 */

// Load environment variables
require('dotenv').config({ path: 'sew4mi/apps/web/.env.local' });

const required = {
  'HUBTEL_CLIENT_ID': process.env.HUBTEL_CLIENT_ID,
  'HUBTEL_CLIENT_SECRET': process.env.HUBTEL_CLIENT_SECRET,
  'HUBTEL_MERCHANT_ACCOUNT_ID': process.env.HUBTEL_MERCHANT_ACCOUNT_ID,
  'HUBTEL_ENVIRONMENT': process.env.HUBTEL_ENVIRONMENT,
  'HUBTEL_CALLBACK_URL': process.env.HUBTEL_CALLBACK_URL,
};

const optional = {
  'HUBTEL_CALLBACK_IPS': process.env.HUBTEL_CALLBACK_IPS,
};

console.log('\n🔍 Hubtel Configuration Check\n');
console.log('Required Variables:');
console.log('===================');

let allRequiredPresent = true;
for (const [key, value] of Object.entries(required)) {
  const status = value ? '✅' : '❌';
  const display = value ? (key.includes('SECRET') ? '***hidden***' : value) : 'NOT SET';
  console.log(`${status} ${key}: ${display}`);
  if (!value) allRequiredPresent = false;
}

console.log('\nOptional Variables:');
console.log('==================');
for (const [key, value] of Object.entries(optional)) {
  const status = value ? '✅' : '⚠️';
  const display = value ? value : 'NOT SET (will log warning)';
  console.log(`${status} ${key}: ${display}`);
}

console.log('\nEnvironment:');
console.log('============');
const env = process.env.HUBTEL_ENVIRONMENT || 'sandbox';
const baseUrl = env === 'production' 
  ? 'https://api.hubtel.com/v1' 
  : 'https://sandbox-api.hubtel.com/v1';
console.log(`Environment: ${env}`);
console.log(`Base URL: ${baseUrl}`);

console.log('\nStatus:');
console.log('=======');
if (allRequiredPresent) {
  console.log('✅ All required variables are set!');
  console.log('✅ You can now test Hubtel payments in development');
  
  if (!process.env.HUBTEL_CALLBACK_IPS) {
    console.log('⚠️  HUBTEL_CALLBACK_IPS not set - webhook security disabled (OK for dev)');
  }
} else {
  console.log('❌ Missing required variables!');
  console.log('📝 Create sew4mi/apps/web/.env.local with your Hubtel credentials');
  console.log('📚 See ENV_CONFIGURATION_GUIDE.md for details');
  process.exit(1);
}

console.log('\n');

