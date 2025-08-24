'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PaymentHistoryTable } from '@/components/features/payments/PaymentHistoryTable';
import { PaymentExportDialog } from '@/components/features/payments/PaymentExportDialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Download } from 'lucide-react';
import Link from 'next/link';
import type { PaymentHistoryItem, PaymentHistoryFilters } from '@sew4mi/shared';

interface PaymentHistoryResponse {
  items: PaymentHistoryItem[];
  total: number;
  hasMore: boolean;
}

interface ExportOptions {
  format: 'CSV';
  preset: 'FULL_PAYMENT_HISTORY' | 'ACCOUNTING_EXPORT' | 'TAX_REPORT';
  dateFrom?: Date;
  dateTo?: Date;
  columns: string[];
  filename?: string;
}

export default function PaymentHistoryPage() {
  const [paymentData, setPaymentData] = useState<PaymentHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<PaymentHistoryFilters>({});
  const [showExportDialog, setShowExportDialog] = useState(false);
  
  const pageSize = 25;

  const fetchPaymentHistory = useCallback(async (page: number, currentFilters: PaymentHistoryFilters) => {
    try {
      setLoading(true);
      setError(null);

      const searchParams = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });

      // Add filters to search params
      if (currentFilters.dateFrom) {
        searchParams.append('dateFrom', currentFilters.dateFrom.toISOString());
      }
      if (currentFilters.dateTo) {
        searchParams.append('dateTo', currentFilters.dateTo.toISOString());
      }
      if (currentFilters.status && currentFilters.status.length > 0) {
        searchParams.append('status', currentFilters.status.join(','));
      }
      if (currentFilters.orderNumber) {
        searchParams.append('orderNumber', currentFilters.orderNumber);
      }
      if (currentFilters.customerName) {
        searchParams.append('customerName', currentFilters.customerName);
      }
      if (currentFilters.minAmount) {
        searchParams.append('minAmount', currentFilters.minAmount.toString());
      }
      if (currentFilters.maxAmount) {
        searchParams.append('maxAmount', currentFilters.maxAmount.toString());
      }

      const response = await fetch(`/api/tailors/payments/history?${searchParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch payment history');
      }

      const result = await response.json();
      setPaymentData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment history');
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    fetchPaymentHistory(currentPage, filters);
  }, [currentPage, filters, fetchPaymentHistory]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleFiltersChange = (newFilters: PaymentHistoryFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleExport = async (options: ExportOptions) => {
    try {
      const response = await fetch('/api/tailors/payments/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: options.format,
          preset: options.preset,
          dateFrom: options.dateFrom?.toISOString(),
          dateTo: options.dateTo?.toISOString(),
          columns: options.columns,
          filename: options.filename
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers or use default
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition?.match(/filename="?([^"]*)"?/)?.[1] || 
                     options.filename || 
                     `payment-history-${new Date().toISOString().slice(0, 10)}.csv`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      throw error; // Re-throw to be handled by the dialog
    }
  };

  if (error) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href="/earnings">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
        
        <Alert variant="destructive">
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fetchPaymentHistory(currentPage, filters)}
              className="ml-4"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" asChild>
            <Link href="/earnings">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
            <p className="text-gray-600">
              Detailed view of all your payment transactions
            </p>
          </div>
        </div>
        
        <Button 
          onClick={() => setShowExportDialog(true)}
          className="bg-[#8B4513] hover:bg-[#8B4513]/90"
        >
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Payment History Table */}
      <PaymentHistoryTable
        data={paymentData?.items || []}
        totalCount={paymentData?.total || 0}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onFiltersChange={handleFiltersChange}
        onExport={() => setShowExportDialog(true)}
        loading={loading}
        filters={filters}
      />

      {/* Export Dialog */}
      <PaymentExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        onExport={handleExport}
        filters={filters}
      />
    </div>
  );
}