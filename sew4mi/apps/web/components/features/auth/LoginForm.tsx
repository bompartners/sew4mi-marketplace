'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { GhanaPhoneInput } from '@sew4mi/ui'
import { useAuth } from '@/hooks/useAuth'
// Import toast system when implemented
// import { useAuthToast } from '@/components/ui/toast'
// import { useNetworkStatus } from '@/lib/services/networkService.client'
// import { useErrorLogging } from '@/lib/services/errorLoggingService.client'

const loginSchema = z.object({
  loginType: z.enum(['email', 'phone']),
  email: z.string().email('Please enter a valid email address').optional(),
  phone: z.string().regex(/^\+233[0-9]{9}$/, 'Please enter a valid Ghana phone number').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().default(false)
}).refine(data => {
  if (data.loginType === 'email') {
    return data.email && data.email.length > 0
  } else {
    return data.phone && data.phone.length > 0
  }
}, {
  message: 'Please provide either email or phone number',
  path: ['email']
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { signIn } = useAuth()
  // Toast and network services - implement when available
  // const toast = useAuthToast()
  // const networkStatus = useNetworkStatus()
  // const { logAuthError } = useErrorLogging()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      loginType: 'email',
      rememberMe: false
    }
  })

  const loginType = watch('loginType')

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError(null)

    // Network status check - implement when service is available
    // if (!networkStatus.isOnline) {
    //   toast.networkError()
    //   setIsLoading(false)
    //   return
    // }

    try {
      const credential = data.loginType === 'email' ? data.email! : data.phone!
      const result = await signIn(credential, data.password, data.rememberMe)
      
      if (result.success) {
        // toast.success('Signed in successfully!', 'Welcome back to Sew4Mi')
        router.push('/dashboard')
      } else {
        const errorMessage = result.error || 'Login failed. Please try again.'
        setError(errorMessage)
        
        // Log authentication error - implement when service is available
        // logAuthError('Login failed', {
        //   credentialType: data.loginType,
        //   errorMessage: errorMessage,
        //   networkStatus: networkStatus.isOnline ? 'online' : 'offline'
        // })

        // Show appropriate toast - implement when toast system is available
        // if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('connection')) {
        //   toast.networkError()
        // } else {
        //   toast.error('Sign in failed', errorMessage)
        // }
      }
    } catch (err) {
      console.error('Login error:', err)
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.'
      setError(errorMessage)
      
      // Log the error - implement when service is available
      // logAuthError('Login exception', {
      //   error: err instanceof Error ? err.message : 'Unknown error',
      //   credentialType: data.loginType,
      //   stack: err instanceof Error ? err.stack : undefined
      // })

      // Show retry-able toast for network errors - implement when toast system is available
      // if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('fetch')) {
      //   toast.retryableError(
      //     'Connection problem. Please try again.',
      //     () => onSubmit(data)
      //   )
      // } else {
      //   toast.error('Sign in failed', errorMessage)
      // }
    } finally {
      setIsLoading(false)
    }
  }

  const handlePhoneChange = (value: string) => {
    setValue('phone', value, { shouldValidate: true })
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Login Type Selection */}
        <div className="space-y-3">
          <Label className="text-base font-medium text-gray-900">
            How would you like to sign in?
          </Label>
          <RadioGroup
            value={loginType}
            onValueChange={(value) => {
              setValue('loginType', value as 'email' | 'phone')
              setError(null)
              // Clear the other field when switching
              if (value === 'email') {
                setValue('phone', '')
              } else {
                setValue('email', '')
              }
            }}
            className="flex space-x-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="email" id="email-option" />
              <Label htmlFor="email-option" className="text-sm font-medium">
                Email Address
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="phone" id="phone-option" />
              <Label htmlFor="phone-option" className="text-sm font-medium">
                Phone Number
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Email Input */}
        {loginType === 'email' && (
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email address"
              {...register('email')}
              className={errors.email ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-amber-500'}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>
        )}

        {/* Phone Input */}
        {loginType === 'phone' && (
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
              Phone Number
            </Label>
            <GhanaPhoneInput
              value={watch('phone') || ''}
              onChange={handlePhoneChange}
              placeholder="Enter your phone number"
              disabled={isLoading}
              error={errors.phone?.message}
            />
          </div>
        )}

        {/* Password Input */}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-gray-700">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              {...register('password')}
              className={errors.password ? 'border-red-500 focus:border-red-500 pr-10' : 'border-gray-300 focus:border-amber-500 pr-10'}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              disabled={isLoading}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        {/* Remember Me */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="rememberMe"
            checked={watch('rememberMe')}
            onCheckedChange={(checked) => setValue('rememberMe', checked as boolean)}
            disabled={isLoading}
          />
          <Label htmlFor="rememberMe" className="text-sm text-gray-700">
            Remember me for 30 days
          </Label>
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-2.5"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing In...
            </>
          ) : (
            'Sign In'
          )}
        </Button>

        {/* Links */}
        <div className="text-center space-y-2">
          <Link
            href="/forgot-password"
            className="text-sm text-amber-600 hover:text-amber-700 hover:underline"
          >
            Forgot your password?
          </Link>
          <div className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link
              href="/register"
              className="text-amber-600 hover:text-amber-700 hover:underline font-medium"
            >
              Sign up
            </Link>
          </div>
        </div>
      </form>
    </div>
  )
}