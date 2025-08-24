# WhatsApp Business API Documentation

WhatsApp Business API enables businesses to communicate with customers at scale. It's planned for integration in Sew4Mi to facilitate seamless communication between customers and tailors, providing order updates, consultations, and customer support.

## Core Concepts for Sew4Mi

### Business Communication
- **Message templates**: Pre-approved message formats for notifications
- **Interactive messages**: Rich media and quick reply buttons
- **Session messaging**: 24-hour conversation windows
- **Webhook integration**: Real-time message delivery and status updates

### Ghana Market Integration
- **Local phone numbers**: Support for Ghana (+233) phone numbers
- **Mobile-first approach**: Optimized for Ghana's mobile-heavy market
- **Offline capability**: Message queuing when users are offline
- **Cost-effective**: Reduce SMS costs by using WhatsApp

## Key Integration Patterns

### API Configuration

```typescript
// services/whatsapp.service.ts
import axios from 'axios'

interface WhatsAppConfig {
  apiUrl: string
  accessToken: string
  phoneNumberId: string
  verifyToken: string
}

const config: WhatsAppConfig = {
  apiUrl: 'https://graph.facebook.com/v18.0',
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!,
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN!,
}

export class WhatsAppService {
  private static baseURL = `${config.apiUrl}/${config.phoneNumberId}`
  
  // Send text message
  static async sendTextMessage(to: string, message: string) {
    try {
      const response = await axios.post(
        `${this.baseURL}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to,
          text: { body: message }
        },
        {
          headers: {
            'Authorization': `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json',
          }
        }
      )
      
      return response.data
    } catch (error) {
      console.error('WhatsApp send error:', error)
      throw new Error('Failed to send WhatsApp message')
    }
  }
  
  // Send template message
  static async sendTemplateMessage(
    to: string, 
    templateName: string, 
    parameters: any[] = []
  ) {
    try {
      const response = await axios.post(
        `${this.baseURL}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to,
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'en' },
            components: parameters.length > 0 ? [
              {
                type: 'body',
                parameters: parameters
              }
            ] : []
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json',
          }
        }
      )
      
      return response.data
    } catch (error) {
      console.error('WhatsApp template error:', error)
      throw new Error('Failed to send WhatsApp template')
    }
  }
  
  // Send interactive message with buttons
  static async sendInteractiveMessage(
    to: string,
    bodyText: string,
    buttons: Array<{ id: string; title: string }>
  ) {
    try {
      const response = await axios.post(
        `${this.baseURL}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: bodyText },
            action: {
              buttons: buttons.map(btn => ({
                type: 'reply',
                reply: {
                  id: btn.id,
                  title: btn.title
                }
              }))
            }
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json',
          }
        }
      )
      
      return response.data
    } catch (error) {
      console.error('WhatsApp interactive error:', error)
      throw new Error('Failed to send WhatsApp interactive message')
    }
  }
  
  // Send media message (images, documents)
  static async sendMediaMessage(
    to: string,
    mediaType: 'image' | 'document' | 'video',
    mediaUrl: string,
    caption?: string
  ) {
    try {
      const mediaObject: any = { link: mediaUrl }
      if (caption) mediaObject.caption = caption
      
      const response = await axios.post(
        `${this.baseURL}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to,
          type: mediaType,
          [mediaType]: mediaObject
        },
        {
          headers: {
            'Authorization': `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json',
          }
        }
      )
      
      return response.data
    } catch (error) {
      console.error('WhatsApp media error:', error)
      throw new Error('Failed to send WhatsApp media')
    }
  }
}
```

### Order Notification Templates

```typescript
// services/notifications/whatsapp-notifications.service.ts
import { WhatsAppService } from '../whatsapp.service'
import { formatPhoneNumber } from '@/utils/phone'

export class WhatsAppNotifications {
  // Order confirmation
  static async sendOrderConfirmation(order: Order) {
    const customerPhone = formatPhoneNumber(order.customer.phone)
    const tailorPhone = formatPhoneNumber(order.tailor.phone)
    
    // Send to customer
    await WhatsAppService.sendTemplateMessage(
      customerPhone,
      'order_confirmation',
      [
        { type: 'text', text: order.id },
        { type: 'text', text: order.tailor.name },
        { type: 'text', text: `₵${order.totalAmount}` },
        { type: 'text', text: order.deadline }
      ]
    )
    
    // Send to tailor
    await WhatsAppService.sendTemplateMessage(
      tailorPhone,
      'new_order_notification',
      [
        { type: 'text', text: order.customer.name },
        { type: 'text', text: order.garmentType },
        { type: 'text', text: `₵${order.totalAmount}` }
      ]
    )
  }
  
  // Order status updates
  static async sendStatusUpdate(order: Order, newStatus: string) {
    const customerPhone = formatPhoneNumber(order.customer.phone)
    
    const statusMessages = {
      'confirmed': 'Your order has been confirmed by the tailor!',
      'in_progress': 'Great news! Work has started on your order.',
      'ready_for_fitting': 'Your garment is ready for fitting. Please schedule an appointment.',
      'completed': 'Your order is ready for pickup/delivery!',
      'delivered': 'Order delivered successfully. Thank you for choosing Sew4Mi!'
    }
    
    const message = statusMessages[newStatus] || `Your order status has been updated to: ${newStatus}`
    
    await WhatsAppService.sendTextMessage(customerPhone, message)
    
    // Send interactive message for fitting appointment
    if (newStatus === 'ready_for_fitting') {
      await WhatsAppService.sendInteractiveMessage(
        customerPhone,
        'Would you like to schedule a fitting appointment?',
        [
          { id: 'schedule_fitting', title: 'Schedule Fitting' },
          { id: 'contact_tailor', title: 'Contact Tailor' }
        ]
      )
    }
  }
  
  // Payment reminders
  static async sendPaymentReminder(order: Order) {
    const customerPhone = formatPhoneNumber(order.customer.phone)
    
    await WhatsAppService.sendInteractiveMessage(
      customerPhone,
      `Hi ${order.customer.name}! Your order #${order.id} is ready but payment is pending. Total amount: ₵${order.totalAmount}`,
      [
        { id: 'pay_now', title: 'Pay Now' },
        { id: 'contact_support', title: 'Contact Support' }
      ]
    )
  }
  
  // Tailor application updates
  static async sendTailorApplicationUpdate(
    phone: string, 
    name: string, 
    status: 'approved' | 'rejected' | 'under_review'
  ) {
    const formattedPhone = formatPhoneNumber(phone)
    
    const messages = {
      'approved': `Congratulations ${name}! Your tailor application has been approved. Welcome to Sew4Mi!`,
      'rejected': `Dear ${name}, unfortunately your tailor application was not approved at this time. You can reapply after addressing the feedback.`,
      'under_review': `Hi ${name}, your tailor application is under review. We'll get back to you within 48 hours.`
    }
    
    await WhatsAppService.sendTextMessage(formattedPhone, messages[status])
    
    if (status === 'approved') {
      await WhatsAppService.sendInteractiveMessage(
        formattedPhone,
        'Ready to start receiving orders?',
        [
          { id: 'complete_profile', title: 'Complete Profile' },
          { id: 'view_dashboard', title: 'View Dashboard' }
        ]
      )
    }
  }
}
```

### Webhook Handler

```typescript
// app/api/webhooks/whatsapp/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { WhatsAppWebhookHandler } from '@/services/whatsapp-webhook.service'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  // Verify webhook
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')
  
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  
  return new NextResponse('Verification failed', { status: 403 })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Process incoming messages
    if (body.entry && body.entry[0].changes) {
      for (const change of body.entry[0].changes) {
        if (change.value.messages) {
          await WhatsAppWebhookHandler.handleIncomingMessages(change.value.messages)
        }
        
        if (change.value.statuses) {
          await WhatsAppWebhookHandler.handleMessageStatuses(change.value.statuses)
        }
      }
    }
    
    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('WhatsApp webhook error:', error)
    return new NextResponse('Error processing webhook', { status: 500 })
  }
}

