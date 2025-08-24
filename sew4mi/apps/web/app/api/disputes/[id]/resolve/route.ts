import { NextRequest, NextResponse } from 'next/server';
import { DisputeResolutionService } from '@/lib/services/dispute-resolution.service';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { DisputeResolutionType } from '@sew4mi/shared/types/dispute';

const resolveDisputeSchema = z.object({
  resolutionType: z.enum(['FULL_REFUND', 'PARTIAL_REFUND', 'ORDER_COMPLETION', 'NO_ACTION']),
  outcome: z.string().min(10, 'Outcome description must be at least 10 characters'),
  reasonCode: z.string().min(1, 'Reason code is required'),
  adminNotes: z.string().min(5, 'Admin notes must be at least 5 characters'),
  refundAmount: z.number().optional()
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
    const validationResult = resolveDisputeSchema.safeParse(body);

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
    const resolutionData = validationResult.data;

    // Additional validation for partial refunds
    if (resolutionData.resolutionType === 'PARTIAL_REFUND' && !resolutionData.refundAmount) {
      return NextResponse.json(
        { error: 'Refund amount is required for partial refunds' },
        { status: 400 }
      );
    }

    // Check if dispute exists and can be resolved
    const { data: dispute, error: disputeError } = await supabase
      .from('disputes')
      .select(`
        id, 
        status, 
        assigned_admin,
        orders (id, total_amount, status)
      `)
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
        { error: 'Dispute is already resolved' },
        { status: 400 }
      );
    }

    // Validate refund amount against order total
    if (resolutionData.refundAmount && resolutionData.refundAmount > dispute.orders[0]?.total_amount) {
      return NextResponse.json(
        { error: 'Refund amount cannot exceed order total' },
        { status: 400 }
      );
    }

    // Resolve dispute using service
    const resolutionService = new DisputeResolutionService();
    const result = await resolutionService.resolveDispute({
      disputeId,
      ...resolutionData,
      resolutionType: resolutionData.resolutionType as DisputeResolutionType
    });

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // Log resolution action
    await supabase
      .from('dispute_messages')
      .insert({
        dispute_id: disputeId,
        sender_id: user.id,
        sender_role: 'ADMIN',
        message: `Dispute resolved with ${resolutionData.resolutionType}: ${resolutionData.outcome}`,
        is_internal_note: false // Visible to all parties
      });

    return NextResponse.json({
      message: 'Dispute resolved successfully',
      resolution: result.data
    });

  } catch (error) {
    console.error('Resolve dispute error:', error);
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