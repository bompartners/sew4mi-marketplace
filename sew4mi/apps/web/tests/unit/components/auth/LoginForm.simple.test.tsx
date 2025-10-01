import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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

// Mock UI components 
vi.mock('@sew4mi/ui', () => ({
  GhanaPhoneInput: ({ value, onChange, placeholder }: any) => (
    <input
      data-testid="ghana-phone-input"
      value={value || ''}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
    />
  ),
}))

// Mock all UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>
}))

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: (props: any) => <input type="checkbox" {...props} />
}))

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: any) => <div>{children}</div>,
  AlertDescription: ({ children }: any) => <div>{children}</div>
}))

vi.mock('@/components/ui/radio-group', () => ({
  RadioGroup: ({ children, onValueChange }: any) => (
    <div>
      {React.Children.map(children, (child) => 
        React.cloneElement(child, { onValueChange })
      )}
    </div>
  ),
  RadioGroupItem: ({ value, onValueChange }: any) => (
    <input
      type="radio"
      value={value}
      onChange={() => onValueChange?.(value)}
    />
  )
}))

const mockPush = vi.fn()
const mockSignIn = vi.fn()

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    ;(useRouter as any).mockReturnValue({
      push: mockPush,
    })
    
    ;(useAuth as any).mockReturnValue({
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
    })
  })

  it('renders login form with basic elements', () => {
    render(<LoginForm />)
    
    expect(screen.getByText(/how would you like to sign in/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/enter your email address/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument()
    expect(screen.getByText(/remember me for 30 days/i)).toBeInTheDocument()
  })
})