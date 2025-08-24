# Vitest Documentation

Vitest is a blazing fast unit testing framework powered by Vite. It provides Jest-compatible APIs with excellent TypeScript support and is used in Sew4Mi for comprehensive unit testing of components, utilities, and business logic.

## Core Concepts for Sew4Mi

### Testing Framework
- **Jest-compatible API**: Familiar testing methods (`describe`, `it`, `expect`)
- **TypeScript support**: First-class TypeScript support out of the box
- **Fast execution**: Powered by Vite's lightning-fast HMR
- **ESM support**: Native ES modules support for modern JavaScript

### Test Organization
- **Test files**: Files ending in `.test.ts` or `.spec.ts`
- **Coverage reports**: Built-in code coverage with V8 or Istanbul
- **Mocking**: Comprehensive mocking capabilities with `vi` utilities
- **Browser testing**: Optional browser mode for DOM testing

## Key Integration Patterns

### Basic Unit Tests

```typescript
// src/utils/formatters.test.ts
import { describe, it, expect } from 'vitest'
import { formatCurrency, formatPhoneNumber, formatDate } from './formatters'

describe('formatCurrency', () => {
  it('formats Ghanaian Cedis correctly', () => {
    expect(formatCurrency(123.45, 'GHS')).toBe('₵123.45')
    expect(formatCurrency(1000, 'GHS')).toBe('₵1,000.00')
    expect(formatCurrency(0.99, 'GHS')).toBe('₵0.99')
  })

  it('handles edge cases', () => {
    expect(formatCurrency(0, 'GHS')).toBe('₵0.00')
    expect(formatCurrency(-50, 'GHS')).toBe('-₵50.00')
    expect(formatCurrency(null as any, 'GHS')).toBe('₵0.00')
  })
})

describe('formatPhoneNumber', () => {
  it('formats Ghana phone numbers correctly', () => {
    expect(formatPhoneNumber('0245123456')).toBe('+233245123456')
    expect(formatPhoneNumber('245123456')).toBe('+233245123456')
    expect(formatPhoneNumber('+233245123456')).toBe('+233245123456')
  })

  it('handles invalid phone numbers', () => {
    expect(formatPhoneNumber('123')).toBe('123') // Too short
    expect(formatPhoneNumber('')).toBe('')
    expect(formatPhoneNumber('abc123')).toBe('abc123') // Invalid format
  })
})

describe('formatDate', () => {
  it('formats dates for Ghana locale', () => {
    const date = new Date('2024-12-25')
    expect(formatDate(date)).toBe('25 Dec 2024')
    expect(formatDate(date, 'short')).toBe('25/12/24')
    expect(formatDate(date, 'long')).toBe('Wednesday, 25 December 2024')
  })
})
```

### Component Testing with React Testing Library

```typescript
// src/components/TailorCard.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TailorCard } from './TailorCard'

const mockTailor = {
  id: '1',
  name: 'Kwame Asante',
  businessName: 'Kwame\'s Tailoring',
  location: 'Accra, Ghana',
  specialties: ['Traditional Wear', 'Modern Designs'],
  rating: 4.8,
  reviewCount: 124,
  profileImage: '/images/kwame.jpg',
  isVerified: true,
}

describe('TailorCard', () => {
  it('renders tailor information correctly', () => {
    render(<TailorCard tailor={mockTailor} />)
    
    expect(screen.getByText('Kwame Asante')).toBeInTheDocument()
    expect(screen.getByText('Kwame\'s Tailoring')).toBeInTheDocument()
    expect(screen.getByText('Accra, Ghana')).toBeInTheDocument()
    expect(screen.getByText('4.8')).toBeInTheDocument()
    expect(screen.getByText('(124 reviews)')).toBeInTheDocument()
  })

  it('displays verification badge for verified tailors', () => {
    render(<TailorCard tailor={mockTailor} />)
    
    expect(screen.getByTestId('verified-badge')).toBeInTheDocument()
  })

  it('does not display verification badge for unverified tailors', () => {
    const unverifiedTailor = { ...mockTailor, isVerified: false }
    render(<TailorCard tailor={unverifiedTailor} />)
    
    expect(screen.queryByTestId('verified-badge')).not.toBeInTheDocument()
  })

  it('calls onContact when contact button is clicked', () => {
    const onContact = vi.fn()
    render(<TailorCard tailor={mockTailor} onContact={onContact} />)
    
    fireEvent.click(screen.getByText('Contact'))
    
    expect(onContact).toHaveBeenCalledWith(mockTailor.id)
  })

  it('displays specialties correctly', () => {
    render(<TailorCard tailor={mockTailor} />)
    
    expect(screen.getByText('Traditional Wear')).toBeInTheDocument()
    expect(screen.getByText('Modern Designs')).toBeInTheDocument()
  })
})
```