// services/whatsapp-webhook.service.ts
export class WhatsAppWebhookHandler {
  static async handleIncomingMessages(messages: any[]) {
    for (const message of messages) {
      const from = message.from
      const messageType = message.type
      
      // Handle different message types
      switch (messageType) {
        case 'text':
          await this.handleTextMessage(from, message.text.body)
          break
        case 'interactive':
          await this.handleInteractiveResponse(from, message.interactive)
          break
        case 'image':
          await this.handleImageMessage(from, message.image)
          break
      }
    }
  }
  
  static async handleTextMessage(from: string, text: string) {
    // Simple command handling
    const lowercaseText = text.toLowerCase()
    
    if (lowercaseText.includes('order status') || lowercaseText.includes('my order')) {
      await this.sendOrderStatus(from)
    } else if (lowercaseText.includes('help') || lowercaseText.includes('support')) {
      await this.sendHelpMenu(from)
    } else {
      // Forward to support team or AI assistant
      await this.forwardToSupport(from, text)
    }
  }
  
  static async handleInteractiveResponse(from: string, interactive: any) {
    const buttonId = interactive.button_reply?.id
    
    switch (buttonId) {
      case 'schedule_fitting':
        await WhatsAppService.sendTextMessage(
          from,
          'Please contact your tailor directly to schedule a fitting appointment. You can find their contact details in your order page.'
        )
        break
      case 'pay_now':
        // Generate payment link
        const paymentLink = await this.generatePaymentLink(from)
        await WhatsAppService.sendTextMessage(
          from,
          `Click here to complete your payment: ${paymentLink}`
        )
        break
      case 'contact_support':
        await this.sendSupportContact(from)
        break
    }
  }
  
