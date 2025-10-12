'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GhanaPhoneInput } from '@/components/ui/GhanaPhoneInput';
import {
  registrationSchema,
  type RegistrationInput,
} from '@sew4mi/shared/schemas';
import { USER_ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS } from '@sew4mi/shared';
import { Eye, EyeOff, Loader2, Mail, Phone } from 'lucide-react';
import Link from 'next/link';

interface RegistrationFormProps {
  initialRole?: string;
  onSuccess?: (data: RegistrationInput, user: any) => void;
  onOTPRequired?: (identifier: string, type: 'email' | 'phone') => void;
}

export function RegistrationForm({ initialRole, onSuccess, onOTPRequired }: RegistrationFormProps) {
  const { signUp } = useAuth();
  const [identifierType, setIdentifierType] = useState<'email' | 'phone'>('email');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      identifierType: 'email',
      role: (initialRole as 'CUSTOMER' | 'TAILOR') || USER_ROLES.CUSTOMER,
      acceptTerms: false,
    },
  });

  const role = watch('role');

  const onSubmit = async (data: RegistrationInput) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Submitting registration form
      
      const result = await signUp(data);
      
      if (result.requiresVerification) {
        // Store verification data for the verify page (client-side only)
        if (typeof window !== 'undefined') {
          localStorage.setItem('otp-verification', JSON.stringify({
            identifier: data.identifier,
            type: data.identifierType,
          }));
        }
        
        if (onOTPRequired) {
          onOTPRequired(data.identifier, data.identifierType);
        }
      } else {
        // Registration completed without verification
        if (onSuccess) {
          onSuccess(data, (result as any).user);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Role Selection */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">I want to register as</Label>
          <p className="text-sm text-muted-foreground mt-1">Choose your account type below</p>
        </div>
        <RadioGroup
          value={role}
          onValueChange={(value) => setValue('role', value as typeof USER_ROLES.CUSTOMER | typeof USER_ROLES.TAILOR)}
        >
          <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
            <RadioGroupItem value={USER_ROLES.CUSTOMER} id="customer" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="customer" className="font-medium cursor-pointer">
                {ROLE_LABELS[USER_ROLES.CUSTOMER]}
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {ROLE_DESCRIPTIONS[USER_ROLES.CUSTOMER]}
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
            <RadioGroupItem value={USER_ROLES.TAILOR} id="tailor" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="tailor" className="font-medium cursor-pointer">
                {ROLE_LABELS[USER_ROLES.TAILOR]}
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {ROLE_DESCRIPTIONS[USER_ROLES.TAILOR]}
              </p>
              {role === USER_ROLES.TAILOR && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-xs text-blue-800">
                    📋 Tailor applications require verification. You'll need to provide business details and portfolio samples during profile completion.
                  </p>
                </div>
              )}
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Identifier Type Toggle */}
      <div className="space-y-3">
        <Label>Contact Information</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={identifierType === 'email' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setIdentifierType('email');
              setValue('identifierType', 'email');
              setValue('identifier', ''); // Clear identifier when switching modes
            }}
            className="flex-1"
          >
            <Mail className="w-4 h-4 mr-2" />
            Email
          </Button>
          <Button
            type="button"
            variant={identifierType === 'phone' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setIdentifierType('phone');
              setValue('identifierType', 'phone');
              setValue('identifier', ''); // Clear identifier when switching modes
            }}
            className="flex-1"
          >
            <Phone className="w-4 h-4 mr-2" />
            Phone
          </Button>
        </div>
      </div>

      {/* Email or Phone Input */}
      <div className="space-y-2">
        <Label htmlFor="identifier">
          {identifierType === 'email' ? 'Email Address' : 'Phone Number'}
        </Label>
        {identifierType === 'email' ? (
          <Input
            id="identifier"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            {...register('identifier')}
            className={errors.identifier ? 'border-destructive' : ''}
          />
        ) : (
          <GhanaPhoneInput
            id="identifier"
            onChange={(value) => setValue('identifier', value)}
            error={errors.identifier?.message}
          />
        )}
        {errors.identifier && identifierType === 'email' && (
          <p className="text-sm text-destructive">{errors.identifier.message}</p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            autoComplete="new-password"
            {...register('password')}
            className={errors.password ? 'border-destructive' : ''}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Must be at least 8 characters with uppercase, lowercase, number and special character
        </p>
      </div>

      {/* Confirm Password */}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Confirm your password"
            autoComplete="new-password"
            {...register('confirmPassword')}
            className={errors.confirmPassword ? 'border-destructive' : ''}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>

      {/* Terms and Conditions */}
      <div className="flex items-start space-x-2">
        <Checkbox
          id="terms"
          onCheckedChange={(checked) => setValue('acceptTerms', checked as boolean)}
        />
        <div className="grid gap-1.5 leading-none">
          <Label
            htmlFor="terms"
            className="text-sm font-normal cursor-pointer"
          >
            I agree to the{' '}
            <Link href="/terms" className="text-primary hover:underline">
              Terms and Conditions
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </Label>
        </div>
      </div>
      {errors.acceptTerms && (
        <p className="text-sm text-destructive">{errors.acceptTerms.message}</p>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full bg-[#006B3F] hover:bg-[#005530]"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating account...
          </>
        ) : (
          'Create Account'
        )}
      </Button>

      {/* Login Link */}
      <div className="text-center text-sm">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </div>
    </form>
  );
}