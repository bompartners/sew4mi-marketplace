/**
 * Service Worker Registration Utility
 * Handles registration and lifecycle management of the service worker
 */

export interface ServiceWorkerStatus {
  registered: boolean;
  active: boolean;
  cacheStatus?: Record<string, number>;
}

/**
 * Register the service worker if supported
 * @returns Promise<ServiceWorkerRegistration | null>
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('[SW] Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[SW] Service Worker registered successfully');

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker available
          console.log('[SW] New version available');

          // Optionally notify user about update
          if (window.confirm('A new version of Sew4Mi is available. Reload to update?')) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          }
        }
      });
    });

    // Handle controller change
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW] Controller changed, reloading page');
      window.location.reload();
    });

    return registration;
  } catch (error) {
    console.error('[SW] Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Unregister the service worker
 * @returns Promise<boolean>
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const unregistered = await registration.unregister();
    console.log('[SW] Service Worker unregistered:', unregistered);
    return unregistered;
  } catch (error) {
    console.error('[SW] Failed to unregister Service Worker:', error);
    return false;
  }
}

/**
 * Clear all service worker caches
 * @returns Promise<void>
 */
export async function clearServiceWorkerCache(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if (registration.active) {
      registration.active.postMessage({ type: 'CLEAR_CACHE' });
      console.log('[SW] Cache clear requested');
    }
  } catch (error) {
    console.error('[SW] Failed to clear cache:', error);
  }
}

/**
 * Get service worker cache status
 * @returns Promise<Record<string, number>>
 */
export async function getServiceWorkerCacheStatus(): Promise<Record<string, number>> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return {};
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.active) {
      return {};
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      registration.active.postMessage(
        { type: 'GET_CACHE_STATUS' },
        [messageChannel.port2]
      );

      // Timeout after 3 seconds
      setTimeout(() => resolve({}), 3000);
    });
  } catch (error) {
    console.error('[SW] Failed to get cache status:', error);
    return {};
  }
}

/**
 * Check if service worker is registered and active
 * @returns Promise<ServiceWorkerStatus>
 */
export async function getServiceWorkerStatus(): Promise<ServiceWorkerStatus> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return { registered: false, active: false };
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();

    if (!registration) {
      return { registered: false, active: false };
    }

    const cacheStatus = await getServiceWorkerCacheStatus();

    return {
      registered: true,
      active: !!registration.active,
      cacheStatus,
    };
  } catch (error) {
    console.error('[SW] Failed to get status:', error);
    return { registered: false, active: false };
  }
}

/**
 * Request background sync for favorites
 * @returns Promise<void>
 */
export async function syncFavorites(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    if ('sync' in registration) {
      await registration.sync.register('sync-favorites');
      console.log('[SW] Background sync registered for favorites');
    }
  } catch (error) {
    console.error('[SW] Failed to register background sync:', error);
  }
}

/**
 * Request background sync for loyalty data
 * @returns Promise<void>
 */
export async function syncLoyalty(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    if ('sync' in registration) {
      await registration.sync.register('sync-loyalty');
      console.log('[SW] Background sync registered for loyalty');
    }
  } catch (error) {
    console.error('[SW] Failed to register background sync:', error);
  }
}

/**
 * Check if user is currently online
 * @returns boolean
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Add online/offline event listeners
 * @param onOnline - Callback when connection is restored
 * @param onOffline - Callback when connection is lost
 * @returns Cleanup function
 */
export function addConnectionListeners(
  onOnline?: () => void,
  onOffline?: () => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleOnline = () => {
    console.log('[SW] Connection restored');
    onOnline?.();
  };

  const handleOffline = () => {
    console.log('[SW] Connection lost');
    onOffline?.();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
