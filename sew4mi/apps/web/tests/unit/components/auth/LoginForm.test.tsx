import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { LoginForm } from '@/components/features/auth/LoginForm'
import { useAuth } from '@/hooks/useAuth'

// Mock the hooks
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

// Mock the GhanaPhoneInput component and cn utility
vi.mock('@sew4mi/ui', () => ({
  GhanaPhoneInput: ({ value, onChange, placeholder, disabled, error }: any) => (
    <div>
      <input
        data-testid="ghana-phone-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
      {error && <span data-testid="phone-error">{error}</span>}
    </div>
  ),
  cn: (...args: any[]) => args.join(' '),
}))

const mockPush = vi.fn()
const mockSignIn = vi.fn()

const defaultAuthReturn = {
  user: null,
  session: null,
  loading: false,
  initialized: true,
  signIn: mockSignIn,
  signUp: vi.fn(),
  signOut: vi.fn(),
  verifyOTP: vi.fn(),
  resendOTP: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
}

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    ;(useRouter as any).mockReturnValue({
      push: mockPush,
    })
    
    ;(useAuth as any).mockReturnValue(defaultAuthReturn)
  })

  it('renders login form with email option selected by default', () => {
    render(<LoginForm />)
    
    expect(screen.getByLabelText(/how would you like to sign in/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('switches between email and phone input types', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)
    
    // Initially shows email input
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.queryByTestId('ghana-phone-input')).not.toBeInTheDocument()
    
    // Switch to phone
    await user.click(screen.getByLabelText(/phone number/i))
    
    expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument()
    expect(screen.getByTestId('ghana-phone-input')).toBeInTheDocument()
  })

  it('validates email input correctly', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)
    
    const emailInput = screen.getByLabelText(/email address/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    await user.type(emailInput, 'invalid-email')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
    })
  })

  it('validates phone input correctly', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)
    
    // Switch to phone input
    await user.click(screen.getByLabelText(/phone number/i))
    
    const phoneInput = screen.getByTestId('ghana-phone-input')
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    await user.type(phoneInput, '1234567890')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid ghana phone number/i)).toBeInTheDocument()
    })
  })

  it('validates password requirement', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)
    
    const emailInput = screen.getByLabelText(/email address/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument()
    })
  })

  it('toggles password visibility', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)
    
    const passwordInput = screen.getByLabelText(/password/i)
    const toggleButton = screen.getByRole('button', { name: '' }) // Eye icon button
    
    expect(passwordInput).toHaveAttribute('type', 'password')
    
    await user.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'text')
    
    await user.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('handles successful login with email', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValue({ success: true })
    
    render(<LoginForm />)
    
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123', false)
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('handles successful login with phone', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValue({ success: true })
    
    render(<LoginForm />)
    
    // Switch to phone input
    await user.click(screen.getByLabelText(/phone number/i))
    
    const phoneInput = screen.getByTestId('ghana-phone-input')
    await user.type(phoneInput, '+233201234567')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('+233201234567', 'password123', false)
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('handles login with remember me option', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValue({ success: true })
    
    render(<LoginForm />)
    
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByLabelText(/remember me/i))
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123', true)
    })
  })

  it('displays error message on login failure', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValue({ 
      success: false, 
      error: 'Invalid credentials' 
    })
    
    render(<LoginForm />)
    
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })

  it('shows loading state during login', async () => {
    const user = userEvent.setup()
    let resolveSignIn: (value: any) => void
    mockSignIn.mockReturnValue(
      new Promise((resolve) => {
        resolveSignIn = resolve
      })
    )
    
    render(<LoginForm />)
    
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    expect(screen.getByText(/signing in/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()
    
    // Resolve the promise
    resolveSignIn!({ success: true })
    
    await waitFor(() => {
      expect(screen.queryByText(/signing in/i)).not.toBeInTheDocument()
    })
  })

  it('includes forgot password and register links', () => {
    render(<LoginForm />)
    
    expect(screen.getByRole('link', { name: /forgot your password/i })).toHaveAttribute('href', '/forgot-password')
    expect(screen.getByRole('link', { name: /sign up/i })).toHaveAttribute('href', '/register')
  })

  it('clears error when switching between login types', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValue({ 
      success: false, 
      error: 'Invalid credentials' 
    })
    
    render(<LoginForm />)
    
    // Cause an error
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
    
    // Switch to phone - should clear error
    await user.click(screen.getByLabelText(/phone number/i))
    
    expect(screen.queryByText(/invalid credentials/i)).not.toBeInTheDocument()
  })
})