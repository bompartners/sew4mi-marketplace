'use client';

/**
 * Fabric Allocation Dedicated Page
 * Focused view for fabric allocation calculations
 */

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { FabricAllocationCalculator } from '@/components/features/tailors/FabricAllocationCalculator';
import { FabricAllocation, FabricQuantityCalculation } from '@sew4mi/shared/types/group-order';

export default function FabricAllocationPage() {
  const params = useParams();
  const router = useRouter();
  const groupOrderId = params.id as string;

  const [allocations, setAllocations] = useState<FabricAllocation[]>([]);
  const [bufferPercentage, setBufferPercentage] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch existing fabric allocations
  useEffect(() => {
    async function fetchAllocations() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/tailors/group-orders/${groupOrderId}/fabric-allocation`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch fabric allocations');
        }

        const data = await response.json();
        setAllocations(data.allocations || []);
        if (data.coordination?.fabric_buffer_percentage) {
          setBufferPercentage(data.coordination.fabric_buffer_percentage);
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAllocations();
  }, [groupOrderId]);

  // Handle save
  const handleSave = async (calculation: FabricQuantityCalculation) => {
    try {
      setIsSaving(true);
      const response = await fetch(`/api/tailors/group-orders/${groupOrderId}/fabric-allocation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calculation)
      });

      if (!response.ok) {
        throw new Error('Failed to save fabric allocation');
      }

      alert('Fabric allocation saved successfully!');
      router.push(`/group-orders/${groupOrderId}`);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-secondary rounded w-1/4"></div>
          <div className="h-96 bg-secondary rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push(`/group-orders/${groupOrderId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Group Order
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Fabric Calculator */}
      <FabricAllocationCalculator
        allocations={allocations}
        initialBufferPercentage={bufferPercentage}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
}

