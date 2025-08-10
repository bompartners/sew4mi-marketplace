#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Set environment variables to prevent tracing issues on Windows
process.env.NEXT_TELEMETRY_DISABLED = '1';

// Change to web app directory
const webDir = path.join(__dirname, '..', 'apps', 'web');
process.chdir(webDir);

console.log('Starting Sew4Mi development server...');
console.log('Working directory:', process.cwd());

// Clean up any existing .next directory issues
const nextDir = path.join(process.cwd(), '.next');
if (fs.existsSync(nextDir)) {
  try {
    // Try to set permissions on the entire .next directory
    const { execSync } = require('child_process');
    execSync(`attrib -r "${nextDir}\\*" /s`, { stdio: 'ignore' });
  } catch (error) {
    // Ignore permission errors during cleanup
  }
}

// Start Next.js development server
const child = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }
});

child.on('error', (error) => {
  console.error('Failed to start development server:', error);
  process.exit(1);
});

child.on('close', (code) => {
  console.log(`Development server exited with code ${code}`);
  process.exit(code);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down development server...');
  child.kill();
});

process.on('SIGTERM', () => {
  child.kill();
});