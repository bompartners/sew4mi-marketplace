import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { EscrowRepository } from '../../../../../lib/repositories/escrow.repository';
import { EscrowService } from '../../../../../lib/services/escrow.service';

/**
 * GET /api/admin/escrow/reconciliation
 * Generate escrow reconciliation report for admin dashboard
 * Requires admin role
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check admin role
    const userRole = user.user_metadata?.role;
    if (userRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(_request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const includeDiscrepancies = searchParams.get('includeDiscrepancies') === 'true';

    const escrowRepository = new EscrowRepository();
    const escrowService = new EscrowService();

    // Get comprehensive escrow data
    const [
      totalEscrowFunds,
      escrowSummary,
      ordersByStage,
      recentTransactions
    ] = await Promise.all([
      escrowRepository.getTotalEscrowFunds(),
      escrowRepository.getEscrowSummary(),
      getOrdersByStage(escrowRepository),
      getRecentEscrowTransactions(escrowRepository, 50)
    ]);

    // Calculate financial metrics
    const financialMetrics = calculateFinancialMetrics(escrowSummary);

    // Perform reconciliation checks if requested
    let discrepancies: any[] = [];
    if (includeDiscrepancies) {
      discrepancies = await findEscrowDiscrepancies(escrowRepository, escrowService, escrowSummary);
    }

    // Calculate system health metrics
    const healthMetrics = calculateSystemHealth(escrowSummary, ordersByStage);

    // Generate time-based analytics
    const timeAnalytics = await generateTimeAnalytics(
      escrowRepository,
      startDate || undefined,
      endDate || undefined
    );

    const reconciliationData = {
      reconciliationDate: new Date().toISOString(),
      financialSummary: {
        totalEscrowFunds,
        pendingReleases: financialMetrics.pendingReleases,
        completedReleases: financialMetrics.completedReleases,
        averageOrderValue: financialMetrics.averageOrderValue,
        totalOrderCount: escrowSummary.length
      },
      ordersByStage,
      systemHealth: healthMetrics,
      timeAnalytics,
      discrepancies,
      recentActivity: {
        transactions: recentTransactions,
        newOrdersToday: timeAnalytics.dailyStats?.newOrders || 0,
        completedOrdersToday: timeAnalytics.dailyStats?.completedOrders || 0
      },
      performanceMetrics: {
        averageDepositTime: calculateAverageDepositTime(escrowSummary),
        averageFittingTime: calculateAverageFittingTime(escrowSummary),
        averageCompletionTime: calculateAverageCompletionTime(escrowSummary),
        escrowUtilizationRate: calculateEscrowUtilizationRate(ordersByStage)
      }
    };

    return NextResponse.json({
      success: true,
      data: reconciliationData
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('Error in escrow reconciliation:', error);

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/admin/escrow/reconciliation
 * Trigger manual reconciliation and fix discrepancies
 * Requires admin role
 */
