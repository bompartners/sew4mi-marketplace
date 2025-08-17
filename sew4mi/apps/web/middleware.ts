import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })

  // Refresh session if expired - required for Server Components
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-otp'
  ]

  // Auth routes - redirect to dashboard if already authenticated
  const authRoutes = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-otp'
  ]

  // Protected routes that require authentication
  const protectedRoutes = [
    '/dashboard',
    '/profile',
    '/settings'
  ]

  // Customer-only routes
  const customerRoutes = [
    '/orders',
    '/browse-tailors',
    '/favorites'
  ]

  // Tailor-only routes
  const tailorRoutes = [
    '/portfolio',
    '/clients',
    '/earnings',
    '/availability'
  ]

  // Check if current path is a protected route
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route)) ||
                          customerRoutes.some(route => pathname.startsWith(route)) ||
                          tailorRoutes.some(route => pathname.startsWith(route))

  // Check if current path is an auth route
  const isAuthRoute = authRoutes.some(route => pathname === route)

  // Check if current path is public
  const isPublicRoute = publicRoutes.some(route => pathname === route)

  // If user is not authenticated and trying to access protected route
  if (!session && isProtectedRoute) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is authenticated and trying to access auth routes, redirect to dashboard
  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Role-based access control
  if (session && session.user) {
    const userRole = session.user.user_metadata?.role || session.user.app_metadata?.role

    // Check customer-only routes
    if (customerRoutes.some(route => pathname.startsWith(route))) {
      if (userRole !== 'customer') {
        return NextResponse.redirect(new URL('/unauthorized', request.url))
      }
    }

    // Check tailor-only routes
    if (tailorRoutes.some(route => pathname.startsWith(route))) {
      if (userRole !== 'tailor') {
        return NextResponse.redirect(new URL('/unauthorized', request.url))
      }
    }
  }

  return res
}

// Specify which routes this middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}