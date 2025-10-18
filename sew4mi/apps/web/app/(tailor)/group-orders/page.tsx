'use client';

/**
 * Tailor Group Orders Listing Page
 * Displays all assigned group orders with filtering and sorting
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TailorGroupOrderDashboard } from '@/components/features/tailors/TailorGroupOrderDashboard';
import { EnhancedGroupOrder } from '@sew4mi/shared/types/group-order';

export default function TailorGroupOrdersPage() {
  const router = useRouter();
  const [groupOrders, setGroupOrders] = useState<EnhancedGroupOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch group orders
  useEffect(() => {
    async function fetchGroupOrders() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/tailors/group-orders');
        
        if (!response.ok) {
          throw new Error('Failed to fetch group orders');
        }

        const data = await response.json();
        setGroupOrders(data.groupOrders || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchGroupOrders();
  }, []);

  // Handle group order selection
  const handleSelectGroupOrder = (groupOrderId: string) => {
    router.push(`/group-orders/${groupOrderId}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <TailorGroupOrderDashboard
        groupOrders={groupOrders}
        isLoading={isLoading}
        error={error}
        onSelectGroupOrder={handleSelectGroupOrder}
      />
    </div>
  );
}

