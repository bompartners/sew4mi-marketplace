/**
 * useToast Hook
 * Hook for using the toast notification system
 */

'use client';

import { useContext } from 'react';
import { ToastContext } from './toast';

export function useToast() {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  const { addToast, removeToast } = context;

  const toast = ({
    title,
    description,
    variant = 'default',
    duration = 5000,
    action
  }: {
    title?: string;
    description?: string;
    variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
    duration?: number;
    action?: React.ReactNode;
  }) => {
    // Map variants to toast types
    const type = variant === 'destructive' ? 'error' : 
                variant === 'success' ? 'success' :
                variant === 'warning' ? 'warning' :
                variant === 'info' ? 'info' : 'default';

    return addToast({
      title,
      description,
      type,
      duration,
      action
    });
  };

  return {
    toast,
    dismiss: removeToast
  };
}