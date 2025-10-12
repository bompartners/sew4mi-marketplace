'use client';

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, RefreshCw, Phone, Mail, CheckCircle } from 'lucide-react';

interface OTPVerificationProps {
  identifier: string;
  identifierType: 'email' | 'phone';
  onVerified?: (otp: string) => void;
  onResend?: () => Promise<void>;
  onCancel?: () => void;
}

export function OTPVerification({
  identifier,
  identifierType,
  onVerified,
  onResend,
  onCancel,
}: OTPVerificationProps) {
  const { verifyOTP, resendOTP } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Start resend timer
  useEffect(() => {
    if (resendTimer > 0 && !canResend) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (resendTimer === 0) {
      setCanResend(true);
    }
    return undefined;
  }, [resendTimer, canResend]);

  // Auto-focus first input
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError(null);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (newOtp.every(digit => digit !== '') && newOtp.join('').length === 6) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    // Handle arrow keys
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (otpCode: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await verifyOTP(identifier, otpCode, identifierType);
      
      if (onVerified) {
        onVerified(otpCode);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid OTP code. Please try again.';
      setError(errorMessage);
      
      // If OTP expired, automatically enable resend
      if (errorMessage.toLowerCase().includes('expired')) {
        setCanResend(true);
        setResendTimer(0);
      }
      
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    
    try {
      setIsResending(true);
      setError(null);
      
      if (onResend) {
        await onResend();
      } else {
        await resendOTP(identifier, identifierType);
      }
      
      // Reset timer
      setResendTimer(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const maskedIdentifier = () => {
    if (identifierType === 'email') {
      const [username, domain] = identifier.split('@');
      const masked = username.slice(0, 2) + '***' + username.slice(-1);
      return `${masked}@${domain}`;
    } else {
      // Mask phone number
      const lastFour = identifier.slice(-4);
      return `***${lastFour}`;
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {identifierType === 'phone' ? (
            <Phone className="h-5 w-5" />
          ) : (
            <Mail className="h-5 w-5" />
          )}
          Verify Your {identifierType === 'phone' ? 'Phone' : 'Email'}
        </CardTitle>
        <CardDescription>
          We've sent a 6-digit verification code to {maskedIdentifier()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant={error.toLowerCase().includes('expired') ? 'default' : 'destructive'}>
            <AlertDescription>
              {error}
              {error.toLowerCase().includes('expired') && (
                <span className="block mt-2 font-medium">
                  Click "Resend Code" below to get a new verification code.
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* OTP Input Fields */}
        <div className="flex justify-center gap-2">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={el => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={index === 0 ? handlePaste : undefined}
              className="w-12 h-14 text-center text-xl font-semibold border-2 rounded-lg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              disabled={isLoading}
            />
          ))}
        </div>

        {/* Verify Button */}
        <Button
          className="w-full bg-[#006B3F] hover:bg-[#005530]"
          onClick={() => handleVerify(otp.join(''))}
          disabled={isLoading || otp.some(digit => !digit)}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Verify Code
            </>
          )}
        </Button>

        {/* Resend Section */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            {error?.toLowerCase().includes('expired') ? 
              'Your verification code has expired' : 
              "Didn't receive the code?"}
          </p>
          {canResend ? (
            <Button
              variant={error?.toLowerCase().includes('expired') ? "outline" : "ghost"}
              size="sm"
              onClick={handleResend}
              disabled={isResending}
              className={error?.toLowerCase().includes('expired') ? "font-medium" : ""}
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resending...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Resend Code
                </>
              )}
            </Button>
          ) : (
            <p className="text-sm font-medium">
              Resend in {resendTimer}s
            </p>
          )}
        </div>

        {/* Cancel Button */}
        {onCancel && (
          <Button
            variant="outline"
            className="w-full"
            onClick={onCancel}
          >
            Cancel Verification
          </Button>
        )}

        {/* Help Text */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            For testing, use code: <span className="font-mono font-semibold">123456</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}