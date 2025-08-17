'use client';

import React, { useEffect, useState, ReactNode } from 'react';

interface HydrationBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Comprehensive hydration boundary that prevents all hydration mismatches
 * 
 * This component ensures that children are only rendered after client-side
 * hydration is complete, preventing any server/client rendering differences.
 * 
 * This is the most robust solution for preventing hydration issues in
 * Next.js 15.4.6 + React 19 applications.
 */
export function HydrationBoundary({ 
  children, 
  fallback = <div style={{ minHeight: '100vh' }}></div> 
}: HydrationBoundaryProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Mark as hydrated after the first client-side render
    setIsHydrated(true);
  }, []);

  // Always render the same structure on server and initial client render
  // to prevent hydration mismatches
  if (!isHydrated) {
    return (
      <div suppressHydrationWarning>
        {fallback}
      </div>
    );
  }

  // After hydration, render the actual content
  return <>{children}</>;
}

/**
 * Higher-order component to wrap any component with hydration protection
 */
export function withHydrationBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  const WrappedComponent = (props: P) => (
    <HydrationBoundary fallback={fallback}>
      <Component {...props} />
    </HydrationBoundary>
  );

  WrappedComponent.displayName = `withHydrationBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}