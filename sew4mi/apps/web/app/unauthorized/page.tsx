'use client';

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Home, ArrowLeft, Shield, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ROLE_LABELS, getUnauthorizedMessage } from '@sew4mi/shared'

export default function UnauthorizedPage() {
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')
  const userRole = searchParams.get('user_role')
  const requiredRole = searchParams.get('required_role')
  
  const getRoleDisplayName = (role: string) => {
    const upperRole = role?.toUpperCase()
    if (upperRole && upperRole in ROLE_LABELS) {
      return ROLE_LABELS[upperRole as keyof typeof ROLE_LABELS]
    }
    return role || 'Unknown'
  }

  const getContextualMessage = () => {
    if (reason === 'insufficient_permissions' && userRole) {
      return getUnauthorizedMessage(userRole as any, 'access this page')
    }
    return 'You don\'t have permission to access this page.'
  }
  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#FFFDD0] to-white">
      <Card className="w-full max-w-lg border-[#8B4513]/20">
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full mb-4">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          
          <CardTitle className="text-2xl font-bold text-gray-900">
            Access Restricted
          </CardTitle>
          
          <CardDescription className="text-lg">
            {getContextualMessage()}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {userRole && (
            <Alert>
              <UserX className="h-4 w-4" />
              <AlertDescription>
                <strong>Your Role:</strong> {getRoleDisplayName(userRole)}
                {requiredRole && requiredRole !== 'unknown' && (
                  <>
                    <br />
                    <strong>Required Role:</strong> {getRoleDisplayName(requiredRole)}
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="text-sm text-gray-600 space-y-2 bg-gray-50 p-4 rounded-lg">
            <p className="font-medium">Why am I seeing this?</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>This page requires specific user permissions</li>
              <li>Your current account role doesn't allow access</li>
              <li>Contact support if you believe this is an error</li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                asChild
                variant="outline"
                className="flex-1 flex items-center justify-center space-x-2"
              >
                <Link href="#" onClick={() => history.back()}>
                  <ArrowLeft className="w-4 h-4" />
                  <span>Go Back</span>
                </Link>
              </Button>
              
              <Button
                asChild
                className="flex-1 flex items-center justify-center space-x-2 bg-[#CE1126] hover:bg-[#CE1126]/90"
              >
                <Link href="/dashboard">
                  <Home className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>
              </Button>
            </div>
            
            <div className="text-center pt-2 border-t border-gray-200">
              <Link
                href="/login"
                className="text-sm text-[#CE1126] hover:text-[#CE1126]/80 hover:underline font-medium"
              >
                Sign in with a different account →
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}