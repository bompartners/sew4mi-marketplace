import { NextRequest, NextResponse } from 'next/server';
import { DisputeService } from '@/lib/services/dispute.service';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(_request: NextRequest) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(_request.url);
    const status = searchParams.get('status') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const category = searchParams.get('category') || undefined;
    const assignedAdmin = searchParams.get('assignedAdmin') || undefined;
    const overdue = searchParams.get('overdue') === 'true' || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

    // Check if user is admin
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('roles (name)')
      .eq('user_id', user.id)
      .eq('roles.name', 'admin')
      .single();

    const isAdmin = !!adminRole;

    // Build filters based on user role
    const filters: any = {
      status,
      priority,
      category,
      overdue,
      limit,
      offset
    };

    if (isAdmin) {
      // Admins can filter by assignedAdmin
      if (assignedAdmin) {
        filters.assignedAdmin = assignedAdmin;
      }
    } else {
      // Regular users can only see their own disputes
      filters.customerId = user.id;
      // Also check if they're a tailor
      const { data: tailorProfile } = await supabase
        .from('user_roles')
        .select('roles (name)')
        .eq('user_id', user.id)
        .eq('roles.name', 'tailor')
        .single();

      if (tailorProfile) {
        filters.tailorId = user.id;
        // Remove customerId filter to allow seeing both customer and tailor disputes
        delete filters.customerId;
      }
    }

    // Get disputes
    const disputeService = new DisputeService();
    const result = await disputeService.getDisputes(filters);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      disputes: result.data,
      pagination: {
        limit,
        offset,
        total: result.data?.length || 0
      }
    });

  } catch (error) {
    console.error('Get disputes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}