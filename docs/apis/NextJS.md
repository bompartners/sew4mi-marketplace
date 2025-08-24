# Next.js Documentation

Next.js is a React framework that enables functionality such as server-side rendering and generating static websites for React-based web applications. It's the core framework powering the Sew4Mi application.

## Core Concepts for Sew4Mi

### App Router
- **Server Components**: Default components that run on the server for better performance
- **Client Components**: Components that run in the browser with `'use client'` directive
- **File-based routing**: Automatic routing based on file structure in the `app` directory
- **Layouts**: Shared UI across pages with nested routing support

### Data Fetching
- **Server-side data fetching**: Built-in `fetch()` with caching strategies
- **Dynamic APIs**: Access to `cookies()`, `headers()`, and `params` in Server Components
- **Route Handlers**: API endpoints replacing Pages Router API routes

## Key Integration Patterns

### Server Component Data Fetching

```typescript
export default async function Page() {
  // This request is cached by default (force-cache)
  const staticData = await fetch(`https://api.example.com/data`, { 
    cache: 'force-cache' 
  })

  // This request is refetched on every request  
  const dynamicData = await fetch(`https://api.example.com/live`, { 
    cache: 'no-store' 
  })

  // This request is cached with 10 second revalidation
  const revalidatedData = await fetch(`https://api.example.com/timed`, {
    next: { revalidate: 10 }
  })

  return <div>...</div>
}
```

### Client Component Navigation

```typescript
'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export default function NavigationComponent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleNavigation = () => {
    router.push('/dashboard')
    router.refresh() // Refresh server components
  }

  return <button onClick={handleNavigation}>Go to Dashboard</button>
}
```

### Dynamic Route Handling

```typescript
// app/shop/[category]/[slug]/page.tsx
export default async function ProductPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>
}) {
  const { category, slug } = await params
  
  const product = await getProduct(category, slug)

  return (
    <div>
      <h1>{product.name}</h1>
      <p>Category: {category}</p>
    </div>
  )
}
```

### Route Handlers (API Endpoints)

```typescript
// app/api/orders/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const userId = searchParams.get('userId')
  
  const orders = await getOrdersByUser(userId)
  
  return NextResponse.json({ orders })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  
  const newOrder = await createOrder(body)
  
  return NextResponse.json({ order: newOrder }, { status: 201 })
}

// Optional: Use Edge Runtime for better performance
export const runtime = 'edge'
```

### Middleware for Authentication

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Update Supabase session
  const response = await updateSession(request)
  
  // Check protected routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('supabase-auth-token')
    
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }
  
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

## Layout System

### Root Layout

```typescript
// app/layout.tsx
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Sew4Mi - Ghana Tailor Marketplace',
  description: 'Connecting customers with skilled Ghanaian tailors',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <header>
          <nav>Sew4Mi Navigation</nav>
        </header>
        <main>{children}</main>
        <footer>© 2024 Sew4Mi</footer>
      </body>
    </html>
  )
}
```

### Nested Layouts

```typescript
// app/dashboard/layout.tsx
export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ team?: string }>
}) {
  const { team } = await params

  return (
    <section>
      <aside>
        <nav>Dashboard Navigation</nav>
      </aside>
      <main>{children}</main>
    </section>
  )
}
```

## Ghana Market Optimizations

### Performance Configuration

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize for mobile networks in Ghana
  experimental: {
    optimizeCss: true,
    serverMinification: false, // Vercel optimizes this
  },
  
  // Image optimization for low bandwidth
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Bundle analyzer for monitoring size
  bundlePagesRouterDependencies: true,
  
  // Headers for performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          }
        ],
      },
    ]
  }
}

module.exports = nextConfig
```

### Mobile-First Loading States

```typescript
// app/dashboard/loading.tsx
export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gold-500">
      </div>
      <p className="mt-4 text-kente-green">Loading your orders...</p>
    </div>
  )
}
```

### Error Boundaries

```typescript
// app/dashboard/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
      <p className="text-gray-600 mb-6">
        {error.message || 'An unexpected error occurred'}
      </p>
      <button
        onClick={reset}
        className="bg-kente-gold text-white px-4 py-2 rounded hover:bg-opacity-80"
      >
        Try again
      </button>
    </div>
  )
}
```

## Environment and Configuration

### Environment Variables

```bash
# Next.js specific
NEXT_PUBLIC_APP_URL=https://sew4mi.vercel.app
NEXT_TELEMETRY_DISABLED=1

# Database and Auth
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# External APIs
NEXT_PUBLIC_WHATSAPP_API_URL=https://api.whatsapp.com
HUBTEL_API_KEY=your_hubtel_key
```

