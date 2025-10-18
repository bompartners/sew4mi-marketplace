/**
 * Client Component Wrapper for Order Detail Page
 * @file OrderDetailClient.tsx
 */

'use client';

import { OrderTrackingPage } from '@/components/features/orders/OrderTrackingPage';

interface OrderDetailClientProps {
  orderId: string;
  userId: string;
  userRole: 'CUSTOMER' | 'TAILOR' | 'ADMIN';
}

export function OrderDetailClient({ orderId, userId, userRole }: OrderDetailClientProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <OrderTrackingPage
        orderId={orderId}
        userId={userId}
        userRole={userRole}
        enableRealTime={true}
        showDetailedTimeline={true}
      />
    </div>
  );
}

