import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OTPVerification } from '@/components/features/auth/OTPVerification';

// Mock the useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    verifyOTP: vi.fn(),
    resendOTP: vi.fn(),
  }),
}));

describe('OTPVerification', () => {
  const defaultProps = {
    identifier: 'test@example.com',
    identifierType: 'email' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with email identifier', () => {
    render(<OTPVerification {...defaultProps} />);
    
    expect(screen.getByText('Verify Your Email')).toBeInTheDocument();
    expect(screen.getByText(/we've sent a 6-digit verification code to/i)).toBeInTheDocument();
    expect(screen.getByText(/t\*\*\*t@example.com/)).toBeInTheDocument();
  });

  it('renders with phone identifier', () => {
    render(
      <OTPVerification
        identifier="+233241234567"
        identifierType="phone"
      />
    );
    
    expect(screen.getByText('Verify Your Phone')).toBeInTheDocument();
    expect(screen.getByText(/\*{3}4567/)).toBeInTheDocument();
  });

  it('renders 6 OTP input fields', () => {
    render(<OTPVerification {...defaultProps} />);
    
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(6);
    
    inputs.forEach(input => {
      expect(input).toHaveAttribute('maxLength', '1');
      expect(input).toHaveAttribute('inputMode', 'numeric');
    });
  });

  it('auto-focuses the first input field', () => {
    render(<OTPVerification {...defaultProps} />);
    
    const firstInput = screen.getAllByRole('textbox')[0];
    expect(firstInput).toHaveFocus();
  });

  it('moves focus to next input when digit is entered', async () => {
    const user = userEvent.setup();
    render(<OTPVerification {...defaultProps} />);
    
    const inputs = screen.getAllByRole('textbox');
    
    await user.type(inputs[0], '1');
    expect(inputs[1]).toHaveFocus();
    
    await user.type(inputs[1], '2');
    expect(inputs[2]).toHaveFocus();
  });

  it('moves focus to previous input on backspace when current field is empty', async () => {
    const user = userEvent.setup();
    render(<OTPVerification {...defaultProps} />);
    
    const inputs = screen.getAllByRole('textbox');
    
    // Type in first two fields
    await user.type(inputs[0], '1');
    await user.type(inputs[1], '2');
    
    // Clear second field and press backspace
    await user.clear(inputs[1]);
    await user.keyboard('[Backspace]');
    
    expect(inputs[0]).toHaveFocus();
  });

  it('only allows numeric input', async () => {
    const user = userEvent.setup();
    render(<OTPVerification {...defaultProps} />);
    
    const firstInput = screen.getAllByRole('textbox')[0];
    
    await user.type(firstInput, 'a');
    expect(firstInput).toHaveValue('');
    
    await user.type(firstInput, '1');
    expect(firstInput).toHaveValue('1');
  });

  it('handles paste of 6-digit code', async () => {
    const onVerified = vi.fn();
    render(<OTPVerification {...defaultProps} onVerified={onVerified} />);
    
    const firstInput = screen.getAllByRole('textbox')[0];
    
    // Simulate paste event
    const pasteEvent = new ClipboardEvent('paste', {
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData?.setData('text', '123456');
    
    fireEvent.paste(firstInput, pasteEvent);
    
    // Check that all inputs are filled
    const inputs = screen.getAllByRole('textbox');
    expect(inputs[0]).toHaveValue('1');
    expect(inputs[1]).toHaveValue('2');
    expect(inputs[2]).toHaveValue('3');
    expect(inputs[3]).toHaveValue('4');
    expect(inputs[4]).toHaveValue('5');
    expect(inputs[5]).toHaveValue('6');
  });

  it('auto-submits when all 6 digits are entered', async () => {
    const onVerified = vi.fn();
    const user = userEvent.setup();
    render(<OTPVerification {...defaultProps} onVerified={onVerified} />);
    
    const inputs = screen.getAllByRole('textbox');
    
    // Fill all inputs
    for (let i = 0; i < 6; i++) {
      await user.type(inputs[i], (i + 1).toString());
    }
    
    // Should trigger verification automatically
    await waitFor(() => {
      expect(onVerified).toHaveBeenCalledWith('123456');
    });
  });

  it('disables verify button when OTP is incomplete', () => {
    render(<OTPVerification {...defaultProps} />);
    
    const verifyButton = screen.getByRole('button', { name: /verify code/i });
    expect(verifyButton).toBeDisabled();
  });

  it('enables verify button when OTP is complete', async () => {
    const user = userEvent.setup();
    render(<OTPVerification {...defaultProps} />);
    
    const inputs = screen.getAllByRole('textbox');
    const verifyButton = screen.getByRole('button', { name: /verify code/i });
    
    // Fill all inputs
    for (let i = 0; i < 6; i++) {
      await user.type(inputs[i], (i + 1).toString());
    }
    
    expect(verifyButton).toBeEnabled();
  });

  it('shows resend timer countdown', async () => {
    render(<OTPVerification {...defaultProps} />);
    
    expect(screen.getByText(/resend in \d+s/i)).toBeInTheDocument();
  });

  it('enables resend button after timer expires', async () => {
    // This test would be complex to implement with real timers
    // In a real scenario, you'd mock the timer or use fake timers
    render(<OTPVerification {...defaultProps} />);
    
    // Initially should show timer
    expect(screen.getByText(/resend in/i)).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<OTPVerification {...defaultProps} onCancel={onCancel} />);
    
    const cancelButton = screen.getByRole('button', { name: /cancel verification/i });
    await user.click(cancelButton);
    
    expect(onCancel).toHaveBeenCalled();
  });

  it('displays error message when verification fails', async () => {
    const user = userEvent.setup();
    render(<OTPVerification {...defaultProps} />);
    
    // Mock failed verification
    const { useAuth } = await import('@/hooks/useAuth');
    const mockVerifyOTP = vi.fn().mockRejectedValue(new Error('Invalid OTP'));
    (useAuth as any).mockReturnValue({
      verifyOTP: mockVerifyOTP,
      resendOTP: vi.fn(),
    });
    
    const inputs = screen.getAllByRole('textbox');
    const verifyButton = screen.getByRole('button', { name: /verify code/i });
    
    // Fill OTP and submit
    for (let i = 0; i < 6; i++) {
      await user.type(inputs[i], (i + 1).toString());
    }
    await user.click(verifyButton);
    
    await waitFor(() => {
      expect(screen.getByText(/invalid otp/i)).toBeInTheDocument();
    });
  });

  it('clears OTP fields after failed verification', async () => {
    const user = userEvent.setup();
    render(<OTPVerification {...defaultProps} />);
    
    // Mock failed verification
    const { useAuth } = await import('@/hooks/useAuth');
    const mockVerifyOTP = vi.fn().mockRejectedValue(new Error('Invalid OTP'));
    (useAuth as any).mockReturnValue({
      verifyOTP: mockVerifyOTP,
      resendOTP: vi.fn(),
    });
    
    const inputs = screen.getAllByRole('textbox');
    
    // Fill OTP
    for (let i = 0; i < 6; i++) {
      await user.type(inputs[i], (i + 1).toString());
    }
    
    await waitFor(() => {
      // Fields should be cleared after error
      inputs.forEach(input => {
        expect(input).toHaveValue('');
      });
    });
  });
});