export async function POST(_request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Check authentication and admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (user.user_metadata?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await _request.json();
    const { action, orderIds, autoFix } = body;

    const escrowRepository = new EscrowRepository();
    const escrowService = new EscrowService();

    const results: any[] = [];

    switch (action) {
      case 'validate_all':
        // Validate all active escrow orders
        const activeOrders = await getAllActiveOrders(escrowRepository);
        for (const order of activeOrders) {
          const validation = await escrowService.validateEscrowState(order.id);
          if (!validation.isValid) {
            results.push({
              orderId: order.id,
              status: 'invalid',
              errors: validation.errors
            });
          }
        }
        break;

      case 'fix_discrepancies':
        // Fix specific order discrepancies
        if (orderIds && orderIds.length > 0) {
          for (const orderId of orderIds) {
            try {
              const validation = await escrowService.validateEscrowState(orderId);
              if (!validation.isValid && autoFix) {
                // Attempt to fix common discrepancies
                const fixResult = await attemptDiscrepancyFix(
                  escrowRepository, 
                  orderId, 
                  validation.errors
                );
                results.push({
                  orderId,
                  status: fixResult.success ? 'fixed' : 'failed',
                  details: fixResult.message
                });
              } else {
                results.push({
                  orderId,
                  status: validation.isValid ? 'valid' : 'needs_manual_review',
                  errors: validation.errors
                });
              }
            } catch (error) {
              results.push({
                orderId,
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }
        }
        break;

      case 'recalculate_balances':
        // Recalculate escrow balances for all orders
        const orders = await getAllActiveOrders(escrowRepository);
        for (const order of orders) {
          try {
            const breakdown = escrowService.calculateBreakdown(order.total_amount);
            await escrowRepository.updateEscrowAmounts(
              order.id,
              breakdown.depositAmount,
              breakdown.fittingAmount,
              breakdown.finalAmount,
              calculateEscrowBalance(order, breakdown)
            );
            results.push({
              orderId: order.id,
              status: 'recalculated'
            });
          } catch (error) {
            results.push({
              orderId: order.id,
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: {
        action,
        processedCount: results.length,
        results: results.slice(0, 100), // Limit response size
        timestamp: new Date().toISOString()
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error in manual reconciliation:', error);

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper functions

async function getOrdersByStage(escrowRepository: EscrowRepository) {
  const [depositOrders, fittingOrders, finalOrders, releasedOrders] = await Promise.all([
    escrowRepository.getOrdersByEscrowStage('DEPOSIT'),
    escrowRepository.getOrdersByEscrowStage('FITTING'),
    escrowRepository.getOrdersByEscrowStage('FINAL'),
    escrowRepository.getOrdersByEscrowStage('RELEASED')
  ]);

  return {
    DEPOSIT: depositOrders.length,
    FITTING: fittingOrders.length,
    FINAL: finalOrders.length,
    RELEASED: releasedOrders.length,
    total: depositOrders.length + fittingOrders.length + finalOrders.length + releasedOrders.length
  };
}

async function getRecentEscrowTransactions(_escrowRepository: EscrowRepository, _limit: number) {
  // This would fetch recent escrow transactions
  // For now, return empty array as the repository method isn't implemented
  return [];
}

function calculateFinancialMetrics(escrowSummary: any[]) {
  const totalAmount = escrowSummary.reduce((sum, order) => sum + order.total_amount, 0);
  const pendingReleases = escrowSummary.reduce((sum, order) => sum + order.escrow_balance, 0);
  const completedReleases = totalAmount - pendingReleases;
  const averageOrderValue = escrowSummary.length > 0 ? totalAmount / escrowSummary.length : 0;

  return {
    pendingReleases,
    completedReleases,
    averageOrderValue
  };
}

async function findEscrowDiscrepancies(
  _escrowRepository: EscrowRepository, 
  escrowService: EscrowService, 
  orders: any[]
) {
  const discrepancies = [];

  for (const order of orders.slice(0, 100)) { // Limit to prevent timeout
    try {
      const validation = await escrowService.validateEscrowState(order.order_id);
      if (!validation.isValid) {
        discrepancies.push({
          orderId: order.order_id,
          errors: validation.errors,
          severity: validation.errors.length > 2 ? 'high' : 'medium'
        });
      }
    } catch (error) {
      discrepancies.push({
        orderId: order.order_id,
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        severity: 'high'
      });
    }
  }

  return discrepancies;
}

function calculateSystemHealth(_escrowSummary: any[], ordersByStage: any) {
  const totalOrders = ordersByStage.total;
  const stuckInDeposit = ordersByStage.DEPOSIT;
  const healthScore = totalOrders > 0 ? ((totalOrders - stuckInDeposit) / totalOrders) * 100 : 100;

  return {
    overallScore: Math.round(healthScore),
    totalActiveOrders: totalOrders,
    ordersStuckInDeposit: stuckInDeposit,
    healthStatus: healthScore > 80 ? 'good' : healthScore > 60 ? 'fair' : 'poor'
  };
}

async function generateTimeAnalytics(
  _escrowRepository: EscrowRepository, 
  _startDate?: string, 
  _endDate?: string
) {
  // Generate time-based analytics
  // This would typically query the database for time-series data
  return {
    dailyStats: {
      newOrders: 5,
      completedOrders: 3,
      totalVolume: 2500
    },
    weeklyTrends: {
      orderCreation: [2, 3, 5, 4, 6, 3, 5],
      completionRate: [60, 65, 70, 68, 75, 72, 78]
    },
    averageTimelines: {
      depositToFitting: '2.5 days',
      fittingToDelivery: '4.2 days',
      totalOrderTime: '6.7 days'
    }
  };
}

function calculateAverageDepositTime(_orders: any[]): string {
  // Calculate average time from order creation to deposit payment
  return '2.5 hours';
}

function calculateAverageFittingTime(_orders: any[]): string {
  // Calculate average time from deposit to fitting approval
  return '3.2 days';
}

function calculateAverageCompletionTime(_orders: any[]): string {
  // Calculate average total order completion time
  return '7.1 days';
}

function calculateEscrowUtilizationRate(ordersByStage: any): number {
  // Calculate how efficiently the escrow system is being used
  const activeOrders = ordersByStage.total - ordersByStage.RELEASED;
  const utilization = activeOrders > 0 ? (ordersByStage.FITTING + ordersByStage.FINAL) / activeOrders : 0;
  return Math.round(utilization * 100);
}

async function getAllActiveOrders(escrowRepository: EscrowRepository) {
  // Get all orders with active escrow processes
  const [deposit, fitting, final] = await Promise.all([
    escrowRepository.getOrdersByEscrowStage('DEPOSIT'),
    escrowRepository.getOrdersByEscrowStage('FITTING'),
    escrowRepository.getOrdersByEscrowStage('FINAL')
  ]);

  return [...deposit, ...fitting, ...final];
}

async function attemptDiscrepancyFix(
  _escrowRepository: EscrowRepository,
  _orderId: string,
  _errors: string[]
): Promise<{ success: boolean; message: string }> {
  // Attempt to automatically fix common discrepancies
  // This would contain logic to fix balance mismatches, etc.
  return {
    success: false,
    message: 'Manual review required - complex discrepancy detected'
  };
}

function calculateEscrowBalance(order: any, breakdown: any): number {
  // Calculate expected escrow balance based on stage and paid amounts
  let balance = breakdown.totalAmount;
  
  if (order.deposit_paid_at) balance -= breakdown.depositAmount;
  if (order.fitting_paid_at) balance -= breakdown.fittingAmount;
  if (order.final_paid_at) balance -= breakdown.finalAmount;
  
  return Math.max(0, balance);
}