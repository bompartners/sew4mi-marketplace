# Hubtel API Documentation

Hubtel is Ghana's leading payment platform that provides mobile money, bank transfers, and other digital payment solutions. It's planned for integration in Sew4Mi to handle secure payments between customers and tailors using Ghana's popular mobile money services.

## Core Concepts for Sew4Mi

### Payment Solutions
- **Mobile Money**: MTN MoMo, Vodafone Cash, AirtelTigo Money
- **Bank transfers**: Direct bank account payments
- **Card payments**: Visa, Mastercard support
- **USSD payments**: Code-based payments for feature phones

### Ghana Market Integration
- **Local payment methods**: Support for all major Ghana mobile networks
- **Cedi currency**: Native GHS support with proper formatting
- **Offline payments**: USSD support for users without smartphones
- **Low transaction fees**: Competitive rates for local transactions

## Key Integration Patterns

### Hubtel Configuration

```typescript
// services/hubtel.service.ts
import axios from 'axios'

interface HubtelConfig {
  baseUrl: string
  clientId: string
  clientSecret: string
  callbackUrl: string
  merchantAccountNumber: string
}

const config: HubtelConfig = {
  baseUrl: process.env.HUBTEL_BASE_URL || 'https://api.hubtel.com/v1',
  clientId: process.env.HUBTEL_CLIENT_ID!,
  clientSecret: process.env.HUBTEL_CLIENT_SECRET!,
  callbackUrl: process.env.HUBTEL_CALLBACK_URL!,
  merchantAccountNumber: process.env.HUBTEL_MERCHANT_ACCOUNT!,
}

export class HubtelService {
  private static async getAccessToken(): Promise<string> {
    try {
      const credentials = Buffer.from(
        `${config.clientId}:${config.clientSecret}`
      ).toString('base64')
      
      const response = await axios.post(
        `${config.baseUrl}/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          }
        }
      )
      
      return response.data.access_token
    } catch (error) {
      console.error('Hubtel auth error:', error)
      throw new Error('Failed to authenticate with Hubtel')
    }
  }
  
  // Initialize mobile money payment
  static async initiateMobileMoneyPayment(paymentData: {
    amount: number
    customerMsisdn: string
    network: 'mtn' | 'vodafone' | 'airteltigo'
    orderId: string
    customerName: string
    description: string
  }) {
    try {
      const accessToken = await this.getAccessToken()
      
      const response = await axios.post(
        `${config.baseUrl}/merchantaccount/merchants/${config.merchantAccountNumber}/receive/mobilemoney`,
        {
          CustomerName: paymentData.customerName,
          CustomerMsisdn: paymentData.customerMsisdn,
          Channel: paymentData.network,
          Amount: paymentData.amount,
          PrimaryCallbackUrl: config.callbackUrl,
          Description: paymentData.description,
          ClientReference: paymentData.orderId,
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        }
      )
      
      return {
        success: true,
        transactionId: response.data.Data.TransactionId,
        description: response.data.Data.Description,
        clientReference: response.data.Data.ClientReference,
        amount: response.data.Data.Amount,
      }
    } catch (error) {
      console.error('Hubtel payment error:', error)
      throw new Error('Failed to initiate mobile money payment')
    }
  }
  
  // Check payment status
  static async checkPaymentStatus(transactionId: string) {
    try {
      const accessToken = await this.getAccessToken()
      
      const response = await axios.get(
        `${config.baseUrl}/merchantaccount/merchants/${config.merchantAccountNumber}/transactions/${transactionId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        }
      )
      
      return {
        transactionId: response.data.Data.TransactionId,
        status: response.data.Data.TransactionStatus,
        amount: response.data.Data.Amount,
        description: response.data.Data.Description,
        clientReference: response.data.Data.ClientReference,
        externalTransactionId: response.data.Data.ExternalTransactionId,
      }
    } catch (error) {
      console.error('Hubtel status check error:', error)
      throw new Error('Failed to check payment status')
    }
  }
  
  // Initiate card payment
  static async initiateCardPayment(paymentData: {
    amount: number
    orderId: string
    customerEmail: string
    customerName: string
    description: string
  }) {
    try {
      const accessToken = await this.getAccessToken()
      
      const response = await axios.post(
        `${config.baseUrl}/merchantaccount/onlinecheckout/invoice/create`,
        {
          Invoice: {
            Items: [
              {
                Name: paymentData.description,
                Quantity: 1,
                UnitPrice: paymentData.amount,
                TotalPrice: paymentData.amount,
              }
            ],
            TotalAmount: paymentData.amount,
            Description: paymentData.description,
            ClientReference: paymentData.orderId,
            ReturnUrl: `${config.callbackUrl}/success`,
            CancelUrl: `${config.callbackUrl}/cancel`,
            CallbackUrl: config.callbackUrl,
          },
          Store: {
            Name: 'Sew4Mi',
            TagLine: 'Connect with Ghana\'s Best Tailors',
            PhoneNumber: '+233501234567',
            PostalAddress: 'Accra, Ghana',
            LogoUrl: 'https://sew4mi.com/logo.png',
          },
          Actions: {
            CancelUrl: `${config.callbackUrl}/cancel`,
            ReturnUrl: `${config.callbackUrl}/success`,
            CallbackUrl: config.callbackUrl,
          },
          CustomData: {
            orderId: paymentData.orderId,
            customerEmail: paymentData.customerEmail,
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        }
      )
      
      return {
        success: true,
        checkoutId: response.data.Data.CheckoutId,
        checkoutUrl: response.data.Data.CheckoutUrl,
        description: response.data.Data.Description,
      }
    } catch (error) {
      console.error('Hubtel card payment error:', error)
      throw new Error('Failed to initiate card payment')
    }
  }
  
  // Send money to tailor (payout)
  static async sendMoneyToTailor(payoutData: {
    amount: number
    tailorMsisdn: string
    network: 'mtn' | 'vodafone' | 'airteltigo'
    orderId: string
    tailorName: string
    description: string
  }) {
    try {
      const accessToken = await this.getAccessToken()
      
      const response = await axios.post(
        `${config.baseUrl}/merchantaccount/merchants/${config.merchantAccountNumber}/send/mobilemoney`,
        {
          RecipientName: payoutData.tailorName,
          RecipientMsisdn: payoutData.tailorMsisdn,
          Channel: payoutData.network,
          Amount: payoutData.amount,
          PrimaryCallbackUrl: config.callbackUrl,
          Description: payoutData.description,
          ClientReference: `payout_${payoutData.orderId}`,
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        }
      )
      
      return {
        success: true,
        transactionId: response.data.Data.TransactionId,
        description: response.data.Data.Description,
        amount: response.data.Data.Amount,
      }
    } catch (error) {
      console.error('Hubtel payout error:', error)
      throw new Error('Failed to send money to tailor')
    }
  }
}
```

### Payment Integration Components

```typescript
// components/payments/MobileMoneyPayment.tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { HubtelService } from '@/services/hubtel.service'
import { formatPhoneNumber, validateGhanaPhoneNumber } from '@/utils/phone'

const mobileMoneySchema = z.object({
  phoneNumber: z.string()
    .min(1, 'Phone number is required')
    .refine(validateGhanaPhoneNumber, 'Please enter a valid Ghana phone number'),
  network: z.enum(['mtn', 'vodafone', 'airteltigo']),
  customerName: z.string().min(1, 'Name is required'),
})

type MobileMoneyFormData = z.infer<typeof mobileMoneySchema>

interface MobileMoneyPaymentProps {
  order: Order
  onPaymentInitiated: (transactionId: string) => void
  onError: (error: string) => void
}

export function MobileMoneyPayment({ 
  order, 
  onPaymentInitiated, 
  onError 
}: MobileMoneyPaymentProps) {
  const [isLoading, setIsLoading] = useState(false)
  
  const form = useForm<MobileMoneyFormData>({
    resolver: zodResolver(mobileMoneySchema),
    defaultValues: {
      phoneNumber: '',
      network: 'mtn',
      customerName: '',
    },
  })
  
  const networkOptions = [
    { value: 'mtn', label: 'MTN MoMo', logo: '/images/mtn-logo.png' },
    { value: 'vodafone', label: 'Vodafone Cash', logo: '/images/vodafone-logo.png' },
    { value: 'airteltigo', label: 'AirtelTigo Money', logo: '/images/airteltigo-logo.png' },
  ]
  
  const handleSubmit = async (data: MobileMoneyFormData) => {
    setIsLoading(true)
    
    try {
      const result = await HubtelService.initiateMobileMoneyPayment({
        amount: order.totalAmount,
        customerMsisdn: formatPhoneNumber(data.phoneNumber),
        network: data.network,
        orderId: order.id,
        customerName: data.customerName,
        description: `Payment for Order #${order.id} - ${order.garmentType}`,
      })
      
      if (result.success) {
        onPaymentInitiated(result.transactionId)
      }
    } catch (error) {
      onError(error.message || 'Payment failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center mb-6">
        <img src="/images/mobile-money-icon.png" alt="Mobile Money" className="w-8 h-8 mr-3" />
        <h3 className="text-lg font-semibold">Mobile Money Payment</h3>
      </div>
      
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* Network Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Network
          </label>
          <div className="grid grid-cols-1 gap-3">
            {networkOptions.map((network) => (
              <label
                key={network.value}
                className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-kente-gold transition-colors"
              >
                <input
                  type="radio"
                  {...form.register('network')}
                  value={network.value}
                  className="sr-only"
                />
                <img src={network.logo} alt={network.label} className="w-8 h-8 mr-3" />
                <span className="font-medium">{network.label}</span>
                <div className="ml-auto w-4 h-4 border border-gray-300 rounded-full"></div>
              </label>
            ))}
          </div>
        </div>
        
        {/* Phone Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            {...form.register('phoneNumber')}
            type="tel"
            placeholder="e.g., 0245123456"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-kente-gold focus:border-kente-gold"
          />
          {form.formState.errors.phoneNumber && (
            <p className="text-red-500 text-sm mt-1">
              {form.formState.errors.phoneNumber.message}
            </p>
          )}
        </div>
        
        {/* Customer Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name
          </label>
          <input
            {...form.register('customerName')}
            type="text"
            placeholder="Enter your full name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-kente-gold focus:border-kente-gold"
          />
          {form.formState.errors.customerName && (
            <p className="text-red-500 text-sm mt-1">
              {form.formState.errors.customerName.message}
            </p>
          )}
        </div>
        
        {/* Payment Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">Order Total:</span>
            <span className="font-semibold">₵{order.totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Transaction Fee:</span>
            <span className="font-semibold">₵0.00</span>
          </div>
          <hr className="my-2" />
          <div className="flex justify-between items-center font-bold">
            <span>Total to Pay:</span>
            <span>₵{order.totalAmount.toFixed(2)}</span>
          </div>
        </div>
        
        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-kente-gold text-white py-3 px-4 rounded-md hover:bg-opacity-90 transition-colors font-semibold disabled:opacity-50"
        >
          {isLoading ? 'Processing Payment...' : `Pay ₵${order.totalAmount.toFixed(2)}`}
        </button>
      </form>
      
      <div className="mt-4 text-center text-sm text-gray-500">
        <p>You will receive a prompt on your phone to complete the payment</p>
      </div>
    </div>
  )
}
```

### Payment Status Tracking

```typescript
// components/payments/PaymentStatusTracker.tsx
import { useState, useEffect } from 'react'
import { HubtelService } from '@/services/hubtel.service'
import { CheckCircle, Clock, XCircle, RefreshCw } from 'lucide-react'

interface PaymentStatusTrackerProps {
  transactionId: string
  onPaymentComplete: (status: 'success' | 'failed') => void
}

export function PaymentStatusTracker({ 
  transactionId, 
  onPaymentComplete 
}: PaymentStatusTrackerProps) {
  const [status, setStatus] = useState<'pending' | 'success' | 'failed' | 'checking'>('checking')
  const [statusMessage, setStatusMessage] = useState('Checking payment status...')
  
  useEffect(() => {
    let interval: NodeJS.Timeout
    
    const checkStatus = async () => {
      try {
        const result = await HubtelService.checkPaymentStatus(transactionId)
        
        switch (result.status) {
          case 'Success':
            setStatus('success')
            setStatusMessage('Payment completed successfully!')
            onPaymentComplete('success')
            break
          case 'Failed':
            setStatus('failed')
            setStatusMessage('Payment failed. Please try again.')
            onPaymentComplete('failed')
            break
          case 'Pending':
            setStatus('pending')
            setStatusMessage('Waiting for payment confirmation...')
            break
          default:
            setStatus('checking')
            setStatusMessage('Checking payment status...')
        }
      } catch (error) {
        console.error('Status check error:', error)
        setStatusMessage('Unable to check payment status')
      }
    }
    
    // Check immediately
    checkStatus()
    
    // Then check every 5 seconds if still pending
    if (status === 'pending' || status === 'checking') {
      interval = setInterval(checkStatus, 5000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [transactionId, status, onPaymentComplete])
  
  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-16 h-16 text-green-500" />
      case 'failed':
        return <XCircle className="w-16 h-16 text-red-500" />
      case 'pending':
        return <Clock className="w-16 h-16 text-yellow-500" />
      default:
        return <RefreshCw className="w-16 h-16 text-blue-500 animate-spin" />
    }
  }
  
  const getStatusColor = () => {
    switch (status) {
      case 'success': return 'text-green-600'
      case 'failed': return 'text-red-600'
      case 'pending': return 'text-yellow-600'
      default: return 'text-blue-600'
    }
  }
  
  return (
    <div className="bg-white p-8 rounded-lg shadow-md text-center">
      <div className="flex justify-center mb-4">
        {getStatusIcon()}
      </div>
      
      <h3 className={`text-xl font-semibold mb-2 ${getStatusColor()}`}>
        {status === 'success' && 'Payment Successful'}
        {status === 'failed' && 'Payment Failed'}
        {status === 'pending' && 'Payment Pending'}
        {status === 'checking' && 'Checking Payment'}
      </h3>
      
      <p className="text-gray-600 mb-4">{statusMessage}</p>
      
      {status === 'pending' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            Please check your phone for a payment prompt and enter your mobile money PIN to complete the transaction.
          </p>
        </div>
      )}
      
      {status === 'failed' && (
        <button
          onClick={() => window.location.reload()}
          className="bg-kente-gold text-white px-6 py-2 rounded-md hover:bg-opacity-90 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  )
}
```

### Webhook Handler for Payment Callbacks

```typescript
// app/api/webhooks/hubtel/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { OrdersService } from '@/services/orders.service'
import { WhatsAppNotifications } from '@/services/notifications/whatsapp-notifications.service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Verify webhook signature (important for security)
    const signature = request.headers.get('X-Hubtel-Signature')
    if (!verifyHubtelSignature(body, signature)) {
      return new NextResponse('Invalid signature', { status: 401 })
    }
    
    const { Data } = body
    const {
      TransactionId,
      TransactionStatus,
      Amount,
      ClientReference,
      ExternalTransactionId,
      Description
    } = Data
    
    // Update order payment status
    if (ClientReference) {
      const orderId = ClientReference.replace('payout_', '') // Handle both payment and payout references
      
      try {
        if (TransactionStatus === 'Success') {
          // Update order as paid
          await OrdersService.updatePaymentStatus(orderId, 'completed', {
            transactionId: TransactionId,
            externalTransactionId: ExternalTransactionId,
            amount: Amount,
            paymentMethod: 'mobile_money',
          })
          
          // Send confirmation to customer
          const order = await OrdersService.getOrderById(orderId)
          await WhatsAppNotifications.sendPaymentConfirmation(order)
          
        } else if (TransactionStatus === 'Failed') {
          // Update order payment as failed
          await OrdersService.updatePaymentStatus(orderId, 'failed', {
            transactionId: TransactionId,
            failureReason: Description,
          })
        }
      } catch (error) {
        console.error('Error updating order payment status:', error)
      }
    }
    
    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('Hubtel webhook error:', error)
    return new NextResponse('Error processing webhook', { status: 500 })
  }
}

function verifyHubtelSignature(payload: any, signature: string | null): boolean {
  if (!signature) return false
  
  // Implement signature verification based on Hubtel's documentation
  // This typically involves HMAC-SHA256 with your webhook secret
  const webhookSecret = process.env.HUBTEL_WEBHOOK_SECRET
  if (!webhookSecret) return false
  
  // Add actual signature verification logic here
  return true
}
```

### Tailor Payout Management

```typescript
// services/payouts.service.ts
import { HubtelService } from './hubtel.service'
import { formatPhoneNumber } from '@/utils/phone'

export class PayoutsService {
  // Calculate tailor earnings (minus platform fee)
  static calculateTailorEarnings(orderAmount: number): {
    tailorAmount: number
    platformFee: number
    processingFee: number
  } {
    const platformFeeRate = 0.05 // 5% platform fee
    const processingFeeRate = 0.02 // 2% processing fee
    
    const platformFee = orderAmount * platformFeeRate
    const processingFee = orderAmount * processingFeeRate
    const tailorAmount = orderAmount - platformFee - processingFee
    
    return {
      tailorAmount: Math.round(tailorAmount * 100) / 100, // Round to 2 decimal places
      platformFee: Math.round(platformFee * 100) / 100,
      processingFee: Math.round(processingFee * 100) / 100,
    }
  }
  
  // Process payout to tailor after order completion
  static async processOrderPayout(order: Order) {
    const { tailorAmount } = this.calculateTailorEarnings(order.totalAmount)
    
    try {
      const result = await HubtelService.sendMoneyToTailor({
        amount: tailorAmount,
        tailorMsisdn: formatPhoneNumber(order.tailor.phone),
        network: order.tailor.preferredNetwork || 'mtn',
        orderId: order.id,
        tailorName: order.tailor.name,
        description: `Payment for Order #${order.id} - ${order.garmentType}`,
      })
      
      // Update order with payout information
      await OrdersService.updatePayoutStatus(order.id, 'sent', {
        payoutTransactionId: result.transactionId,
        payoutAmount: tailorAmount,
        payoutDate: new Date().toISOString(),
      })
      
      // Notify tailor via WhatsApp
      await WhatsAppNotifications.sendPayoutNotification(order, tailorAmount)
      
      return result
    } catch (error) {
      console.error('Payout error:', error)
      
      // Mark payout as failed
      await OrdersService.updatePayoutStatus(order.id, 'failed', {
        failureReason: error.message,
      })
      
      throw error
    }
  }
  
  // Get tailor earnings summary
  static async getTailorEarnings(tailorId: string, period: 'week' | 'month' | 'year') {
    const orders = await OrdersService.getTailorCompletedOrders(tailorId, period)
    
    let totalEarnings = 0
    let totalOrders = 0
    let pendingPayouts = 0
    
    for (const order of orders) {
      const { tailorAmount } = this.calculateTailorEarnings(order.totalAmount)
      totalEarnings += tailorAmount
      totalOrders += 1
      
      if (order.payoutStatus === 'pending') {
        pendingPayouts += tailorAmount
      }
    }
    
    return {
      totalEarnings,
      totalOrders,
      pendingPayouts,
      averageOrderValue: totalOrders > 0 ? totalEarnings / totalOrders : 0,
    }
  }
}
```

## Ghana-Specific Features

### Mobile Network Detection

```typescript
// utils/network-detection.ts
export function detectNetworkFromPhone(phoneNumber: string): 'mtn' | 'vodafone' | 'airteltigo' | 'unknown' {
  const cleaned = phoneNumber.replace(/\D/g, '')
  
  // Remove country code and leading zero if present
  let localNumber = cleaned
  if (localNumber.startsWith('233')) {
    localNumber = localNumber.substring(3)
  } else if (localNumber.startsWith('0')) {
    localNumber = localNumber.substring(1)
  }
  
  // MTN prefixes: 24, 25, 53, 54, 55, 59
  if (/^(24|25|53|54|55|59)/.test(localNumber)) {
    return 'mtn'
  }
  
  // Vodafone prefixes: 20, 21, 50
  if (/^(20|21|50)/.test(localNumber)) {
    return 'vodafone'
  }
  
  // AirtelTigo prefixes: 26, 27, 56, 57
  if (/^(26|27|56|57)/.test(localNumber)) {
    return 'airteltigo'
  }
  
  return 'unknown'
}

// Usage
const network = detectNetworkFromPhone('0245123456') // Returns 'mtn'
```

### Currency Formatting

```typescript
// utils/currency.ts
export function formatGhsCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatCedis(amount: number): string {
  return `₵${amount.toFixed(2)}`
}

// Usage
console.log(formatGhsCurrency(150.50)) // "GH₵150.50"
console.log(formatCedis(150.50))       // "₵150.50"
```

## Best Practices for Sew4Mi

1. **Security**: Always verify webhook signatures and use HTTPS
2. **Error Handling**: Implement robust error handling and retry logic
3. **Phone Validation**: Validate Ghana phone numbers before API calls
4. **Network Detection**: Auto-detect mobile network when possible
5. **Status Tracking**: Monitor payment and payout statuses closely
6. **Customer Communication**: Keep customers informed of payment status
7. **Fee Transparency**: Clearly display all fees to users
8. **Compliance**: Follow Ghana's financial regulations and data protection laws
9. **Backup Payment Methods**: Provide alternative payment options
10. **Testing**: Use Hubtel's sandbox environment for development and testing

This implementation provides a comprehensive payment solution for Sew4Mi using Hubtel's services, optimized for Ghana's mobile money ecosystem and local payment preferences.