/**
 * Bulk Progress Update API Routes
 * PUT /api/tailors/group-orders/[id]/items/bulk-progress - Bulk update progress for multiple items
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { createErrorResponse } from '@/lib/utils/api-error-handler';
import { OrderStatus } from '@sew4mi/shared/types';
import { BulkProgressUpdateSchema, formatZodErrors } from '@/lib/validation/group-order.schemas';
import { NotificationService, NotificationType } from '@/lib/services/notification.service';
import { AuditLogService, getIPAddress } from '@/lib/services/audit-log.service';

interface BulkProgressUpdate {
  selectedItemIds: string[];
  newStatus: OrderStatus;
  progressNotes: string;
  progressPhotos: string[];
  notifyCustomers: boolean;
}

/**
 * PUT /api/tailors/group-orders/[id]/items/bulk-progress
 * Bulk update progress for multiple group order items
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupOrderId } = await params;
    const body: BulkProgressUpdate = await request.json();

    // Validate request body
    const validation = BulkProgressUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          errors: formatZodErrors(validation.error)
        },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify tailor owns this group order
    const { data: groupOrder, error: verifyError } = await supabase
      .from('group_orders')
      .select('tailor_id')
      .eq('id', groupOrderId)
      .single();

    if (verifyError || groupOrder?.tailor_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Calculate progress percentage based on status
    const progressMap: Record<OrderStatus, number> = {
      [OrderStatus.PENDING]: 0,
      [OrderStatus.AWAITING_DEPOSIT]: 10,
      [OrderStatus.DEPOSIT_RECEIVED]: 20,
      [OrderStatus.IN_PROGRESS]: 50,
      [OrderStatus.AWAITING_FITTING]: 70,
      [OrderStatus.AWAITING_FINAL_PAYMENT]: 85,
      [OrderStatus.READY_FOR_DELIVERY]: 95,
      [OrderStatus.COMPLETED]: 100,
      [OrderStatus.CANCELLED]: 0
    };

    const newProgressPercentage = progressMap[body.newStatus] || 0;

    // Start transaction - update all selected items
    const updatePromises = body.selectedItemIds.map(async (itemId) => {
      // Update group order item
      const { error: updateError } = await supabase
        .from('group_order_items')
        .update({
          status: body.newStatus,
          progress_percentage: newProgressPercentage,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)
        .eq('group_order_id', groupOrderId);

      if (updateError) {
        throw updateError;
      }

      // Get the order ID for this item
      const { data: item } = await supabase
        .from('group_order_items')
        .select('order_id')
        .eq('id', itemId)
        .single();

      if (item?.order_id) {
        // Update the corresponding order
        await supabase
          .from('orders')
          .update({
            status: body.newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.order_id);

        // Create milestone entry
        await supabase
          .from('milestones')
          .insert({
            order_id: item.order_id,
            milestone_type: body.newStatus,
            completed_at: new Date().toISOString(),
            notes: body.progressNotes,
            photos: body.progressPhotos,
            created_at: new Date().toISOString()
          });
      }

      return itemId;
    });

    const updatedItemIds = await Promise.all(updatePromises);

    // Update group order status based on item statuses
    const { data: allItems } = await supabase
      .from('group_order_items')
      .select('status')
      .eq('group_order_id', groupOrderId);

    if (allItems) {
      const completedCount = allItems.filter(i => i.status === OrderStatus.COMPLETED).length;
      const totalCount = allItems.length;

      let groupStatus = 'IN_PROGRESS';
      if (completedCount === totalCount) {
        groupStatus = 'COMPLETED';
      } else if (completedCount > 0) {
        groupStatus = 'PARTIALLY_COMPLETED';
      }

      await supabase
        .from('group_orders')
        .update({
          status: groupStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', groupOrderId);
    }

    // Send notifications if requested
    if (body.notifyCustomers) {
      // Get customer IDs for notification
      const { data: items } = await supabase
        .from('group_order_items')
        .select('payment_responsibility, family_member_name, order_id')
        .in('id', body.selectedItemIds);

      if (items) {
        // Send notifications via notification service
        const notificationService = new NotificationService();
        const uniqueCustomers = [...new Set(items.map(i => i.payment_responsibility))];
        
        await Promise.allSettled(
          uniqueCustomers.map(customerId =>
            notificationService.sendNotification({
              userId: customerId,
              type: NotificationType.PROGRESS_UPDATE,
              title: 'Progress Update',
              message: body.progressNotes,
              data: {
                groupOrderId,
                newStatus: body.newStatus,
                photos: body.progressPhotos
              },
              channels: ['in-app', 'whatsapp'],
              priority: 'normal'
            })
          )
        );
      }
    }

    // Audit log the bulk update
    const auditService = new AuditLogService();
    await auditService.logBulkProgressUpdate(
      user.id,
      groupOrderId,
      body.selectedItemIds,
      body.newStatus,
      getIPAddress(request)
    );

    return NextResponse.json({
      success: true,
      updatedItemIds,
      message: `Successfully updated ${updatedItemIds.length} item(s)`
    });
    
  } catch (error) {
    console.error('Error updating bulk progress:', error);
    return createErrorResponse(error as Error, 500);
  }
}

