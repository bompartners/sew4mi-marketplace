'use client';

import dynamic from 'next/dynamic';
import { ReactNode } from 'react';

interface NoSSRProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component that only renders on the client side to avoid SSR hydration issues
 */
function NoSSRComponent({ children, fallback = null }: NoSSRProps) {
  return <>{children}</>;
}

/**
 * NoSSR wrapper that disables server-side rendering for wrapped components
 */
export const NoSSR = dynamic(
  () => Promise.resolve(NoSSRComponent),
  {
    ssr: false,
    loading: () => null
  }
);

export default NoSSR;