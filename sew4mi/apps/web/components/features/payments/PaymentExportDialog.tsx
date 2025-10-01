'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  FileText, 
  Calculator,
  AlertTriangle,
  Check,
  Loader2
} from 'lucide-react';
import type { PaymentHistoryFilters } from '@sew4mi/shared';

interface PaymentExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (options: ExportOptions) => Promise<void>;
  filters?: PaymentHistoryFilters;
}

interface ExportOptions {
  format: 'CSV';
  preset: 'FULL_PAYMENT_HISTORY' | 'ACCOUNTING_EXPORT' | 'TAX_REPORT';
  dateFrom?: Date;
  dateTo?: Date;
  columns: string[];
  filename?: string;
}

const EXPORT_PRESETS = {
  FULL_PAYMENT_HISTORY: {
    name: 'Complete Payment History',
    description: 'All payment data including milestone details',
    icon: FileText,
    columns: [
      'orderNumber',
      'paymentDate', 
      'customerName',
      'garmentType',
      'status',
      'totalAmount',
      'commissionAmount',
      'netAmount',
      'escrowStage'
    ]
  },
  ACCOUNTING_EXPORT: {
    name: 'Accounting Export',
    description: 'Formatted for bookkeeping software',
    icon: Calculator,
    columns: [
      'paymentDate',
      'orderNumber',
      'description',
      'totalAmount',
      'netAmount',
      'commissionAmount'
    ]
  },
  TAX_REPORT: {
    name: 'Tax Report',
    description: 'Ghana tax reporting format',
    icon: FileText,
    columns: [
      'paymentDate',
      'orderNumber',
      'totalAmount',
      'commissionAmount',
      'netAmount',
      'status'
    ]
  }
};

const AVAILABLE_COLUMNS = {
  orderNumber: 'Order Number',
  paymentDate: 'Payment Date',
  customerName: 'Customer Name',
  garmentType: 'Garment Type',
  status: 'Status',
  totalAmount: 'Gross Amount',
  commissionAmount: 'Commission',
  netAmount: 'Net Amount',
  escrowStage: 'Escrow Stage',
  description: 'Description'
};

export function PaymentExportDialog({ 
  open, 
  onOpenChange, 
  onExport,
  filters = {}
}: PaymentExportDialogProps) {
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof EXPORT_PRESETS>('FULL_PAYMENT_HISTORY');
  const [customColumns, setCustomColumns] = useState<string[]>([]);
  const [useCustomColumns, setUseCustomColumns] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: filters.dateFrom?.toISOString().split('T')[0] || '',
    to: filters.dateTo?.toISOString().split('T')[0] || ''
  });
  const [filename, setFilename] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportError(null);
      
      const exportOptions: ExportOptions = {
        format: 'CSV',
        preset: selectedPreset,
        dateFrom: dateRange.from ? new Date(dateRange.from) : undefined,
        dateTo: dateRange.to ? new Date(dateRange.to) : undefined,
        columns: useCustomColumns ? customColumns : EXPORT_PRESETS[selectedPreset].columns,
        filename: filename || undefined
      };

      await onExport(exportOptions);
      
      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
        onOpenChange(false);
      }, 2000);
      
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleColumnToggle = (columnKey: string) => {
    setCustomColumns(prev => 
      prev.includes(columnKey)
        ? prev.filter(col => col !== columnKey)
        : [...prev, columnKey]
    );
  };

  const handlePresetChange = (preset: keyof typeof EXPORT_PRESETS) => {
    setSelectedPreset(preset);
    if (useCustomColumns) {
      setCustomColumns(EXPORT_PRESETS[preset].columns);
    }
  };

  const selectedPresetInfo = EXPORT_PRESETS[selectedPreset];
  const PresetIcon = selectedPresetInfo.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Download className="w-5 h-5 mr-2" />
            Export Payment History
          </DialogTitle>
          <DialogDescription>
            Download your payment data in CSV format for external use
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          
          {/* Export Presets */}
          <div>
            <Label className="text-base font-medium">Export Template</Label>
            <div className="grid md:grid-cols-3 gap-3 mt-2">
              {Object.entries(EXPORT_PRESETS).map(([key, preset]) => {
                const Icon = preset.icon;
                return (
                  <div
                    key={key}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedPreset === key 
                        ? 'border-[#8B4513] bg-[#8B4513]/5' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handlePresetChange(key as keyof typeof EXPORT_PRESETS)}
                  >
                    <div className="flex items-center mb-2">
                      <Icon className="w-4 h-4 mr-2" />
                      <span className="font-medium text-sm">{preset.name}</span>
                    </div>
                    <p className="text-xs text-gray-600">{preset.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Columns */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Checkbox
                id="custom-columns"
                checked={useCustomColumns}
                onCheckedChange={(checked) => setUseCustomColumns(checked === true)}
              />
              <Label htmlFor="custom-columns" className="text-base font-medium">
                Customize Columns
              </Label>
            </div>
            
            {useCustomColumns && (
              <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 rounded-lg">
                {Object.entries(AVAILABLE_COLUMNS).map(([key, label]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`column-${key}`}
                      checked={customColumns.includes(key)}
                      onCheckedChange={() => handleColumnToggle(key)}
                    />
                    <Label htmlFor={`column-${key}`} className="text-sm">
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Date Range */}
          <div>
            <Label className="text-base font-medium">Date Range (Optional)</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <Label htmlFor="date-from" className="text-sm">From</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="date-to" className="text-sm">To</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Filename */}
          <div>
            <Label htmlFor="filename" className="text-base font-medium">
              Filename (Optional)
            </Label>
            <Input
              id="filename"
              placeholder="payment-history"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="mt-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to auto-generate with timestamp
            </p>
          </div>

          {/* Export Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <PresetIcon className="w-4 h-4 mr-2 text-blue-600" />
              <span className="font-medium text-blue-900">Export Preview</span>
            </div>
            <div className="text-sm text-blue-800">
              <p><strong>Template:</strong> {selectedPresetInfo.name}</p>
              <p><strong>Columns:</strong> {
                useCustomColumns ? customColumns.length : selectedPresetInfo.columns.length
              } selected</p>
              {(dateRange.from || dateRange.to) && (
                <p><strong>Date Range:</strong> {
                  dateRange.from ? new Date(dateRange.from).toLocaleDateString() : 'Start'
                } - {
                  dateRange.to ? new Date(dateRange.to).toLocaleDateString() : 'End'
                }</p>
              )}
            </div>
          </div>

          {/* Export Limits Alert */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Export is limited to 10,000 records per file. Large datasets will be split automatically.
              You can perform up to 5 exports per hour.
            </AlertDescription>
          </Alert>

          {/* Success/Error Messages */}
          {exportSuccess && (
            <Alert className="border-green-200 bg-green-50">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Export completed successfully! Your download should start shortly.
              </AlertDescription>
            </Alert>
          )}

          {exportError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {exportError}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || (useCustomColumns && customColumns.length === 0)}
            className="bg-[#8B4513] hover:bg-[#8B4513]/90"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}