  static async sendOrderStatus(from: string) {
    // Look up customer orders
    const orders = await this.getCustomerOrders(from)
    
    if (orders.length === 0) {
      await WhatsAppService.sendTextMessage(
        from,
        'You don\'t have any active orders. Visit sew4mi.com to place an order!'
      )
      return
    }
    
    const activeOrder = orders[0] // Most recent order
    await WhatsAppService.sendTextMessage(
      from,
      `Your order #${activeOrder.id} status: ${activeOrder.status}\nTailor: ${activeOrder.tailor.name}\nExpected completion: ${activeOrder.deadline}`
    )
  }
  
  static async sendHelpMenu(from: string) {
    await WhatsAppService.sendInteractiveMessage(
      from,
      'How can we help you today?',
      [
        { id: 'order_status', title: 'Check Order Status' },
        { id: 'find_tailor', title: 'Find a Tailor' },
        { id: 'contact_support', title: 'Contact Support' }
      ]
    )
  }
}
```

### Ghana-Specific Phone Number Handling

```typescript
// utils/phone.ts
export function formatPhoneNumber(phone: string): string {
  // Remove any non-digit characters
  const cleaned = phone.replace(/\D/g, '')
  
  // Handle Ghana phone number formats
  if (cleaned.startsWith('233')) {
    // Already in international format
    return `+${cleaned}`
  } else if (cleaned.startsWith('0')) {
    // Ghana local format (0XXXXXXXXX) -> +233XXXXXXXXX
    return `+233${cleaned.substring(1)}`
  } else if (cleaned.length === 9) {
    // Missing leading zero (XXXXXXXXX) -> +233XXXXXXXXX
    return `+233${cleaned}`
  }
  
  // Return as-is if format is not recognized
  return phone
}

export function validateGhanaPhoneNumber(phone: string): boolean {
  const formatted = formatPhoneNumber(phone)
  const ghanaRegex = /^\+233[2-5][0-9]{8}$/
  return ghanaRegex.test(formatted)
}

// Example usage
console.log(formatPhoneNumber('0245123456'))  // +233245123456
console.log(formatPhoneNumber('245123456'))   // +233245123456
console.log(formatPhoneNumber('+233245123456')) // +233245123456
```

### Integration with Order Management

```typescript
// hooks/useWhatsAppIntegration.ts
import { useState } from 'react'
import { WhatsAppNotifications } from '@/services/notifications/whatsapp-notifications.service'
import { useToast } from '@/hooks/use-toast'

