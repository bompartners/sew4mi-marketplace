'use client';

import { useState, useEffect, useCallback } from 'react';
import { authService } from '@/services/auth.service';
import type { User, Session } from '@supabase/supabase-js';
import type { RegistrationInput } from '@sew4mi/shared/schemas/auth.schema';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
}

interface AuthActions {
  signIn: (credential: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  signUp: (data: RegistrationInput) => Promise<{ requiresVerification: boolean; verificationMethod?: string }>;
  signOut: () => Promise<void>;
  verifyOTP: (identifier: string, otp: string, type: 'email' | 'phone') => Promise<void>;
  resendOTP: (identifier: string, type: 'email' | 'phone') => Promise<void>;
  requestPasswordReset: (identifier: string) => Promise<void>;
  resetPassword: (password: string) => Promise<void>;
}

export function useAuth(): AuthState & AuthActions {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    initialized: false,
  });

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const session = await authService.getSession();
        if (isMounted) {
          setState(prev => ({
            ...prev,
            user: session?.user ?? null,
            session,
            loading: false,
            initialized: true,
          }));
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        if (isMounted) {
          setState(prev => ({
            ...prev,
            loading: false,
            initialized: true,
          }));
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange((_, session) => {
      if (isMounted) {
        setState(prev => ({
          ...prev,
          user: session?.user ?? null,
          session: session ?? null,
          loading: false,
          initialized: true,
        }));
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (credential: string, password: string, rememberMe: boolean = false) => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const result = await authService.signIn(credential, password, rememberMe);
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          user: result.user ?? null,
          session: result.session ?? null,
          loading: false,
        }));
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
      
      return { success: result.success, error: result.error };
    } catch (error) {
      setState(prev => ({ ...prev, loading: false }));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    }
  }, []);

  const signUp = useCallback(async (data: RegistrationInput) => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const result = await authService.register(data);
      
      if (result.requiresVerification) {
        setState(prev => ({ ...prev, loading: false }));
        return {
          requiresVerification: true,
          verificationMethod: result.verificationMethod,
        };
      } else {
        setState(prev => ({
          ...prev,
          user: result.user,
          session: result.session,
          loading: false,
        }));
        return { requiresVerification: false };
      }
    } catch (error) {
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      await authService.signOut();
      
      setState(prev => ({
        ...prev,
        user: null,
        session: null,
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, []);

  const verifyOTP = useCallback(async (identifier: string, otp: string, type: 'email' | 'phone') => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const result = await authService.verifyOTP({ identifier, otp, type });
      
      setState(prev => ({
        ...prev,
        user: result.user,
        session: result.session,
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, []);

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
      setState(prev => ({ ...prev, loading: true }));
      await authService.resetPassword({ password, confirmPassword: password, token: '' });
      setState(prev => ({ ...prev, loading: false }));
    } catch (error) {
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, []);

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    verifyOTP,
    resendOTP,
    requestPasswordReset,
    resetPassword,
  };
}