import { useEffect, useState } from 'react';
import {
  registerServiceWorker,
  getServiceWorkerStatus,
  addConnectionListeners,
  isOnline,
  type ServiceWorkerStatus,
} from '@/lib/utils/service-worker';

/**
 * Hook to manage service worker registration and online/offline status
 * @returns Service worker status and connection state
 */
export function useServiceWorker() {
  const [status, setStatus] = useState<ServiceWorkerStatus>({
    registered: false,
    active: false,
  });
  const [online, setOnline] = useState(true);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  useEffect(() => {
    // Set initial online status
    setOnline(isOnline());

    // Register service worker
    registerServiceWorker()
      .then(() => {
        // Get initial status
        return getServiceWorkerStatus();
      })
      .then((workerStatus) => {
        setStatus(workerStatus);
      })
      .catch((error) => {
        console.error('[useServiceWorker] Error:', error);
      });

    // Listen for connection changes
    const cleanup = addConnectionListeners(
      () => {
        setOnline(true);
        // Reload to fetch fresh data when back online
        if (!navigator.onLine) return;

        // Trigger background sync if available
        if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
          navigator.serviceWorker.ready.then((registration) => {
            registration.sync.register('sync-favorites');
            registration.sync.register('sync-loyalty');
          });
        }
      },
      () => {
        setOnline(false);
      }
    );

    return cleanup;
  }, []);

  return {
    ...status,
    online,
    showUpdatePrompt,
    dismissUpdatePrompt: () => setShowUpdatePrompt(false),
  };
}

/**
 * Hook to show offline indicator
 * @returns Whether to show offline indicator
 */
export function useOfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!isOnline());

    const cleanup = addConnectionListeners(
      () => setIsOffline(false),
      () => setIsOffline(true)
    );

    return cleanup;
  }, []);

  return isOffline;
}
