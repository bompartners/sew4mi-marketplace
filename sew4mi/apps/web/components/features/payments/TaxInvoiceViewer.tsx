'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  FileText, 
  Download, 
  Eye, 
  Plus, 
  Calendar,
  DollarSign,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  X
} from 'lucide-react';
import type { TaxInvoice } from '@sew4mi/shared';

interface TaxInvoiceViewerProps {
  className?: string;
}

export function TaxInvoiceViewer({ className }: TaxInvoiceViewerProps) {
  const [invoices, setInvoices] = useState<TaxInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<TaxInvoice | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [_generatingInvoice, _setGeneratingInvoice] = useState<string | null>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/tailors/invoices');
      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }
      
      const result = await response.json();
      setInvoices(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const formatCurrency = (amount: number) => 
    `GHS ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

  const formatDate = (date: Date) => 
    new Date(date).toLocaleDateString('en-GB');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ISSUED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ISSUED':
        return CheckCircle;
      case 'DRAFT':
        return Clock;
      case 'CANCELLED':
        return X;
      default:
        return Clock;
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/tailors/invoices/${invoiceId}/download`);
      
      if (!response.ok) {
        throw new Error('Failed to download invoice');
      }

      // Handle different response types
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('text/html')) {
        // HTML response - open in new tab
        const html = await response.text();
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(html);
          newWindow.document.close();
        }
      } else {
        // PDF or other file download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const invoice = invoices.find(inv => inv.id === invoiceId);
        const filename = `invoice-${invoice?.invoiceNumber || invoiceId}.pdf`;
        link.download = filename;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download invoice. Please try again.');
    }
  };

  // Unused function for invoice generation
  // const _handleGenerateInvoice = async (orderId: string) => {
  //   // Implementation commented out to avoid unused function error
  // };

  const handlePreviewInvoice = (invoice: TaxInvoice) => {
    setSelectedInvoice(invoice);
    setShowPreview(true);
  };

  if (error) {
    return (
      <div className={className}>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchInvoices}
              className="ml-4"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={className}>
      <Card className="border-[#8B4513]/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2 text-[#8B4513]" />
                Tax Invoices
              </CardTitle>
              <CardDescription>
                Generated invoices for completed orders
              </CardDescription>
            </div>
            
            <Button 
              onClick={fetchInvoices}
              variant="outline"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse flex space-x-4 p-4 border rounded">
                  <div className="rounded bg-gray-200 h-4 w-32"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
              ))}
            </div>
          ) : invoices.length > 0 ? (
            <div className="space-y-4">
              {invoices.map((invoice) => {
                const StatusIcon = getStatusIcon(invoice.status);
                
                return (
                  <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div>
                            <h4 className="font-medium">{invoice.invoiceNumber}</h4>
                            <p className="text-sm text-gray-600">Order: {invoice.orderId}</p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(invoice.status)}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {invoice.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center text-gray-500">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDate(invoice.issueDate)}
                          </span>
                          <span className="flex items-center text-green-600 font-medium">
                            <DollarSign className="w-4 h-4 mr-1" />
                            {formatCurrency(invoice.netAmount)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500 mt-1">
                        Gross: {formatCurrency(invoice.grossAmount)} • 
                        Commission: {formatCurrency(invoice.commissionAmount)}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreviewInvoice(invoice)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadInvoice(invoice.id)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices yet</h3>
              <p className="text-gray-500 mb-4">
                Tax invoices are automatically generated when orders are completed
              </p>
              
              {/* Show option to generate invoice for completed orders */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-blue-800 mb-2">
                  💡 Have completed orders without invoices?
                </p>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Missing Invoices
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice Preview</DialogTitle>
            <DialogDescription>
              {selectedInvoice?.invoiceNumber} • {selectedInvoice && formatDate(selectedInvoice.issueDate)}
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="bg-gradient-to-r from-[#8B4513]/10 to-[#FFD700]/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg">Tax Invoice</h3>
                    <p className="text-sm text-gray-600">Sew4Mi Digital Marketplace</p>
                  </div>
                  <Badge className={getStatusColor(selectedInvoice.status)}>
                    {selectedInvoice.status}
                  </Badge>
                </div>
              </div>

              {/* Invoice Details */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Invoice Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Invoice Number:</span>
                      <span className="font-medium">{selectedInvoice.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Issue Date:</span>
                      <span>{formatDate(selectedInvoice.issueDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order ID:</span>
                      <span>{selectedInvoice.orderId}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Payment Breakdown</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gross Amount:</span>
                      <span>{formatCurrency(selectedInvoice.grossAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Commission:</span>
                      <span className="text-red-600">
                        -{formatCurrency(selectedInvoice.commissionAmount)}
                      </span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between font-medium">
                        <span>Net Amount:</span>
                        <span className="text-green-600">
                          {formatCurrency(selectedInvoice.netAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ghana Tax Information */}
              <div className="bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-lg p-4">
                <h4 className="font-medium text-[#8B4513] mb-2">Ghana Tax Information</h4>
                <p className="text-sm text-gray-700">
                  This invoice complies with Ghana Revenue Authority requirements for digital marketplace transactions.
                </p>
                {selectedInvoice.ghanaVatNumber && (
                  <p className="text-sm text-gray-600 mt-1">
                    VAT Number: {selectedInvoice.ghanaVatNumber}
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
            {selectedInvoice && (
              <Button
                onClick={() => handleDownloadInvoice(selectedInvoice.id)}
                className="bg-[#8B4513] hover:bg-[#8B4513]/90"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}