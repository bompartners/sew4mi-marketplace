/**
 * Show contents of .env.local file (masking secrets)
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, 'sew4mi', 'apps', 'web', '.env.local');

console.log('\n📄 Contents of .env.local (with secrets masked):\n');
console.log('='.repeat(60));

const content = fs.readFileSync(envPath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  const lineNum = String(index + 1).padStart(2, ' ');
  
  // Mask secret values
  let display = line;
  if (line.includes('SECRET') || line.includes('KEY')) {
    const [key, value] = line.split('=');
    if (value && value.trim()) {
      display = `${key}=***masked***`;
    }
  }
  
  console.log(`${lineNum} | ${display}`);
});

console.log('='.repeat(60));
console.log('\n');

