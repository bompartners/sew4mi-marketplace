'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { RegistrationForm } from '@/components/features/auth/RegistrationForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { USER_ROLES } from '@sew4mi/shared';
import type { RegistrationInput } from '@sew4mi/shared';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get role from URL parameter (default to CUSTOMER if not provided or invalid)
  const roleParam = searchParams.get('role');
  const initialRole = (roleParam === 'tailor') ? USER_ROLES.TAILOR : USER_ROLES.CUSTOMER;

  const handleRegistrationSuccess = (data: RegistrationInput, user: any) => {
    // Check if user registered as tailor and redirect to application
    if (data.role === USER_ROLES.TAILOR && user) {
      const params = new URLSearchParams({
        userId: user.id,
        userName: user.user_metadata?.full_name || user.email || 'Tailor'
      });
      router.push(`/apply-tailor?${params.toString()}`);
      return;
    }
    
    // For customers, proceed with normal flow
    if (user) {
      router.push('/dashboard?welcome=true');
    }
  };

  const handleOTPRequired = (identifier: string, type: 'email' | 'phone') => {
    // Store OTP data in localStorage for the verify page
    if (typeof window !== 'undefined') {
      localStorage.setItem('otp-verification', JSON.stringify({ identifier, type }));
    }
    // Navigate to OTP verification page
    router.push('/verify-otp');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#FFFDD0] to-white px-4 py-12">
      <Card className="w-full max-w-md border-[#8B4513]/20">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Join Sew4Mi
          </CardTitle>
          <CardDescription className="text-center">
            Create your account to connect with skilled Ghanaian tailors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegistrationForm
            initialRole={initialRole}
            onSuccess={handleRegistrationSuccess}
            onOTPRequired={handleOTPRequired}
          />
        </CardContent>
      </Card>
    </div>
  );
}