'use client';

import React from 'react';
import type { NetworkStatus } from './networkService';

/**
 * Client-only network status hook that's safe for SSR
 */
export function useNetworkStatus(): NetworkStatus {
  // Always start with same default values for SSR consistency
  const [status, setStatus] = React.useState<NetworkStatus>({
    isOnline: true,
    isSlowConnection: false,
    effectiveType: '4g',
    rtt: 0
  });

  React.useEffect(() => {
    // Only import and use network service on client side
    import('./networkService').then(({ networkService }) => {
      // Set initial status after component mounts
      setStatus(networkService.getStatus());
      
      // Subscribe to changes
      const unsubscribe = networkService.subscribe(setStatus);
      return unsubscribe;
    });
  }, []);

  return status;
}