# React Query (TanStack Query) Documentation

TanStack Query (formerly React Query) is a powerful data fetching library for React applications that provides caching, synchronization, and server state management. It's used in Sew4Mi for efficient data fetching and real-time updates.

## Core Concepts for Sew4Mi

### Data Fetching
- **useQuery**: Fetch and cache data with automatic refetching
- **useMutation**: Handle create, update, delete operations  
- **Query invalidation**: Keep data fresh after mutations
- **Optimistic updates**: Immediate UI feedback for better UX

### Caching Strategy
- **Automatic caching**: Queries are cached by key for instant subsequent loads
- **Background refetching**: Data stays fresh without blocking UI
- **Stale-while-revalidate**: Show cached data while fetching updates

## Key Integration Patterns

### Basic Data Fetching

```typescript
import { useQuery } from '@tanstack/react-query'

interface Tailor {
  id: string
  name: string
  location: string
  specialties: string[]
  rating: number
}

function TailorsList() {
  const { data: tailors, isLoading, error } = useQuery({
    queryKey: ['tailors'],
    queryFn: async (): Promise<Tailor[]> => {
      const response = await fetch('/api/tailors')
      if (!response.ok) {
        throw new Error('Failed to fetch tailors')
      }
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })

  if (isLoading) return <div>Loading tailors...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tailors?.map((tailor) => (
        <TailorCard key={tailor.id} tailor={tailor} />
      ))}
    </div>
  )
}
```

### Mutations with Cache Updates

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'

interface CreateOrderData {
  tailorId: string
  garmentType: string
  measurements: Record<string, number>
  deadline: string
}

function useCreateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orderData: CreateOrderData) => {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      })
      
      if (!response.ok) {
        throw new Error('Failed to create order')
      }
      
      return response.json()
    },
    onSuccess: (newOrder) => {
      // Update the orders cache
      queryClient.setQueryData(['orders'], (oldOrders: any[]) => 
        oldOrders ? [...oldOrders, newOrder] : [newOrder]
      )
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['tailors', newOrder.tailorId] })
    },
    onError: (error) => {
      console.error('Order creation failed:', error)
      // Could trigger toast notification here
    },
  })
}

