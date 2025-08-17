'use client'

import * as React from 'react'
import { createContext, useContext, useState, useCallback } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@sew4mi/ui'

export interface Toast {
  id: string
  title?: string
  description?: string
  type?: 'default' | 'success' | 'error' | 'warning' | 'info'
  duration?: number
  action?: React.ReactNode
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  clearAll: () => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: Toast = {
      id,
      duration: 5000,
      type: 'default',
      ...toast
    }

    setToasts(prev => [...prev, newToast])

    // Auto remove after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, newToast.duration)
    }

    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setToasts([])
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearAll }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

function ToastContainer() {
  const { toasts } = useToast()

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useToast()
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  React.useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  const handleClose = () => {
    setIsLeaving(true)
    setTimeout(() => removeToast(toast.id), 200)
  }

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-600" />
      case 'info':
        return <Info className="h-4 w-4 text-blue-600" />
      default:
        return null
    }
  }

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success':
        return 'border-l-green-500'
      case 'error':
        return 'border-l-red-500'
      case 'warning':
        return 'border-l-amber-500'
      case 'info':
        return 'border-l-blue-500'
      default:
        return 'border-l-gray-500'
    }
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-white border border-gray-200 border-l-4 shadow-lg transition-all duration-200 ease-in-out',
        getBorderColor(),
        isVisible && !isLeaving
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0',
        isLeaving && 'translate-x-full opacity-0'
      )}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="ml-3 w-0 flex-1">
            {toast.title && (
              <p className="text-sm font-medium text-gray-900">
                {toast.title}
              </p>
            )}
            {toast.description && (
              <p className={cn(
                'text-sm text-gray-500',
                toast.title && 'mt-1'
              )}>
                {toast.description}
              </p>
            )}
            {toast.action && (
              <div className="mt-3">
                {toast.action}
              </div>
            )}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
              onClick={handleClose}
            >
              <span className="sr-only">Close</span>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Convenience functions for different toast types
export function useAuthToast() {
  const { addToast } = useToast()

  return {
    success: (title: string, description?: string) =>
      addToast({ title, description, type: 'success' }),
    
    error: (title: string, description?: string) =>
      addToast({ title, description, type: 'error', duration: 7000 }),
    
    warning: (title: string, description?: string) =>
      addToast({ title, description, type: 'warning' }),
    
    info: (title: string, description?: string) =>
      addToast({ title, description, type: 'info' }),

    networkError: () =>
      addToast({
        title: 'Connection Problem',
        description: 'Please check your internet connection and try again.',
        type: 'error',
        duration: 0 // Don't auto-dismiss network errors
      }),

    retryableError: (message: string, retryAction?: () => void) =>
      addToast({
        title: 'Something went wrong',
        description: message,
        type: 'error',
        duration: 10000,
        action: retryAction ? (
          <button
            className="text-sm font-medium text-amber-600 hover:text-amber-500"
            onClick={retryAction}
          >
            Try again
          </button>
        ) : undefined
      }),

    sessionExpired: () =>
      addToast({
        title: 'Session Expired',
        description: 'Please sign in again to continue.',
        type: 'warning',
        duration: 0,
        action: (
          <button
            className="text-sm font-medium text-amber-600 hover:text-amber-500"
            onClick={() => window.location.href = '/login'}
          >
            Sign In
          </button>
        )
      })
  }
}