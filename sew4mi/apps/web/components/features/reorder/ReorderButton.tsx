'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useReorder } from '@/hooks/useReorder';
import { useToast } from '@/hooks/use-toast';

interface ReorderButtonProps {
  orderId: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showText?: boolean;
  className?: string;
}

export function ReorderButton({
  orderId,
  variant = 'outline',
  size = 'default',
  showText = true,
  className = '',
}: ReorderButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { createReorder, isCreating } = useReorder();

  const handleReorder = async () => {
    try {
      const newOrder = await createReorder({
        originalOrderId: orderId,
      });

      toast({
        title: 'Order reordered successfully',
        description: 'Your new order has been created.',
      });

      // Navigate to the new order details or checkout
      router.push(`/orders/${newOrder.id}`);
    } catch (error) {
      toast({
        title: 'Failed to reorder',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleReorder}
      disabled={isCreating}
      className={className}
    >
      <RefreshCw className={`${showText ? 'mr-2' : ''} h-4 w-4 ${isCreating ? 'animate-spin' : ''}`} />
      {showText && (isCreating ? 'Reordering...' : 'Reorder')}
    </Button>
  );
}
