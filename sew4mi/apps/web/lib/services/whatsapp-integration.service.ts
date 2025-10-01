/**
 * WhatsApp Integration Service (Enhanced with Twilio)
 * 
 * Provides integration with Twilio WhatsApp API for order messaging
 * Includes Ghana-specific phone number formatting and message templates
 * Falls back to Twilio Sandbox for development and Facebook API for production
 */

import { OrderMessage, OrderMessageType, OrderParticipantRole } from '@sew4mi/shared/types';
import { twilioService, MessageChannel, MessageResult, GhanaPhoneUtils } from './twilio.service';

/**
 * WhatsApp message template types
 */
export enum WhatsAppTemplateType {
  ORDER_UPDATE = 'order_update',
  MILESTONE_UPDATE = 'milestone_update',
  PAYMENT_REMINDER = 'payment_reminder',
  FITTING_REMINDER = 'fitting_reminder',
  DELIVERY_READY = 'delivery_ready',
  GENERAL_MESSAGE = 'general_message'
}

/**
 * WhatsApp message payload
 */
export interface WhatsAppMessagePayload {
  to: string;
  type: 'text' | 'image' | 'document' | 'audio' | 'template';
  content: string;
  mediaUrl?: string;
  templateType?: WhatsAppTemplateType;
  templateParams?: Record<string, string>;
  orderId?: string;
  context?: {
    messageId?: string;
    from?: string;
  };
}

/**
 * WhatsApp contact information
 */
export interface WhatsAppContact {
  phone: string;
  name: string;
  formattedPhone: string;
  countryCode: string;
}

/**
 * WhatsApp service configuration
 */
interface WhatsAppConfig {
  baseUrl: string;
  token: string;
  phoneNumberId: string;
  verifyToken: string;
  businessAccountId: string;
  useTwilio: boolean;
  twilioWhatsAppNumber: string;
}

/**
 * Ghana phone number patterns
 */
const GHANA_PHONE_PATTERNS = {
  MTN: /^(0?24|0?54|0?55|0?59)\d{7}$/,
  VODAFONE: /^(0?20|0?50)\d{7}$/,
  AIRTELTIGO: /^(0?26|0?56|0?27|0?57)\d{7}$/
};

/**
 * WhatsApp message templates for Ghana market
 */
const WHATSAPP_TEMPLATES = {
  [WhatsAppTemplateType.ORDER_UPDATE]: {
    name: 'order_status_update',
    text: 'Hi {{customer_name}}! 👋\n\nYour {{garment_type}} order ({{order_number}}) status has been updated to: *{{status}}*\n\n📱 View details: {{order_link}}\n\nThank you for choosing us!',
    params: ['customer_name', 'garment_type', 'order_number', 'status', 'order_link']
  },
  [WhatsAppTemplateType.MILESTONE_UPDATE]: {
    name: 'milestone_update',
    text: 'Exciting update! 🎉\n\nNew photos available for your {{garment_type}} order:\n\n📸 *{{milestone_name}}* completed\n{{milestone_description}}\n\n👀 View photos: {{photos_link}}\n\nLooking great so far!',
    params: ['garment_type', 'milestone_name', 'milestone_description', 'photos_link']
  },
  [WhatsAppTemplateType.PAYMENT_REMINDER]: {
    name: 'payment_reminder',
    text: 'Payment Reminder 💳\n\nHi {{customer_name}},\n\nYour {{payment_stage}} payment of *GHS {{amount}}* is due {{due_date}}.\n\n💰 Pay now: {{payment_link}}\n📞 Questions? Reply to this message.\n\nThank you!',
    params: ['customer_name', 'payment_stage', 'amount', 'due_date', 'payment_link']
  },
  [WhatsAppTemplateType.FITTING_REMINDER]: {
    name: 'fitting_reminder',
    text: 'Fitting Reminder 👔\n\nHi {{customer_name}}!\n\nYour fitting is scheduled for:\n📅 {{fitting_date}} at {{fitting_time}}\n📍 {{location}}\n\n⚠️ Please arrive 10 minutes early.\n\n📞 Need to reschedule? Reply here.',
    params: ['customer_name', 'fitting_date', 'fitting_time', 'location']
  },
  [WhatsAppTemplateType.DELIVERY_READY]: {
    name: 'delivery_ready',
    text: 'Your Garment is Ready! 🎉\n\nHi {{customer_name}},\n\nYour beautiful {{garment_type}} is complete and ready for {{delivery_type}}!\n\n📍 {{pickup_details}}\n📞 {{contact_number}}\n\nWe can\'t wait for you to see it!',
    params: ['customer_name', 'garment_type', 'delivery_type', 'pickup_details', 'contact_number']
  }
};

