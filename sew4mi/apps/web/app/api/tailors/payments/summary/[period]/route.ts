import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PaymentAnalyticsService } from '@/lib/services/payment-analytics.service';
import { z } from 'zod';

const PeriodParamSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be in YYYY-MM format')
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ period: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user is a tailor
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || userData?.role !== 'TAILOR') {
      return NextResponse.json(
        { error: 'Access denied. Tailor role required.' },
        { status: 403 }
      );
    }

    // Validate period parameter
    const resolvedParams = await params;
    const parsed = PeriodParamSchema.safeParse({ period: resolvedParams.period });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid period format. Use YYYY-MM format (e.g., 2024-08)' },
        { status: 400 }
      );
    }

    const { period } = parsed.data;

    // Validate that the period is not in the future
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    
    if (period > currentPeriod) {
      return NextResponse.json(
        { error: 'Cannot request data for future periods' },
        { status: 400 }
      );
    }

    // Get monthly earnings summary
    const paymentService = new PaymentAnalyticsService();
    const summary = await paymentService.getMonthlyEarningsSummary(user.id, period);

    if (!summary) {
      return NextResponse.json({
        success: true,
        data: null,
        message: `No payment data found for period ${period}`
      });
    }

    // Get comparison with previous month
    const [year, month] = period.split('-').map(Number);
    const previousDate = new Date(year, month - 2, 1); // month - 2 because months are 0-indexed
    const previousPeriod = `${previousDate.getFullYear()}-${(previousDate.getMonth() + 1).toString().padStart(2, '0')}`;
    
    const previousSummary = await paymentService.getMonthlyEarningsSummary(user.id, previousPeriod);

    // Calculate growth percentages
    const growthMetrics = previousSummary ? {
      earningsGrowth: calculateGrowthPercentage(summary.totalEarnings, previousSummary.totalEarnings),
      ordersGrowth: calculateGrowthPercentage(summary.totalOrders, previousSummary.totalOrders),
      averageOrderValueGrowth: calculateGrowthPercentage(summary.averageOrderValue, previousSummary.averageOrderValue)
    } : null;

    return NextResponse.json({
      success: true,
      data: {
        summary,
        previousPeriod: previousSummary,
        growth: growthMetrics,
        period: {
          current: period,
          previous: previousPeriod
        }
      }
    });

  } catch (error) {
    console.error('Error fetching period summary:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch period summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function calculateGrowthPercentage(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 100) / 100; // Round to 2 decimal places
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