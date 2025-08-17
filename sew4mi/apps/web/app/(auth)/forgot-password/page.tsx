import { Metadata } from 'next'
import { ForgotPasswordForm } from '@/components/features/auth/ForgotPasswordForm'

export const metadata: Metadata = {
  title: 'Reset Password | Sew4Mi',
  description: 'Reset your Sew4Mi account password to regain access to skilled Ghanaian tailors.',
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <ForgotPasswordForm />
      </div>
    </div>
  )
}