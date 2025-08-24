import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { PaymentAnalyticsService } from '@/lib/services/payment-analytics.service';
import { 
  exportPaymentHistoryCSV, 
  PAYMENT_HISTORY_COLUMNS,
  EXPORT_PRESETS,
  validateCSVExportRequest,
  generateCSVFilename
} from '@/lib/utils/csv-export';
import { z } from 'zod';

const ExportRequestSchema = z.object({
  format: z.enum(['CSV']).default('CSV'),
  preset: z.enum(['FULL_PAYMENT_HISTORY', 'ACCOUNTING_EXPORT', 'TAX_REPORT']).optional(),
  dateFrom: z.string().optional().transform(val => val ? new Date(val) : undefined),
  dateTo: z.string().optional().transform(val => val ? new Date(val) : undefined),
  status: z.array(z.enum(['PENDING', 'COMPLETED', 'DISPUTED', 'REFUNDED'])).optional(),
  columns: z.array(z.string()).optional(),
  filename: z.string().optional()
});

// Rate limiting store (in production, use Redis or similar)
const exportRateLimit = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_EXPORTS_PER_HOUR = 5;

function checkRateLimit(userId: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const userLimit = exportRateLimit.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    // Reset or initialize rate limit
    exportRateLimit.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }
  
  if (userLimit.count >= MAX_EXPORTS_PER_HOUR) {
    return { allowed: false, resetTime: userLimit.resetTime };
  }
  
  userLimit.count += 1;
  return { allowed: true };
}

export async function POST(_request: NextRequest) {
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

    // Check rate limit
    const rateLimitCheck = checkRateLimit(user.id);
    if (!rateLimitCheck.allowed) {
      const resetTime = new Date(rateLimitCheck.resetTime!);
      return NextResponse.json(
        { 
          error: 'Export rate limit exceeded',
          message: `You can perform ${MAX_EXPORTS_PER_HOUR} exports per hour. Rate limit resets at ${resetTime.toISOString()}`
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await _request.json();
    const parsed = ExportRequestSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid export parameters', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { preset, dateFrom, dateTo, status, columns, filename } = parsed.data;
    // format is not used in current implementation

    // Build filters for data retrieval
    const filters = {
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo }),
      ...(status && { status })
    };

    // Get payment history data
    const paymentService = new PaymentAnalyticsService();
    
    // Get all data (no pagination for export)
    const historyData = await paymentService.getPaymentHistory(user.id, filters, 1, 10000);

    // Validate export request
    const validation = validateCSVExportRequest(historyData.items);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Determine column configuration
    let exportColumns = PAYMENT_HISTORY_COLUMNS;
    if (preset && EXPORT_PRESETS[preset]) {
      exportColumns = EXPORT_PRESETS[preset];
    } else if (columns && columns.length > 0) {
      // Custom columns (filter existing columns)
      exportColumns = PAYMENT_HISTORY_COLUMNS.filter(col => 
        columns.includes(col.key)
      );
    }

    // Generate CSV
    const csvBlob = exportPaymentHistoryCSV(
      historyData.items,
      {
        filename: filename || generateCSVFilename('payment_history'),
        columns: exportColumns,
        ...(dateFrom && dateTo && { dateRange: { from: dateFrom, to: dateTo } })
      }
    );

    // Convert blob to buffer for response
    const buffer = await csvBlob.arrayBuffer();
    const csvContent = Buffer.from(buffer);

    const exportFilename = filename || generateCSVFilename('payment_history');

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${exportFilename}"`,
        'Content-Length': csvContent.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error exporting payment data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to export payment data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
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