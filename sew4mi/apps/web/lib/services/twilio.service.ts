/**
 * Twilio Service for SMS and WhatsApp messaging
 * Provides unified interface for sending messages via Twilio API
 * @file twilio.service.ts
 */

import { Twilio } from 'twilio';

/**
 * Message delivery status from Twilio webhooks
 */
export enum MessageStatus {
  QUEUED = 'queued',
  SENT = 'sent',
  DELIVERED = 'delivered',
  UNDELIVERED = 'undelivered',
  FAILED = 'failed',
  RECEIVED = 'received'
}

/**
 * Message channel types
 */
export enum MessageChannel {
  SMS = 'sms',
  WHATSAPP = 'whatsapp'
}

/**
 * Base message interface
 */
export interface BaseMessage {
  to: string;
  body: string;
  from?: string;
  mediaUrl?: string[];
  statusCallback?: string;
}

/**
 * SMS message options
 */
export interface SMSMessage extends BaseMessage {
  channel: MessageChannel.SMS;
  sendAsText?: boolean;
  maxPrice?: number;
  provideFeedback?: boolean;
  attemptNumber?: number;
  validityPeriod?: number;
}

/**
 * WhatsApp message options
 */
export interface WhatsAppMessage extends BaseMessage {
  channel: MessageChannel.WHATSAPP;
  templateSid?: string;
  templateParameters?: string[];
  contentSid?: string;
  contentVariables?: Record<string, string>;
}

/**
 * Message result interface
 */
export interface MessageResult {
  sid: string;
  status: MessageStatus;
  channel: MessageChannel;
  to: string;
  from: string;
  body: string;
  dateCreated: Date;
  errorCode?: string;
  errorMessage?: string;
  price?: string;
  priceUnit?: string;
  uri: string;
}

/**
 * Ghana phone number utilities
 */
export class GhanaPhoneUtils {
  private static readonly GHANA_COUNTRY_CODE = '+233';
  private static readonly VALID_PREFIXES = ['20', '23', '24', '25', '26', '27', '28', '50', '53', '54', '55', '56', '57', '59'];

  /**
   * Format Ghana phone number to international format
   */
  static formatGhanaNumber(phoneNumber: string): string {
    // Remove all non-numeric characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Handle different input formats
    if (cleaned.startsWith('233')) {
      // Already in international format without +
      return `+${cleaned}`;
    }
    
    if (cleaned.startsWith('0')) {
      // Local format (0XXXXXXXXX)
      return `${this.GHANA_COUNTRY_CODE}${cleaned.substring(1)}`;
    }
    
    if (cleaned.length === 9 && this.VALID_PREFIXES.some(prefix => cleaned.startsWith(prefix))) {
      // Missing leading zero (XXXXXXXXX)
      return `${this.GHANA_COUNTRY_CODE}${cleaned}`;
    }
    
    // If already formatted with +233, return as is
    if (phoneNumber.startsWith(this.GHANA_COUNTRY_CODE)) {
      return phoneNumber;
    }
    
    // Default: assume it needs Ghana country code
    return `${this.GHANA_COUNTRY_CODE}${cleaned}`;
  }

  /**
   * Validate Ghana phone number
   */
  static isValidGhanaNumber(phoneNumber: string): boolean {
    try {
      const formatted = this.formatGhanaNumber(phoneNumber);
      const numberPart = formatted.replace(this.GHANA_COUNTRY_CODE, '');
      
      // Should be exactly 9 digits after country code
      if (numberPart.length !== 9) return false;
      
      // Should start with valid prefix
      return this.VALID_PREFIXES.some(prefix => numberPart.startsWith(prefix));
    } catch {
      return false;
    }
  }

  /**
   * Format for WhatsApp (whatsapp:+233XXXXXXXXX)
   */
  static formatForWhatsApp(phoneNumber: string): string {
    const formatted = this.formatGhanaNumber(phoneNumber);
    return `whatsapp:${formatted}`;
  }
}

/**
 * TwilioService class for managing SMS and WhatsApp messaging
 */
export class TwilioService {
  private static instance: TwilioService;
  private client: Twilio;
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly phoneNumber: string;
  private readonly whatsAppNumber: string;

  private constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID!;
    this.authToken = process.env.TWILIO_AUTH_TOKEN!;
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER!;
    this.whatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER!;

