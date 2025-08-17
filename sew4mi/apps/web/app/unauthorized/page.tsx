import { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Unauthorized Access | Sew4Mi',
  description: 'You do not have permission to access this page.',
}

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-4">
          <div className="flex items-center justify-center w-20 h-20 mx-auto bg-red-100 rounded-full">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">
              Access Denied
            </h1>
            <p className="text-lg text-gray-600">
              You don't have permission to access this page.
            </p>
          </div>
          
          <div className="text-sm text-gray-500 space-y-1">
            <p>This page requires specific user permissions.</p>
            <p>Please contact support if you believe this is an error.</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              asChild
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Link href="javascript:history.back()">
                <ArrowLeft className="w-4 h-4" />
                <span>Go Back</span>
              </Link>
            </Button>
            
            <Button
              asChild
              className="flex items-center space-x-2 bg-amber-600 hover:bg-amber-700"
            >
              <Link href="/dashboard">
                <Home className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
            </Button>
          </div>
          
          <div className="text-center">
            <Link
              href="/login"
              className="text-sm text-amber-600 hover:text-amber-700 hover:underline"
            >
              Sign in with a different account
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}