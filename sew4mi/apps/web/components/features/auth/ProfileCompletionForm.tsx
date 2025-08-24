'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { User, Loader2, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { GhanaPhoneInput } from '@sew4mi/ui'
import { profileUpdateSchema, ProfileUpdateInput } from '@sew4mi/shared/schemas/auth.schema'

interface ProfileCompletionFormProps {
  user: any // User from session
  onComplete: (data: ProfileUpdateInput) => Promise<void>
  completionPercentage?: number
}

export function ProfileCompletionForm({ user, onComplete, completionPercentage = 0 }: ProfileCompletionFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      full_name: user?.user_metadata?.full_name || '',
      preferred_language: 'en',
      whatsapp_opted_in: false
    }
  })

  const onSubmit = async (data: ProfileUpdateInput) => {
    setIsLoading(true)
    setError(null)

    try {
      await onComplete(data)
      router.push('/dashboard')
    } catch (err) {
      console.error('Profile completion failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to complete profile. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePhoneChange = (value: string) => {
    setValue('whatsapp_number', value, { shouldValidate: true })
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="text-center space-y-4 mb-8">
        <div className="flex items-center justify-center w-16 h-16 mx-auto bg-amber-100 rounded-full">
          <User className="w-8 h-8 text-amber-600" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">
            Complete Your Profile
          </h1>
          <p className="text-gray-600">
            Help us personalize your Sew4Mi experience
          </p>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-amber-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.max(completionPercentage, 20)}%` }}
          />
        </div>
        <p className="text-sm text-gray-500">
          {Math.round(completionPercentage)}% complete
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="full_name" className="text-sm font-medium text-gray-700">
            Full Name *
          </Label>
          <Input
            id="full_name"
            type="text"
            placeholder="Enter your full name"
            {...register('full_name')}
            className={errors.full_name ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-amber-500'}
            disabled={isLoading}
          />
          {errors.full_name && (
            <p className="text-sm text-red-600">{errors.full_name.message}</p>
          )}
        </div>

        {/* Date of Birth */}
        <div className="space-y-2">
          <Label htmlFor="date_of_birth" className="text-sm font-medium text-gray-700">
            Date of Birth
          </Label>
          <Input
            id="date_of_birth"
            type="date"
            {...register('date_of_birth')}
            className={errors.date_of_birth ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-amber-500'}
            disabled={isLoading}
          />
          {errors.date_of_birth && (
            <p className="text-sm text-red-600">{errors.date_of_birth.message}</p>
          )}
        </div>

        {/* Gender */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700">
            Gender
          </Label>
          <RadioGroup
            value={watch('gender') || ''}
            onValueChange={(value) => setValue('gender', value as any)}
            className="flex flex-wrap gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="male" id="male" />
              <Label htmlFor="male" className="text-sm">Male</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="female" id="female" />
              <Label htmlFor="female" className="text-sm">Female</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="other" id="other" />
              <Label htmlFor="other" className="text-sm">Other</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="prefer_not_to_say" id="prefer_not_to_say" />
              <Label htmlFor="prefer_not_to_say" className="text-sm">Prefer not to say</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Preferred Language */}
        <div className="space-y-2">
          <Label htmlFor="preferred_language" className="text-sm font-medium text-gray-700">
            Preferred Language *
          </Label>
          <select
            id="preferred_language"
            {...register('preferred_language')}
            className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm ring-offset-background focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading}
          >
            <option value="en">English</option>
            <option value="tw">Twi</option>
            <option value="ga">Ga</option>
            <option value="ewe">Ewe</option>
            <option value="fante">Fante</option>
          </select>
          {errors.preferred_language && (
            <p className="text-sm text-red-600">{errors.preferred_language.message}</p>
          )}
        </div>

        {/* WhatsApp Integration */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="whatsapp_opted_in"
              checked={watch('whatsapp_opted_in')}
              onCheckedChange={(checked) => setValue('whatsapp_opted_in', checked as boolean)}
              disabled={isLoading}
            />
            <Label htmlFor="whatsapp_opted_in" className="text-sm text-gray-700">
              Enable WhatsApp notifications for order updates
            </Label>
          </div>

          {watch('whatsapp_opted_in') && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                WhatsApp Number
              </Label>
              <GhanaPhoneInput
                value={watch('whatsapp_number') || ''}
                onChange={handlePhoneChange}
                placeholder="Enter WhatsApp number"
                disabled={isLoading}
                error={errors.whatsapp_number?.message}
              />
            </div>
          )}
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
        <div className="space-y-4">
          <Button
            type="submit"
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-3"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Completing Profile...
              </>
            ) : (
              <>
                Complete Profile
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
          
          <p className="text-center text-sm text-gray-500">
            You can update these details later in your settings
          </p>
        </div>
      </form>
    </div>
  )
}