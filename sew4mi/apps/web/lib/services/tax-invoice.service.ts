import { createClient } from '@/lib/supabase/server';
import type { TaxInvoice } from '@sew4mi/shared';
import type { Database } from '@sew4mi/shared';

type DbTaxInvoice = Database['public']['Tables']['tax_invoices']['Row'];
type DbTaxInvoiceInsert = Database['public']['Tables']['tax_invoices']['Insert'];

export class TaxInvoiceService {
  private supabase = createClient();

  async generateInvoice(data: {
    tailorId: string;
    orderId: string;
    commissionRecordId?: string;
    grossAmount: number;
    commissionAmount: number;
    netAmount: number;
    ghanaVatNumber?: string;
  }): Promise<TaxInvoice> {
    // Generate unique invoice number
    const invoiceNumber = await this.generateInvoiceNumber();

    const insertData: DbTaxInvoiceInsert = {
      invoice_number: invoiceNumber,
      tailor_id: data.tailorId,
      order_id: data.orderId,
      commission_record_id: data.commissionRecordId || null,
      issue_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      gross_amount: data.grossAmount,
      commission_amount: data.commissionAmount,
      net_amount: data.netAmount,
      ghana_vat_number: data.ghanaVatNumber || null,
      status: 'DRAFT',
      metadata: {}
    };

    const { data: invoice, error } = await this.supabase
      .from('tax_invoices')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create tax invoice: ${error.message}`);
    }

    const mappedInvoice = this.mapDbInvoiceToTaxInvoice(invoice);

    // Generate PDF after creating the record
    await this.generateInvoicePDF(mappedInvoice);

    return mappedInvoice;
  }

  async getInvoicesByTailor(tailorId: string): Promise<TaxInvoice[]> {
    const { data, error } = await this.supabase
      .from('tax_invoices')
      .select('*')
      .eq('tailor_id', tailorId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch invoices: ${error.message}`);
    }

    return (data || []).map(this.mapDbInvoiceToTaxInvoice);
  }

  async getInvoiceById(invoiceId: string): Promise<TaxInvoice | null> {
    const { data, error } = await this.supabase
      .from('tax_invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch invoice: ${error.message}`);
    }

    return data ? this.mapDbInvoiceToTaxInvoice(data) : null;
  }

  async getInvoiceByOrderId(orderId: string): Promise<TaxInvoice | null> {
    const { data, error } = await this.supabase
      .from('tax_invoices')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch invoice by order ID: ${error.message}`);
    }

    return data ? this.mapDbInvoiceToTaxInvoice(data) : null;
  }

  async issueInvoice(invoiceId: string): Promise<TaxInvoice> {
    const { data, error } = await this.supabase
      .from('tax_invoices')
      .update({
        status: 'ISSUED',
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to issue invoice: ${error.message}`);
    }

    return this.mapDbInvoiceToTaxInvoice(data);
  }

  async cancelInvoice(invoiceId: string): Promise<TaxInvoice> {
    const { data, error } = await this.supabase
      .from('tax_invoices')
      .update({
        status: 'CANCELLED',
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to cancel invoice: ${error.message}`);
    }

    return this.mapDbInvoiceToTaxInvoice(data);
  }

  async regenerateInvoicePDF(invoiceId: string): Promise<TaxInvoice> {
    const invoice = await this.getInvoiceById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    await this.generateInvoicePDF(invoice);
    return invoice;
  }

  private async generateInvoiceNumber(): Promise<string> {
    const { data, error } = await this.supabase
      .rpc('generate_invoice_number');

    if (error) {
      throw new Error(`Failed to generate invoice number: ${error.message}`);
    }

    return data || `INV-${Date.now()}`;
  }

  private async generateInvoicePDF(invoice: TaxInvoice): Promise<string> {
    try {
      // Get additional data needed for invoice
      const { data: orderData, error: orderError } = await this.supabase
        .from('orders')
        .select(`
          order_number,
          garment_type,
          quantity,
          created_at,
          users!orders_customer_id_fkey(full_name, email)
        `)
        .eq('id', invoice.orderId)
        .single();

      if (orderError) {
        throw new Error(`Failed to fetch order data: ${orderError.message}`);
      }

      const { data: tailorData, error: tailorError } = await this.supabase
        .from('tailor_profiles')
        .select(`
          business_name,
          city,
          region,
          users!tailor_profiles_user_id_fkey(full_name, email, phone_number)
        `)
        .eq('user_id', invoice.tailorId)
        .single();

      if (tailorError) {
        throw new Error(`Failed to fetch tailor data: ${tailorError.message}`);
      }

      // Generate PDF content (HTML template)
      const htmlContent = this.generateInvoiceHTML({
        invoice,
        order: orderData,
        tailor: tailorData
      });

      // In a real implementation, you would use a PDF generation service like:
      // - Puppeteer
      // - wkhtmltopdf
      // - A cloud service like HTMLtoPDF
      
      // For now, we'll simulate PDF generation and store a placeholder URL
      const pdfUrl = await this.uploadInvoicePDF(htmlContent, invoice.invoiceNumber);

      // Update the invoice record with the PDF URL
      const { error: updateError } = await this.supabase
        .from('tax_invoices')
        .update({
          pdf_url: pdfUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoice.id);

      if (updateError) {
        throw new Error(`Failed to update invoice with PDF URL: ${updateError.message}`);
      }

      return pdfUrl;
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      throw new Error(`Failed to generate invoice PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private generateInvoiceHTML(data: {
    invoice: TaxInvoice;
    order: any;
    tailor: any;
  }): string {
    const { invoice, order, tailor } = data;
    
    // Ghana-compliant invoice template
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Tax Invoice - ${invoice.invoiceNumber}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .company-info, .customer-info { width: 48%; }
            .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .invoice-table th, .invoice-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            .invoice-table th { background-color: #f5f5f5; }
            .totals { text-align: right; margin-top: 20px; }
            .footer { margin-top: 40px; font-size: 12px; text-align: center; }
            .ghana-colors { border-left: 5px solid #FFD700; padding-left: 15px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>TAX INVOICE</h1>
            <h2 class="ghana-colors">Sew4Mi Digital Marketplace</h2>
            <p>Invoice Number: ${invoice.invoiceNumber}</p>
            <p>Issue Date: ${invoice.issueDate.toLocaleDateString()}</p>
        </div>

        <div class="invoice-details">
            <div class="company-info">
                <h3>From:</h3>
                <p><strong>${tailor.business_name}</strong></p>
                <p>${tailor.users.full_name}</p>
                <p>${tailor.city}, ${tailor.region}</p>
                <p>Phone: ${tailor.users.phone_number}</p>
                <p>Email: ${tailor.users.email}</p>
                ${invoice.ghanaVatNumber ? `<p>VAT Number: ${invoice.ghanaVatNumber}</p>` : ''}
            </div>
            
            <div class="customer-info">
                <h3>To:</h3>
                <p><strong>Sew4Mi Platform</strong></p>
                <p>Commission Payment</p>
                <p>Order: ${order.order_number}</p>
                <p>Customer: ${order.users.full_name}</p>
            </div>
        </div>

        <table class="invoice-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>Unit Price (GHS)</th>
                    <th>Amount (GHS)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>${order.garment_type} - Order ${order.order_number}</td>
                    <td>${order.quantity}</td>
                    <td>${(invoice.grossAmount / order.quantity).toFixed(2)}</td>
                    <td>${invoice.grossAmount.toFixed(2)}</td>
                </tr>
                <tr>
                    <td>Platform Commission (${(invoice.commissionAmount / invoice.grossAmount * 100).toFixed(1)}%)</td>
                    <td>1</td>
                    <td>-${invoice.commissionAmount.toFixed(2)}</td>
                    <td>-${invoice.commissionAmount.toFixed(2)}</td>
                </tr>
            </tbody>
        </table>

        <div class="totals">
            <p><strong>Gross Amount: GHS ${invoice.grossAmount.toFixed(2)}</strong></p>
            <p>Less: Platform Commission: GHS ${invoice.commissionAmount.toFixed(2)}</p>
            <p><strong>Net Amount: GHS ${invoice.netAmount.toFixed(2)}</strong></p>
        </div>

        <div class="footer">
            <p>This invoice is generated automatically by Sew4Mi platform.</p>
            <p>For queries, contact: support@sew4mi.com</p>
            <p style="color: #8B4513;">Supporting Ghanaian Tailors 🇬🇭</p>
        </div>
    </body>
    </html>
    `;
  }

  private async uploadInvoicePDF(_htmlContent: string, invoiceNumber: string): Promise<string> {
    // In a real implementation, this would:
    // 1. Convert HTML to PDF using a service like Puppeteer
    // 2. Upload the PDF to cloud storage (e.g., Supabase Storage)
    // 3. Return the public URL
    
    // For now, return a placeholder URL
    const fileName = `invoice-${invoiceNumber}.pdf`;
    
    // Simulate PDF storage
    console.log(`Generated PDF for ${fileName}`);
    
    // Return a simulated storage URL
    return `/api/invoices/${invoiceNumber}/download`;
  }

  private mapDbInvoiceToTaxInvoice(invoice: DbTaxInvoice): TaxInvoice {
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      tailorId: invoice.tailor_id,
      orderId: invoice.order_id,
      issueDate: new Date(invoice.issue_date),
      grossAmount: invoice.gross_amount,
      commissionAmount: invoice.commission_amount,
      netAmount: invoice.net_amount,
      ghanaVatNumber: invoice.ghana_vat_number || undefined,
      pdfUrl: invoice.pdf_url || undefined,
      status: invoice.status as 'DRAFT' | 'ISSUED' | 'CANCELLED',
      metadata: invoice.metadata as Record<string, any> || {},
      createdAt: new Date(invoice.created_at),
      updatedAt: new Date(invoice.updated_at)
    };
  }

  async getInvoiceStats(tailorId: string, period?: string) {
    let query = this.supabase
      .from('tax_invoices')
      .select('*')
      .eq('tailor_id', tailorId);

    if (period) {
      const startDate = `${period}-01`;
      const endDate = new Date(period + '-01');
      endDate.setMonth(endDate.getMonth() + 1);
      
      query = query
        .gte('issue_date', startDate)
        .lt('issue_date', endDate.toISOString().slice(0, 10));
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch invoice stats: ${error.message}`);
    }

    const invoices = data || [];
    const totalInvoices = invoices.length;
    const totalGrossAmount = invoices.reduce((sum, inv) => sum + inv.gross_amount, 0);
    const totalNetAmount = invoices.reduce((sum, inv) => sum + inv.net_amount, 0);
    
    const statusCounts = invoices.reduce((counts, inv) => {
      counts[inv.status] = (counts[inv.status] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    return {
      totalInvoices,
      totalGrossAmount,
      totalNetAmount,
      statusBreakdown: {
        draft: statusCounts.DRAFT || 0,
        issued: statusCounts.ISSUED || 0,
        cancelled: statusCounts.CANCELLED || 0
      }
    };
  }
}