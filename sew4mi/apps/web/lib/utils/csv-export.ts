/**
 * CSV Export utilities for payment history and analytics
 * Supports Ghana business accounting standards
 */

import type { PaymentHistoryItem, TailorPaymentSummary } from '@sew4mi/shared';

export interface CSVColumn {
  key: string;
  header: string;
  formatter?: (value: any, row: any) => string;
}

export interface CSVExportOptions {
  filename: string;
  columns: CSVColumn[];
  data: any[];
  includeHeader?: boolean;
  delimiter?: string;
}

/**
 * Default columns for payment history export
 */
export const PAYMENT_HISTORY_COLUMNS: CSVColumn[] = [
  {
    key: 'orderNumber',
    header: 'Order Number'
  },
  {
    key: 'paymentDate',
    header: 'Payment Date',
    formatter: (date: Date) => date.toLocaleDateString('en-GB')
  },
  {
    key: 'customerName',
    header: 'Customer Name'
  },
  {
    key: 'garmentType',
    header: 'Garment Type'
  },
  {
    key: 'status',
    header: 'Status'
  },
  {
    key: 'totalAmount',
    header: 'Gross Amount (GHS)',
    formatter: (amount: number) => amount.toFixed(2)
  },
  {
    key: 'commissionAmount',
    header: 'Commission (GHS)',
    formatter: (amount: number) => amount.toFixed(2)
  },
  {
    key: 'netAmount',
    header: 'Net Amount (GHS)',
    formatter: (amount: number) => amount.toFixed(2)
  },
  {
    key: 'escrowStage',
    header: 'Escrow Stage'
  }
];

/**
 * Columns for monthly earnings summary export
 */
export const MONTHLY_SUMMARY_COLUMNS: CSVColumn[] = [
  {
    key: 'period',
    header: 'Month'
  },
  {
    key: 'totalOrders',
    header: 'Total Orders'
  },
  {
    key: 'completedOrders',
    header: 'Completed Orders'
  },
  {
    key: 'grossPayments',
    header: 'Gross Payments (GHS)',
    formatter: (amount: number) => amount.toFixed(2)
  },
  {
    key: 'platformCommission',
    header: 'Platform Commission (GHS)',
    formatter: (amount: number) => amount.toFixed(2)
  },
  {
    key: 'netEarnings',
    header: 'Net Earnings (GHS)',
    formatter: (amount: number) => amount.toFixed(2)
  },
  {
    key: 'averageOrderValue',
    header: 'Average Order Value (GHS)',
    formatter: (amount: number) => amount.toFixed(2)
  },
  {
    key: 'commissionRate',
    header: 'Commission Rate (%)',
    formatter: (rate: number) => (rate * 100).toFixed(1)
  }
];

/**
 * Generate CSV content from data and column configuration
 */
export function generateCSV(options: CSVExportOptions): string {
  const { columns, data, includeHeader = true, delimiter = ',' } = options;

  const lines: string[] = [];

  // Add header row if requested
  if (includeHeader) {
    const headers = columns.map(col => escapeCSVValue(col.header));
    lines.push(headers.join(delimiter));
  }

  // Add data rows
  data.forEach(row => {
    const values = columns.map(col => {
      let value = getNestedValue(row, col.key);
      
      // Apply formatter if provided
      if (col.formatter && value !== null && value !== undefined) {
        value = col.formatter(value, row);
      }
      
      // Convert to string and escape
      return escapeCSVValue(String(value || ''));
    });
    
    lines.push(values.join(delimiter));
  });

  return lines.join('\n');
}

/**
 * Create a downloadable CSV blob
 */
export function createCSVBlob(csvContent: string): Blob {
  // Add BOM for proper UTF-8 encoding in Excel
  const BOM = '\uFEFF';
  return new Blob([BOM + csvContent], { 
    type: 'text/csv;charset=utf-8;' 
  });
}

/**
 * Generate filename with timestamp
 */
export function generateCSVFilename(prefix: string, extension = 'csv'): string {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-');
  return `${prefix}_${timestamp}.${extension}`;
}

/**
 * Export payment history to CSV
 */
export function exportPaymentHistoryCSV(
  paymentHistory: PaymentHistoryItem[],
  options?: {
    filename?: string;
    columns?: CSVColumn[];
    dateRange?: { from: Date; to: Date };
  }
): Blob {
  // const _filename = options?.filename || generateCSVFilename('payment_history'); // TODO: Use when needed
  const columns = options?.columns || PAYMENT_HISTORY_COLUMNS;

  let data = paymentHistory;

  // Apply date filter if provided
  if (options?.dateRange) {
    data = data.filter(item => 
      item.paymentDate >= options.dateRange!.from && 
      item.paymentDate <= options.dateRange!.to
    );
  }

  // Add summary row at the top
  const summaryData = calculatePaymentSummary(data);
  const csvContent = generateCSVWithSummary(columns, data, summaryData);

  return createCSVBlob(csvContent);
}

/**
 * Export monthly earnings summary to CSV
 */
