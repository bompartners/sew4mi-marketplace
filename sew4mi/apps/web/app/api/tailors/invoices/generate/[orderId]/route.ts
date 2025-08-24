import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { TaxInvoiceService } from '@/lib/services/tax-invoice.service';
import { CommissionService } from '@/lib/services/commission.service';
import { z } from 'zod';

const OrderIdParamSchema = z.object({
  orderId: z.string().uuid('Order ID must be a valid UUID')
});

const GenerateInvoiceBodySchema = z.object({
  ghanaVatNumber: z.string().optional(),
  issue: z.boolean().default(false) // Whether to immediately issue the invoice
});

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
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

    // Validate order ID parameter
    const resolvedParams = await params;
    const parsed = OrderIdParamSchema.safeParse({ orderId: resolvedParams.orderId });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid order ID format' },
        { status: 400 }
      );
    }

    const { orderId } = parsed.data;

    // Parse request body
    const body = await _request.json().catch(() => ({}));
    const bodyParsed = GenerateInvoiceBodySchema.safeParse(body);
    if (!bodyParsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: bodyParsed.error.errors },
        { status: 400 }
      );
    }

    const { ghanaVatNumber, issue } = bodyParsed.data;

    // Verify the order belongs to this tailor and is eligible for invoicing
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('tailor_id, total_amount, status, completed_at')
      .eq('id', orderId)
      .single();

    if (orderError) {
      if (orderError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }
      throw new Error(`Failed to fetch order: ${orderError.message}`);
    }

    if (orderData.tailor_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied. You can only generate invoices for your own orders.' },
        { status: 403 }
      );
    }

    // Check if order is completed (required for invoice generation)
    if (orderData.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Invoice can only be generated for completed orders' },
        { status: 400 }
      );
    }

    // Check if invoice already exists
    const taxInvoiceService = new TaxInvoiceService();
    const existingInvoice = await taxInvoiceService.getInvoiceByOrderId(orderId);
    
    if (existingInvoice) {
      return NextResponse.json(
        { 
          error: 'Invoice already exists for this order',
          data: existingInvoice
        },
        { status: 409 }
      );
    }

    // Get commission record for this order
    const commissionService = new CommissionService();
    const commissionRecords = await commissionService.getCommissionRecordsByTailor(user.id);
    const commissionRecord = commissionRecords.find(record => record.orderId === orderId);

    if (!commissionRecord) {
      return NextResponse.json(
        { error: 'No commission record found for this order' },
        { status: 400 }
      );
    }

    // Generate the invoice
    const invoice = await taxInvoiceService.generateInvoice({
      tailorId: user.id,
      orderId,
      commissionRecordId: commissionRecord.id,
      grossAmount: orderData.total_amount,
      commissionAmount: commissionRecord.commissionAmount,
      netAmount: commissionRecord.netPayment,
      ghanaVatNumber
    });

    // Issue the invoice immediately if requested
    if (issue) {
      await taxInvoiceService.issueInvoice(invoice.id);
      invoice.status = 'ISSUED';
    }

    return NextResponse.json({
      success: true,
      data: {
        invoice,
        message: issue ? 'Invoice generated and issued successfully' : 'Invoice generated in draft status'
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error generating invoice:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate invoice',
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