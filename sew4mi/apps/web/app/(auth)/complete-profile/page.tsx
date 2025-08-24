'use client'

import { Suspense, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProfileCompletionForm } from '@/components/features/auth/ProfileCompletionForm'
import { useAuth } from '@/hooks/useAuth'
import { ProfileUpdateInput } from '@sew4mi/shared/schemas/auth.schema'

function ProfileCompletionContent() {
  const { user, session, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !session) {
      router.push('/login')
    }
  }, [loading, session, router])

  const handleProfileComplete = async (data: ProfileUpdateInput) => {
    if (!user) return

    try {
      // Create a simple user repository client-side call
      // In a real app, this would be an API route
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      // Optionally send welcome email here
      router.push('/dashboard?welcome=true')
    } catch (error) {
      console.error('Profile update failed:', error)
      throw error
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" suppressHydrationWarning>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <div suppressHydrationWarning></div>
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <ProfileCompletionForm
        user={user}
        onComplete={handleProfileComplete}
        completionPercentage={30} // Initial percentage
      />
    </div>
  )
}

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" suppressHydrationWarning>
        <div>Loading...</div>
      </div>
    }>
      <ProfileCompletionContent />
    </Suspense>
  )
}