export function exportMonthlySummaryCSV(
  summaries: TailorPaymentSummary[],
  filename?: string
): Blob {
  const csvFilename = filename || generateCSVFilename('monthly_earnings');
  
  const csvContent = generateCSV({
    filename: csvFilename,
    columns: MONTHLY_SUMMARY_COLUMNS,
    data: summaries
  });

  return createCSVBlob(csvContent);
}

/**
 * Generate CSV with summary statistics at the top
 */
function generateCSVWithSummary(
  columns: CSVColumn[],
  data: any[],
  summary: any
): string {
  const lines: string[] = [];

  // Add summary section
  lines.push('PAYMENT SUMMARY');
  lines.push(`Total Records,${data.length}`);
  lines.push(`Total Gross Amount (GHS),${summary.totalGross.toFixed(2)}`);
  lines.push(`Total Commission (GHS),${summary.totalCommission.toFixed(2)}`);
  lines.push(`Total Net Amount (GHS),${summary.totalNet.toFixed(2)}`);
  lines.push(`Average Order Value (GHS),${summary.averageOrder.toFixed(2)}`);
  lines.push(''); // Empty line

  // Add main data
  const csvContent = generateCSV({
    filename: '',
    columns,
    data,
    includeHeader: true
  });

  lines.push(csvContent);

  return lines.join('\n');
}

/**
 * Calculate summary statistics for payment data
 */
function calculatePaymentSummary(data: PaymentHistoryItem[]) {
  const totalGross = data.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalCommission = data.reduce((sum, item) => sum + item.commissionAmount, 0);
  const totalNet = data.reduce((sum, item) => sum + item.netAmount, 0);
  const averageOrder = data.length > 0 ? totalGross / data.length : 0;

  return {
    totalGross,
    totalCommission,
    totalNet,
    averageOrder
  };
}

/**
 * Escape CSV values to handle commas, quotes, and newlines
 */
function escapeCSVValue(value: string): string {
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

/**
 * Get nested object value using dot notation
 */
function getNestedValue(obj: any, key: string): any {
  return key.split('.').reduce((current, prop) => current?.[prop], obj);
}

/**
 * Custom column configurations for different export types
 */
export const EXPORT_PRESETS = {
  FULL_PAYMENT_HISTORY: [
    ...PAYMENT_HISTORY_COLUMNS,
    {
      key: 'milestonePayments.deposit.status',
      header: 'Deposit Status'
    },
    {
      key: 'milestonePayments.fitting.status',
      header: 'Fitting Payment Status'
    },
    {
      key: 'milestonePayments.final.status',
      header: 'Final Payment Status'
    }
  ],

  ACCOUNTING_EXPORT: [
    {
      key: 'paymentDate',
      header: 'Date',
      formatter: (date: Date) => date.toLocaleDateString('en-GB')
    },
    {
      key: 'orderNumber',
      header: 'Reference'
    },
    {
      key: 'customerName',
      header: 'Description',
      formatter: (name: string, row: any) => `${row.garmentType} for ${name}`
    },
    {
      key: 'totalAmount',
      header: 'Debit (GHS)',
      formatter: (amount: number) => amount.toFixed(2)
    },
    {
      key: 'netAmount',
      header: 'Credit (GHS)',
      formatter: (amount: number) => amount.toFixed(2)
    },
    {
      key: 'commissionAmount',
      header: 'Commission (GHS)',
      formatter: (amount: number) => amount.toFixed(2)
    }
  ],

  TAX_REPORT: [
    {
      key: 'paymentDate',
      header: 'Date',
      formatter: (date: Date) => date.toLocaleDateString('en-GB')
    },
    {
      key: 'orderNumber',
      header: 'Invoice Number'
    },
    {
      key: 'totalAmount',
      header: 'Gross Income (GHS)',
      formatter: (amount: number) => amount.toFixed(2)
    },
    {
      key: 'commissionAmount',
      header: 'Business Expenses (GHS)',
      formatter: (amount: number) => amount.toFixed(2)
    },
    {
      key: 'netAmount',
      header: 'Net Income (GHS)',
      formatter: (amount: number) => amount.toFixed(2)
    },
    {
      key: 'status',
      header: 'Status'
    }
  ]
};

/**
 * Validate CSV export request
 */
export function validateCSVExportRequest(data: any[], maxRecords = 10000): {
  isValid: boolean;
  error?: string;
} {
  if (!Array.isArray(data)) {
    return { isValid: false, error: 'Data must be an array' };
  }

  if (data.length === 0) {
    return { isValid: false, error: 'No data to export' };
  }

  if (data.length > maxRecords) {
    return { 
      isValid: false, 
      error: `Export limited to ${maxRecords} records. Please filter your data or contact support.` 
    };
  }

  return { isValid: true };
}

/**
 * Create download link for CSV blob
 */
export function createDownloadLink(blob: Blob, _filename: string): string {
  return URL.createObjectURL(blob);
}

/**
 * Trigger browser download for CSV
 */
export function downloadCSV(blob: Blob, filename: string): void {
  const url = createDownloadLink(blob, filename);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}