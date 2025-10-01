'use client';

/**
 * Individual Group Order Detail Page
 * Displays full group order details with coordination tools
 */

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft,
  Calendar,
  Users,
  Package,
  AlertTriangle 
} from 'lucide-react';
import { EnhancedGroupOrder } from '@sew4mi/shared/types/group-order';
import { FabricAllocationCalculator } from '@/components/features/tailors/FabricAllocationCalculator';
import { ProductionSchedulePlanner } from '@/components/features/tailors/ProductionSchedulePlanner';
import { DesignSuggestionTool } from '@/components/features/tailors/DesignSuggestionTool';
import { BulkProgressUpdater } from '@/components/features/tailors/BulkProgressUpdater';
import { GroupOrderMessaging } from '@/components/features/tailors/GroupOrderMessaging';
import { CoordinationChecklist } from '@/components/features/tailors/CoordinationChecklist';
import { format } from 'date-fns';

export default function GroupOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupOrderId = params.id as string;

  const [groupOrder, setGroupOrder] = useState<EnhancedGroupOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch group order details
  useEffect(() => {
    async function fetchGroupOrder() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/tailors/group-orders/${groupOrderId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch group order');
        }

        const data = await response.json();
        setGroupOrder(data.groupOrder);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchGroupOrder();
  }, [groupOrderId]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-secondary rounded w-1/4"></div>
          <div className="h-64 bg-secondary rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !groupOrder) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error?.message || 'Group order not found'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/group-orders')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Group Orders
        </Button>
      </div>

      {/* Group Order Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{groupOrder.groupName}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {groupOrder.groupOrderNumber || `Order #${groupOrder.id.slice(0, 8)}`}
              </p>
            </div>
            <Badge variant="outline">
              {groupOrder.status.replace(/_/g, ' ')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Event Date</p>
                <p className="text-sm text-muted-foreground">
                  {groupOrder.eventDate 
                    ? format(new Date(groupOrder.eventDate), 'MMM dd, yyyy')
                    : 'Not set'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Total Items</p>
                <p className="text-sm text-muted-foreground">
                  {groupOrder.totalOrders} garments
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Participants</p>
                <p className="text-sm text-muted-foreground">
                  {groupOrder.totalParticipants} people
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coordination Tools Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="fabric">Fabric</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="design">Design</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="messaging">Messaging</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Group Order Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Progress Summary</h4>
                <div className="grid gap-2 md:grid-cols-4">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold">{groupOrder.progressSummary.completedItems}</p>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold">{groupOrder.progressSummary.inProgressItems}</p>
                    <p className="text-sm text-muted-foreground">In Progress</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold">{groupOrder.progressSummary.pendingItems}</p>
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold">
                      {Math.round(groupOrder.progressSummary.overallProgressPercentage)}%
                    </p>
                    <p className="text-sm text-muted-foreground">Overall</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fabric">
          <FabricAllocationCalculator
            allocations={[]}
            initialBufferPercentage={10}
          />
        </TabsContent>

        <TabsContent value="schedule">
          <ProductionSchedulePlanner
            groupOrderId={groupOrderId}
            eventDate={groupOrder.eventDate ? new Date(groupOrder.eventDate) : new Date()}
            scheduleItems={[]}
            dailyCapacityHours={8}
          />
        </TabsContent>

        <TabsContent value="design">
          <DesignSuggestionTool
            groupOrderId={groupOrderId}
            eventType={groupOrder.eventType}
          />
        </TabsContent>

        <TabsContent value="progress">
          <BulkProgressUpdater
            groupOrderId={groupOrderId}
            items={groupOrder.items || []}
          />
        </TabsContent>

        <TabsContent value="messaging">
          <GroupOrderMessaging
            groupOrderId={groupOrderId}
            participants={[]}
            messages={[]}
          />
        </TabsContent>

        <TabsContent value="checklist">
          <CoordinationChecklist
            groupOrderId={groupOrderId}
            totalItems={groupOrder.totalOrders}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