/**
 * WhatsApp Integration Service Class
 */
export class WhatsAppIntegrationService {
  private config: WhatsAppConfig;
  private isProduction: boolean;

  constructor(config?: Partial<WhatsAppConfig>) {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.config = {
      baseUrl: config?.baseUrl || process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0',
      token: config?.token || process.env.WHATSAPP_ACCESS_TOKEN || '',
      phoneNumberId: config?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      verifyToken: config?.verifyToken || process.env.WHATSAPP_VERIFY_TOKEN || '',
      businessAccountId: config?.businessAccountId || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
      useTwilio: config?.useTwilio ?? (!this.isProduction || !process.env.WHATSAPP_ACCESS_TOKEN),
      twilioWhatsAppNumber: config?.twilioWhatsAppNumber || process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'
    };
  }

  /**
   * Format Ghana phone number for WhatsApp (now uses Twilio utility)
   */
  public formatGhanaPhone(phone: string): WhatsAppContact | null {
    try {
      // Use Twilio's Ghana phone utils for better formatting
      if (!GhanaPhoneUtils.isValidGhanaNumber(phone)) {
        return null;
      }

      const formatted = GhanaPhoneUtils.formatGhanaNumber(phone);
      const formattedPhone = formatted.replace('+', '');
      
      return {
        phone: phone,
        formattedPhone: formattedPhone,
        countryCode: '233',
        name: 'Customer' // Default name, should be updated with actual customer name
      };
    } catch (error) {
      console.error('Error formatting Ghana phone number:', error);
      return null;
    }
  }

  /**
   * Get network provider for Ghana phone number
   */
  public getGhanaNetworkProvider(phone: string): string | null {
    const contact = this.formatGhanaPhone(phone);
    if (!contact) return null;

    const localNumber = contact.formattedPhone.substring(3);
    
    for (const [provider, pattern] of Object.entries(GHANA_PHONE_PATTERNS)) {
      if (pattern.test('0' + localNumber)) {
        return provider;
      }
    }
    
    return null;
  }

