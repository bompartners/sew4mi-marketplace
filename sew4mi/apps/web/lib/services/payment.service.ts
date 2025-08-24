import { hubtelService } from './hubtel.service';
import { networkService } from './networkService';
import { paymentRepository } from '../repositories/payment.repository';
import { 
  PaymentInitiationRequest, 
  PaymentTransaction, 
  PaymentStatusResponse,
  HubtelWebhookPayload 
} from '@sew4mi/shared/types';
import { 
  PAYMENT_PROVIDERS, 
  PAYMENT_STATUSES, 
  RETRY_CONFIG 
} from '@sew4mi/shared/constants';
import { validateGhanaPhoneNumber } from '@sew4mi/shared';
import { v4 as uuidv4 } from 'uuid';

export interface PaymentServiceResult {
  success: boolean;
  transactionId: string;
  hubtelTransactionId?: string;
  paymentUrl?: string;
  message: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
}

export class PaymentService {
  
  /**
   * Initiate a payment using Hubtel gateway
   */
  async initiatePayment(request: PaymentInitiationRequest): Promise<PaymentServiceResult> {
    try {
      // Generate unique transaction ID
      const transactionId = uuidv4();
      
      // Validate phone number and determine provider
      const phoneValidation = validateGhanaPhoneNumber(request.customerPhoneNumber);
      
      if (!phoneValidation.isValid || !phoneValidation.network) {
        return {
          success: false,
          transactionId,
          message: `Invalid phone number format: ${request.customerPhoneNumber}`,
          status: 'FAILED'
        };
      }

      // Map payment method to provider
      const provider = this.getPaymentProvider(request.paymentMethod, phoneValidation.network);
      
      // Prepare Hubtel request
      const hubtelRequest = {
        amount: request.amount,
        customerPhoneNumber: phoneValidation.formattedNumber!,
        paymentMethod: request.paymentMethod,
        transactionId,
        description: request.description || `Payment for order ${request.orderId}`,
        customerName: 'Customer' // Will be enhanced with actual customer data
      };

      // Call Hubtel API
      const hubtelResponse = await hubtelService.initiateMobileMoneyPayment(hubtelRequest);

      // Save payment transaction to database
      const paymentTransaction = await paymentRepository.create({
        id: transactionId,
        orderId: request.orderId,
        type: 'DEPOSIT', // Default type, can be enhanced based on business logic
        amount: request.amount,
        provider,
        providerTransactionId: transactionId,
        hubtelTransactionId: hubtelResponse.hubtelTransactionId,
        paymentMethod: request.paymentMethod,
        customerPhoneNumber: phoneValidation.formattedNumber!,
        status: hubtelResponse.status as 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED'
      });

      if (!paymentTransaction) {
        console.error('Failed to save payment transaction to database');
      }

      return {
        success: hubtelResponse.status !== 'FAILED',
        transactionId: hubtelResponse.transactionId,
        hubtelTransactionId: hubtelResponse.hubtelTransactionId,
        paymentUrl: hubtelResponse.paymentUrl,
        message: hubtelResponse.message,
        status: hubtelResponse.status as 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED'
      };

    } catch (error) {
      console.error('Payment initiation error:', error);
      
      return {
        success: false,
        transactionId: uuidv4(),
        message: error instanceof Error ? error.message : 'Payment initiation failed',
        status: 'FAILED'
      };
    }
  }

