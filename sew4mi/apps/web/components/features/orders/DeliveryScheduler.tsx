'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Truck,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import type { GroupOrderItem, DeliverySchedule } from '@sew4mi/shared/types/group-order';

interface DeliverySchedulerProps {
  groupOrderId: string;
  items: GroupOrderItem[];
  existingSchedules?: DeliverySchedule[];
  onScheduleUpdated?: () => void;
}

export function DeliveryScheduler({
  groupOrderId,
  items,
  existingSchedules = [],
  onScheduleUpdated,
}: DeliverySchedulerProps) {
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<Array<{
    orderItemIds: string[];
    scheduledDate: string;
    notes?: string;
  }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get items that are ready for delivery
  const readyItems = items.filter(item =>
    ['READY_FOR_DELIVERY', 'COMPLETED'].includes(item.status)
  );

  // Get items already scheduled
  const scheduledItemIds = new Set(
    existingSchedules.flatMap(schedule => schedule.orderItems)
  );

  const unscheduledItems = readyItems.filter(
    item => !scheduledItemIds.has(item.id)
  );

  const handleAddSchedule = () => {
    setSchedules([
      ...schedules,
      {
        orderItemIds: [],
        scheduledDate: new Date().toISOString().split('T')[0],
        notes: '',
      },
    ]);
  };

  const handleRemoveSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const handleUpdateSchedule = (
    index: number,
    updates: Partial<typeof schedules[0]>
  ) => {
    const newSchedules = [...schedules];
    newSchedules[index] = { ...newSchedules[index], ...updates };
    setSchedules(newSchedules);
  };

  const handleToggleItem = (scheduleIndex: number, itemId: string) => {
    const schedule = schedules[scheduleIndex];
    const itemIds = schedule.orderItemIds;
    
    if (itemIds.includes(itemId)) {
      handleUpdateSchedule(scheduleIndex, {
        orderItemIds: itemIds.filter(id => id !== itemId),
      });
    } else {
      handleUpdateSchedule(scheduleIndex, {
        orderItemIds: [...itemIds, itemId],
      });
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (schedules.length === 0) {
      toast({
        title: 'No Schedules',
        description: 'Please add at least one delivery schedule',
        variant: 'destructive',
      });
      return;
    }

    const invalidSchedules = schedules.filter(s => s.orderItemIds.length === 0);
    if (invalidSchedules.length > 0) {
      toast({
        title: 'Invalid Schedule',
        description: 'Each schedule must have at least one item',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/orders/group/${groupOrderId}/delivery`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryStrategy: 'STAGGERED',
          schedules: schedules.map(s => ({
            ...s,
            scheduledDate: new Date(s.scheduledDate),
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update delivery schedules');
      }

      toast({
        title: 'Success',
        description: 'Delivery schedules updated successfully',
      });

      setSchedules([]);
      
      if (onScheduleUpdated) {
        onScheduleUpdated();
      }
    } catch (error) {
      console.error('Error updating delivery schedules:', error);
      toast({
        title: 'Error',
        description: 'Failed to update delivery schedules',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" />
              <CardTitle>Staggered Delivery Management</CardTitle>
            </div>
            {unscheduledItems.length > 0 && (
              <Badge variant="secondary">
                {unscheduledItems.length} item{unscheduledItems.length !== 1 ? 's' : ''} ready
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Schedules */}
          {existingSchedules.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Existing Schedules</h4>
              {existingSchedules.map((schedule) => (
                <Card key={schedule.id} className="p-3 bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-sm">
                        {new Date(schedule.scheduledDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <Badge className={getStatusBadgeClass(schedule.status)}>
                      {schedule.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-600">
                    {schedule.orderItems.length} item{schedule.orderItems.length !== 1 ? 's' : ''}
                  </div>
                  {schedule.notes && (
                    <div className="text-xs text-gray-500 mt-2">{schedule.notes}</div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Unscheduled Items Alert */}
          {unscheduledItems.length > 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-amber-900">
                    {unscheduledItems.length} Item{unscheduledItems.length !== 1 ? 's' : ''} Ready for Delivery
                  </div>
                  <div className="text-sm text-amber-700 mt-1">
                    Create delivery schedules for completed items
                  </div>
                  <div className="mt-3 space-y-1">
                    {unscheduledItems.map(item => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                        <span>{item.familyMemberName} - {item.garmentType}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">All ready items are scheduled</span>
              </div>
            </div>
          )}

          {/* New Schedules */}
          {schedules.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">New Delivery Schedules</h4>
              {schedules.map((schedule, index) => (
                <Card key={index} className="p-4 border-2 border-blue-200">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">Schedule #{index + 1}</div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSchedule(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Delivery Date
                      </label>
                      <input
                        type="date"
                        value={schedule.scheduledDate}
                        onChange={(e) =>
                          handleUpdateSchedule(index, { scheduledDate: e.target.value })
                        }
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Select Items ({schedule.orderItemIds.length} selected)
                      </label>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {unscheduledItems.map(item => (
                          <label
                            key={item.id}
                            className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={schedule.orderItemIds.includes(item.id)}
                              onChange={() => handleToggleItem(index, item.id)}
                              className="rounded"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium">
                                {item.familyMemberName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {item.garmentType}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Delivery Notes (Optional)
                      </label>
                      <textarea
                        value={schedule.notes || ''}
                        onChange={(e) =>
                          handleUpdateSchedule(index, { notes: e.target.value })
                        }
                        placeholder="Any special delivery instructions..."
                        rows={2}
                        className="w-full px-3 py-2 border rounded-md text-sm"
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {unscheduledItems.length > 0 && (
              <Button
                variant="outline"
                onClick={handleAddSchedule}
                disabled={isSubmitting}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Delivery Schedule
              </Button>
            )}
            {schedules.length > 0 && (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Saving...' : 'Save Schedules'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getStatusBadgeClass(status: string): string {
  const classes: Record<string, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-700',
    READY: 'bg-green-100 text-green-700',
    IN_TRANSIT: 'bg-amber-100 text-amber-700',
    DELIVERED: 'bg-green-100 text-green-700',
    FAILED: 'bg-red-100 text-red-700',
  };
  return classes[status] || 'bg-gray-100 text-gray-700';
}

