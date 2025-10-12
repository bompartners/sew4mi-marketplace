'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/utils/service-worker';

/**
 * Client component to register service worker on mount
 * Must be placed in a client-side component
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    // Only register in production or if explicitly enabled in development
    const shouldRegister =
      process.env.NODE_ENV === 'production' ||
      process.env.NEXT_PUBLIC_ENABLE_SW === 'true';

    if (shouldRegister) {
      registerServiceWorker().catch((error) => {
        console.error('[SW] Registration error:', error);
      });
    } else {
      console.log('[SW] Service worker registration disabled in development');
    }
  }, []);

  return null;
}
