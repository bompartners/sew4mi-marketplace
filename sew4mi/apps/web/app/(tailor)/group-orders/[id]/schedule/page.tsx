'use client';

/**
 * Production Schedule Dedicated Page
 * Focused view for production schedule planning
 */

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { ProductionSchedulePlanner } from '@/components/features/tailors/ProductionSchedulePlanner';
import { ProductionScheduleItem } from '@sew4mi/shared/types/group-order';

export default function ProductionSchedulePage() {
  const params = useParams();
  const router = useRouter();
  const groupOrderId = params.id as string;

  const [scheduleItems, setScheduleItems] = useState<ProductionScheduleItem[]>([]);
  const [eventDate, setEventDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch existing schedule
  useEffect(() => {
    async function fetchSchedule() {
      try {
        setIsLoading(true);
        
        // Fetch group order details
        const groupOrderResponse = await fetch(`/api/tailors/group-orders/${groupOrderId}`);
        if (!groupOrderResponse.ok) {
          throw new Error('Failed to fetch group order');
        }
        const groupOrderData = await groupOrderResponse.json();
        setEventDate(new Date(groupOrderData.groupOrder.eventDate || Date.now()));

        // Fetch schedule
        const scheduleResponse = await fetch(`/api/tailors/group-orders/${groupOrderId}/production-schedule`);
        if (!scheduleResponse.ok) {
          throw new Error('Failed to fetch production schedule');
        }
        const scheduleData = await scheduleResponse.json();
        
        // TODO: Transform schedule data to schedule items format
        setScheduleItems(scheduleData.schedule?.items || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSchedule();
  }, [groupOrderId]);

  // Handle save
  const handleSave = async (items: ProductionScheduleItem[]) => {
    try {
      setIsSaving(true);
      const response = await fetch(`/api/tailors/group-orders/${groupOrderId}/production-schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          eventDate: eventDate.toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save production schedule');
      }

      alert('Production schedule saved successfully!');
      router.push(`/group-orders/${groupOrderId}`);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-secondary rounded w-1/4"></div>
          <div className="h-96 bg-secondary rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
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

      {/* Production Planner */}
      <ProductionSchedulePlanner
        groupOrderId={groupOrderId}
        eventDate={eventDate}
        scheduleItems={scheduleItems}
        dailyCapacityHours={8}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
}