### Form Validation Testing

```typescript
// src/components/RegistrationForm.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegistrationForm } from './RegistrationForm'

const mockOnSubmit = vi.fn()

describe('RegistrationForm', () => {
  beforeEach(() => {
    mockOnSubmit.mockClear()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<RegistrationForm onSubmit={mockOnSubmit} />)
    
    // Try to submit empty form
    await user.click(screen.getByRole('button', { name: /register/i }))
    
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument()
      expect(screen.getByText('Password is required')).toBeInTheDocument()
      expect(screen.getByText('Full name is required')).toBeInTheDocument()
    })
    
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('validates email format', async () => {
    const user = userEvent.setup()
    render(<RegistrationForm onSubmit={mockOnSubmit} />)
    
    await user.type(screen.getByLabelText(/email/i), 'invalid-email')
    await user.click(screen.getByRole('button', { name: /register/i }))
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
    })
  })

  it('validates password strength', async () => {
    const user = userEvent.setup()
    render(<RegistrationForm onSubmit={mockOnSubmit} />)
    
    await user.type(screen.getByLabelText(/password/i), '123')
    await user.click(screen.getByRole('button', { name: /register/i }))
    
    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument()
    })
  })

  it('validates Ghana phone number format', async () => {
    const user = userEvent.setup()
    render(<RegistrationForm onSubmit={mockOnSubmit} />)
    
    await user.type(screen.getByLabelText(/phone/i), '123456')
    await user.click(screen.getByRole('button', { name: /register/i }))
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid Ghana phone number')).toBeInTheDocument()
    })
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    render(<RegistrationForm onSubmit={mockOnSubmit} />)
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'SecurePassword123!')
    await user.type(screen.getByLabelText(/full name/i), 'John Doe')
    await user.type(screen.getByLabelText(/phone/i), '0245123456')
    await user.selectOptions(screen.getByLabelText(/role/i), 'customer')
    
    await user.click(screen.getByRole('button', { name: /register/i }))
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'SecurePassword123!',
        fullName: 'John Doe',
        phone: '+233245123456', // Should be formatted
        role: 'customer',
      })
    })
  })
})
```

### Service Layer Testing with Mocking

