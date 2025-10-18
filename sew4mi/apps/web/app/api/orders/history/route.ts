import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { 
  OrderHistoryResponse,
  OrderHistoryItem,
  OrderStatus
} from '@sew4mi/shared/types';

/**
 * GET /api/orders/history
 * Gets paginated order history for a user (customer or tailor)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, errors: ['Authentication required'] },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    
    const querySchema = z.object({
      customerId: z.string().uuid().optional(),
      tailorId: z.string().uuid().optional(),
      status: z.string().optional(),
      limit: z.coerce.number().min(1).max(50).default(20),
      offset: z.coerce.number().min(0).default(0),
      sortBy: z.enum(['created_at', 'updated_at', 'estimated_delivery']).default('created_at'),
      sortOrder: z.enum(['asc', 'desc']).default('desc')
    });

    const {
      customerId,
      tailorId,
      status,
      limit,
      offset,
      sortBy,
      sortOrder
    } = querySchema.parse({
      customerId: searchParams.get('customerId'),
      tailorId: searchParams.get('tailorId'),
      status: searchParams.get('status'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder')
    });

    // Build query - user can only see their own orders
    let query = supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_id,
        tailor_id,
        garment_type,
        status,
        total_amount,
        created_at,
        estimated_delivery,
        customer:user_profiles!orders_customer_id_fkey(first_name, last_name),
        tailor:user_profiles!orders_tailor_id_fkey(first_name, last_name),
        milestones:order_milestones(status)
      `, { count: 'exact' });

    // Filter by user access - can see orders as customer or tailor
    query = query.or(`customer_id.eq.${user.id},tailor_id.eq.${user.id}`);

    // Apply additional filters if provided (and user has access)
    if (customerId && customerId === user.id) {
      query = query.eq('customer_id', customerId);
    } else if (tailorId && tailorId === user.id) {
      query = query.eq('tailor_id', tailorId);
    }

    if (status) {
      const statusFilters = status.split(',');
      query = query.in('status', statusFilters);
    }

    // Apply sorting and pagination
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    const { data: orders, error: ordersError, count } = await query;

    if (ordersError) {
      console.error('Order history fetch error:', ordersError);
      return NextResponse.json(
        { success: false, errors: ['Failed to fetch order history'] },
        { status: 500 }
      );
    }

    // Calculate progress percentage for each order
    const ordersWithProgress: OrderHistoryItem[] = (orders || []).map(order => {
      const completedMilestones = order.milestones?.filter((m: any) => 
        m.status === 'APPROVED' || m.status === 'COMPLETED'
      ).length || 0;
      const totalMilestones = order.milestones?.length || 3; // Default to 3 milestones
      
      const progressPercentage = totalMilestones > 0 
        ? Math.round((completedMilestones / totalMilestones) * 100)
        : 0;

      return {
        id: order.id,
        orderNumber: order.order_number,
        customerName: `${order.customer?.first_name} ${order.customer?.last_name}`.trim(),
        tailorName: `${order.tailor?.first_name} ${order.tailor?.last_name}`.trim(),
        garmentType: order.garment_type,
        status: order.status as OrderStatus,
        progressPercentage,
        totalAmount: order.total_amount,
        createdAt: new Date(order.created_at),
        estimatedCompletion: order.estimated_delivery ? new Date(order.estimated_delivery) : undefined,
        thumbnailUrl: undefined // TODO: Get first milestone photo
      };
    });

    const response: OrderHistoryResponse = {
      orders: ordersWithProgress,
      totalCount: count || 0,
      hasMore: (count || 0) > offset + limit
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return NextResponse.json(
        { success: false, errors },
        { status: 400 }
      );
    }

    console.error('Order history error:', error);
    return NextResponse.json(
      { success: false, errors: ['Internal server error'] },
      { status: 500 }
    );
  }
}