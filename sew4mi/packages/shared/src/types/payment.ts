export interface PaymentTransaction {
  id: string;
  orderId: string;
  type: 'DEPOSIT' | 'FITTING_PAYMENT' | 'FINAL_PAYMENT' | 'REFUND';
  amount: number;
  provider: 'HUBTEL_MTN' | 'HUBTEL_VODAFONE' | 'HUBTEL_AIRTELTIGO' | 'HUBTEL_CARD';
  providerTransactionId: string;
  hubtelTransactionId?: string;
  paymentMethod: string;
  customerPhoneNumber?: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  webhookReceived: boolean;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface HubtelPaymentRequest {
  amount: number;
  customerPhoneNumber: string;
  paymentMethod: string;
  transactionId: string;
  description?: string;
  customerName?: string;
}

export interface HubtelPaymentResponse {
  transactionId: string;
  hubtelTransactionId: string;
  status: string;
  paymentUrl?: string;
  message: string;
}

export interface HubtelWebhookPayload {
  transactionId: string;
  hubtelTransactionId: string;
  status: string;
  amount: number;
  customerPhoneNumber: string;
  paymentMethod: string;
  timestamp: string;
  signature: string;
}

export interface PaymentStatusResponse {
  transactionId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  amount: number;
  provider: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentInitiationRequest {
  orderId: string;
  amount: number;
  customerPhoneNumber: string;
  paymentMethod: 'MTN' | 'VODAFONE' | 'AIRTELTIGO' | 'CARD';
  description?: string;
}

export interface GhanaPhoneValidation {
  isValid: boolean;
  network?: 'MTN' | 'VODAFONE' | 'AIRTELTIGO';
  formattedNumber?: string;
  error?: string;
  suggestion?: string;
}

// Payment Analytics Types

export interface TailorPaymentSummary {
  tailorId: string;
  period: string; // 'YYYY-MM' format
  totalEarnings: number;
  grossPayments: number; // Before commission
  platformCommission: number; // 20% of gross
  netEarnings: number; // After commission
  pendingAmount: number;
  completedAmount: number;
  disputedAmount: number;
  refundedAmount: number;
  totalOrders: number;
  completedOrders: number;
  averageOrderValue: number;
  commissionRate: number; // Current rate (20%)
  lastUpdated: Date;
}

export interface TailorCommissionRecord {
  id: string;
  tailorId: string;
  orderId: string;
  orderAmount: number;
  commissionRate: number; // Rate at time of order
  commissionAmount: number;
  netPayment: number;
  processedAt: Date | null;
  status: 'PENDING' | 'PROCESSED' | 'DISPUTED';
  invoiceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaxInvoice {
  id: string;
  invoiceNumber: string;
  tailorId: string;
  orderId: string;
  issueDate: Date;
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
  ghanaVatNumber?: string;
  pdfUrl?: string;
  status: 'DRAFT' | 'ISSUED' | 'CANCELLED';
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentHistoryItem {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  garmentType: string;
  totalAmount: number;
  commissionAmount: number;
  netAmount: number;
  paymentDate: Date;
  status: 'PENDING' | 'COMPLETED' | 'DISPUTED' | 'REFUNDED';
  escrowStage: 'DEPOSIT' | 'FITTING' | 'FINAL' | 'RELEASED';
  milestonePayments: {
    deposit: { amount: number; paidAt?: Date; status: string };
    fitting: { amount: number; paidAt?: Date; status: string };
    final: { amount: number; paidAt?: Date; status: string };
  };
}

export interface PaymentDashboardData {
  summary: TailorPaymentSummary;
  monthlyTrends: Array<{
    period: string;
    earnings: number;
    orders: number;
    commission: number;
  }>;
  paymentStatusBreakdown: {
    pending: number;
    completed: number;
    disputed: number;
    refunded: number;
  };
  recentTransactions: PaymentHistoryItem[];
}

export interface PaymentHistoryFilters {
  dateFrom?: Date;
  dateTo?: Date;
  status?: ('PENDING' | 'COMPLETED' | 'DISPUTED' | 'REFUNDED')[];
  orderNumber?: string;
  customerName?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface PaymentExportRequest {
  format: 'CSV' | 'EXCEL';
  dateFrom?: Date;
  dateTo?: Date;
  filters?: PaymentHistoryFilters;
  columns: string[];
}

export interface CommissionBreakdown {
  orderId: string;
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  platformFees: number;
  processingFees: number;
  netAmount: number;
  breakdown: Array<{
    type: 'PLATFORM_COMMISSION' | 'PROCESSING_FEE' | 'TAX_DEDUCTION';
    amount: number;
    percentage: number;
    description: string;
  }>;
}