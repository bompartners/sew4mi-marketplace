import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TaxInvoiceService } from '@/lib/services/tax-invoice.service';
import { z } from 'zod';

const InvoiceIdParamSchema = z.object({
  invoiceId: z.string().uuid('Invoice ID must be a valid UUID')
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
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

    // Validate invoice ID parameter
    const resolvedParams = await params;
    const parsed = InvoiceIdParamSchema.safeParse({ invoiceId: resolvedParams.invoiceId });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid invoice ID format' },
        { status: 400 }
      );
    }

    const { invoiceId } = parsed.data;

    // Get invoice and verify ownership
    const taxInvoiceService = new TaxInvoiceService();
    const invoice = await taxInvoiceService.getInvoiceById(invoiceId);

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    if (invoice.tailorId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied. You can only download your own invoices.' },
        { status: 403 }
      );
    }

    // Check if invoice has a PDF URL
    if (!invoice.pdfUrl) {
      // Try to regenerate the PDF
      try {
        await taxInvoiceService.regenerateInvoicePDF(invoiceId);
        // Refresh invoice data
        const updatedInvoice = await taxInvoiceService.getInvoiceById(invoiceId);
        if (updatedInvoice?.pdfUrl) {
          invoice.pdfUrl = updatedInvoice.pdfUrl;
        }
      } catch (regenerateError) {
        console.error('Error regenerating PDF:', regenerateError);
        return NextResponse.json(
          { error: 'Invoice PDF not available and could not be regenerated' },
          { status: 500 }
        );
      }
    }

    // In a real implementation, this would fetch the PDF from cloud storage
    // For now, we'll return a redirect to the PDF URL or generate it on-demand
    
    if (invoice.pdfUrl?.startsWith('/api/')) {
      // Internal API route - handle PDF generation here
      return await generatePDFResponse(invoice);
    } else if (invoice.pdfUrl?.startsWith('http')) {
      // External URL - redirect to the PDF
      return NextResponse.redirect(invoice.pdfUrl);
    } else {
      // Generate PDF on-demand
      return await generatePDFResponse(invoice);
    }

  } catch (error) {
    console.error('Error downloading invoice:', error);
    return NextResponse.json(
      { 
        error: 'Failed to download invoice',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function generatePDFResponse(invoice: any) {
  try {
    // In a production environment, you would:
    // 1. Use a PDF generation library like Puppeteer or jsPDF
    // 2. Fetch the invoice data and generate the PDF content
    // 3. Return the PDF as a buffer with proper headers
    
    // For now, return a simple HTML response that could be printed to PDF
    const htmlContent = generateInvoiceHTML(invoice);
    
    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="invoice-${invoice.invoiceNumber}.html"`,
      },
    });
    
  } catch (error) {
    console.error('Error generating PDF response:', error);
    throw error;
  }
}

function generateInvoiceHTML(invoice: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Tax Invoice - ${invoice.invoiceNumber}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 40px; 
            line-height: 1.6;
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 3px solid #FFD700;
            padding-bottom: 20px;
        }
        .invoice-details { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 30px; 
        }
        .company-info, .invoice-info { 
            width: 48%; 
        }
        .invoice-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 30px; 
        }
        .invoice-table th, .invoice-table td { 
            border: 1px solid #ddd; 
            padding: 12px; 
            text-align: left; 
        }
        .invoice-table th { 
            background-color: #f5f5f5; 
        }
        .totals { 
            text-align: right; 
            margin-top: 20px; 
            font-size: 16px;
        }
        .footer { 
            margin-top: 40px; 
            font-size: 12px; 
            text-align: center; 
            color: #666;
        }
        .ghana-colors { 
            border-left: 5px solid #FFD700; 
            padding-left: 15px; 
        }
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status-issued {
            background-color: #10b981;
            color: white;
        }
        .status-draft {
            background-color: #f59e0b;
            color: white;
        }
        @media print {
            body { margin: 20px; }
            .header { border-color: #000; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>TAX INVOICE</h1>
        <h2 class="ghana-colors">Sew4Mi Digital Marketplace</h2>
        <div style="margin-top: 15px;">
            <span class="status-badge status-${invoice.status.toLowerCase()}">${invoice.status}</span>
        </div>
    </div>

    <div class="invoice-details">
        <div class="company-info ghana-colors">
            <h3>Invoice Details:</h3>
            <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Issue Date:</strong> ${new Date(invoice.issueDate).toLocaleDateString()}</p>
            <p><strong>Order ID:</strong> ${invoice.orderId}</p>
            ${invoice.ghanaVatNumber ? `<p><strong>VAT Number:</strong> ${invoice.ghanaVatNumber}</p>` : ''}
        </div>
        
        <div class="invoice-info">
            <h3>Platform Details:</h3>
            <p><strong>Sew4Mi Limited</strong></p>
            <p>Digital Marketplace for Tailoring Services</p>
            <p>Accra, Ghana</p>
            <p>Email: billing@sew4mi.com</p>
            <p>Website: www.sew4mi.com</p>
        </div>
    </div>

    <table class="invoice-table">
        <thead>
            <tr>
                <th>Description</th>
                <th style="text-align: right;">Amount (GHS)</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Gross Payment Received</td>
                <td style="text-align: right;">${invoice.grossAmount.toFixed(2)}</td>
            </tr>
            <tr>
                <td>Platform Commission (${((invoice.commissionAmount / invoice.grossAmount) * 100).toFixed(1)}%)</td>
                <td style="text-align: right;">-${invoice.commissionAmount.toFixed(2)}</td>
            </tr>
        </tbody>
    </table>

    <div class="totals">
        <p><strong>Gross Amount: GHS ${invoice.grossAmount.toFixed(2)}</strong></p>
        <p>Less: Platform Commission: GHS ${invoice.commissionAmount.toFixed(2)}</p>
        <p style="font-size: 18px; margin-top: 10px; padding-top: 10px; border-top: 2px solid #333;">
            <strong>Net Amount: GHS ${invoice.netAmount.toFixed(2)}</strong>
        </p>
    </div>

    <div class="footer">
        <p>This invoice is generated automatically by the Sew4Mi platform.</p>
        <p>For queries regarding this invoice, contact: support@sew4mi.com</p>
        <p style="color: #8B4513; font-weight: bold;">Supporting Ghanaian Tailors 🇬🇭</p>
        <p style="margin-top: 15px; font-size: 10px;">
            Generated on ${new Date().toLocaleString()} | Invoice ID: ${invoice.id}
        </p>
    </div>

    <script>
        // Auto-print functionality for PDF generation
        window.onload = function() {
            if (window.location.search.includes('print=true')) {
                window.print();
            }
        }
    </script>
</body>
</html>
  `.trim();
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