// Usage in component
function OrderForm() {
  const createOrder = useCreateOrder()

  const handleSubmit = (orderData: CreateOrderData) => {
    createOrder.mutate(orderData, {
      onSuccess: () => {
        // Navigate to order confirmation
        router.push('/orders/confirmation')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button 
        type="submit" 
        disabled={createOrder.isPending}
        className="bg-kente-gold text-white px-4 py-2 rounded"
      >
        {createOrder.isPending ? 'Creating Order...' : 'Place Order'}
      </button>
    </form>
  )
}
```

### Optimistic Updates

```typescript
function useUpdateOrderStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      return response.json()
    },
    
    // Optimistic update
    onMutate: async ({ orderId, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['orders'] })
      
      // Snapshot previous value
      const previousOrders = queryClient.getQueryData(['orders'])
      
      // Optimistically update
      queryClient.setQueryData(['orders'], (old: any[]) =>
        old?.map(order => 
          order.id === orderId 
            ? { ...order, status, updatedAt: new Date().toISOString() }
            : order
        )
      )
      
      return { previousOrders }
    },
    
    // Rollback on error
    onError: (error, variables, context) => {
      if (context?.previousOrders) {
        queryClient.setQueryData(['orders'], context.previousOrders)
      }
    },
    
    // Always refetch after success or error
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
```

### Dependent Queries

```typescript
function OrderDetails({ orderId }: { orderId: string }) {
  // First, fetch the order
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ['orders', orderId],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}`)
      return response.json()
    },
  })

  // Then fetch tailor details (depends on order.tailorId)
  const { data: tailor, isLoading: tailorLoading } = useQuery({
    queryKey: ['tailors', order?.tailorId],
    queryFn: async () => {
      const response = await fetch(`/api/tailors/${order.tailorId}`)
      return response.json()
    },
    enabled: !!order?.tailorId, // Only run when we have tailorId
  })

  if (orderLoading) return <div>Loading order...</div>
  if (!order) return <div>Order not found</div>

  return (
    <div>
      <h1>Order #{order.id}</h1>
      <p>Status: {order.status}</p>
      
      {tailorLoading ? (
        <div>Loading tailor information...</div>
      ) : (
        <div>
          <h2>Tailor: {tailor?.name}</h2>
          <p>Location: {tailor?.location}</p>
        </div>
      )}
    </div>
  )
}
```

## Ghana Market Optimizations

### Offline-First Queries

```typescript
import { useQuery } from '@tanstack/react-query'

// For areas with poor connectivity
function useOfflineFirstTailors() {
  return useQuery({
    queryKey: ['tailors'],
    queryFn: fetchTailors,
    staleTime: 10 * 60 * 1000, // 10 minutes - data stays fresh longer
    gcTime: 24 * 60 * 60 * 1000, // 24 hours - keep cached longer
    refetchOnWindowFocus: false,
    refetchOnReconnect: true, // Refetch when connection restored
    retry: (failureCount, error) => {
      // More aggressive retry for network errors
      if (error.message.includes('fetch')) {
        return failureCount < 5
      }
      return failureCount < 3
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}
```

### WhatsApp Integration with Mutations

```typescript
function useSendWhatsAppUpdate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orderId, message, phoneNumber }: {
      orderId: string
      message: string
      phoneNumber: string
    }) => {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, message, phoneNumber }),
      })
      return response.json()
    },
    onSuccess: (data, variables) => {
      // Update order with WhatsApp message sent status
      queryClient.setQueryData(['orders', variables.orderId], (oldOrder: any) => ({
        ...oldOrder,
        lastWhatsAppUpdate: new Date().toISOString(),
        notifications: [...(oldOrder.notifications || []), {
          type: 'whatsapp',
          message: variables.message,
          sentAt: new Date().toISOString(),
        }],
      }))
    },
  })
}
```

### Mobile Money Payment Integration

```typescript
function useHubtelPayment() {
  return useMutation({
    mutationFn: async (paymentData: {
      amount: number
      phoneNumber: string
      orderId: string
    }) => {
      const response = await fetch('/api/payments/hubtel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Payment failed')
      }
      
      return response.json()
    },
    onSuccess: (paymentResult, variables) => {
      // Update order payment status
      queryClient.setQueryData(['orders', variables.orderId], (oldOrder: any) => ({
        ...oldOrder,
        paymentStatus: 'pending',
        paymentReference: paymentResult.reference,
      }))
    },
  })
}
```

## Real-time Updates with Polling

```typescript
function useOrderTracking(orderId: string) {
  return useQuery({
    queryKey: ['orders', orderId, 'tracking'],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}/tracking`)
      return response.json()
    },
    refetchInterval: (data) => {
      // Poll more frequently for active orders
      if (data?.status === 'in_progress') {
        return 30 * 1000 // 30 seconds
      }
      if (data?.status === 'pending') {
        return 2 * 60 * 1000 // 2 minutes
      }
      return false // Don't poll for completed orders
    },
    refetchIntervalInBackground: true,
  })
}
```

## Query Client Configuration

```typescript
// utils/queryClient.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Ghana network optimization
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error instanceof Error && error.message.includes('4')) {
          return false
        }
        return failureCount < 3
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1, // Retry mutations once
      retryDelay: 2000, // 2 second delay
    },
  },
})

// app/layout.tsx
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
          {process.env.NODE_ENV === 'development' && (
            <ReactQueryDevtools initialIsOpen={false} />
          )}
        </QueryClientProvider>
      </body>
    </html>
  )
}
```

## Custom Hooks for Sew4Mi

### Tailor Management

```typescript
// hooks/useTailors.ts
export function useTailors(filters?: {
  location?: string
  specialty?: string
  rating?: number
}) {
  return useQuery({
    queryKey: ['tailors', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.location) params.append('location', filters.location)
      if (filters?.specialty) params.append('specialty', filters.specialty)
      if (filters?.rating) params.append('rating', filters.rating.toString())
      
      const response = await fetch(`/api/tailors?${params}`)
      return response.json()
    },
    staleTime: 10 * 60 * 1000, // Tailor data changes less frequently
  })
}

