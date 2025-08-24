# Supabase Documentation

Supabase is an open-source backend platform providing a full Postgres database, authentication, storage, real-time, and edge functions to help developers build applications quickly.

## Core Concepts for Sew4Mi

### Authentication
- **Email/Password Authentication**: Built-in auth system for user registration and login
- **Row Level Security (RLS)**: Database-level security policies for user data isolation
- **Server-side Auth**: Authentication utilities for Next.js App Router and Pages Router

### Database
- **PostgreSQL**: Full-featured Postgres database with auto-generated APIs
- **Real-time subscriptions**: Live data updates via WebSocket connections
- **Storage**: File upload and management for images, documents, etc.

## Key Integration Patterns

### Next.js App Router Authentication

```typescript
// utils/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => 
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

### Server Component Data Fetching

```typescript
export default async function Page() {
  const supabase = await createClient()
  
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect('/login')
  }

  return <p>Hello {data.user.email}</p>
}
```

### Client-side Auth Component

```typescript
'use client'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
  const supabase = createClient()
  const router = useRouter()

  const handleSignIn = async (formData: FormData) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    })
    
    if (!error) {
      router.refresh()
    }
  }
}
```

### Middleware for Session Management

```typescript
// middleware.ts
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

## Environment Variables

Required for Sew4Mi project:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=your_database_url
```

## Database Setup

### RLS Policies
- Enable RLS on all tables containing user data
- Create policies for authenticated users to access their own data
- Use `auth.uid()` for user identification in policies

### Tables for Sew4Mi
- **users**: Extended user profiles with role information
- **tailors**: Tailor-specific information and applications
- **orders**: Customer orders and measurements
- **measurements**: Body measurements for custom garments

## Integration with Sew4Mi Features

### Ghana Market Optimization
- **User Profiles**: Store Ghana-specific data (location, mobile money preferences)
- **WhatsApp Integration**: Store WhatsApp contact information
- **Mobile Money**: Integrate with Hubtel payment data

### File Storage
- **Profile Pictures**: User and tailor profile images
- **Garment Images**: Before/after photos, design references
- **Documents**: Verification documents for tailors

## Best Practices

1. **Always use RLS**: Never rely solely on client-side auth checks
2. **Server-side validation**: Validate all inputs on the server
3. **Type safety**: Use generated TypeScript types for database schema
4. **Error handling**: Implement proper error boundaries and user feedback
5. **Session management**: Use middleware for consistent auth state

## Troubleshooting

### Common Issues
- **Session persistence**: Ensure middleware is properly configured
- **RLS conflicts**: Check policy conditions match expected user roles
- **Type errors**: Regenerate types after schema changes
- **CORS issues**: Verify domain configuration in Supabase dashboard

### Development Tips
- Use Supabase CLI for local development
- Monitor real-time connections in dashboard
- Use database webhooks for complex business logic
- Implement proper database migrations