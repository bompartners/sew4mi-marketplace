import { 
  EscrowStage, 
  EscrowStatus, 
  EscrowTransactionType,
  EscrowBreakdown,
  PaymentInitiationRequest 
} from '@sew4mi/shared';
import { calculateEscrowBreakdown, getStageAmount } from '../utils/escrow-calculator';
import { EscrowRepository } from '../repositories/escrow.repository';
import { PaymentService } from './payment.service';

export class EscrowService {
  private escrowRepository: EscrowRepository;
  private paymentService: PaymentService;

  constructor() {
    this.escrowRepository = new EscrowRepository();
    this.paymentService = new PaymentService();
  }

  /**
   * Initialize escrow payment for an order
   * Creates deposit payment intent and sets up escrow structure
   */
  async initiateEscrowPayment(
    orderId: string,
    totalAmount: number,
    customerPhone: string,
    customerId: string
  ): Promise<{
    paymentIntentId: string;
    depositAmount: number;
    paymentUrl?: string;
    orderStatus: string;
  }> {
    try {
      // Calculate escrow breakdown
      const breakdown = calculateEscrowBreakdown(totalAmount);
      
      // Update order with escrow amounts
      await this.escrowRepository.updateEscrowAmounts(
        orderId,
        breakdown.depositAmount,
        breakdown.fittingAmount,
        breakdown.finalAmount,
        totalAmount // Initial escrow balance = total amount
      );

      // Set order to PENDING_DEPOSIT status
      await this.escrowRepository.updateEscrowStage(orderId, 'DEPOSIT');

      // Create deposit payment intent with Hubtel
      const paymentRequest: PaymentInitiationRequest = {
        orderId,
        amount: breakdown.depositAmount,
        customerPhoneNumber: customerPhone,
        paymentMethod: 'MTN', // Default to MTN, should be determined by phone number
        description: `Deposit payment for order ${orderId} (25% of ${totalAmount})`
      };
      
      const paymentResult = await this.paymentService.initiatePayment(paymentRequest);

      if (!paymentResult.success) {
        throw new Error(`Payment initiation failed: ${paymentResult.message}`);
      }

      // Create escrow transaction record
      await this.escrowRepository.createEscrowTransaction(
        orderId,
        'DEPOSIT',
        breakdown.depositAmount,
        null, // No previous stage for deposit
        'DEPOSIT',
        paymentResult.transactionId,
        customerId,
        'Initial deposit payment for order'
      );

      return {
        paymentIntentId: paymentResult.transactionId,
        depositAmount: breakdown.depositAmount,
        paymentUrl: paymentResult.paymentUrl,
        orderStatus: 'PENDING_DEPOSIT'
      };
    } catch (error) {
      console.error('Error initiating escrow payment:', error);
      throw new Error(`Failed to initiate escrow payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process successful deposit payment
   * Called by webhook when deposit payment is confirmed
   */
  async processDepositPayment(
    orderId: string,
    paymentTransactionId: string,
    paidAmount: number
  ): Promise<boolean> {
    try {
      // Update escrow stage to FITTING (deposit paid, now waiting for fitting)
      await this.escrowRepository.updateEscrowStage(orderId, 'FITTING', paidAmount);

      // Create transaction record for deposit completion
      await this.escrowRepository.createEscrowTransaction(
        orderId,
        'DEPOSIT',
        paidAmount,
        'DEPOSIT',
        'FITTING',
        paymentTransactionId,
        undefined,
        'Deposit payment confirmed, order ready for fitting'
      );

      // Note: Order confirmation to tailor would be handled by order service
      // This service focuses on escrow-specific logic

      return true;
    } catch (error) {
      console.error('Error processing deposit payment:', error);
      return false;
    }
  }

  /**
   * Get current escrow status for an order
   */
  async getEscrowStatus(orderId: string): Promise<EscrowStatus | null> {
    return await this.escrowRepository.getEscrowStatus(orderId);
  }

  /**
   * Calculate escrow breakdown for given amount
   */
  calculateBreakdown(totalAmount: number): EscrowBreakdown {
    return calculateEscrowBreakdown(totalAmount);
  }

  /**
   * Get amount required for specific stage
   */
  getStageAmount(totalAmount: number, stage: EscrowStage): number {
    return getStageAmount(totalAmount, stage);
  }

  /**
   * Approve milestone and release payment
   * Used for fitting approval and final delivery confirmation
   */
  async approveMilestone(
    orderId: string,
    currentStage: EscrowStage,
    approvedBy: string,
    notes?: string
  ): Promise<{
    success: boolean;
    amountReleased: number;
    newStage: EscrowStage;
    transactionId?: string;
  }> {
    try {
      const escrowStatus = await this.getEscrowStatus(orderId);
      if (!escrowStatus) {
        throw new Error('Order not found or has no escrow status');
      }

      // Validate current stage matches expected stage
      if (escrowStatus.currentStage !== currentStage) {
        throw new Error(
          `Invalid stage transition. Expected ${currentStage}, got ${escrowStatus.currentStage}`
        );
      }

      let amountToRelease = 0;
      let newStage: EscrowStage;
      let transactionType: EscrowTransactionType;

      // Determine amount to release and next stage
      switch (currentStage) {
        case 'FITTING':
          amountToRelease = escrowStatus.totalAmount * 0.50; // 50% for fitting
          newStage = 'FINAL';
          transactionType = 'FITTING_PAYMENT';
          break;
        case 'FINAL':
          amountToRelease = escrowStatus.totalAmount * 0.25; // 25% for final
          newStage = 'RELEASED';
          transactionType = 'FINAL_PAYMENT';
          break;
        default:
          throw new Error(`Cannot approve milestone for stage: ${currentStage}`);
      }

      // Update escrow stage
      await this.escrowRepository.updateEscrowStage(orderId, newStage, amountToRelease);

      // Create transaction record for milestone approval
      const transaction = await this.escrowRepository.createEscrowTransaction(
        orderId,
        transactionType,
        amountToRelease,
        currentStage,
        newStage,
        undefined, // No payment transaction ID for releases
        approvedBy,
        notes || `${currentStage} milestone approved`
      );

      return {
        success: true,
        amountReleased: amountToRelease,
        newStage,
        transactionId: transaction?.id
      };
    } catch (error) {
      console.error('Error approving milestone:', error);
      return {
        success: false,
        amountReleased: 0,
        newStage: currentStage,
      };
    }
  }

  /**
   * Handle payment webhook for escrow payments
   */
  async handlePaymentWebhook(
    orderId: string,
    paymentStatus: string,
    paymentTransactionId: string,
    amount: number,
    paymentType: string
  ): Promise<boolean> {
    try {
      if (paymentStatus === 'SUCCESS' && paymentType === 'DEPOSIT') {
        return await this.processDepositPayment(orderId, paymentTransactionId, amount);
      }
      
      // Handle other payment types (fitting, final) if needed
      return true;
    } catch (error) {
      console.error('Error handling payment webhook:', error);
      return false;
    }
  }

  /**
   * Validate escrow state consistency
   */
  async validateEscrowState(orderId: string): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    try {
      const status = await this.getEscrowStatus(orderId);
      if (!status) {
        return {
          isValid: false,
          errors: ['Order not found']
        };
      }

      const errors: string[] = [];

      // Validate amount calculations
      const breakdown = this.calculateBreakdown(status.totalAmount);
      const calculatedTotal = breakdown.depositAmount + breakdown.fittingAmount + breakdown.finalAmount;
      
      if (Math.abs(calculatedTotal - status.totalAmount) > 0.01) {
        errors.push(`Total amount mismatch: ${calculatedTotal} vs ${status.totalAmount}`);
      }

      // Validate stage progression
      const paidTotal = status.depositPaid + status.fittingPaid + status.finalPaid;
      const expectedBalance = status.totalAmount - paidTotal;
      
      if (Math.abs(status.escrowBalance - expectedBalance) > 0.01) {
        errors.push(`Escrow balance mismatch: ${status.escrowBalance} vs ${expectedBalance}`);
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation error: ${error.message}`]
      };
    }
  }
}