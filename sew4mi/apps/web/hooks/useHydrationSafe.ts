'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to safely handle hydration differences between server and client rendering
 * 
 * This hook ensures that components render consistently on both server and client
 * during the initial hydration phase, preventing hydration mismatches.
 * 
 * @returns {boolean} isMounted - true after client-side hydration is complete
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isMounted = useHydrationSafe();
 *   
 *   if (!isMounted) {
 *     return <div suppressHydrationWarning>Loading...</div>;
 *   }
 *   
 *   // Client-side only content that may differ from server
 *   return <div>{localStorage.getItem('data') || 'No data'}</div>;
 * }
 * ```
 */
export function useHydrationSafe(): boolean {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // This effect only runs on the client after hydration
    setIsMounted(true);
  }, []);

  return isMounted;
}

/**
 * Hook for safely accessing browser APIs that are not available during SSR
 * 
 * @param callback - Function that accesses browser APIs
 * @param fallback - Fallback value to return during SSR
 * @returns The result of the callback or fallback value
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const userAgent = useBrowserSafe(
 *     () => navigator.userAgent,
 *     'unknown'
 *   );
 *   
 *   return <div>User Agent: {userAgent}</div>;
 * }
 * ```
 */
export function useBrowserSafe<T>(callback: () => T, fallback: T): T {
  const isMounted = useHydrationSafe();
  
  if (!isMounted || typeof window === 'undefined') {
    return fallback;
  }
  
  try {
    return callback();
  } catch {
    return fallback;
  }
}

/**
 * Hook for safely accessing localStorage with SSR compatibility
 * 
 * @param key - localStorage key
 * @param defaultValue - Default value if key doesn't exist
 * @returns [value, setValue] tuple similar to useState
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const [theme, setTheme] = useLocalStorage('theme', 'light');
 *   
 *   return (
 *     <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
 *       Current theme: {theme}
 *     </button>
 *   );
 * }
 * ```
 */
export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(defaultValue);
  const isMounted = useHydrationSafe();

  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          setStoredValue(JSON.parse(item));
        }
      } catch (error) {
        console.warn(`Error reading localStorage key "${key}":`, error);
      }
    }
  }, [key, isMounted]);

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}