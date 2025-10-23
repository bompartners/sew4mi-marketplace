/**
 * Diagnostic test for Hubtel configuration
 * This reads the .env.local file and checks each variable
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, 'sew4mi', 'apps', 'web', '.env.local');

console.log('\n🔍 Hubtel Configuration Diagnostic\n');
console.log('Environment File:', envPath);
console.log('File exists:', fs.existsSync(envPath));

if (!fs.existsSync(envPath)) {
  console.log('\n❌ .env.local file not found!');
  console.log('Expected location: sew4mi/apps/web/.env.local');
  process.exit(1);
}

const content = fs.readFileSync(envPath, 'utf8');
const lines = content.split('\n');

console.log('\nFile size:', content.length, 'bytes');
console.log('Total lines:', lines.length);

console.log('\n📋 Hubtel Configuration Lines:\n');

const hubtelLines = lines.filter(line => 
  line.trim().startsWith('HUBTEL_') && !line.trim().startsWith('#')
);

if (hubtelLines.length === 0) {
  console.log('❌ No HUBTEL_ variables found in file!');
  console.log('\n💡 Make sure your .env.local contains lines like:');
  console.log('   HUBTEL_CLIENT_ID=your-value');
  console.log('   HUBTEL_CLIENT_SECRET=your-value');
  console.log('   HUBTEL_MERCHANT_ACCOUNT_ID=your-value');
  console.log('   HUBTEL_ENVIRONMENT=sandbox');
  console.log('   HUBTEL_CALLBACK_URL=http://localhost:3000/api/webhooks/hubtel');
} else {
  hubtelLines.forEach(line => {
    const [key, value] = line.split('=');
    const hasValue = value && value.trim() !== '';
    const status = hasValue ? '✅' : '❌';
    const display = hasValue ? 
      (key.includes('SECRET') ? '***hidden***' : value.trim()) : 
      'EMPTY';
    console.log(`${status} ${key.trim()} = ${display}`);
  });
}

console.log('\n');

