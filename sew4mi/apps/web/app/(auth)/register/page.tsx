'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RegistrationForm } from '@/components/features/auth/RegistrationForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function RegisterPage() {
  const router = useRouter();
  const [showOTP, setShowOTP] = useState(false);
  const [otpIdentifier, setOtpIdentifier] = useState<{
    identifier: string;
    type: 'email' | 'phone';
  } | null>(null);

  const handleRegistrationSuccess = () => {
    // Registration successful, OTP will be handled
  };

  const handleOTPRequired = (identifier: string, type: 'email' | 'phone') => {
    setOtpIdentifier({ identifier, type });
    setShowOTP(true);
    // TODO: Navigate to OTP verification page or show OTP component
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
            onSuccess={handleRegistrationSuccess}
            onOTPRequired={handleOTPRequired}
          />
        </CardContent>
      </Card>
    </div>
  );
}