```typescript
// src/services/orders.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OrdersService } from './orders.service'
import { createClient } from '@/utils/supabase/client'

// Mock Supabase client
vi.mock('@/utils/supabase/client')

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn(),
}

vi.mocked(createClient).mockReturnValue(mockSupabase as any)

describe('OrdersService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getOrderById', () => {
    it('fetches order successfully', async () => {
      const mockOrder = {
        id: '123',
        status: 'pending',
        customerId: 'customer1',
        tailorId: 'tailor1',
        totalAmount: 250.00,
      }

      mockSupabase.single.mockResolvedValue({
        data: mockOrder,
        error: null,
      })

      const result = await OrdersService.getOrderById('123')

      expect(mockSupabase.from).toHaveBeenCalledWith('orders')
      expect(mockSupabase.select).toHaveBeenCalledWith(`
        *,
        customer:profiles!customer_id(*),
        tailor:profiles!tailor_id(*),
        measurements(*)
      `)
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', '123')
      expect(result).toEqual(mockOrder)
    })

    it('throws error when order not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Order not found' },
      })

      await expect(OrdersService.getOrderById('999')).rejects.toThrow('Order not found')
    })
  })

  describe('createOrder', () => {
    it('creates order successfully', async () => {
      const orderData = {
        customerId: 'customer1',
        tailorId: 'tailor1',
        garmentType: 'Traditional Dress',
        measurements: {
          chest: 36,
          waist: 32,
          hip: 38,
        },
        deadline: '2024-12-25',
        instructions: 'Use Kente cloth',
      }

      const mockCreatedOrder = {
        id: 'new-order-123',
        ...orderData,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }

      mockSupabase.single.mockResolvedValue({
        data: mockCreatedOrder,
        error: null,
      })

      const result = await OrdersService.createOrder(orderData)

      expect(mockSupabase.from).toHaveBeenCalledWith('orders')
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        customer_id: orderData.customerId,
        tailor_id: orderData.tailorId,
        garment_type: orderData.garmentType,
        measurements: orderData.measurements,
        deadline: orderData.deadline,
        instructions: orderData.instructions,
        status: 'pending',
      })
      expect(result).toEqual(mockCreatedOrder)
    })
  })

  describe('updateOrderStatus', () => {
    it('updates order status successfully', async () => {
      const mockUpdatedOrder = {
        id: '123',
        status: 'in_progress',
        updatedAt: new Date().toISOString(),
      }

      mockSupabase.single.mockResolvedValue({
        data: mockUpdatedOrder,
        error: null,
      })

      const result = await OrdersService.updateOrderStatus('123', 'in_progress')

      expect(mockSupabase.from).toHaveBeenCalledWith('orders')
      expect(mockSupabase.update).toHaveBeenCalledWith({
        status: 'in_progress',
        updated_at: expect.any(String),
      })
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', '123')
      expect(result).toEqual(mockUpdatedOrder)
    })
  })
})
```

### Custom Hook Testing

```typescript
// src/hooks/useAuth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAuth } from './useAuth'
import { createClient } from '@/utils/supabase/client'

// Mock Supabase
vi.mock('@/utils/supabase/client')

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
}

vi.mocked(createClient).mockReturnValue(mockSupabase as any)

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with loading state', () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const { result } = renderHook(() => useAuth())

    expect(result.current.isLoading).toBe(true)
    expect(result.current.user).toBe(null)
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('sets user when authenticated', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      user_metadata: {
        full_name: 'John Doe',
        role: 'customer',
      },
    }

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
    })
  })

  it('handles login successfully', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
    }

    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.login('test@example.com', 'password123')
    })

    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
  })

  it('handles login error', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid credentials' },
    })

    const { result } = renderHook(() => useAuth())

    await expect(
      result.current.login('test@example.com', 'wrongpassword')
    ).rejects.toThrow('Invalid credentials')
  })
})
```

### API Mocking with MSW

```typescript
// src/tests/setup/msw.ts
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

export const handlers = [
  // Auth endpoints
  http.post('/api/auth/login', async ({ request }) => {
    const { email, password } = await request.json()
    
    if (email === 'test@example.com' && password === 'password123') {
      return HttpResponse.json({
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'John Doe',
          role: 'customer',
        },
        token: 'mock-jwt-token',
      })
    }
    
    return HttpResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    )
  }),

  // Tailors endpoints
  http.get('/api/tailors', () => {
    return HttpResponse.json([
      {
        id: '1',
        name: 'Kwame Asante',
        businessName: 'Kwame\'s Tailoring',
        location: 'Accra',
        specialties: ['Traditional Wear'],
        rating: 4.8,
        isVerified: true,
      },
      {
        id: '2',
        name: 'Ama Serwaa',
        businessName: 'Ama\'s Designs',
        location: 'Kumasi',
        specialties: ['Modern Designs'],
        rating: 4.6,
        isVerified: true,
      },
    ])
  }),

  // Orders endpoints
  http.post('/api/orders', async ({ request }) => {
    const orderData = await request.json()
    
    return HttpResponse.json({
      id: 'order-123',
      ...orderData,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }, { status: 201 })
  }),

  // WhatsApp API mock
  http.post('/api/whatsapp/send', async ({ request }) => {
    const { phoneNumber, message } = await request.json()
    
    return HttpResponse.json({
      success: true,
      messageId: 'wa_' + Math.random().toString(36).substr(2, 9),
      sentTo: phoneNumber,
    })
  }),

  // Hubtel payment mock
  http.post('/api/payments/hubtel', async ({ request }) => {
    const { amount, phoneNumber } = await request.json()
    
    return HttpResponse.json({
      success: true,
      reference: 'HUB_' + Math.random().toString(36).substr(2, 9),
      paymentUrl: 'https://pay.hubtel.com/mock-payment',
      amount,
      phoneNumber,
    })
  }),
]

export const server = setupServer(...handlers)
```

