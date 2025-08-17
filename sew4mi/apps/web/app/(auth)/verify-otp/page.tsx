'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { OTPVerification } from '@/components/features/auth/OTPVerification';
import { useHydrationSafe, useBrowserSafe } from '@/hooks/useHydrationSafe';

export default function VerifyOTPPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMounted = useHydrationSafe();
  const [verificationData, setVerificationData] = useState<{
    identifier: string;
    type: 'email' | 'phone';
  } | null>(null);

  useEffect(() => {
    // Only process verification data after hydration is complete
    if (!isMounted) return;

    // Get verification data from URL params first
    const identifier = searchParams.get('identifier');
    const type = searchParams.get('type') as 'email' | 'phone';
    
    if (identifier && type) {
      setVerificationData({ identifier, type });
    } else {
      // Check localStorage for verification data (client-side only)
      if (typeof window !== 'undefined') {
        const storedData = localStorage.getItem('otp-verification');
        if (storedData) {
          try {
            const parsed = JSON.parse(storedData);
            setVerificationData(parsed);
          } catch (error) {
            console.error('Failed to parse verification data:', error);
            router.push('/register');
          }
        } else {
          // No verification data, redirect to registration
          router.push('/register');
        }
      }
    }
  }, [isMounted, searchParams, router]);

  const handleVerified = async (otp: string) => {
    try {
      // Clear stored verification data (client-side only)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('otp-verification');
      }
      
      // TODO: Complete user registration/login flow
      console.log('OTP verified successfully:', otp);
      
      // For now, redirect to a success page or dashboard
      router.push('/dashboard'); // This will be created later
    } catch (error) {
      console.error('Verification completion failed:', error);
    }
  };

  const handleResend = async () => {
    if (!verificationData) return;
    
    // TODO: Implement actual OTP resend logic
    console.log('Resending OTP to:', verificationData.identifier);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const handleCancel = () => {
    // Clear stored verification data (client-side only)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('otp-verification');
    }
    router.push('/register');
  };

  // Render loading state before hydration to prevent mismatch
  if (!isMounted || !verificationData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#FFFDD0] to-white px-4 py-12" suppressHydrationWarning>
        <div className="text-center">
          <p className="text-muted-foreground">Loading verification...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#FFFDD0] to-white px-4 py-12">
      <OTPVerification
        identifier={verificationData.identifier}
        identifierType={verificationData.type}
        onVerified={handleVerified}
        onResend={handleResend}
        onCancel={handleCancel}
      />
    </div>
  );
}