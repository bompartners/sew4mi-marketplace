import { ENV_CONFIG, validateHubtelEnvironment } from '../config/env';
import { networkService } from './networkService';
import { 
  HubtelPaymentRequest, 
  HubtelPaymentResponse
  // HubtelWebhookPayload - TODO: Used for webhook processing
} from '@sew4mi/shared/types';
import { NETWORK_TIMEOUTS, HUBTEL_ENDPOINTS, HUBTEL_CHANNELS } from '@sew4mi/shared/constants';
import { validateGhanaPhoneNumber } from '@sew4mi/shared';
import crypto from 'crypto';

export interface HubtelTransactionStatusResponse {
  transactionId: string;
  hubtelTransactionId: string;
  status: string;
  amount: number;
  customerPhoneNumber: string;
  message: string;
  timestamp: string;
}

export class HubtelService {
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private merchantId: string;
  private webhookSecret: string;

  constructor() {
    validateHubtelEnvironment();
    
    this.baseUrl = ENV_CONFIG.HUBTEL_BASE_URL;
    this.clientId = ENV_CONFIG.HUBTEL_CLIENT_ID;
    this.clientSecret = ENV_CONFIG.HUBTEL_CLIENT_SECRET;
    this.merchantId = ENV_CONFIG.HUBTEL_MERCHANT_ACCOUNT_ID;
    this.webhookSecret = ENV_CONFIG.HUBTEL_WEBHOOK_SECRET;
  }

  /**
   * Generates OAuth 2.0 authorization header for Hubtel API
   */
  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    return `Basic ${credentials}`;
  }


  /**
   * Initiate mobile money payment
   */
  async initiateMobileMoneyPayment(request: HubtelPaymentRequest): Promise<HubtelPaymentResponse> {
    const phoneValidation = validateGhanaPhoneNumber(request.customerPhoneNumber);
    
    if (!phoneValidation.isValid || !phoneValidation.network) {
      throw new Error(`Invalid Ghana phone number: ${request.customerPhoneNumber}`);
    }

    const endpoint = HUBTEL_ENDPOINTS.MOBILE_MONEY.replace('{merchant-id}', this.merchantId);
    const url = `${this.baseUrl}${endpoint}`;

    const payload = {
      CustomerName: request.customerName || 'Customer',
      CustomerMsisdn: phoneValidation.formattedNumber,
      CustomerEmail: '', // Optional
      Channel: this.getHubtelChannel(phoneValidation.network),
      Amount: request.amount,
      PrimaryCallbackUrl: ENV_CONFIG.HUBTEL_CALLBACK_URL,
      Description: request.description || 'Payment for Sew4Mi order',
      ClientReference: request.transactionId,
    };

    try {
      const timeout = NETWORK_TIMEOUTS[phoneValidation.network];
      
      const response = await networkService.withRetry(async () => {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(timeout)
        });

        if (!res.ok) {
          const errorBody = await res.text().catch(() => 'Unknown error');
          throw new Error(`Hubtel API error ${res.status}: ${errorBody}`);
        }

        return res;
      }, {
        maxRetries: 2,
        baseDelay: 2000,
        retryCondition: (error) => this.isRetryableError(error)
      });

      const data = await response.json();

      return {
        transactionId: request.transactionId,
        hubtelTransactionId: data.Data?.TransactionId || data.TransactionId,
        status: this.mapHubtelStatus(data.ResponseCode || data.Data?.Status),
        paymentUrl: data.Data?.CheckoutDirectUrl,
        message: data.Message || data.Data?.Description || 'Payment initiated successfully'
      };

    } catch (error) {
      console.error('Hubtel mobile money payment error:', error);
      throw new Error(
        error instanceof Error 
          ? `Payment initiation failed: ${error.message}`
          : 'Payment initiation failed: Unknown error'
      );
    }
  }

  /**
   * Get transaction status from Hubtel
   */
  async getTransactionStatus(transactionId: string): Promise<HubtelTransactionStatusResponse> {
    const endpoint = HUBTEL_ENDPOINTS.TRANSACTION_STATUS
      .replace('{merchant-id}', this.merchantId)
      .replace('{transaction-id}', transactionId);
    
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await networkService.withRetry(async () => {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(10000) // 10s timeout for status checks
        });

        if (!res.ok) {
          const errorBody = await res.text().catch(() => 'Unknown error');
          throw new Error(`Hubtel status check error ${res.status}: ${errorBody}`);
        }

        return res;
      }, {
        maxRetries: 3,
        baseDelay: 1000
      });

      const data = await response.json();
      const txData = data.Data || data;

      return {
        transactionId,
        hubtelTransactionId: txData.TransactionId,
        status: this.mapHubtelStatus(txData.Status || txData.ResponseCode),
        amount: parseFloat(txData.Amount || '0'),
        customerPhoneNumber: txData.CustomerMsisdn || '',
        message: txData.Description || txData.Message || 'Status retrieved',
        timestamp: txData.TransactionDate || new Date().toISOString()
      };

    } catch (error) {
      console.error('Hubtel transaction status error:', error);
      throw new Error(
        error instanceof Error 
          ? `Status check failed: ${error.message}`
          : 'Status check failed: Unknown error'
      );
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');
      
      // Remove 'sha256=' prefix if present
      const cleanSignature = signature.replace(/^sha256=/, '');
      
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(cleanSignature, 'hex')
      );
    } catch (error) {
      console.error('Webhook signature verification error:', error);
      return false;
    }
  }

  /**
   * Map Hubtel status codes to our standard status
   */
  private mapHubtelStatus(hubtelStatus: string | number): string {
    const status = String(hubtelStatus).toLowerCase();
    
    switch (status) {
      case '0000':
      case 'success':
      case 'successful':
      case 'paid':
        return 'SUCCESS';
      
      case '0001':
      case 'pending':
      case 'processing':
        return 'PENDING';
      
      case 'failed':
      case 'error':
      case 'declined':
      case 'insufficient_funds':
        return 'FAILED';
      
      case 'cancelled':
      case 'canceled':
        return 'CANCELLED';
      
      default:
        return 'PENDING';
    }
  }

  /**
   * Get Hubtel channel name for network
   */
  private getHubtelChannel(network: 'MTN' | 'VODAFONE' | 'AIRTELTIGO'): string {
    const channel = HUBTEL_CHANNELS[network];
    if (!channel) {
      throw new Error(`Unsupported network: ${network}`);
    }
    return channel;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false;

    const message = error.message?.toLowerCase() || '';
    const status = error.status || error.statusCode;

    // Network errors
    if (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('fetch')
    ) {
      return true;
    }

    // HTTP status codes that should be retried
    if (status === 408 || status === 429 || (status >= 500 && status <= 599)) {
      return true;
    }

    return false;
  }
}

// Singleton instance
export const hubtelService = new HubtelService();