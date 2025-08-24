import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '@/services/auth.service';
import type { RegistrationInput } from '@sew4mi/shared/schemas/auth.schema';

// Mock Supabase
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: () => ({
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      verifyOtp: vi.fn(),
      resend: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      getSession: vi.fn(),
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  }),
}));

describe('AuthService', () => {
  let authService: AuthService;
  let mockSupabase: any;

  beforeEach(() => {
    authService = new AuthService();
    mockSupabase = (authService as any).supabase;
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should register user with email', async () => {
      const registrationData: RegistrationInput = {
        identifier: 'test@example.com',
        identifierType: 'email',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'CUSTOMER',
        acceptTerms: true,
      };

      const mockUser = { id: '123', email: 'test@example.com' };
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      const result = await authService.register(registrationData);

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!',
        options: {
          data: {
            role: 'CUSTOMER',
            full_name: '',
            phone: null,
          },
        },
      });

      expect(result).toEqual({
        user: mockUser,
        requiresVerification: true,
        verificationMethod: 'email',
      });
    });

    it('should register user with phone', async () => {
      const registrationData: RegistrationInput = {
        identifier: '+233241234567',
        identifierType: 'phone',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'TAILOR',
        acceptTerms: true,
      };

      const mockUser = { id: '123', phone: '+233241234567' };
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      const result = await authService.register(registrationData);

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        phone: '+233241234567',
        password: 'Password123!',
        options: {
          data: {
            role: 'TAILOR',
            full_name: '',
            phone: '+233241234567',
          },
        },
      });

      expect(result).toEqual({
        user: mockUser,
        requiresVerification: true,
        verificationMethod: 'phone',
      });
    });

    it('should throw error on registration failure', async () => {
      const registrationData: RegistrationInput = {
        identifier: 'test@example.com',
        identifierType: 'email',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'CUSTOMER',
        acceptTerms: true,
      };

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email already exists' },
      });

      await expect(authService.register(registrationData)).rejects.toThrow('An account with this email already exists. Please sign in instead.');
    });
  });

  describe('verifyOTP', () => {
    it('should verify email OTP', async () => {
      const mockResult = { user: { id: '123' }, session: { access_token: 'token' } };
      mockSupabase.auth.verifyOtp.mockResolvedValue({
        data: mockResult,
        error: null,
      });

      const result = await authService.verifyOTP({
        identifier: 'test@example.com',
        otp: '123456',
        type: 'email',
      });

      expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        token: '123456',
        type: 'email',
      });

      expect(result).toEqual(mockResult);
    });

    it('should verify phone OTP', async () => {
      const mockResult = { user: { id: '123' }, session: { access_token: 'token' } };
      mockSupabase.auth.verifyOtp.mockResolvedValue({
        data: mockResult,
        error: null,
      });

      const result = await authService.verifyOTP({
        identifier: '+233241234567',
        otp: '123456',
        type: 'phone',
      });

      expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledWith({
        phone: '+233241234567',
        token: '123456',
        type: 'sms',
      });

      expect(result).toEqual(mockResult);
    });

    it('should throw error on invalid OTP', async () => {
      mockSupabase.auth.verifyOtp.mockResolvedValue({
        data: null,
        error: { message: 'Invalid OTP' },
      });

      await expect(
        authService.verifyOTP({
          identifier: 'test@example.com',
          otp: '000000',
          type: 'email',
        })
      ).rejects.toThrow('Invalid OTP');
    });
  });

  describe('resendOTP', () => {
    it('should resend email OTP', async () => {
      mockSupabase.auth.resend.mockResolvedValue({
        error: null,
      });

      const result = await authService.resendOTP('test@example.com', 'email');

      expect(mockSupabase.auth.resend).toHaveBeenCalledWith({
        email: 'test@example.com',
        type: 'signup',
      });

      expect(result).toEqual({ success: true });
    });

    it('should resend phone OTP', async () => {
      mockSupabase.auth.resend.mockResolvedValue({
        error: null,
      });

      const result = await authService.resendOTP('+233241234567', 'phone');

      expect(mockSupabase.auth.resend).toHaveBeenCalledWith({
        phone: '+233241234567',
        type: 'sms',
      });

      expect(result).toEqual({ success: true });
    });
  });

  describe('signIn', () => {
    it('should sign in with email', async () => {
      const mockResult = { user: { id: '123' }, session: { access_token: 'token' } };
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: mockResult,
        error: null,
      });

      const result = await authService.signIn(
        'test@example.com',
        'Password123!'
      );

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!',
      });

      expect(result).toEqual(mockResult);
    });

    it('should sign in with phone', async () => {
      const mockResult = { user: { id: '123' }, session: { access_token: 'token' } };
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: mockResult,
        error: null,
      });

      const result = await authService.signIn(
        '+233241234567',
        'Password123!'
      );

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        phone: '+233241234567',
        password: 'Password123!',
      });

      expect(result).toEqual(mockResult);
    });
  });
});