### Static Generation with Dynamic Params

```typescript
// app/tailors/[id]/page.tsx
export async function generateStaticParams() {
  const tailors = await getAllTailors()
  
  return tailors.map((tailor) => ({
    id: tailor.id,
  }))
}

export default async function TailorProfile({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const tailor = await getTailor(id)

  return <TailorProfileComponent tailor={tailor} />
}
```

## Integration with Sew4Mi Features

### WhatsApp Integration API Route

```typescript
// app/api/whatsapp/send/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { message, phoneNumber, orderId } = await request.json()
  
  try {
    const whatsappResponse = await fetch('https://api.whatsapp.com/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneNumber,
        text: { body: message }
      })
    })

    if (!whatsappResponse.ok) {
      throw new Error('WhatsApp API request failed')
    }

    // Log to database
    await logWhatsAppMessage(orderId, phoneNumber, message)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to send WhatsApp message' },
      { status: 500 }
    )
  }
}
```

### Measurement Form with Server Actions

```typescript
// app/orders/[id]/measurements/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

async function saveMeasurements(formData: FormData) {
  'use server'
  
  const supabase = await createClient()
  const orderId = formData.get('orderId') as string
  
  const measurements = {
    chest: formData.get('chest'),
    waist: formData.get('waist'),
    hip: formData.get('hip'),
    // ... other measurements
  }
  
  const { error } = await supabase
    .from('measurements')
    .insert({ order_id: orderId, ...measurements })
  
  if (error) {
    throw new Error('Failed to save measurements')
  }
  
  redirect(`/orders/${orderId}`)
}

export default function MeasurementsPage() {
  return (
    <form action={saveMeasurements}>
      <input type="hidden" name="orderId" value={orderId} />
      <input name="chest" placeholder="Chest measurement" required />
      <input name="waist" placeholder="Waist measurement" required />
      <button type="submit">Save Measurements</button>
    </form>
  )
}
```

## Performance Best Practices

### Code Splitting

```typescript
// Lazy load heavy components
import { lazy, Suspense } from 'react'

const MeasurementChart = lazy(() => import('./MeasurementChart'))

export default function OrderDetails() {
  return (
    <div>
      <h1>Order Details</h1>
      <Suspense fallback={<div>Loading chart...</div>}>
        <MeasurementChart />
      </Suspense>
    </div>
  )
}
```

### Bundle Analysis

```bash
# Analyze bundle size
npm install -g @next/bundle-analyzer
ANALYZE=true pnpm build

# Monitor Core Web Vitals
# Built into Next.js with web-vitals
```

## Development and Production

### Development Commands

```bash
# Development server
pnpm dev --filter=web

# Type checking
pnpm typecheck --filter=web

# Build for production
pnpm build:web

# Static export (if needed)
pnpm export
```

### Production Optimizations

```javascript
// next.config.js production settings
const nextConfig = {
  output: 'standalone', // For Docker deployments
  poweredByHeader: false, // Remove X-Powered-By header
  reactStrictMode: true,
  swcMinify: true, // Use SWC for minification
  
  // Optimize for Vercel deployment
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  }
}
```

## Testing Integration

### Component Testing

```typescript
// __tests__/components/TailorCard.test.tsx
import { render, screen } from '@testing-library/react'
import TailorCard from '@/components/TailorCard'

describe('TailorCard', () => {
  it('renders tailor information', () => {
    const tailor = {
      id: '1',
      name: 'Kwame Asante',
      location: 'Accra',
      rating: 4.8
    }

    render(<TailorCard tailor={tailor} />)
    
    expect(screen.getByText('Kwame Asante')).toBeInTheDocument()
    expect(screen.getByText('Accra')).toBeInTheDocument()
  })
})
```

## Troubleshooting

### Common Issues

- **Hydration errors**: Ensure client and server render the same content
- **Dynamic API usage**: Using `cookies()` or `headers()` opts routes out of static generation
- **Middleware performance**: Keep middleware lightweight, use Edge Runtime when possible
- **Bundle size**: Monitor and optimize imports, use dynamic imports for large components

### Development Tips

- Use `next/font` for optimized font loading
- Implement proper error boundaries for better UX
- Use Server Components by default, Client Components when needed
- Monitor Core Web Vitals in production with Vercel Analytics

## Best Practices

1. **Component Architecture**: Default to Server Components, use Client Components sparingly
2. **Data Fetching**: Fetch data at the page level, pass props down to components  
3. **Error Handling**: Implement proper error boundaries and fallback UIs
4. **Performance**: Use Next.js Image component, optimize fonts, monitor bundle size
5. **Security**: Implement CSP headers, validate all inputs on the server side