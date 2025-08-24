export type EscrowStage = 'DEPOSIT' | 'FITTING' | 'FINAL' | 'RELEASED';

export interface EscrowBreakdown {
  totalAmount: number;
  depositAmount: number;      // 25%
  fittingAmount: number;      // 50% 
  finalAmount: number;        // 25%
  depositPercentage: number;
  fittingPercentage: number;
  finalPercentage: number;
}

export interface EscrowStatus {
  orderId: string;
  currentStage: EscrowStage;
  totalAmount: number;
  depositPaid: number;
  fittingPaid: number;
  finalPaid: number;
  escrowBalance: number;      // Unreleased funds
  nextStageAmount?: number;   // Amount due for next milestone
  stageHistory: EscrowStageTransition[];
}

export interface EscrowStageTransition {
  stage: EscrowStage;
  transitionedAt: string;     // ISO date string
  amount: number;
  transactionId?: string;
  notes?: string;
}

export interface EscrowMilestoneApproval {
  orderId: string;
  stage: EscrowStage;
  approvedBy: string;         // User ID
  approvedAt: string;         // ISO date string
  amount: number;
  notes?: string;
}

export interface EscrowReconciliation {
  totalEscrowFunds: number;
  pendingReleases: number;
  completedReleases: number;
  orderCount: number;
  reconciliationDate: string;
  discrepancies: EscrowDiscrepancy[];
}

export interface EscrowDiscrepancy {
  orderId: string;
  expectedAmount: number;
  actualAmount: number;
  difference: number;
  reason: string;
}

export type EscrowTransactionType = 'DEPOSIT' | 'FITTING_PAYMENT' | 'FINAL_PAYMENT' | 'REFUND';

export interface EscrowTransaction {
  id: string;
  orderId: string;
  transactionType: EscrowTransactionType;
  amount: number;
  fromStage?: EscrowStage;
  toStage: EscrowStage;
  paymentTransactionId?: string;
  approvedBy?: string;
  approvedAt: string;           // ISO date string
  notes?: string;
  createdAt: string;           // ISO date string
  updatedAt: string;           // ISO date string
}