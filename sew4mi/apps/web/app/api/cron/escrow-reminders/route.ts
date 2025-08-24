import { NextRequest, NextResponse } from 'next/server';
import { EscrowNotificationService } from '../../../../lib/services/escrow-notification.service';
import { EscrowRepository } from '../../../../lib/repositories/escrow.repository';

/**
 * POST /api/cron/escrow-reminders
 * Scheduled job to process escrow payment reminders
 * 
 * This endpoint should be called by a cron job service (like Vercel Cron, GitHub Actions, or external scheduler)
 * Expected to run every hour to check for due reminders
 */
export async function POST(_request: NextRequest) {
  try {
    // Verify the request is from authorized scheduler
    const authHeader = _request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Starting escrow reminders processing:', new Date().toISOString());

    const notificationService = new EscrowNotificationService();
    const escrowRepository = new EscrowRepository();

    // Get orders that need reminder processing
    const activeOrders = await getActiveEscrowOrders(escrowRepository);
    
    let processedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const order of activeOrders) {
      try {
        // Check if order needs reminder notifications
        const needsReminder = await checkIfOrderNeedsReminder(order);
        
        if (needsReminder) {
          await notificationService.scheduleReminderNotifications(order.id);
          processedCount++;
          console.log(`Processed reminders for order ${order.id}`);
        }
      } catch (error) {
        errorCount++;
        const errorMessage = `Failed to process order ${order.id}: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMessage);
        console.error(errorMessage);
      }
    }

    // Process any overdue reminders
    try {
      await notificationService.processOverdueReminders();
    } catch (error) {
      console.error('Failed to process overdue reminders:', error);
      errors.push(`Overdue processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    console.log('Escrow reminders processing completed:', {
      totalOrders: activeOrders.length,
      processedCount,
      errorCount,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      data: {
        totalOrders: activeOrders.length,
        processedCount,
        errorCount,
        errors: errors.slice(0, 10), // Limit error details
        timestamp: new Date().toISOString()
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error in escrow reminders cron job:', error);

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * GET /api/cron/escrow-reminders
 * Get status of escrow reminders system (for monitoring)
 */
export async function GET(_request: NextRequest) {
  try {
    // Verify the request is from authorized monitoring
    const authHeader = _request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const escrowRepository = new EscrowRepository();
    
    // Get current escrow system status
    const activeOrders = await getActiveEscrowOrders(escrowRepository);
    const totalEscrowFunds = await escrowRepository.getTotalEscrowFunds();
    
    // Count orders by stage
    const ordersByStage = activeOrders.reduce((acc, order) => {
      acc[order.escrowStage] = (acc[order.escrowStage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Check for orders that might need attention
    const overdueOrders = activeOrders.filter(order => 
      isOrderOverdue(order)
    ).length;

    return NextResponse.json({
      success: true,
      data: {
        systemStatus: 'operational',
        totalActiveOrders: activeOrders.length,
        totalEscrowFunds,
        ordersByStage,
        overdueOrders,
        lastChecked: new Date().toISOString(),
        nextScheduledRun: getNextRunTime()
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error getting escrow reminders status:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to get system status',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * Get orders that have active escrow processes
 */
async function getActiveEscrowOrders(escrowRepository: EscrowRepository): Promise<any[]> {
  try {
    // Get orders in stages that need monitoring
    const depositOrders = await escrowRepository.getOrdersByEscrowStage('DEPOSIT');
    const fittingOrders = await escrowRepository.getOrdersByEscrowStage('FITTING');
    const finalOrders = await escrowRepository.getOrdersByEscrowStage('FINAL');

    return [...depositOrders, ...fittingOrders, ...finalOrders];
  } catch (error) {
    console.error('Error fetching active escrow orders:', error);
    return [];
  }
}

/**
 * Check if an order needs reminder notifications
 */
async function checkIfOrderNeedsReminder(order: any): Promise<boolean> {
  const now = new Date();
  const orderUpdated = new Date(order.updated_at);
  const hoursSinceUpdate = (now.getTime() - orderUpdated.getTime()) / (1000 * 60 * 60);

  // Business rules for when to send reminders
  switch (order.escrow_stage) {
    case 'DEPOSIT':
      // Send reminder if deposit hasn't been paid for 2+ hours
      return hoursSinceUpdate >= 2 && !order.deposit_paid_at;
    
    case 'FITTING':
      // Send reminder if fitting hasn't been approved for 24+ hours
      return hoursSinceUpdate >= 24 && !order.fitting_paid_at;
    
    case 'FINAL':
      // Send reminder if final payment hasn't been released for 6+ hours
      return hoursSinceUpdate >= 6 && !order.final_paid_at;
    
    default:
      return false;
  }
}

/**
 * Check if an order is overdue based on business rules
 */
function isOrderOverdue(order: any): boolean {
  const now = new Date();
  const orderCreated = new Date(order.created_at);
  const daysSinceCreated = (now.getTime() - orderCreated.getTime()) / (1000 * 60 * 60 * 24);

  // Define overdue thresholds
  const overdueThresholds = {
    'DEPOSIT': 2, // 2 days to pay deposit
    'FITTING': 14, // 14 days for fitting process
    'FINAL': 7 // 7 days for delivery
  };

  const threshold = overdueThresholds[order.escrow_stage as keyof typeof overdueThresholds];
  return threshold ? daysSinceCreated > threshold : false;
}

/**
 * Calculate next scheduled run time (assuming hourly runs)
 */
function getNextRunTime(): string {
  const nextRun = new Date();
  nextRun.setHours(nextRun.getHours() + 1, 0, 0, 0); // Next hour
  return nextRun.toISOString();
}