import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { 
  EscrowMilestoneApproveSchema,
  EscrowApprovalResponseSchema 
} from '@sew4mi/shared';
import { EscrowService } from '../../../../../../lib/services/escrow.service';

/**
 * POST /api/orders/[id]/milestone/approve
 * Approve milestone and release payment to tailor
 */
export async function POST(
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

    // Parse and validate request body
    const body = await _request.json();
    const validationResult = EscrowMilestoneApproveSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const { stage, notes } = validationResult.data;

    // Verify order exists and user has permission
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, customer_id, tailor_id, status, escrow_stage')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if user is authorized to approve milestones
    // Customer can approve fitting milestones, both customer and tailor can trigger final payments
    let canApprove = false;
    
    if (stage === 'FITTING' && order.customer_id === user.id) {
      // Customer approves fitting milestone
      canApprove = true;
    } else if (stage === 'FINAL' && (order.customer_id === user.id || order.tailor_id === user.id)) {
      // Both customer and tailor can trigger final payment
      canApprove = true;
    } else {
      // Check if user is admin
      const { data: userData } = await supabase.auth.getUser();
      const userRole = userData?.user?.user_metadata?.role;
      if (userRole === 'admin') {
        canApprove = true;
      }
    }

    if (!canApprove) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Insufficient permissions to approve this milestone' 
        },
        { status: 403 }
      );
    }

    // Check if order is in correct stage
    if (order.escrow_stage !== stage) {
      return NextResponse.json(
        {
          success: false,
          error: `Order is in ${order.escrow_stage} stage, cannot approve ${stage} milestone`
        },
        { status: 400 }
      );
    }

    // Check order status is appropriate for milestone approval
    const validStatusesForApproval: { [key: string]: string[] } = {
      'FITTING': ['DEPOSIT_PAID', 'IN_PROGRESS', 'READY_FOR_FITTING'],
      'FINAL': ['FITTING_APPROVED', 'COMPLETING', 'READY_FOR_DELIVERY']
    };

    const validStatuses = validStatusesForApproval[stage];
    if (validStatuses && !validStatuses.includes(order.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Order status ${order.status} is not valid for ${stage} milestone approval`
        },
        { status: 400 }
      );
    }

    // Approve milestone using escrow service
    const escrowService = new EscrowService();
    const approvalResult = await escrowService.approveMilestone(
      orderId,
      stage,
      user.id,
      notes
    );

    if (!approvalResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to approve milestone'
        },
        { status: 500 }
      );
    }

    // Update order status based on milestone
    let newOrderStatus = order.status;
    if (stage === 'FITTING') {
      newOrderStatus = 'FITTING_APPROVED';
    } else if (stage === 'FINAL') {
      newOrderStatus = 'COMPLETED';
    }

    // Update order status in database
    await supabase
      .from('orders')
      .update({ 
        status: newOrderStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    // Validate response against schema
    const responseData = {
      success: true as const,
      data: {
        orderId,
        stage: approvalResult.newStage,
        amountReleased: approvalResult.amountReleased,
        newStage: approvalResult.newStage,
        transactionId: approvalResult.transactionId
      }
    };

    const validatedResponse = EscrowApprovalResponseSchema.parse(responseData);

    return NextResponse.json(validatedResponse, { status: 200 });

  } catch (error) {
    console.error('Error in milestone approval:', error);

    // Handle specific error types
    if (error instanceof Error && error.message.includes('Invalid stage transition')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid milestone transition',
          details: error.message
        },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('Order not found')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Order not found or invalid escrow state'
        },
        { status: 404 }
      );
    }

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
 * GET /api/orders/[id]/milestone/approve
 * Get milestone approval requirements and current state
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
      .select('id, customer_id, tailor_id, status, escrow_stage')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to view this order
    if (order.customer_id !== user.id && order.tailor_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get current escrow status
    const escrowService = new EscrowService();
    const escrowStatus = await escrowService.getEscrowStatus(orderId);

    if (!escrowStatus) {
      return NextResponse.json(
        { success: false, error: 'Escrow status not found' },
        { status: 404 }
      );
    }

    // Determine what actions are available
    const availableActions: string[] = [];
    
    if (escrowStatus.currentStage === 'FITTING' && order.customer_id === user.id) {
      availableActions.push('APPROVE_FITTING');
    }
    
    if (escrowStatus.currentStage === 'FINAL' && 
        (order.customer_id === user.id || order.tailor_id === user.id)) {
      availableActions.push('APPROVE_FINAL');
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId,
        currentStage: escrowStatus.currentStage,
        orderStatus: order.status,
        escrowBalance: escrowStatus.escrowBalance,
        nextStageAmount: escrowStatus.nextStageAmount,
        availableActions,
        stageHistory: escrowStatus.stageHistory,
        canApprove: availableActions.length > 0
      }
    });

  } catch (error) {
    console.error('Error getting milestone approval info:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}