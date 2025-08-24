import { NextRequest, NextResponse } from 'next/server';
import { DisputeService } from '@/lib/services/dispute.service';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';

const assignDisputeSchema = z.object({
  adminId: z.string().uuid('Invalid admin ID')
});

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    // Verify admin role
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('roles (name)')
      .eq('user_id', user.id)
      .eq('roles.name', 'admin')
      .single();

    if (!adminRole) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await _request.json();
    const validationResult = assignDisputeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.issues 
        },
        { status: 400 }
      );
    }

    const disputeId = id;
    const { adminId } = validationResult.data;

    // Verify the assigned admin exists and has admin role
    const { data: targetAdmin } = await supabase
      .from('user_roles')
      .select('users (id, full_name, email), roles (name)')
      .eq('user_id', adminId)
      .eq('roles.name', 'admin')
      .single();

    if (!targetAdmin) {
      return NextResponse.json(
        { error: 'Invalid admin ID or user is not an admin' },
        { status: 400 }
      );
    }

    // Check if dispute exists and is in a state that can be assigned
    const { data: dispute, error: disputeError } = await supabase
      .from('disputes')
      .select('id, status, assigned_admin')
      .eq('id', disputeId)
      .single();

    if (disputeError || !dispute) {
      return NextResponse.json(
        { error: 'Dispute not found' },
        { status: 404 }
      );
    }

    if (dispute.status === 'RESOLVED' || dispute.status === 'CLOSED') {
      return NextResponse.json(
        { error: 'Cannot assign resolved or closed disputes' },
        { status: 400 }
      );
    }

    // Assign dispute using service
    const disputeService = new DisputeService();
    const result = await disputeService.assignDispute(disputeId, adminId);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // Log assignment action
    await supabase
      .from('dispute_messages')
      .insert({
        dispute_id: disputeId,
        sender_id: user.id,
        sender_role: 'ADMIN',
        message: `Dispute assigned to ${targetAdmin.users[0]?.full_name} (${targetAdmin.users[0]?.email})`,
        is_internal_note: true
      });

    return NextResponse.json({
      message: 'Dispute assigned successfully',
      dispute: result.data,
      assignedTo: {
        id: targetAdmin.users[0]?.id,
        name: targetAdmin.users[0]?.full_name,
        email: targetAdmin.users[0]?.email
      }
    });

  } catch (error) {
    console.error('Assign dispute error:', error);
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}