  /**
   * Send WhatsApp message (enhanced with Twilio support)
   */
  public async sendMessage(payload: WhatsAppMessagePayload): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    twilioResult?: MessageResult;
  }> {
    try {
      // Format recipient phone number
      const contact = this.formatGhanaPhone(payload.to);
      if (!contact) {
        throw new Error('Invalid Ghana phone number format');
      }

      // Use Twilio for WhatsApp if configured or in development
      if (this.config.useTwilio) {
        return await this.sendViaTwilio(payload, contact);
      }

      // Fallback to Facebook WhatsApp Business API (production only)
      return await this.sendViaFacebook(payload, contact);

    } catch (error) {
      console.error('WhatsApp send message error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send WhatsApp message via Twilio
   */
  private async sendViaTwilio(
    payload: WhatsAppMessagePayload, 
    contact: WhatsAppContact
  ): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    twilioResult?: MessageResult;
  }> {
    try {
      let messageContent = payload.content;
      let mediaUrls: string[] | undefined;

      // Handle different message types for Twilio
      switch (payload.type) {
        case 'text':
          // Use content as is
          break;
        
        case 'image':
        case 'document':
        case 'audio':
          if (payload.mediaUrl) {
            mediaUrls = [payload.mediaUrl];
          }
          // Add caption for media messages
          if (payload.type === 'image' && payload.content) {
            messageContent = payload.content;
          }
          break;

        case 'template':
          // Convert template to text message for Twilio sandbox
          messageContent = this.convertTemplateToText(payload);
          break;

        default:
          throw new Error(`Unsupported message type for Twilio: ${payload.type}`);
      }

      // Send via Twilio WhatsApp
      const result = await twilioService.sendWhatsApp({
        channel: MessageChannel.WHATSAPP,
        to: `+${contact.formattedPhone}`,
        body: messageContent,
        mediaUrl: mediaUrls,
        statusCallback: `${process.env.WEBHOOK_BASE_URL}/api/webhooks/twilio/whatsapp`
      });

      return {
        success: true,
        messageId: result.sid,
        twilioResult: result
      };

    } catch (error) {
      console.error('Twilio WhatsApp send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Twilio send failed'
      };
    }
  }

  /**
   * Send WhatsApp message via Facebook Business API
   */
  private async sendViaFacebook(
    payload: WhatsAppMessagePayload, 
    contact: WhatsAppContact
  ): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      // Validate Facebook API configuration
      if (!this.config.token || !this.config.phoneNumberId) {
        throw new Error('WhatsApp Business API configuration is incomplete');
      }

      // Prepare message data for Facebook API
      const messageData = await this.prepareMessageData(payload, contact);

      // Send message via WhatsApp Business API
      const response = await fetch(
        `${this.config.baseUrl}/${this.config.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(messageData)
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error?.message || 'Failed to send message');
      }

      return {
        success: true,
        messageId: responseData.messages?.[0]?.id
      };

    } catch (error) {
      console.error('Facebook WhatsApp API send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Facebook API send failed'
      };
    }
  }

  /**
   * Convert template message to plain text for Twilio sandbox
   */
  private convertTemplateToText(payload: WhatsAppMessagePayload): string {
    if (!payload.templateType || !payload.templateParams) {
      return payload.content;
    }

    const template = WHATSAPP_TEMPLATES[payload.templateType];
    if (!template) {
      return payload.content;
    }

    // Replace template placeholders with actual values
    let text = template.text;
    for (const [key, value] of Object.entries(payload.templateParams)) {
      text = text.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    return text;
  }

  /**
   * Prepare message data for WhatsApp API
   */
  private async prepareMessageData(
    payload: WhatsAppMessagePayload, 
    contact: WhatsAppContact
  ): Promise<any> {
    const baseData = {
      messaging_product: 'whatsapp',
      to: contact.formattedPhone,
      context: payload.context
    };

    switch (payload.type) {
      case 'text':
        return {
          ...baseData,
          type: 'text',
          text: { body: payload.content }
        };

      case 'image':
        return {
          ...baseData,
          type: 'image',
          image: {
            link: payload.mediaUrl,
            caption: payload.content || ''
          }
        };

      case 'document':
        return {
          ...baseData,
          type: 'document',
          document: {
            link: payload.mediaUrl,
            caption: payload.content || '',
            filename: this.extractFilename(payload.mediaUrl)
          }
        };

      case 'audio':
        return {
          ...baseData,
          type: 'audio',
          audio: {
            link: payload.mediaUrl
          }
        };

      case 'template':
        if (!payload.templateType || !payload.templateParams) {
          throw new Error('Template type and parameters are required for template messages');
        }
        
        return this.prepareTemplateMessage(baseData, payload.templateType, payload.templateParams);

      default:
        throw new Error(`Unsupported message type: ${payload.type}`);
    }
  }

  /**
   * Prepare template message data
   */
  private prepareTemplateMessage(
    baseData: any, 
    templateType: WhatsAppTemplateType, 
    params: Record<string, string>
  ): any {
    const template = WHATSAPP_TEMPLATES[templateType];
    if (!template) {
      throw new Error(`Template not found: ${templateType}`);
    }

    // Build template parameters
    const components = [{
      type: 'body',
      parameters: template.params.map(param => ({
        type: 'text',
        text: params[param] || `{{${param}}}`
      }))
    }];

    return {
      ...baseData,
      type: 'template',
      template: {
        name: template.name,
        language: { code: 'en' },
        components
      }
    };
  }

  /**
   * Convert order message to WhatsApp format
   */
  public async convertOrderMessageToWhatsApp(
    message: OrderMessage,
    recipientPhone: string
  ): Promise<WhatsAppMessagePayload | null> {
    const contact = this.formatGhanaPhone(recipientPhone);
    if (!contact) {
      return null;
    }

    const basePayload: WhatsAppMessagePayload = {
      to: contact.formattedPhone,
      type: 'text',
      content: message.message,
      orderId: message.orderId,
      context: {
        messageId: message.id
      }
    };

    switch (message.messageType) {
      case OrderMessageType.TEXT:
        return { ...basePayload, type: 'text' };

      case OrderMessageType.IMAGE:
        return {
          ...basePayload,
          type: 'image',
          mediaUrl: message.mediaUrl,
          content: message.message || 'Image'
        };

      case OrderMessageType.VOICE:
        return {
          ...basePayload,
          type: 'audio',
          mediaUrl: message.mediaUrl
        };

      default:
        return basePayload;
    }
  }

  /**
   * Send order notification via WhatsApp
   */
  public async sendOrderNotification(
    templateType: WhatsAppTemplateType,
    recipientPhone: string,
    templateParams: Record<string, string>
  ): Promise<{ success: boolean; messageId?: string; error?: string; twilioResult?: MessageResult }> {
    return this.sendMessage({
      to: recipientPhone,
      type: 'template',
      content: '',
      templateType,
      templateParams
    });
  }

  /**
   * Send simple text message via WhatsApp (Twilio optimized)
   */
  public async sendTextMessage(
    to: string,
    message: string,
    options: {
      mediaUrl?: string;
      orderId?: string;
    } = {}
  ): Promise<{ success: boolean; messageId?: string; error?: string; twilioResult?: MessageResult }> {
    return this.sendMessage({
      to,
      type: options.mediaUrl ? 'image' : 'text',
      content: message,
      mediaUrl: options.mediaUrl,
      orderId: options.orderId
    });
  }

  /**
   * Send milestone update with photos (optimized for Twilio)
   */
  public async sendMilestoneUpdate(
    to: string,
    orderNumber: string,
    milestoneName: string,
    status: string,
    photoUrls?: string[]
  ): Promise<{ success: boolean; messageId?: string; error?: string; twilioResult?: MessageResult }> {
    const message = `🧵 *Sew4Mi Order #${orderNumber}*\n\n📸 *${milestoneName}* is *${status}*!\n\nCheck your app for full details and more photos.`;

    return this.sendMessage({
      to,
      type: photoUrls && photoUrls.length > 0 ? 'image' : 'text',
      content: message,
      mediaUrl: photoUrls?.[0], // Use first photo as main image
      orderId: orderNumber
    });
  }

  /**
   * Extract filename from URL
   */
  private extractFilename(url?: string): string {
    if (!url) return 'document';
    
    try {
      const pathname = new URL(url).pathname;
      return pathname.split('/').pop() || 'document';
    } catch {
      return 'document';
    }
  }

  /**
   * Verify WhatsApp webhook
   */
  public verifyWebhook(
    mode: string,
    token: string,
    challenge: string
  ): string | null {
    if (mode === 'subscribe' && token === this.config.verifyToken) {
      return challenge;
    }
    return null;
  }

  /**
   * Process incoming WhatsApp webhook
   */
  public processWebhook(body: any): {
    messageId?: string;
    from?: string;
    content?: string;
    type?: string;
    timestamp?: number;
  } | null {
    try {
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0];
      const message = change?.value?.messages?.[0];

      if (!message) {
        return null;
      }

      return {
        messageId: message.id,
        from: message.from,
        content: message.text?.body || message.caption || '',
        type: message.type,
        timestamp: message.timestamp
      };

    } catch (error) {
      console.error('Error processing WhatsApp webhook:', error);
      return null;
    }
  }

  /**
   * Get WhatsApp Business Profile
   */
  public async getBusinessProfile(): Promise<{
    success: boolean;
    profile?: {
      displayName: string;
      about?: string;
      photoUrl?: string;
      website?: string;
    };
    error?: string;
  }> {
    try {
      if (!this.isProduction) {
        return {
          success: true,
          profile: {
            displayName: 'Sew4Mi (Dev)',
            about: 'Custom tailoring marketplace in Ghana',
            website: 'https://sew4mi.com'
          }
        };
      }

      const response = await fetch(
        `${this.config.baseUrl}/${this.config.phoneNumberId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.config.token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to get business profile');
      }

      return {
        success: true,
        profile: {
          displayName: data.display_name,
          about: data.about,
          photoUrl: data.profile_picture_url,
          website: data.website
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const whatsappService = new WhatsAppIntegrationService();