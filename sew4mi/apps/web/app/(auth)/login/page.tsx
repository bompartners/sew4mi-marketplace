'use client';

import { LoginForm } from '@/components/features/auth/LoginForm'
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use suppressHydrationWarning to prevent hydration mismatch
  // This is safe because we intentionally want different content post-hydration
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" suppressHydrationWarning>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" suppressHydrationWarning>
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back
          </h1>
          <p className="text-gray-600">
            Sign in to your account to continue
          </p>
        </div>
        
        <LoginForm />
      </div>
    </div>
  )
}