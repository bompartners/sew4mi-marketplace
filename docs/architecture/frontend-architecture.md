# Frontend Architecture

## Component Architecture

### Component Organization
```
src/
├── components/
│   ├── ui/                 # Shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── dialog.tsx
│   ├── common/             # Shared components
│   │   ├── Layout/
│   │   ├── Navigation/
│   │   └── ErrorBoundary/
│   ├── features/           # Feature-specific components
│   │   ├── orders/
│   │   │   ├── OrderCard.tsx
│   │   │   ├── OrderTimeline.tsx
│   │   │   └── EscrowProgress.tsx
│   │   ├── tailors/
│   │   │   ├── TailorProfile.tsx
│   │   │   ├── PortfolioGallery.tsx
│   │   │   └── TailorSearch.tsx
│   │   ├── measurements/
│   │   │   ├── MeasurementForm.tsx
│   │   │   ├── VoiceRecorder.tsx
│   │   │   └── ProfileSelector.tsx
│   │   └── payments/
│   │       ├── MobileMoneyButton.tsx
│   │       └── PaymentStatus.tsx
│   └── patterns/           # Design patterns
│       ├── OptimisticUpdate/
│       ├── InfiniteScroll/
│       └── OfflineQueue/
```

### Component Template
```typescript
// components/features/orders/OrderCard.tsx
import { memo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import type { Order } from '@/types/models';

interface OrderCardProps {
  order: Order;
  onSelect?: (order: Order) => void;
  className?: string;
}

export const OrderCard = memo<OrderCardProps>(({ 
  order, 
  onSelect,
  className 
}) => {
  const statusColor = {
    'DRAFT': 'secondary',
    'IN_PROGRESS': 'warning',
    'DELIVERED': 'success',
    'DISPUTED': 'destructive'
  }[order.status] || 'default';

  return (
    <Card 
      className={cn('cursor-pointer hover:shadow-lg transition-shadow', className)}
      onClick={() => onSelect?.(order)}
    >
      <CardHeader>
        <div className="flex justify-between items-start">
          <h3 className="font-semibold">{order.garmentType}</h3>
          <Badge variant={statusColor}>{order.status}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Order #{order.orderNumber}
          </p>
          <p className="font-medium">
            {formatCurrency(order.totalAmount, 'GHS')}
          </p>
          <p className="text-sm">
            Delivery: {formatDate(order.estimatedDelivery)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
});

OrderCard.displayName = 'OrderCard';
```

## State Management Architecture

### State Structure
```typescript
// stores/index.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// User store for auth and profile
interface UserState {
  user: User | null;
  measurementProfiles: MeasurementProfile[];
  selectedProfileId: string | null;
  actions: {
    setUser: (user: User | null) => void;
    addMeasurementProfile: (profile: MeasurementProfile) => void;
    selectProfile: (id: string) => void;
  };
}

export const useUserStore = create<UserState>()(
  devtools(
    persist(
      immer((set) => ({
        user: null,
        measurementProfiles: [],
        selectedProfileId: null,
        actions: {
          setUser: (user) => set((state) => {
            state.user = user;
          }),
          addMeasurementProfile: (profile) => set((state) => {
            state.measurementProfiles.push(profile);
          }),
          selectProfile: (id) => set((state) => {
            state.selectedProfileId = id;
          }),
        },
      })),
      {
        name: 'user-storage',
        partialize: (state) => ({
          selectedProfileId: state.selectedProfileId,
        }),
      }
    )
  )
);

// Order store for cart and active orders
interface OrderState {
  cart: Partial<Order> | null;
  activeOrders: Order[];
  actions: {
    updateCart: (updates: Partial<Order>) => void;
    clearCart: () => void;
    setActiveOrders: (orders: Order[]) => void;
  };
}

export const useOrderStore = create<OrderState>()(
  immer((set) => ({
    cart: null,
    activeOrders: [],
    actions: {
      updateCart: (updates) => set((state) => {
        state.cart = { ...state.cart, ...updates };
      }),
      clearCart: () => set((state) => {
        state.cart = null;
      }),
      setActiveOrders: (orders) => set((state) => {
        state.activeOrders = orders;
      }),
    },
  }))
);
```

### State Management Patterns
- **Optimistic Updates:** Update UI immediately, rollback on error
- **Server State Caching:** React Query for API data with stale-while-revalidate
- **Offline Queue:** Store actions locally when offline, sync when connected
- **Real-time Subscriptions:** Supabase realtime for order status updates

## Routing Architecture

### Route Organization
```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx
│   ├── register/
│   │   └── page.tsx
│   └── layout.tsx          # Auth layout
├── (customer)/
│   ├── dashboard/
│   │   └── page.tsx
│   ├── orders/
│   │   ├── [id]/
│   │   │   └── page.tsx
│   │   └── page.tsx
│   ├── tailors/
│   │   ├── [id]/
│   │   │   └── page.tsx
│   │   └── page.tsx
│   └── layout.tsx          # Customer layout
├── (tailor)/
│   ├── tailor-dashboard/
│   │   └── page.tsx
│   ├── tailor-orders/
│   │   └── page.tsx
│   └── layout.tsx          # Tailor layout
├── admin/
│   ├── disputes/
│   ├── verification/
│   └── layout.tsx          # Admin layout
├── api/                    # API routes
│   ├── orders/
│   ├── webhooks/
│   └── graphql/
└── layout.tsx              # Root layout
```

### Protected Route Pattern
```typescript
// app/(customer)/layout.tsx
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }
  
  // Check if user is customer
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
    
  if (profile?.role !== 'CUSTOMER') {
    redirect('/unauthorized');
  }
  
  return (
    <div className="min-h-screen bg-background">
      <CustomerNav />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
```

## Frontend Services Layer

### API Client Setup
```typescript
// lib/api/client.ts
import { createClient } from '@supabase/supabase-js';
import { GraphQLClient } from 'graphql-request';

// Supabase client for auth and realtime
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

// GraphQL client for complex queries
export const graphqlClient = new GraphQLClient(
  `${process.env.NEXT_PUBLIC_API_URL}/api/graphql`,
  {
    headers: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session ? {
        Authorization: `Bearer ${session.access_token}`,
      } : {};
    },
  }
);

// REST client wrapper
export const api = {
  async post<T>(path: string, data: any): Promise<T> {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`/api${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session && { Authorization: `Bearer ${session.access_token}` }),
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    
    return response.json();
  },
  // Similar for get, put, delete...
};
```

### Service Example
```typescript
// services/orders.service.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { graphqlClient, api } from '@/lib/api/client';
import { SEARCH_TAILORS, CREATE_ORDER } from '@/graphql/queries';
import type { Order, CreateOrderInput } from '@/types/models';

export const useSearchTailors = (filters: TailorSearchFilters) => {
  return useQuery({
    queryKey: ['tailors', filters],
    queryFn: () => graphqlClient.request(SEARCH_TAILORS, filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateOrderInput) => 
      api.post<Order>('/orders', data),
    onSuccess: (order) => {
      // Optimistically update the orders list
      queryClient.setQueryData(['orders'], (old: Order[] = []) => 
        [order, ...old]
      );
      // Invalidate to refetch
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => {
      // Show error toast
      toast.error('Failed to create order');
    },
  });
};

// Real-time subscription hook
export const useOrderUpdates = (orderId: string) => {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const subscription = supabase
      .channel(`order:${orderId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`,
      }, (payload) => {
        // Update cache with new data
        queryClient.setQueryData(['order', orderId], payload.new);
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, [orderId, queryClient]);
};
```
