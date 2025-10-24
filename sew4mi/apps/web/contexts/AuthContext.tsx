'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authService } from '@/services/auth.service';
import type { User, Session } from '@supabase/supabase-js';
import type { RegistrationInput } from '@sew4mi/shared/schemas/auth.schema';
import { USER_ROLES, type UserRole, parseUserRole } from '@sew4mi/shared';
import { authCache } from '@/lib/cache/authCache';

interface AuthState {
  user: User | null;
  session: Session | null;
  userRole: UserRole | null;
  loading: boolean;
  initialized: boolean;
  isLoading: boolean; // Alias for loading for consistency
}

interface AuthActions {
  signIn: (credential: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string; userRole?: UserRole }>;
  signUp: (data: RegistrationInput) => Promise<{ requiresVerification: boolean; verificationMethod?: string; user?: User | null }>;
  signOut: () => Promise<void>;
  verifyOTP: (identifier: string, otp: string, type: 'email' | 'phone') => Promise<void>;
  resendOTP: (identifier: string, type: 'email' | 'phone') => Promise<void>;
  requestPasswordReset: (identifier: string) => Promise<void>;
  resetPassword: (password: string) => Promise<void>;
}

type AuthContextType = AuthState & AuthActions;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth Provider Component
 * Provides authentication state and methods to the entire app
 * Optimized with caching to prevent unnecessary re-renders
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initRef = useRef(false);
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    userRole: null,
    loading: true,
    initialized: false,
    isLoading: true,
  });

  // Cached fetchUserRole to prevent excessive API calls and rate limiting
  const fetchUserRole = useCallback(async (user: User | null): Promise<UserRole | null> => {
    if (!user) return null;

    // Step 1: Check cache first (prevents API calls)
    const cachedRole = authCache.getUserRole(user.id);
    if (cachedRole) {
      console.log('✅ Using cached user role:', cachedRole, 'for user:', user.id);
      return cachedRole;
    }

    // Step 2: Try to get role from user metadata first (faster than DB)
    const metadataRole = user.user_metadata?.role || user.app_metadata?.role;
    if (metadataRole) {
      const parsedRole = parseUserRole(metadataRole);
      if (parsedRole) {
        authCache.setUserRole(user.id, parsedRole, {
          email: user.email || '',
          full_name: user.user_metadata?.full_name,
        });
        console.log('✅ Cached role from metadata:', parsedRole, 'for user:', user.id);
        return parsedRole;
      }
    }

    // Step 3: Fallback to database lookup (will be cached for 5 minutes)
    try {
      console.log('🔄 Fetching user role from database for:', user.id);
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient(); // Use our singleton client

      const { data: userData, error } = await supabase
        .from('users')
        .select('role, email, full_name')
        .eq('id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('ℹ️ User profile not found in database (new user), using default CUSTOMER role');
        } else {
          console.warn('⚠️ Failed to fetch user role:', {
            message: error.message,
            code: error.code,
          });
        }
        return USER_ROLES.CUSTOMER; // Default fallback
      }

      const role = userData?.role || USER_ROLES.CUSTOMER;

      authCache.setUserRole(user.id, role, {
        email: userData?.email || user.email || '',
        full_name: userData?.full_name,
      });

      console.log('✅ Cached role from database:', role, 'for user:', user.id);
      return role;
    } catch (error) {
      console.warn('⚠️ Error fetching user role:', error instanceof Error ? error.message : 'Unknown error');
      return USER_ROLES.CUSTOMER; // Default fallback
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (initRef.current) return;
    initRef.current = true;

    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const session = await authService.getSession();
        const userRole = await fetchUserRole(session?.user ?? null);

        if (isMounted) {
          setState((prev) => ({
            ...prev,
            user: session?.user ?? null,
            session,
            userRole,
            loading: false,
            isLoading: false,
            initialized: true,
          }));
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        if (isMounted) {
          setState((prev) => ({
            ...prev,
            loading: false,
            isLoading: false,
            initialized: true,
          }));
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = authService.onAuthStateChange(async (_, session) => {
      if (isMounted) {
        const userRole = await fetchUserRole(session?.user ?? null);
        setState((prev) => ({
          ...prev,
          user: session?.user ?? null,
          session: session ?? null,
          userRole,
          loading: false,
          isLoading: false,
          initialized: true,
        }));
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserRole]);

  const signIn = useCallback(async (credential: string, password: string, rememberMe: boolean = false) => {
    console.log('🔑 AuthContext.signIn - Started with credential:', credential);
    let userRole: UserRole | null = null;

    try {
      setState((prev) => ({ ...prev, loading: true }));
      console.log('🔑 AuthContext.signIn - Calling authService.signIn...');
      const result = await authService.signIn(credential, password, rememberMe);
      console.log('🔑 AuthContext.signIn - authService result:', { success: result.success, error: result.error, hasUser: !!result.user, hasSession: !!result.session });

      if (result.success) {
        console.log('✅ AuthContext.signIn - Success! Fetching user role...');
        userRole = await fetchUserRole(result.user ?? null);
        console.log('✅ AuthContext.signIn - User role:', userRole);
        setState((prev) => ({
          ...prev,
          user: result.user ?? null,
          session: result.session ?? null,
          userRole,
          loading: false,
          isLoading: false,
        }));
        console.log('✅ AuthContext.signIn - State updated successfully');
      } else {
        console.error('❌ AuthContext.signIn - Failed:', result.error);
        setState((prev) => ({
          ...prev,
          loading: false,
          isLoading: false,
        }));
      }

      return { success: result.success, error: result.error || undefined, userRole: userRole ?? undefined };
    } catch (error) {
      console.error('❌ AuthContext.signIn - Exception:', error);
      setState((prev) => ({
        ...prev,
        loading: false,
        isLoading: false,
      }));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        userRole: undefined,
      };
    }
  }, [fetchUserRole]);

  const signUp = useCallback(async (data: RegistrationInput) => {
    try {
      setState((prev) => ({ ...prev, loading: true }));
      const result = await authService.register(data);

      if (result.requiresVerification) {
        setState((prev) => ({
          ...prev,
          loading: false,
          isLoading: false,
        }));
        return {
          requiresVerification: true,
          verificationMethod: result.verificationMethod,
        };
      } else {
        const userRole = await fetchUserRole(result.user ?? null);
        setState((prev) => ({
          ...prev,
          user: result.user,
          session: result.session || null,
          userRole,
          loading: false,
          isLoading: false,
          initialized: true,
        }));
        return { 
          requiresVerification: false,
          user: result.user 
        };
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        isLoading: false,
      }));
      throw error;
    }
  }, [fetchUserRole]);

  const signOut = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true }));
      await authService.signOut();

      authCache.clearAllCache();
      console.log('🗑️ Cleared all auth cache on sign out');

      setState((prev) => ({
        ...prev,
        user: null,
        session: null,
        userRole: null,
        loading: false,
        isLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        isLoading: false,
      }));
      throw error;
    }
  }, []);

  const verifyOTP = useCallback(async (identifier: string, otp: string, type: 'email' | 'phone') => {
    try {
      setState((prev) => ({ ...prev, loading: true }));
      const result = await authService.verifyOTP({ identifier, otp, type });

      const userRole = await fetchUserRole(result.user ?? null);
      setState((prev) => ({
        ...prev,
        user: result.user,
        session: result.session,
        userRole,
        loading: false,
        isLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        isLoading: false,
      }));
      throw error;
    }
  }, [fetchUserRole]);

  const resendOTP = useCallback(async (identifier: string, type: 'email' | 'phone') => {
    try {
      await authService.resendOTP(identifier, type);
    } catch (error) {
      throw error;
    }
  }, []);

  const requestPasswordReset = useCallback(async (identifier: string) => {
    try {
      await authService.requestPasswordReset({ identifier });
    } catch (error) {
      throw error;
    }
  }, []);

  const resetPassword = useCallback(async (password: string) => {
    try {
      setState((prev) => ({ ...prev, loading: true }));
      await authService.resetPassword({ password, confirmPassword: password, token: '' });
      setState((prev) => ({
        ...prev,
        loading: false,
        isLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        isLoading: false,
      }));
      throw error;
    }
  }, []);

  const value: AuthContextType = {
    ...state,
    signIn,
    signUp,
    signOut,
    verifyOTP,
    resendOTP,
    requestPasswordReset,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 * Use this instead of the old useAuth hook for better performance
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
