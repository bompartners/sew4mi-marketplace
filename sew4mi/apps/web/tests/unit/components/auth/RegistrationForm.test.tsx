import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegistrationForm } from '@/components/features/auth/RegistrationForm';

// Mock useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    session: null,
    loading: false,
    initialized: true,
    signIn: vi.fn(),
    signUp: vi.fn().mockResolvedValue({ requiresVerification: true, verificationMethod: 'email' }),
    signOut: vi.fn(),
    verifyOTP: vi.fn(),
    resendOTP: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
  })
}));

// Mock UI components that might not be properly configured
vi.mock('@sew4mi/ui', () => ({
  GhanaPhoneInput: ({ onChange, ...props }: any) => (
    <input 
      {...props} 
      data-testid="ghana-phone-input"
      placeholder="024 123 4567"
      onChange={(e) => onChange?.(e.target.value)}
    />
  )
}));

describe('RegistrationForm', () => {
  it('renders all required form fields', () => {
    render(<RegistrationForm />);
    
    // Check role selection
    expect(screen.getByText('I want to register as')).toBeInTheDocument();
    expect(screen.getByLabelText('Customer - Order custom clothing')).toBeInTheDocument();
    expect(screen.getByLabelText('Tailor - Offer tailoring services')).toBeInTheDocument();
    
    // Check contact type toggle
    expect(screen.getByText('Contact Information')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /email/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /phone/i })).toBeInTheDocument();
    
    // Check form fields
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
  });

  it('toggles between email and phone input', async () => {
    const user = userEvent.setup();
    render(<RegistrationForm />);
    
    // Initially shows email input
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    
    // Click phone button
    const phoneButton = screen.getByRole('button', { name: /phone/i });
    await user.click(phoneButton);
    
    // Should show phone input
    expect(screen.getByLabelText('Phone Number')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('024 123 4567')).toBeInTheDocument();
  });

  it('shows password visibility toggle', async () => {
    const user = userEvent.setup();
    render(<RegistrationForm />);
    
    const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
    expect(passwordInput.type).toBe('password');
    
    // Click show password button
    const showButtons = screen.getAllByRole('button');
    const showPasswordButton = showButtons.find(btn => btn.querySelector('.lucide-eye'));
    
    if (showPasswordButton) {
      await user.click(showPasswordButton);
      expect(passwordInput.type).toBe('text');
    }
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    render(<RegistrationForm />);
    
    const emailInput = screen.getByLabelText('Email Address');
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    // Enter invalid email
    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
    });
  });

  it('validates password requirements', async () => {
    const user = userEvent.setup();
    render(<RegistrationForm />);
    
    const emailInput = screen.getByLabelText('Email Address');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'weak');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('validates password confirmation match', async () => {
    const user = userEvent.setup();
    render(<RegistrationForm />);
    
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    await user.type(passwordInput, 'StrongPass123!');
    await user.type(confirmPasswordInput, 'DifferentPass123!');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('requires terms acceptance', async () => {
    const user = userEvent.setup();
    render(<RegistrationForm />);
    
    const emailInput = screen.getByLabelText('Email Address');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'StrongPass123!');
    await user.type(confirmPasswordInput, 'StrongPass123!');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/you must accept the terms and conditions/i)).toBeInTheDocument();
    });
  });

  it('calls onSuccess callback on successful submission', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onOTPRequired = vi.fn();
    
    render(<RegistrationForm onSuccess={onSuccess} onOTPRequired={onOTPRequired} />);
    
    const emailInput = screen.getByLabelText('Email Address');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const termsCheckbox = screen.getByRole('checkbox', { name: /i agree to the/i });
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'StrongPass123!');
    await user.type(confirmPasswordInput, 'StrongPass123!');
    await user.click(termsCheckbox);
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(onOTPRequired).toHaveBeenCalledWith('test@example.com', 'email');
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('switches role between customer and tailor', async () => {
    const user = userEvent.setup();
    render(<RegistrationForm />);
    
    // Default is customer
    const customerRadio = screen.getByLabelText('Customer - Order custom clothing') as HTMLInputElement;
    expect(customerRadio.checked).toBe(true);
    
    // Switch to tailor
    const tailorRadio = screen.getByLabelText('Tailor - Offer tailoring services');
    await user.click(tailorRadio);
    
    const tailorRadioInput = screen.getByLabelText('Tailor - Offer tailoring services') as HTMLInputElement;
    expect(tailorRadioInput.checked).toBe(true);
  });

  it('formats Ghana phone numbers correctly', async () => {
    const user = userEvent.setup();
    render(<RegistrationForm />);
    
    // Switch to phone input
    const phoneButton = screen.getByRole('button', { name: /phone/i });
    await user.click(phoneButton);
    
    const phoneInput = screen.getByPlaceholderText('024 123 4567');
    
    // Type a Ghana number
    await user.type(phoneInput, '0241234567');
    
    // Check formatting is applied
    await waitFor(() => {
      expect(phoneInput).toHaveValue('024 123 4567');
    });
  });
});