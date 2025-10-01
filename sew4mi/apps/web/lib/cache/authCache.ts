/**
 * Authentication cache to reduce Supabase API calls and prevent rate limiting
 * 
 * This cache stores user data, roles, and session information in memory and localStorage
 * to minimize database queries and auth API calls.
 */

import type { Session } from '@supabase/supabase-js';
import type { UserRole } from '@sew4mi/shared';

interface CachedUserData {
  role: UserRole;
  email: string;
  full_name?: string;
  phone_number?: string;
  lastUpdated: number;
}

interface CachedSession {
  session: Session | null;
  lastUpdated: number;
}

class AuthCache {
  private userRoleCache = new Map<string, CachedUserData>();
  private sessionCache: CachedSession | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly STORAGE_KEY_PREFIX = 'sew4mi_auth_';
  private readonly SESSION_STORAGE_KEY = 'sew4mi_session_cache';
  private readonly USER_STORAGE_KEY = 'sew4mi_user_cache';

  /**
   * Get cached user role with automatic expiration
   */
  getUserRole(userId: string): UserRole | null {
    // Check memory cache first
    const cached = this.userRoleCache.get(userId);
    if (cached && this.isCacheValid(cached.lastUpdated)) {
      return cached.role;
    }

    // Check localStorage cache
    try {
      const stored = localStorage.getItem(`${this.STORAGE_KEY_PREFIX}${userId}`);
      if (stored) {
        const parsedData: CachedUserData = JSON.parse(stored);
        if (this.isCacheValid(parsedData.lastUpdated)) {
          // Restore to memory cache
          this.userRoleCache.set(userId, parsedData);
          return parsedData.role;
        } else {
          // Remove expired cache
          localStorage.removeItem(`${this.STORAGE_KEY_PREFIX}${userId}`);
        }
      }
    } catch (error) {
      console.warn('Failed to read user cache from localStorage:', error);
    }

    return null;
  }

  /**
   * Cache user role and data
   */
  setUserRole(userId: string, role: UserRole, userData?: Partial<CachedUserData>): void {
    const cachedData: CachedUserData = {
      role,
      email: userData?.email || '',
      full_name: userData?.full_name,
      phone_number: userData?.phone_number,
      lastUpdated: Date.now(),
    };

    // Store in memory cache
    this.userRoleCache.set(userId, cachedData);

    // Store in localStorage for persistence across page reloads
    try {
      localStorage.setItem(`${this.STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(cachedData));
    } catch (error) {
      console.warn('Failed to save user cache to localStorage:', error);
    }
  }

  /**
   * Get cached session
   */
  getSession(): Session | null {
    if (this.sessionCache && this.isCacheValid(this.sessionCache.lastUpdated)) {
      return this.sessionCache.session;
    }

    // Check localStorage for session cache
    try {
      const stored = localStorage.getItem(this.SESSION_STORAGE_KEY);
      if (stored) {
        const parsedSession: CachedSession = JSON.parse(stored);
        if (this.isCacheValid(parsedSession.lastUpdated)) {
          this.sessionCache = parsedSession;
          return parsedSession.session;
        } else {
          localStorage.removeItem(this.SESSION_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.warn('Failed to read session cache from localStorage:', error);
    }

    return null;
  }

  /**
   * Cache session data
   */
  setSession(session: Session | null): void {
    this.sessionCache = {
      session,
      lastUpdated: Date.now(),
    };

    // Store in localStorage for persistence
    try {
      localStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(this.sessionCache));
    } catch (error) {
      console.warn('Failed to save session cache to localStorage:', error);
    }
  }

  /**
   * Clear all cached data for a user
   */
  clearUserCache(userId: string): void {
    this.userRoleCache.delete(userId);
    try {
      localStorage.removeItem(`${this.STORAGE_KEY_PREFIX}${userId}`);
    } catch (error) {
      console.warn('Failed to clear user cache from localStorage:', error);
    }
  }

  /**
   * Clear all cached data
   */
  clearAllCache(): void {
    this.userRoleCache.clear();
    this.sessionCache = null;
    
    try {
      // Clear all auth-related items from localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(this.STORAGE_KEY_PREFIX) || 
            key === this.SESSION_STORAGE_KEY || 
            key === this.USER_STORAGE_KEY) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear cache from localStorage:', error);
    }
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(lastUpdated: number): boolean {
    return Date.now() - lastUpdated < this.CACHE_DURATION;
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): {
    userCacheSize: number;
    sessionCached: boolean;
    oldestCacheAge: number;
  } {
    let oldestAge = 0;
    const now = Date.now();
    
    this.userRoleCache.forEach(userData => {
      const age = now - userData.lastUpdated;
      if (age > oldestAge) {
        oldestAge = age;
      }
    });

    return {
      userCacheSize: this.userRoleCache.size,
      sessionCached: this.sessionCache !== null,
      oldestCacheAge: oldestAge,
    };
  }

  /**
   * Preload user data to prevent future API calls
   */
  preloadUserData(users: Array<{ id: string; role: UserRole; email: string; full_name?: string }>): void {
    users.forEach(user => {
      if (!this.userRoleCache.has(user.id)) {
        this.setUserRole(user.id, user.role, {
          email: user.email,
          full_name: user.full_name,
        });
      }
    });
  }
}

// Export singleton instance
export const authCache = new AuthCache();

/**
 * Hook to get cache statistics (useful for debugging rate limits)
 */
export function useAuthCacheStats() {
  return authCache.getCacheStats();
}

export default authCache;