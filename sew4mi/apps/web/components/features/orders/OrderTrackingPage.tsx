/**
 * OrderTrackingPage component for displaying individual order tracking
 * Features comprehensive order details, progress timeline, and real-time updates
 * @file OrderTrackingPage.tsx
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Share2, Download, MessageSquare, Phone, MapPin, Clock, Package, User, CreditCard, FileText, AlertCircle, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { OrderWithProgress, OrderStatus, OrderParticipantRole } from '@sew4mi/shared/types/order-creation';
import { OrderProgressTimeline } from './OrderProgressTimeline';
import { OrderCountdown } from './OrderCountdown';
import { OrderChat } from './OrderChat';
import { MilestonePhotoGallery } from './MilestonePhotoGallery';
import { NotificationSettings } from './NotificationSettings';
import { format, parseISO } from 'date-fns';

/**
 * Props for OrderTrackingPage component
 */
interface OrderTrackingPageProps {
  /** Order ID to track */
  orderId: string;
  /** Current user ID */
  userId: string;
  /** Current user role */
  userRole: OrderParticipantRole;
  /** Show detailed timeline */
  showDetailedTimeline?: boolean;
  /** Enable real-time updates */
  enableRealTime?: boolean;
  /** Callback when back is clicked */
  onBack?: () => void;
  /** Callback for sharing order */
  onShare?: (orderId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Order details card component
 */
interface OrderDetailsCardProps {
  order: OrderWithProgress;
  userRole: OrderParticipantRole;
  onContactParticipant?: (participantId: string, method: 'chat' | 'phone' | 'whatsapp') => void;
}

function OrderDetailsCard({ order, userRole, onContactParticipant }: OrderDetailsCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS'
    }).format(amount);
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case OrderStatus.IN_PROGRESS:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case OrderStatus.COMPLETED:
        return 'bg-green-100 text-green-800 border-green-200';
      case OrderStatus.CANCELLED:
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const participantInfo = userRole === OrderParticipantRole.CUSTOMER 
    ? { 
        id: order.tailorId, 
        name: order.tailorName, 
        avatar: order.tailorAvatar,
        role: 'Tailor',
        phone: order.tailorPhone,
        location: order.tailorLocation
      }
    : { 
        id: order.customerId, 
        name: order.customerName, 
        avatar: order.customerAvatar,
        role: 'Customer',
        phone: order.customerPhone,
        location: order.customerLocation
      };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl">Order #{order.orderNumber}</CardTitle>
            <p className="text-gray-600 mt-1">
              Created {format(parseISO(order.createdAt), 'MMMM d, yyyy')}
            </p>
          </div>
          <Badge className={cn('text-sm', getStatusColor(order.status))}>
            {order.status.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Garment Details */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Package className="h-4 w-4" />
            Garment Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Type</label>
              <p className="text-base">{order.garmentType.replace('_', ' ')}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Category</label>
              <p className="text-base">{order.garmentCategory}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Size</label>
              <p className="text-base">{order.size}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Fabric</label>
              <p className="text-base">{order.fabric}</p>
            </div>
          </div>
          
          {order.specialInstructions && (
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-500">Special Instructions</label>
              <p className="text-base bg-gray-50 p-3 rounded-lg mt-1">
                {order.specialInstructions}
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Participant Info */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <User className="h-4 w-4" />
            {participantInfo.role}
          </h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={participantInfo.avatar} />
                <AvatarFallback>
                  {participantInfo.name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{participantInfo.name}</p>
                {participantInfo.location && (
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {participantInfo.location}
                  </p>
                )}
              </div>
            </div>
            
            {onContactParticipant && order.status === OrderStatus.IN_PROGRESS && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onContactParticipant(participantInfo.id, 'chat')}
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
                {participantInfo.phone && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onContactParticipant(participantInfo.id, 'phone')}
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Pricing */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Pricing
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Base Price</span>
              <span>{formatCurrency(order.basePrice || 0)}</span>
            </div>
            {order.customizationFee && order.customizationFee > 0 && (
              <div className="flex justify-between">
                <span>Customization Fee</span>
                <span>{formatCurrency(order.customizationFee)}</span>
              </div>
            )}
            {order.rushOrderFee && order.rushOrderFee > 0 && (
              <div className="flex justify-between text-orange-600">
                <span>Rush Order Fee</span>
                <span>{formatCurrency(order.rushOrderFee)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>{formatCurrency(order.totalPrice)}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Timeline */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Timeline
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Order Date</label>
              <p className="text-base">
                {format(parseISO(order.createdAt), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
            {order.estimatedStartDate && (
              <div>
                <label className="text-sm font-medium text-gray-500">Estimated Start</label>
                <p className="text-base">
                  {format(parseISO(order.estimatedStartDate), 'MMM d, yyyy')}
                </p>
              </div>
            )}
            {order.estimatedCompletionDate && (
              <div>
                <label className="text-sm font-medium text-gray-500">Estimated Completion</label>
                <p className="text-base">
                  {format(parseISO(order.estimatedCompletionDate), 'MMM d, yyyy')}
                </p>
              </div>
            )}
            {order.actualCompletionDate && (
              <div>
                <label className="text-sm font-medium text-gray-500">Actual Completion</label>
                <p className="text-base text-green-600">
                  {format(parseISO(order.actualCompletionDate), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * OrderTrackingPage Component
 * Comprehensive order tracking with real-time updates
 */
export function OrderTrackingPage({
  orderId,
  userId,
  userRole,
  showDetailedTimeline = true,
  enableRealTime = true,
  onBack,
  onShare,
  className
}: OrderTrackingPageProps) {
  const [order, setOrder] = useState<OrderWithProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Load order details
   */
  const loadOrder = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/orders/${orderId}?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load order details');
      }

      const data = await response.json();
      setOrder(data.order);
    } catch (error) {
      console.error('Failed to load order:', error);
      setError(error instanceof Error ? error.message : 'Failed to load order');
    } finally {
      setIsLoading(false);
    }
  }, [orderId, userId]);

  /**
   * Connect to real-time updates
   */
  const connectWebSocket = useCallback(() => {
    if (!enableRealTime) return;

    try {
      const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'}/orders/${orderId}/track?userId=${userId}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('Connected to order tracking WebSocket');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'order_updated':
              setOrder(prev => prev ? { ...prev, ...data.updates } : null);
              break;
            case 'milestone_updated':
              // Refresh order to get updated milestones
              loadOrder();
              break;
            default:
              break;
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        // Attempt to reconnect
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 5000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, [orderId, userId, enableRealTime, loadOrder]);

  /**
   * Handle participant contact
   */
  const handleContactParticipant = useCallback((participantId: string, method: 'chat' | 'phone' | 'whatsapp') => {
    switch (method) {
      case 'chat':
        setIsChatOpen(true);
        break;
      case 'phone':
        if (order) {
          const phone = userRole === OrderParticipantRole.CUSTOMER 
            ? order.tailorPhone 
            : order.customerPhone;
          if (phone) {
            window.open(`tel:${phone}`, '_self');
          }
        }
        break;
      case 'whatsapp':
        if (order) {
          const phone = userRole === OrderParticipantRole.CUSTOMER 
            ? order.tailorPhone 
            : order.customerPhone;
          if (phone) {
            const message = encodeURIComponent(`Hi! I'd like to discuss my order #${order.orderNumber}.`);
            window.open(`https://wa.me/${phone.replace(/\+/g, '')}?text=${message}`, '_blank');
          }
        }
        break;
    }
  }, [order, userRole]);

  /**
   * Handle order share
   */
  const handleShare = useCallback(() => {
    if (navigator.share && order) {
      navigator.share({
        title: `Order #${order.orderNumber}`,
        text: `Track my order progress on Sew4Mi`,
        url: window.location.href
      });
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href);
      // You might want to show a toast here
    }
    onShare?.(orderId);
  }, [order, orderId, onShare]);

  /**
   * Generate order receipt/summary
   */
  const generateReceipt = useCallback(async () => {
    if (!order) return;

    try {
      const response = await fetch(`/api/orders/${orderId}/receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, format: 'pdf' })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `order-${order.orderNumber}-receipt.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to generate receipt:', error);
    }
  }, [order, orderId, userId]);

  // Initialize on mount
  useEffect(() => {
    loadOrder();
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [loadOrder, connectWebSocket]);

  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className={cn('space-y-4', className)}>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || 'Order not found'}
          </AlertDescription>
        </Alert>
        <div className="flex gap-2">
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <Button onClick={loadOrder} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const participantInfo = userRole === OrderParticipantRole.CUSTOMER 
    ? { id: order.tailorId, name: order.tailorName }
    : { id: order.customerId, name: order.customerName };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">Order #{order.orderNumber}</h1>
            <p className="text-gray-600">{order.garmentType.replace('_', ' ')} - {order.garmentCategory}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm" onClick={generateReceipt}>
            <Download className="h-4 w-4 mr-2" />
            Receipt
          </Button>
          <Dialog open={isNotificationSettingsOpen} onOpenChange={setIsNotificationSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Notification Settings</DialogTitle>
              </DialogHeader>
              <NotificationSettings
                userId={userId}
                showTestOptions={false}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Countdown Timer */}
      {order.estimatedCompletionDate && order.status === OrderStatus.IN_PROGRESS && (
        <OrderCountdown
          targetDate={parseISO(order.estimatedCompletionDate)}
          orderId={orderId}
          className="mb-6"
        />
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OrderDetailsCard
            order={order}
            userRole={userRole}
            onContactParticipant={handleContactParticipant}
          />
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <OrderProgressTimeline
            orderId={orderId}
            userId={userId}
            userRole={userRole}
            showPhotoGallery={false}
            enableRealTime={enableRealTime}
            detailed={showDetailedTimeline}
          />
        </TabsContent>

        <TabsContent value="photos" className="mt-6">
          <MilestonePhotoGallery
            orderId={orderId}
            userId={userId}
            userRole={userRole}
            showUploadButton={userRole === OrderParticipantRole.TAILOR}
          />
        </TabsContent>

        <TabsContent value="chat" className="mt-6">
          <div className="max-w-md mx-auto">
            <OrderChat
              orderId={orderId}
              userId={userId}
              userRole={userRole}
              tailor={userRole === OrderParticipantRole.CUSTOMER ? {
                id: order.tailorId,
                name: order.tailorName || 'Tailor',
                avatar: order.tailorAvatar,
                phoneNumber: order.tailorPhone,
                isOnline: true
              } : undefined}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default OrderTrackingPage;