export function useTailorApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (applicationData: TailorApplicationData) => {
      const response = await fetch('/api/tailors/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(applicationData),
      })
      return response.json()
    },
    onSuccess: () => {
      // Redirect to application confirmation
      queryClient.invalidateQueries({ queryKey: ['tailor-application'] })
    },
  })
}
```

### Order Management

```typescript
// hooks/useOrders.ts
export function useOrders(status?: string) {
  return useQuery({
    queryKey: ['orders', { status }],
    queryFn: async () => {
      const params = status ? `?status=${status}` : ''
      const response = await fetch(`/api/orders${params}`)
      return response.json()
    },
  })
}

export function useOrderMutations() {
  const queryClient = useQueryClient()

  const updateMeasurements = useMutation({
    mutationFn: async ({ orderId, measurements }: {
      orderId: string
      measurements: Record<string, number>
    }) => {
      const response = await fetch(`/api/orders/${orderId}/measurements`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(measurements),
      })
      return response.json()
    },
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['orders', orderId] })
    },
  })

  const cancelOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
      })
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  return { updateMeasurements, cancelOrder }
}
```

## Error Handling

```typescript
// utils/errorHandling.ts
import { toast } from 'react-hot-toast'

export function handleMutationError(error: unknown) {
  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      toast.error('Network error. Please check your connection and try again.')
      return
    }
    
    // API errors
    if (error.message.includes('400')) {
      toast.error('Invalid request. Please check your input.')
      return
    }
    
    if (error.message.includes('401') || error.message.includes('403')) {
      toast.error('Authentication required. Please log in.')
      // Redirect to login
      return
    }
    
    // Generic error
    toast.error(error.message || 'Something went wrong. Please try again.')
  }
}

// In mutations
const createOrder = useMutation({
  mutationFn: createOrderAPI,
  onError: handleMutationError,
})
```

## Performance Optimizations

### Query Prefetching

```typescript
// Prefetch related data
function TailorCard({ tailor }: { tailor: Tailor }) {
  const queryClient = useQueryClient()

  const handleMouseEnter = () => {
    // Prefetch tailor details when hovering
    queryClient.prefetchQuery({
      queryKey: ['tailors', tailor.id],
      queryFn: () => fetch(`/api/tailors/${tailor.id}`).then(r => r.json()),
      staleTime: 5 * 60 * 1000,
    })
  }

  return (
    <div onMouseEnter={handleMouseEnter} className="tailor-card">
      {/* Card content */}
    </div>
  )
}
```

### Background Updates

```typescript
// Keep data fresh in background
function useBackgroundSync() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const interval = setInterval(() => {
      // Refetch critical data in background
      queryClient.invalidateQueries({ 
        queryKey: ['orders'], 
        refetchType: 'all' 
      })
    }, 5 * 60 * 1000) // Every 5 minutes

    return () => clearInterval(interval)
  }, [queryClient])
}
```

## Testing with React Query

```typescript
// utils/test-utils.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'

export function renderWithQueryClient(component: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  )
}

// Component test
describe('TailorsList', () => {
  it('displays tailors after loading', async () => {
    const { findByText } = renderWithQueryClient(<TailorsList />)
    
    // Mock API response
    fetchMock.mockResponseOnce(JSON.stringify([
      { id: '1', name: 'Kwame Asante', location: 'Accra' }
    ]))

    expect(await findByText('Kwame Asante')).toBeInTheDocument()
  })
})
```

## Best Practices

1. **Query Keys**: Use hierarchical query keys for better cache management
2. **Error Boundaries**: Implement error boundaries for graceful error handling
3. **Loading States**: Provide meaningful loading indicators for better UX
4. **Optimistic Updates**: Use for immediate feedback on user actions
5. **Background Refetching**: Keep data fresh without blocking the UI
6. **Network Optimization**: Configure retry logic for Ghana's network conditions

## Integration with Next.js

```typescript
// Server-side prefetching in Next.js
export async function getServerSideProps() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: ['tailors'],
    queryFn: fetchTailors,
  })

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
    },
  }
}
```

This configuration provides a robust data management layer for Sew4Mi, optimized for the Ghana market with features like offline support, optimistic updates, and efficient caching strategies.