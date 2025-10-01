/**
 * Test to prevent hydration mismatch regressions
 */
import React from 'react';
import { render } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { CacheStats } from '@/components/debug/CacheStats';

// Mock the cache hooks to avoid actual cache operations in tests
vi.mock('@/lib/cache/authCache', () => ({
  useAuthCacheStats: () => ({
    userCacheSize: 0,
    sessionCached: false,
    oldestCacheAge: 0,
  }),
}));

vi.mock('@/lib/utils/rateLimiter', () => ({
  useRateLimitStats: () => ({
    authCount: 0,
    dbCount: 0,
  }),
}));

describe('CacheStats Hydration Fix', () => {
  it('renders consistently in development mode during SSR and client hydration', () => {
    vi.stubEnv('NODE_ENV', 'development');
    
    // First render (simulates SSR)
    const { container: serverContainer } = render(<CacheStats />);
    const serverHTML = serverContainer.innerHTML;
    
    // Second render (simulates client hydration)
    const { container: clientContainer } = render(<CacheStats />);
    const clientHTML = clientContainer.innerHTML;
    
    // Both renders should produce identical DOM structure
    expect(serverHTML).toBe(clientHTML);
    
    // Should always render a div with proper classes
    expect(serverContainer.querySelector('div')).toHaveClass('fixed', 'bottom-4', 'right-4');
  });

  it('renders consistently in production mode during SSR and client hydration', () => {
    vi.stubEnv('NODE_ENV', 'production');
    
    // First render (simulates SSR)
    const { container: serverContainer } = render(<CacheStats />);
    const serverHTML = serverContainer.innerHTML;
    
    // Second render (simulates client hydration)
    const { container: clientContainer } = render(<CacheStats />);
    const clientHTML = clientContainer.innerHTML;
    
    // Both renders should produce identical DOM structure
    expect(serverHTML).toBe(clientHTML);
    
    // Should always render a div but hidden in production
    const div = serverContainer.querySelector('div');
    expect(div).toHaveClass('hidden');
    expect(div).toHaveAttribute('aria-hidden', 'true');
  });

  it('never returns null to prevent hydration mismatch', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { container } = render(<CacheStats />);
    
    // Component should always render a div, never null
    expect(container.firstChild).toBeTruthy();
    expect(container.firstChild?.nodeName).toBe('DIV');
    
    vi.stubEnv('NODE_ENV', 'production');
    const { container: prodContainer } = render(<CacheStats />);
    
    // Even in production, should render a div (just hidden)
    expect(prodContainer.firstChild).toBeTruthy();
    expect(prodContainer.firstChild?.nodeName).toBe('DIV');
  });

  it('maintains consistent DOM structure regardless of mounted state', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { container } = render(<CacheStats />);
    
    // Component should always render a div structure for consistent hydration
    const div = container.querySelector('div');
    expect(div).toBeTruthy();
    expect(div).toHaveClass('fixed', 'bottom-4', 'right-4');
    
    // The visibility is controlled by CSS classes, not conditional rendering
    const hasHiddenClass = div?.classList.contains('hidden');
    const hasBlockClass = div?.classList.contains('block');
    expect(hasHiddenClass || hasBlockClass).toBe(true);
  });
});