export function useWhatsAppIntegration() {
  const [isSending, setIsSending] = useState(false)
  const { toast } = useToast()
  
  const sendOrderUpdate = async (order: Order, message: string) => {
    setIsSending(true)
    
    try {
      await WhatsAppNotifications.sendStatusUpdate(order, message)
      
      toast({
        title: "WhatsApp Sent",
        description: "Order update sent to customer via WhatsApp",
      })
    } catch (error) {
      toast({
        title: "Failed to Send",
        description: "Could not send WhatsApp message. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }
  
  const sendCustomMessage = async (phone: string, message: string) => {
    setIsSending(true)
    
    try {
      await WhatsAppService.sendTextMessage(phone, message)
      
      toast({
        title: "Message Sent",
        description: "WhatsApp message sent successfully",
      })
    } catch (error) {
      toast({
        title: "Failed to Send",
        description: "Could not send WhatsApp message",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }
  
  return {
    sendOrderUpdate,
    sendCustomMessage,
    isSending,
  }
}

// Usage in components
function OrderStatusUpdate({ order }: { order: Order }) {
  const { sendOrderUpdate, isSending } = useWhatsAppIntegration()
  const [status, setStatus] = useState(order.status)
  
  const handleStatusUpdate = async () => {
    await sendOrderUpdate(order, status)
  }
  
  return (
    <div className="space-y-4">
      <select 
        value={status} 
        onChange={(e) => setStatus(e.target.value)}
        className="w-full p-2 border rounded"
      >
        <option value="confirmed">Confirmed</option>
        <option value="in_progress">In Progress</option>
        <option value="ready_for_fitting">Ready for Fitting</option>
        <option value="completed">Completed</option>
      </select>
      
      <button
        onClick={handleStatusUpdate}
        disabled={isSending}
        className="w-full bg-green-500 text-white p-2 rounded disabled:opacity-50"
      >
        {isSending ? 'Sending...' : 'Update & Notify Customer'}
      </button>
    </div>
  )
}
```

### Template Message Management

```typescript
// services/whatsapp-templates.service.ts
export class WhatsAppTemplates {
  // Template names (must be approved by WhatsApp)
  static templates = {
    ORDER_CONFIRMATION: 'order_confirmation',
    STATUS_UPDATE: 'order_status_update',
    PAYMENT_REMINDER: 'payment_reminder',
    TAILOR_APPROVED: 'tailor_application_approved',
    APPOINTMENT_REMINDER: 'appointment_reminder',
  }
  
  // Send order confirmation template
  static async sendOrderConfirmationTemplate(order: Order) {
    return WhatsAppService.sendTemplateMessage(
      formatPhoneNumber(order.customer.phone),
      this.templates.ORDER_CONFIRMATION,
      [
        { type: 'text', text: order.customer.name },
        { type: 'text', text: order.id },
        { type: 'text', text: order.tailor.name },
        { type: 'text', text: `₵${order.totalAmount}` }
      ]
    )
  }
  
  // Send appointment reminder
  static async sendAppointmentReminder(
    customerPhone: string,
    customerName: string,
    appointmentDate: string,
    tailorName: string
  ) {
    return WhatsAppService.sendTemplateMessage(
      formatPhoneNumber(customerPhone),
      this.templates.APPOINTMENT_REMINDER,
      [
        { type: 'text', text: customerName },
        { type: 'text', text: appointmentDate },
        { type: 'text', text: tailorName }
      ]
    )
  }
}
```

## Best Practices for Sew4Mi

1. **Phone Number Validation**: Always validate and format Ghana phone numbers correctly
2. **Template Approval**: Get all message templates approved by WhatsApp before use
3. **Rate Limiting**: Respect WhatsApp's messaging limits to avoid suspension
4. **Opt-in Consent**: Ensure customers consent to WhatsApp communications
5. **Fallback Options**: Have SMS/email backups for critical notifications
6. **Message Personalization**: Use customer names and order details in messages
7. **Interactive Elements**: Use buttons and quick replies for better engagement
8. **Status Tracking**: Monitor message delivery and read receipts
9. **Customer Support**: Provide easy escalation to human support
10. **Compliance**: Follow WhatsApp Business API terms and Ghana's data protection laws

This implementation provides a comprehensive WhatsApp Business API integration for Sew4Mi, enabling seamless communication between customers and tailors while being optimized for the Ghana market.