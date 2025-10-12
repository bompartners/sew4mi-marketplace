import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { USER_ROLES, ROLE_ROUTE_MAPPING, canAccessRoute } from '@sew4mi/shared'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Rate limiting protection: Skip auth for static assets and API routes that don't need it
  const { pathname } = request.nextUrl
  if (pathname.startsWith('/_next/') ||
      pathname.startsWith('/favicon') ||
      pathname.startsWith('/api/health') ||
      pathname.match(/\.(jpg|jpeg|png|gif|ico|svg|css|js|woff|woff2)$/)) {
    return response
  }

  // Refresh session if expired - required for Server Components
  // Note: This is the main source of API calls in middleware
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Public routes that don't require authentication
  // const publicRoutes = [ // TODO: Use when needed
  //     '/',
  //     '/login',
  //     '/register',
  //     '/forgot-password',
  //     '/reset-password',
  //     '/verify-otp',
  //     '/apply-tailor'
  //   ]
  // 
    // Auth routes - redirect to dashboard if already authenticated
    const authRoutes = [
      '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-otp'
  ]

  // Routes that always require authentication but allow any role
  const protectedRoutes = [
    '/dashboard',
    '/profile',
    '/settings'
  ]

  // Check if current path is a route that always requires authentication (any role)
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // Check if current path is a role-specific route (from ROLE_ROUTE_MAPPING)
  const isRoleSpecificRoute = Object.keys(ROLE_ROUTE_MAPPING).some(route => 
    pathname.startsWith(route) && route !== '/dashboard' && route !== '/profile' && route !== '/settings'
  )

  // Check if current path is an auth route
  const isAuthRoute = authRoutes.some(route => pathname === route)

  // Check if current path is public
  // const _isPublicRoute = publicRoutes.some(route => pathname === route) // TODO: Use when needed

  // If user is not authenticated and trying to access protected or role-specific route
  if (!session && (isProtectedRoute || isRoleSpecificRoute)) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is authenticated and trying to access auth routes, redirect to appropriate dashboard
  if (session && isAuthRoute) {
    // Get user role to redirect to appropriate dashboard
    let userRole: typeof USER_ROLES[keyof typeof USER_ROLES] = USER_ROLES.CUSTOMER; // default
    
    if (session.user) {
      // Try to get role from user metadata or fetch from database
      const metadataRole = session.user.user_metadata?.role || session.user.app_metadata?.role;
      if (metadataRole) {
        userRole = metadataRole.toUpperCase() as typeof USER_ROLES[keyof typeof USER_ROLES];
      } else {
        // Fetch role from database if not in metadata
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();
          
          if (userData?.role) {
            userRole = userData.role as typeof USER_ROLES[keyof typeof USER_ROLES];
          }
        } catch (error) {
          console.error('Failed to fetch user role:', error);
        }
      }
    }

    // Redirect to appropriate dashboard based on role
    const defaultRoute = userRole === USER_ROLES.ADMIN ? '/admin/dashboard' : '/dashboard';
    return NextResponse.redirect(new URL(defaultRoute, request.url));
  }

  // Enhanced role-based access control
  if (session && session.user && (isRoleSpecificRoute || isProtectedRoute)) {
    let userRole: typeof USER_ROLES[keyof typeof USER_ROLES] = USER_ROLES.CUSTOMER; // default
    
    // Get user role from metadata or database
    const metadataRole = session.user.user_metadata?.role || session.user.app_metadata?.role;
    if (metadataRole) {
      userRole = metadataRole.toUpperCase();
    } else {
      // Fetch role from database if not in metadata
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        if (userData?.role) {
          userRole = userData.role;
        }
      } catch (error) {
        console.error('Failed to fetch user role:', error);
      }
    }

    // Check role-based route access using the utility function
    if (!canAccessRoute(userRole as any, pathname)) {
      const redirectUrl = new URL('/unauthorized', request.url);
      redirectUrl.searchParams.set('reason', 'insufficient_permissions');
      redirectUrl.searchParams.set('required_role', 'unknown');
      redirectUrl.searchParams.set('user_role', userRole);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response
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