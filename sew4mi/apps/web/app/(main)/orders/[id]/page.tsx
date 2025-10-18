/**
 * Order Detail Page - Individual order tracking and progress view
 * Part of Story 3.4: Order Progress Tracking
 * @file app/(main)/orders/[id]/page.tsx
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { OrderDetailClient } from './OrderDetailClient';

/**
 * Order Detail Page Component (Server Component)
 * Handles authentication and data fetching, then renders client component
 */
export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login?redirect=/orders/' + id);
  }

  // Get user's role from users table
  const { data: userProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const userRole = userProfile?.role || 'CUSTOMER';

  return (
    <OrderDetailClient
      orderId={id}
      userId={user.id}
      userRole={userRole as 'CUSTOMER' | 'TAILOR' | 'ADMIN'}
    />
  );
}

/**
 * Generate metadata for the order detail page
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return {
    title: `Order ${id} - Sew4Mi Marketplace`,
    description: 'Track your custom garment order progress in real-time',
  };
}