    if (!this.accountSid || !this.authToken) {
      throw new Error('Twilio credentials not found in environment variables');
    }

    this.client = new Twilio(this.accountSid, this.authToken);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): TwilioService {
    if (!TwilioService.instance) {
      TwilioService.instance = new TwilioService();
    }
    return TwilioService.instance;
  }

  /**
   * Send SMS message
   */
  public async sendSMS(message: SMSMessage): Promise<MessageResult> {
    try {
      // Format phone number for Ghana
      const toNumber = GhanaPhoneUtils.formatGhanaNumber(message.to);
      
      // Validate phone number
      if (!GhanaPhoneUtils.isValidGhanaNumber(toNumber)) {
        throw new Error(`Invalid Ghana phone number: ${message.to}`);
      }

      const result = await this.client.messages.create({
        body: message.body,
        from: message.from || this.phoneNumber,
        to: toNumber,
        mediaUrl: message.mediaUrl,
        statusCallback: message.statusCallback,
        maxPrice: message.maxPrice,
        provideFeedback: message.provideFeedback,
        attemptNumber: message.attemptNumber,
        validityPeriod: message.validityPeriod
      });

      console.log(`SMS sent successfully: ${result.sid}`);

      return this.mapTwilioMessageToResult(result, MessageChannel.SMS);
    } catch (error) {
      console.error('Failed to send SMS:', error);
      throw this.handleTwilioError(error);
    }
  }

  /**
   * Send WhatsApp message
   */
  public async sendWhatsApp(message: WhatsAppMessage): Promise<MessageResult> {
    try {
      // Format phone number for WhatsApp
      const toNumber = GhanaPhoneUtils.formatForWhatsApp(message.to);
      
      const result = await this.client.messages.create({
        body: message.body,
        from: message.from || this.whatsAppNumber,
        to: toNumber,
        mediaUrl: message.mediaUrl,
        statusCallback: message.statusCallback,
        messagingServiceSid: message.templateSid,
        contentSid: message.contentSid,
        contentVariables: message.contentVariables ? JSON.stringify(message.contentVariables) : undefined
      });

      console.log(`WhatsApp message sent successfully: ${result.sid}`);

      return this.mapTwilioMessageToResult(result, MessageChannel.WHATSAPP);
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error);
      throw this.handleTwilioError(error);
    }
  }

  /**
   * Send unified message (auto-selects SMS or WhatsApp based on preferences)
   */
  public async sendMessage(
    to: string, 
    body: string, 
    options: {
      channel?: MessageChannel;
      mediaUrl?: string[];
      statusCallback?: string;
      templateSid?: string;
      contentVariables?: Record<string, string>;
    } = {}
  ): Promise<MessageResult> {
    const { channel = MessageChannel.SMS, ...messageOptions } = options;

    if (channel === MessageChannel.WHATSAPP) {
      return this.sendWhatsApp({
        channel: MessageChannel.WHATSAPP,
        to,
        body,
        ...messageOptions
      });
    } else {
      return this.sendSMS({
        channel: MessageChannel.SMS,
        to,
        body,
        ...messageOptions
      });
    }
  }

  /**
   * Get message status by SID
   */
  public async getMessageStatus(messageSid: string): Promise<MessageResult | null> {
    try {
      const message = await this.client.messages(messageSid).fetch();
      const channel = message.from?.startsWith('whatsapp:') 
        ? MessageChannel.WHATSAPP 
        : MessageChannel.SMS;
      
      return this.mapTwilioMessageToResult(message, channel);
    } catch (error) {
      console.error(`Failed to fetch message status for SID ${messageSid}:`, error);
      return null;
    }
  }

  /**
   * List recent messages
   */
  public async getRecentMessages(limit: number = 20): Promise<MessageResult[]> {
    try {
      const messages = await this.client.messages.list({ limit });
      
      return messages.map(message => {
        const channel = message.from?.startsWith('whatsapp:') 
          ? MessageChannel.WHATSAPP 
          : MessageChannel.SMS;
        return this.mapTwilioMessageToResult(message, channel);
      });
    } catch (error) {
      console.error('Failed to fetch recent messages:', error);
      throw this.handleTwilioError(error);
    }
  }

  /**
   * Send order notification via preferred channel
   */
  public async sendOrderNotification(
    to: string,
    orderNumber: string,
    message: string,
    channel: MessageChannel = MessageChannel.SMS
  ): Promise<MessageResult> {
    const body = `Sew4Mi Order #${orderNumber}: ${message}`;
    
    return this.sendMessage(to, body, {
      channel,
      statusCallback: `${process.env.WEBHOOK_BASE_URL}/api/webhooks/twilio/status`
    });
  }

  /**
   * Send milestone notification
   */
  public async sendMilestoneNotification(
    to: string,
    orderNumber: string,
    milestoneName: string,
    status: string,
    channel: MessageChannel = MessageChannel.SMS
  ): Promise<MessageResult> {
    const body = `Sew4Mi Update: Order #${orderNumber} - ${milestoneName} is ${status}. Check the app for details.`;
    
    return this.sendMessage(to, body, {
      channel,
      statusCallback: `${process.env.WEBHOOK_BASE_URL}/api/webhooks/twilio/status`
    });
  }

  /**
   * Send payment confirmation
   */
  public async sendPaymentConfirmation(
    to: string,
    orderNumber: string,
    amount: number,
    currency: string = 'GHS',
    channel: MessageChannel = MessageChannel.SMS
  ): Promise<MessageResult> {
    const body = `Payment confirmed! Order #${orderNumber} - ${currency}${amount.toFixed(2)} received. Thank you for using Sew4Mi!`;
    
    return this.sendMessage(to, body, {
      channel,
      statusCallback: `${process.env.WEBHOOK_BASE_URL}/api/webhooks/twilio/status`
    });
  }

  /**
   * Validate webhook signature for security
   */
  public validateWebhookSignature(
    signature: string,
    url: string,
    body: string
  ): boolean {
    try {
      return this.client.webhooks.validate(this.authToken, signature, url, body);
    } catch (error) {
      console.error('Failed to validate webhook signature:', error);
      return false;
    }
  }

  /**
   * Map Twilio message to our result format
   */
  private mapTwilioMessageToResult(message: any, channel: MessageChannel): MessageResult {
    return {
      sid: message.sid,
      status: message.status as MessageStatus,
      channel,
      to: message.to,
      from: message.from,
      body: message.body,
      dateCreated: new Date(message.dateCreated),
      errorCode: message.errorCode,
      errorMessage: message.errorMessage,
      price: message.price,
      priceUnit: message.priceUnit,
      uri: message.uri
    };
  }

  /**
   * Handle Twilio API errors
   */
  private handleTwilioError(error: any): Error {
    if (error.code) {
      // Twilio API error
      const errorMessage = `Twilio Error ${error.code}: ${error.message}`;
      return new Error(errorMessage);
    } else {
      // Other error
      return error instanceof Error ? error : new Error(String(error));
    }
  }
}

