import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { RegistrationInput, LoginInput, OTPInput, ForgotPasswordInput, ResetPasswordInput } from '@sew4mi/shared/schemas';
import { ENV_CONFIG } from '@/lib/config/env';

export class AuthService {
  private _supabase: ReturnType<typeof createClientComponentClient> | null = null;
  
  private get supabase() {
    if (!this._supabase) {
      // Lazy initialization to avoid SSR issues
      this._supabase = createClientComponentClient();
    }
    return this._supabase;
  }

  constructor() {
    // Constructor kept minimal for SSR compatibility
  }

  /**
   * Register a new user with email or phone
   */
  async register(data: RegistrationInput) {
    try {
      // Test network connectivity first
      if (typeof window !== 'undefined' && !navigator.onLine) {
        throw new Error('No internet connection. Please check your network and try again.');
      }

      const { identifier, identifierType, password, role } = data;
      
      let authData: any = {
        password,
        options: {
          data: {
            role,
            full_name: '', // Will be filled during profile completion
            phone: identifierType === 'phone' ? identifier : null,
          },
        },
      };

      if (identifierType === 'email') {
        authData.email = identifier;
      } else {
        authData.phone = identifier;
      }

      const { data: authResult, error } = await this.supabase.auth.signUp(authData);

      if (error) {
        console.error('Supabase registration error:', error);
        throw new Error(this.formatError(error.message));
      }

      // If user is created and confirmed immediately, create profile
      if (authResult.user && authResult.session) {
        await this.createUserProfile(authResult.user, { 
          email: identifierType === 'email' ? identifier : null,
          phone_number: identifierType === 'phone' ? identifier : null,
          role: role as 'CUSTOMER' | 'TAILOR'
        });
      }

      // Check if confirmation is required
      if (authResult.user && !authResult.session) {
        return {
          user: authResult.user,
          requiresVerification: true,
          verificationMethod: identifierType,
        };
      }

      return {
        user: authResult.user,
        session: authResult.session,
        requiresVerification: false,
      };
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  /**
   * Verify OTP for email or phone
   */
  async verifyOTP(data: { identifier: string; otp: string; type: 'email' | 'phone' }) {
    try {
      const { identifier, otp, type } = data;
      
      let verifyData: any = {
        token: otp,
        type: type === 'email' ? 'email' : 'sms',
      };

      if (type === 'email') {
        verifyData.email = identifier;
      } else {
        verifyData.phone = identifier;
      }

      const { data: result, error } = await this.supabase.auth.verifyOtp(verifyData);

      if (error) {
        throw new Error(this.formatError(error.message));
      }

      return result;
    } catch (error) {
      console.error('OTP verification failed:', error);
      throw error;
    }
  }

  /**
   * Resend OTP for email or phone
   */
  async resendOTP(identifier: string, type: 'email' | 'phone') {
    try {
      let resendData: any = {
        type: type === 'email' ? 'signup' : 'sms',
      };

      if (type === 'email') {
        resendData.email = identifier;
      } else {
        resendData.phone = identifier;
      }

      const { error } = await this.supabase.auth.resend(resendData);

      if (error) {
        throw new Error(this.formatError(error.message));
      }

      return { success: true };
    } catch (error) {
      console.error('OTP resend failed:', error);
      throw error;
    }
  }

  /**
   * Sign in with email/phone and password
   */
  async signIn(credential: string, password: string, rememberMe: boolean = false) {
    try {
      // Validate credential parameter
      if (!credential || typeof credential !== 'string') {
        return {
          success: false,
          error: 'Please provide a valid email or phone number',
          user: null,
          session: null
        };
      }

      // Determine if credential is email or phone
      const isEmail = credential.includes('@');
      
      let signInData: any = {
        password,
      };

      if (isEmail) {
        signInData.email = credential;
      } else {
        signInData.phone = credential;
      }

      const { data: authData, error } = await this.supabase.auth.signInWithPassword(signInData);

      if (error) {
        return {
          success: false,
          error: error.message,
          user: null,
          session: null
        };
      }

      // Set session persistence based on remember me
      if (rememberMe && authData.session) {
        // Store session with longer expiration (30 days)
        await this.supabase.auth.setSession({
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
        });
      }

      return {
        success: true,
        error: null,
        user: authData.user,
        session: authData.session
      };
    } catch (error) {
      console.error('Sign in failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        user: null,
        session: null
      };
    }
  }

  /**
   * Sign out current user
   */
  async signOut() {
    try {
      const { error } = await this.supabase.auth.signOut();
      
      if (error) {
        throw new Error(this.formatError(error.message));
      }

      return { success: true };
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(data: ForgotPasswordInput) {
    try {
      const { identifier } = data;
      const isEmail = identifier.includes('@');
      
      if (!isEmail) {
        throw new Error('Password reset is only available for email addresses');
      }

      const { error } = await this.supabase.auth.resetPasswordForEmail(identifier, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw new Error(this.formatError(error.message));
      }

      return { success: true };
    } catch (error) {
      console.error('Password reset request failed:', error);
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(data: ResetPasswordInput) {
    try {
      const { password } = data;
      
      const { error } = await this.supabase.auth.updateUser({
        password,
      });

      if (error) {
        throw new Error(this.formatError(error.message));
      }

      return { success: true };
    } catch (error) {
      console.error('Password reset failed:', error);
      throw error;
    }
  }

  /**
   * Get current session
   */
  async getSession() {
    try {
      const { data, error } = await this.supabase.auth.getSession();
      
      if (error) {
        throw new Error(this.formatError(error.message));
      }

      return data.session;
    } catch (error) {
      console.error('Get session failed:', error);
      throw error;
    }
  }

  /**
   * Get current user
   */
  async getUser() {
    try {
      const { data, error } = await this.supabase.auth.getUser();
      
      if (error) {
        throw new Error(this.formatError(error.message));
      }

      return data.user;
    } catch (error) {
      console.error('Get user failed:', error);
      throw error;
    }
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return this.supabase.auth.onAuthStateChange(callback);
  }

  /**
   * Refresh current session
   */
  async refreshSession() {
    try {
      const { data, error } = await this.supabase.auth.refreshSession();
      
      if (error) {
        throw new Error(this.formatError(error.message));
      }

      return data.session;
    } catch (error) {
      console.error('Session refresh failed:', error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    try {
      const session = await this.getSession();
      return !!session;
    } catch (error) {
      return false;
    }
  }

  /**
   * Format error messages for user-friendly display
   */
  private formatError(errorMessage: string): string {
    // Map common Supabase errors to user-friendly messages
    const errorMap: Record<string, string> = {
      'Email already exists': 'An account with this email already exists. Please sign in instead.',
      'Phone number already exists': 'An account with this phone number already exists. Please sign in instead.',
      'Invalid login credentials': 'The email/phone or password you entered is incorrect. Please try again.',
      'Email not confirmed': 'Please check your email and click the verification link before signing in.',
      'Phone not confirmed': 'Please verify your phone number with the OTP code before signing in.',
      'Token has expired or is invalid': 'The verification code has expired. Please request a new one.',
      'Signup requires a valid password': 'Please enter a valid password with at least 8 characters.',
      'Unable to validate email address: invalid format': 'Please enter a valid email address.',
      'Phone number is not valid': 'Please enter a valid Ghana phone number starting with +233.',
      'Too many requests': 'Too many attempts. Please wait a moment before trying again.',
    };

    // Check for exact matches first
    if (errorMap[errorMessage]) {
      return errorMap[errorMessage];
    }

    // Check for partial matches
    for (const [key, value] of Object.entries(errorMap)) {
      if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }

    // Return original message if no mapping found
    return errorMessage;
  }

  /**
   * Create user profile in database (called after auth signup)
   */
  private async createUserProfile(authUser: any, userData: { email: string | null; phone_number: string | null; role: 'CUSTOMER' | 'TAILOR' }) {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .insert({
          id: authUser.id,
          email: userData.email,
          phone_number: userData.phone_number,
          role: userData.role,
          full_name: '',
          preferred_language: 'en',
          whatsapp_opted_in: false,
          phone_verified: false
        })

      if (error) {
        console.error('Failed to create user profile:', error);
        // Don't throw here as auth user is already created
      }

      return data;
    } catch (error) {
      console.error('createUserProfile failed:', error);
      // Don't throw here as auth user is already created
    }
  }
}

export const authService = new AuthService();