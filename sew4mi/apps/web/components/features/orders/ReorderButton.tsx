'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReorder } from '@/hooks/useReorder';
import { useRouter } from 'next/navigation';

interface ReorderButtonProps {
  orderId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  showText?: boolean;
}

export function ReorderButton({ orderId, variant = 'outline', size = 'default', showText = true }: ReorderButtonProps) {
  const { previewReorder, isPreviewing } = useReorder();
  const router = useRouter();

  const handleReorder = async () => {
    try {
      await previewReorder(orderId);
      // Navigate to reorder wizard
      router.push(`/orders/${orderId}/reorder`);
    } catch (error) {
      console.error('Reorder preview failed:', error);
    }
  };

  return (
    <Button variant={variant} size={size} onClick={handleReorder} disabled={isPreviewing}>
      <RotateCcw className="h-4 w-4" />
      {showText && <span className="ml-2">{isPreviewing ? 'Loading...' : 'Reorder'}</span>}
    </Button>
  );
}