// Export factory function for better testability
export const createTwilioService = () => TwilioService.getInstance();

// Export singleton instance (lazy initialized)
let _twilioService: TwilioService | null = null;
export const twilioService = {
  get instance() {
    if (!_twilioService) {
      _twilioService = TwilioService.getInstance();
    }
    return _twilioService;
  },
  
  // Delegate methods for backwards compatibility
  sendSMS: (...args: Parameters<TwilioService['sendSMS']>) => 
    twilioService.instance.sendSMS(...args),
  sendWhatsApp: (...args: Parameters<TwilioService['sendWhatsApp']>) => 
    twilioService.instance.sendWhatsApp(...args),
  sendMessage: (...args: Parameters<TwilioService['sendMessage']>) => 
    twilioService.instance.sendMessage(...args),
  getMessageStatus: (...args: Parameters<TwilioService['getMessageStatus']>) => 
    twilioService.instance.getMessageStatus(...args),
  getRecentMessages: (...args: Parameters<TwilioService['getRecentMessages']>) => 
    twilioService.instance.getRecentMessages(...args),
  sendOrderNotification: (...args: Parameters<TwilioService['sendOrderNotification']>) => 
    twilioService.instance.sendOrderNotification(...args),
  sendMilestoneNotification: (...args: Parameters<TwilioService['sendMilestoneNotification']>) => 
    twilioService.instance.sendMilestoneNotification(...args),
  sendPaymentConfirmation: (...args: Parameters<TwilioService['sendPaymentConfirmation']>) => 
    twilioService.instance.sendPaymentConfirmation(...args),
  validateWebhookSignature: (...args: Parameters<TwilioService['validateWebhookSignature']>) => 
    twilioService.instance.validateWebhookSignature(...args)
};