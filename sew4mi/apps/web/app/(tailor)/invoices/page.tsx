import { TaxInvoiceViewer } from '@/components/features/payments/TaxInvoiceViewer';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tax Invoices - Sew4Mi',
  description: 'View and download your tax invoices for completed orders',
};

export default function InvoicesPage() {
  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="ghost" asChild>
          <Link href="/earnings">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tax Invoices</h1>
          <p className="text-gray-600">
            View and download Ghana Revenue Authority compliant invoices
          </p>
        </div>
      </div>

      {/* Tax Invoice Viewer */}
      <TaxInvoiceViewer />
    </div>
  );
}