### Integration Testing

```typescript
// src/tests/integration/order-flow.test.ts
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '../setup/msw'
import { OrderFlow } from '@/components/OrderFlow'

// Start MSW server
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
})

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  </BrowserRouter>
)

describe('Order Flow Integration', () => {
  it('completes full order creation flow', async () => {
    const user = userEvent.setup()
    
    render(
      <TestWrapper>
        <OrderFlow tailorId="1" />
      </TestWrapper>
    )

    // Select garment type
    await user.click(screen.getByText('Traditional Dress'))
    
    // Fill measurements
    await user.type(screen.getByLabelText('Chest'), '36')
    await user.type(screen.getByLabelText('Waist'), '32')
    await user.type(screen.getByLabelText('Hip'), '38')
    
    // Set deadline
    await user.type(screen.getByLabelText('Deadline'), '2024-12-25')
    
    // Add instructions
    await user.type(
      screen.getByLabelText('Special Instructions'),
      'Please use Kente cloth with gold accents'
    )
    
    // Submit order
    await user.click(screen.getByText('Place Order'))
    
    // Verify order creation
    await waitFor(() => {
      expect(screen.getByText('Order placed successfully!')).toBeInTheDocument()
    })
    
    // Verify order details are displayed
    expect(screen.getByText('Order #order-123')).toBeInTheDocument()
    expect(screen.getByText('Status: Pending')).toBeInTheDocument()
  })
})
```

## Configuration for Sew4Mi

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup/vitest.setup.ts'],
    
    // Test file patterns
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'coverage/**',
        'dist/**',
        'packages/*/test{,s}/**',
        '**/*.d.ts',
        'cypress/**',
        'test{,s}/**',
        'test{,-*}.{js,cjs,mjs,ts,tsx,jsx}',
        '**/*{.,-}test.{js,cjs,mjs,ts,tsx,jsx}',
        '**/*{.,-}spec.{js,cjs,mjs,ts,tsx,jsx}',
        '**/__tests__/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
        '**/.{eslint,mocha,prettier}rc.{js,cjs,yml}',
      ],
      thresholds: {
        global: {
          branches: 50,
          functions: 60,
          lines: 60,
          statements: 60,
        },
        'src/utils/**/*.ts': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },

    // Test execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
    
    // Timeouts
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Mock configuration
    clearMocks: true,
    restoreMocks: true,
    unstubEnvs: true,
    
    // Retry configuration
    retry: process.env.CI ? 2 : 0,
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/services': path.resolve(__dirname, './src/services'),
    },
  },
})
```

### Test Setup File

```typescript
// src/tests/setup/vitest.setup.ts
import '@testing-library/jest-dom'
import { vi } from 'vitest'
import { server } from './msw'

// Start MSW server for all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

// Mock environment variables
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')

// Mock Next.js router
vi.mock('next/router', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
    replace: vi.fn(),
    reload: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
    beforePopState: vi.fn(),
    events: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    },
  })),
}))

// Mock Next.js navigation (App Router)
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}))

// Mock intersection observer
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock Geolocation API
global.navigator.geolocation = {
  getCurrentPosition: vi.fn().mockImplementation((success) => 
    success({
      coords: {
        latitude: 5.6037, // Accra coordinates
        longitude: -0.1870,
        accuracy: 100,
      },
    })
  ),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
}
```

### Ghana-Specific Test Utilities

```typescript
// src/tests/utils/ghana-test-utils.ts
import { vi } from 'vitest'

