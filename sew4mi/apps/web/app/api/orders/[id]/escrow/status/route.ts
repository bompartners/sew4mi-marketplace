import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { EscrowStatusResponseSchema } from '@sew4mi/shared';
import { EscrowService } from '../../../../../../lib/services/escrow.service';

/**
 * GET /api/orders/[id]/escrow/status
 * Get current escrow status for an order
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerComponentClient({ cookies });
    const orderId = (await params).id;
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify order exists and user has permission
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, customer_id, tailor_id, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to view this order's escrow status
    const isCustomer = order.customer_id === user.id;
    const isTailor = order.tailor_id === user.id;
    
    // Check if user is admin
    let isAdmin = false;
    try {
      const { data: adminCheckData } = await supabase.auth.getUser();
      const userRole = adminCheckData?.user?.user_metadata?.role;
      isAdmin = userRole === 'admin';
    } catch {
      // Continue without admin privileges
    }

    if (!isCustomer && !isTailor && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get escrow status
    const escrowService = new EscrowService();
    const escrowStatus = await escrowService.getEscrowStatus(orderId);

    if (!escrowStatus) {
      return NextResponse.json(
        { success: false, error: 'Escrow status not found' },
        { status: 404 }
      );
    }

    // Calculate additional information
    const progressPercentage = calculateProgressPercentage(escrowStatus);
    const nextMilestone = getNextMilestone(escrowStatus.currentStage);
    
    // Validate response against schema
    const responseData = {
      success: true as const,
      data: {
        ...escrowStatus,
        progressPercentage,
        nextMilestone,
        orderStatus: order.status
      }
    };

    const validatedResponse = EscrowStatusResponseSchema.parse(responseData);

    return NextResponse.json(validatedResponse, { status: 200 });

  } catch (error) {
    console.error('Error getting escrow status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate progress percentage based on escrow stage
 */
function calculateProgressPercentage(escrowStatus: any): number {
  const stageProgressMap: { [key: string]: number } = {
    'DEPOSIT': 25,     // Deposit paid
    'FITTING': 75,     // Deposit + Fitting paid
    'FINAL': 95,       // All payments except final
    'RELEASED': 100    // All payments released
  };

  return stageProgressMap[escrowStatus.currentStage] || 0;
}

/**
 * Get next milestone information
 */
function getNextMilestone(currentStage: string): { 
  stage: string; 
  description: string; 
  requiredAction?: string 
} | null {
  const milestoneMap: { [key: string]: { stage: string; description: string; requiredAction?: string } | null } = {
    'DEPOSIT': {
      stage: 'FITTING',
      description: 'Fitting approval required',
      requiredAction: 'Customer must approve fitting photos'
    },
    'FITTING': {
      stage: 'FINAL',
      description: 'Delivery confirmation required',
      requiredAction: 'Delivery must be confirmed'
    },
    'FINAL': {
      stage: 'RELEASED',
      description: 'Final payment release',
      requiredAction: 'Final payment will be released automatically'
    },
    'RELEASED': null
  };

  return milestoneMap[currentStage] || null;
}