import { Metadata } from 'next'
import { Suspense } from 'react'
import { ResetPasswordForm } from '@/components/features/auth/ResetPasswordForm'

export const metadata: Metadata = {
  title: 'Reset Password | Sew4Mi',
  description: 'Set a new password for your Sew4Mi account.',
}

function ResetPasswordContent() {
  return <ResetPasswordForm />
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Suspense fallback={<div suppressHydrationWarning>Loading...</div>}>
          <ResetPasswordContent />
        </Suspense>
      </div>
    </div>
  )
}