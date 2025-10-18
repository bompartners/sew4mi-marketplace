// Load test environment variables first
import { config } from 'dotenv';
import path from 'path';

// Load .env.test file
config({ path: path.resolve(__dirname, '../.env.test') });

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/test-path',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Next.js headers and cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    get: vi.fn((name: string) => undefined),
    set: vi.fn(),
    delete: vi.fn(),
    has: vi.fn(() => false),
  })),
  headers: vi.fn(() => ({
    get: vi.fn((name: string) => null),
    has: vi.fn(() => false),
    forEach: vi.fn(),
    entries: vi.fn(() => []),
  })),
}));

// Mock Supabase server client creation
vi.mock('@/lib/supabase/server', () => {
  const { createMockSupabaseClient } = require('./mocks/supabase');
  
  return {
    createClient: vi.fn(() => Promise.resolve(createMockSupabaseClient())),
    createServiceRoleClient: vi.fn(() => createMockSupabaseClient()),
  };
});

// Mock Next.js dynamic imports
vi.mock('next/dynamic', () => {
  return {
    __esModule: true,
    default: (fn: () => Promise<any>) => {
      const Component = fn();
      return Component.default || Component;
    },
  };
});

// Mock fetch globally
global.fetch = vi.fn();

// Mock window.matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Setup for each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});
