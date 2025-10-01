/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: ['node_modules/', '.next/', 'coverage/', '*.config.*'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/', 
        '.next/', 
        'tests/', 
        '*.config.ts', 
        '*.config.js', 
        'coverage/',
        'types/',
        '**/*.d.ts'
      ],
      thresholds: {
        statements: 60, // Lowered per CLAUDE.md requirements
        branches: 50,
        functions: 50,
        lines: 60,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@sew4mi/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@sew4mi/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
  define: {
    // Fix Next.js globals for testing
    'process.env.NODE_ENV': '"test"',
  },
  esbuild: {
    // Automatically inject React for JSX
    jsxInject: `import React from 'react'`,
  },
  // CSS processing disabled for tests
});