  /**
   * Verify payment status with retry logic
   */
  async verifyPaymentStatus(
    transactionId: string, 
    hubtelTransactionId?: string,
    retryCount: number = 0
  ): Promise<PaymentStatusResponse> {
    try {
      // First, get payment transaction from database
      const paymentTransaction = await paymentRepository.findById(transactionId);
      
      if (!paymentTransaction) {
        throw new Error(`Payment transaction not found: ${transactionId}`);
      }

      // Call Hubtel to get latest status
      const statusResponse = await hubtelService.getTransactionStatus(
        hubtelTransactionId || paymentTransaction.hubtelTransactionId || transactionId
      );

      // Update database with latest status if changed
      if (statusResponse.status !== paymentTransaction.status) {
        await paymentRepository.updateStatus(transactionId, {
          status: statusResponse.status as 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED',
          hubtelTransactionId: statusResponse.hubtelTransactionId,
          retryCount: retryCount
        });
      }

      return {
        transactionId,
        status: statusResponse.status as 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED',
        amount: statusResponse.amount,
        provider: paymentTransaction.provider,
        createdAt: paymentTransaction.createdAt,
        updatedAt: new Date()
      };

    } catch (error) {
      console.error(`Payment verification error (attempt ${retryCount + 1}):`, error);

      // Increment retry count in database
      await paymentRepository.incrementRetryCount(transactionId);

      // Implement retry logic for failed verifications
      if (retryCount < RETRY_CONFIG.MAX_RETRIES) {
        const delay = RETRY_CONFIG.DELAYS[retryCount] || 10000;
        
        console.log(`Retrying payment verification in ${delay}ms...`);
        await this.delay(delay);
        
        return this.verifyPaymentStatus(transactionId, hubtelTransactionId, retryCount + 1);
      }

      // Return failed status after max retries
      return {
        transactionId,
        status: 'FAILED',
        amount: 0,
        provider: 'UNKNOWN',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
  }

  /**
   * Process webhook notification
   */
  async processWebhook(
    payload: string, 
    signature: string
  ): Promise<{ success: boolean; message: string; transactionId?: string }> {
    try {
      // Verify webhook signature
      if (!hubtelService.verifyWebhookSignature(payload, signature)) {
        console.error('Invalid webhook signature');
        return { 
          success: false, 
          message: 'Invalid webhook signature' 
        };
      }

      // Parse webhook payload
      const webhookData: HubtelWebhookPayload = JSON.parse(payload);
      
      // Validate required fields
      if (!webhookData.transactionId || !webhookData.status) {
        console.error('Invalid webhook payload structure');
        return { 
          success: false, 
          message: 'Invalid webhook payload structure' 
        };
      }

      // Update payment transaction status in database
      const updateResult = await this.updatePaymentFromWebhook(webhookData);
      
      if (!updateResult.success) {
        console.error('Failed to update payment from webhook:', updateResult.error);
      }

      return {
        success: true,
        message: 'Webhook processed successfully',
        transactionId: webhookData.transactionId
      };

    } catch (error) {
      console.error('Webhook processing error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Webhook processing failed'
      };
    }
  }

  /**
   * Update payment transaction from webhook data
   */
  async updatePaymentFromWebhook(webhookData: HubtelWebhookPayload): Promise<{ success: boolean; error?: string }> {
    try {
      // Find payment transaction by provider transaction ID first
      let paymentTransaction = await paymentRepository.findByProviderTransactionId(webhookData.transactionId);
      
      // If not found by provider ID, try by Hubtel transaction ID
      if (!paymentTransaction && webhookData.hubtelTransactionId) {
        paymentTransaction = await paymentRepository.findByHubtelTransactionId(webhookData.hubtelTransactionId);
      }

      if (!paymentTransaction) {
        return { 
          success: false, 
          error: `Payment transaction not found: ${webhookData.transactionId}` 
        };
      }

      // Map Hubtel status to our status
      const mappedStatus = this.mapWebhookStatus(webhookData.status);

      // Update payment transaction
      const updatedTransaction = await paymentRepository.updateStatus(paymentTransaction.id, {
        status: mappedStatus,
        hubtelTransactionId: webhookData.hubtelTransactionId,
        webhookReceived: true
      });

      if (!updatedTransaction) {
        return { 
          success: false, 
          error: 'Failed to update payment transaction status' 
        };
      }

      return { success: true };

    } catch (error) {
      console.error('Error updating payment from webhook:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Map webhook status to our payment status
   */
  private mapWebhookStatus(webhookStatus: string): 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' {
    const status = webhookStatus.toLowerCase();
    
    switch (status) {
      case 'success':
      case 'successful':
      case 'paid':
      case 'completed':
        return 'SUCCESS';
      
      case 'failed':
      case 'error':
      case 'declined':
      case 'rejected':
        return 'FAILED';
      
      case 'cancelled':
      case 'canceled':
      case 'aborted':
        return 'CANCELLED';
      
      case 'pending':
      case 'processing':
      default:
        return 'PENDING';
    }
  }

  /**
   * Check if payment status polling should continue
   */
  shouldContinuePolling(status: string, retryCount: number): boolean {
    // Stop polling if payment is final or max retries reached
    if (['SUCCESS', 'FAILED', 'CANCELLED'].includes(status)) {
      return false;
    }
    
    return retryCount < RETRY_CONFIG.MAX_RETRIES;
  }

  /**
   * Get payment provider based on method and network
   */
  private getPaymentProvider(
    paymentMethod: string, 
    network: 'MTN' | 'VODAFONE' | 'AIRTELTIGO'
  ): string {
    switch (paymentMethod.toLowerCase()) {
      case 'mtn':
        return PAYMENT_PROVIDERS.HUBTEL_MTN;
      case 'vodafone':
        return PAYMENT_PROVIDERS.HUBTEL_VODAFONE;
      case 'airteltigo':
        return PAYMENT_PROVIDERS.HUBTEL_AIRTELTIGO;
      case 'card':
        return PAYMENT_PROVIDERS.HUBTEL_CARD;
      default:
        // Fallback to network-based provider
        return network === 'MTN' 
          ? PAYMENT_PROVIDERS.HUBTEL_MTN
          : network === 'VODAFONE'
          ? PAYMENT_PROVIDERS.HUBTEL_VODAFONE
          : PAYMENT_PROVIDERS.HUBTEL_AIRTELTIGO;
    }
  }

  /**
   * Determine provider from phone number
   */
  private determineProviderFromPhone(phoneNumber: string): string {
    const validation = validateGhanaPhoneNumber(phoneNumber);
    
    if (!validation.isValid || !validation.network) {
      return 'UNKNOWN';
    }

    return this.getPaymentProvider(validation.network.toLowerCase(), validation.network);
  }

  /**
   * Create delay promise
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Format currency amount for Ghana Cedi
   */
  formatGhanaCedi(amount: number): string {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Validate payment amount
   */
  validateAmount(amount: number): { isValid: boolean; message?: string } {
    if (amount <= 0) {
      return { isValid: false, message: 'Amount must be greater than 0' };
    }

    if (amount < 0.01) {
      return { isValid: false, message: 'Minimum amount is GH₵0.01' };
    }

    if (amount > 100000) {
      return { isValid: false, message: 'Maximum amount is GH₵100,000' };
    }

    return { isValid: true };
  }
}

// Singleton instance
export const paymentService = new PaymentService();