export const ghanaTestData = {
  phone: {
    valid: [
      '0245123456',
      '245123456', 
      '+233245123456',
      '0501234567',
      '0241234567',
    ],
    invalid: [
      '123456',
      '12345678901234',
      '+1234567890',
      'abc123456',
    ],
  },
  locations: [
    'Accra',
    'Kumasi',
    'Tamale',
    'Cape Coast',
    'Sunyani',
    'Ho',
    'Koforidua',
  ],
  currencies: {
    GHS: {
      symbol: '₵',
      format: (amount: number) => `₵${amount.toFixed(2)}`,
    },
  },
}

export const mockGeolocation = (coords?: { latitude: number; longitude: number }) => {
  const position = {
    coords: {
      latitude: coords?.latitude || 5.6037, // Accra
      longitude: coords?.longitude || -0.1870,
      accuracy: 100,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
  }

  vi.spyOn(navigator.geolocation, 'getCurrentPosition').mockImplementation(
    (success) => success(position)
  )
}

export const mockWhatsAppAPI = () => {
  return vi.fn().mockResolvedValue({
    success: true,
    messageId: 'wa_' + Math.random().toString(36).substr(2, 9),
  })
}

export const mockHubtelAPI = () => {
  return vi.fn().mockResolvedValue({
    success: true,
    reference: 'HUB_' + Math.random().toString(36).substr(2, 9),
    paymentUrl: 'https://pay.hubtel.com/test',
  })
}

export const createMockTailor = (overrides = {}) => ({
  id: '1',
  name: 'Kwame Asante',
  businessName: 'Kwame\'s Tailoring',
  location: 'Accra',
  specialties: ['Traditional Wear', 'Modern Designs'],
  rating: 4.8,
  reviewCount: 124,
  isVerified: true,
  whatsappNumber: '+233245123456',
  ...overrides,
})

export const createMockOrder = (overrides = {}) => ({
  id: 'order-123',
  customerId: 'customer-1',
  tailorId: 'tailor-1',
  status: 'pending',
  garmentType: 'Traditional Dress',
  measurements: {
    chest: 36,
    waist: 32,
    hip: 38,
    length: 45,
  },
  deadline: '2024-12-25',
  totalAmount: 250.00,
  currency: 'GHS',
  createdAt: new Date().toISOString(),
  ...overrides,
})
```

## Testing Commands

### Development Commands

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test auth.service.test.ts

# Run tests in specific directory
pnpm test tests/unit/

# Run tests with UI (browser mode)
pnpm test --ui

# Debug tests
pnpm test --reporter=verbose
```

### CI/CD Commands

```bash
# Run tests with coverage in CI
pnpm test:coverage --reporter=junit --outputFile=test-results.xml

# Run tests with performance monitoring
pnpm test --reporter=verbose --logHeapUsage

# Check coverage thresholds
pnpm test:coverage --coverage.thresholds.global.branches=80
```

## Performance and Optimization

### Test Performance Configuration

```typescript
// vitest.config.ts performance optimizations
export default defineConfig({
  test: {
    // Use threads for better performance
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 4,
      },
    },
    
    // Optimize test discovery
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.d.ts',
    ],
    
    // Faster test execution
    isolate: false, // Disable test isolation for faster execution
    
    // Optimize coverage
    coverage: {
      provider: 'v8', // Faster than istanbul
      skipFull: true, // Skip files with 100% coverage
    },
  },
})
```

### Test Isolation and Cleanup

```typescript
// Ensure proper test isolation
describe('Component Tests', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
    
    // Reset DOM
    document.body.innerHTML = ''
    
    // Reset any global state
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    // Cleanup after each test
    cleanup() // React Testing Library cleanup
  })
})
```

## Best Practices for Sew4Mi

1. **Test Structure**: Use descriptive test names and organize with `describe` blocks
2. **Mocking**: Mock external dependencies (APIs, Supabase, etc.) for unit tests
3. **Coverage**: Maintain high coverage for utils and services, moderate for components
4. **Performance**: Use thread pool and optimize test discovery patterns
5. **Ghana Context**: Test phone number formatting, currency display, and location features
6. **Integration**: Use MSW for API mocking in integration tests
7. **Async Testing**: Use proper async/await patterns with `waitFor` for UI updates
8. **Custom Hooks**: Test hooks in isolation with `renderHook`

This configuration provides comprehensive unit testing coverage for Sew4Mi, ensuring reliability across all components and business logic while maintaining fast test execution.