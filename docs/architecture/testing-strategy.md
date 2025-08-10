# Testing Strategy

## Testing Pyramid

```
                  E2E Tests
                 /        \
            Integration Tests
               /            \
          Frontend Unit  Backend Unit
```

## Test Organization

### Frontend Tests
```
apps/web/tests/
├── unit/                           # Component and utility tests
│   ├── components/
│   │   ├── OrderCard.test.tsx
│   │   ├── TailorProfile.test.tsx
│   │   └── MeasurementForm.test.tsx
│   ├── hooks/
│   │   ├── useAuth.test.ts
│   │   └── useOrders.test.ts
│   ├── services/
│   │   └── api.test.ts
│   └── utils/
│       ├── currency.test.ts
│       └── phone.test.ts
├── integration/                    # Page and workflow tests
│   ├── auth/
│   │   ├── login.test.tsx
│   │   └── registration.test.tsx
│   ├── orders/
│   │   ├── create-order.test.tsx
│   │   └── order-timeline.test.tsx
│   └── payments/
│       └── mobile-money.test.tsx
└── e2e/                           # End-to-end user journeys
    ├── customer-journey.spec.ts
    ├── tailor-workflow.spec.ts
    └── whatsapp-integration.spec.ts
```

### Backend Tests
```
apps/api/tests/
├── unit/                          # Service and utility tests
│   ├── services/
│   │   ├── order.service.test.ts
│   │   ├── payment.service.test.ts
│   │   └── whatsapp.service.test.ts
│   ├── repositories/
│   │   └── order.repository.test.ts
│   └── utils/
│       └── escrow.test.ts
└── integration/                   # API endpoint tests
    ├── auth/
    │   └── registration.test.ts
    ├── orders/
    │   ├── create.test.ts
    │   ├── milestones.test.ts
    │   └── disputes.test.ts
    ├── webhooks/
    │   ├── whatsapp.test.ts
    │   └── payments.test.ts
    └── graphql/
        └── resolvers.test.ts
```

### E2E Tests
```
tests/e2e/
├── specs/
│   ├── customer-onboarding.spec.ts
│   ├── order-lifecycle.spec.ts
│   ├── payment-flow.spec.ts
│   └── dispute-resolution.spec.ts
├── fixtures/
│   ├── users.json
│   ├── orders.json
│   └── test-data.ts
└── support/
    ├── commands.ts
    └── helpers.ts
```

## Test Examples

### Frontend Component Test
```typescript
// tests/unit/components/OrderCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { OrderCard } from '@/components/features/orders/OrderCard';
import { mockOrder } from '@/tests/fixtures/orders';

describe('OrderCard', () => {
  it('displays order information correctly', () => {
    const onSelect = jest.fn();
    
    render(
      <OrderCard 
        order={mockOrder} 
        onSelect={onSelect} 
      />
    );
    
    expect(screen.getByText('Custom Shirt')).toBeInTheDocument();
    expect(screen.getByText('SW202408001')).toBeInTheDocument();
    expect(screen.getByText('GH₵ 120.00')).toBeInTheDocument();
    expect(screen.getByText('IN_PROGRESS')).toBeInTheDocument();
  });
  
  it('calls onSelect when clicked', () => {
    const onSelect = jest.fn();
    
    render(
      <OrderCard 
        order={mockOrder} 
        onSelect={onSelect} 
      />
    );
    
    fireEvent.click(screen.getByRole('article'));
    expect(onSelect).toHaveBeenCalledWith(mockOrder);
  });
  
  it('handles loading state', () => {
    render(
      <OrderCard 
        order={undefined} 
        loading={true}
      />
    );
    
    expect(screen.getByTestId('order-card-skeleton')).toBeInTheDocument();
  });
});
```

### Backend API Test
```typescript
// tests/integration/orders/create.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestClient } from '@/tests/utils/test-client';
import { createTestUser, createTestTailor } from '@/tests/fixtures/users';

describe('POST /api/orders/create', () => {
  let client: TestClient;
  let customer: TestUser;
  let tailor: TestTailor;
  
  beforeEach(async () => {
    client = await createTestClient();
    customer = await createTestUser({ role: 'CUSTOMER' });
    tailor = await createTestTailor({ verified: true });
  });
  
  it('creates order successfully with valid data', async () => {
    const orderData = {
      tailorId: tailor.id,
      measurementProfileId: customer.defaultProfileId,
      garmentType: 'Custom Shirt',
      totalAmount: 120.00,
      estimatedDelivery: '2024-09-15T10:00:00Z'
    };
    
    const response = await client
      .post('/api/orders/create')
      .auth(customer.token)
      .send(orderData)
      .expect(201);
      
    expect(response.body).toMatchObject({
      id: expect.any(String),
      orderNumber: expect.stringMatching(/^SW\d{6}\d{4}$/),
      status: 'PENDING_DEPOSIT',
      customerId: customer.id,
      tailorId: tailor.id,
    });
  });
  
  it('validates required fields', async () => {
    const response = await client
      .post('/api/orders/create')
      .auth(customer.token)
      .send({})
      .expect(400);
      
    expect(response.body.errors).toContain('tailorId is required');
  });
  
  it('checks tailor availability', async () => {
    // Set tailor to full capacity
    await client.db.tailorProfiles.update({
      where: { id: tailor.id },
      data: { capacity: 0 }
    });
    
    const response = await client
      .post('/api/orders/create')
      .auth(customer.token)
      .send({ tailorId: tailor.id })
      .expect(409);
      
    expect(response.body.error).toBe('Tailor not available');
  });
});
```

### E2E Test
```typescript
// tests/e2e/order-lifecycle.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { OrdersPage } from '../pages/OrdersPage';
import { PaymentPage } from '../pages/PaymentPage';

test.describe('Complete Order Lifecycle', () => {
  test('customer can create and complete order', async ({ page, context }) => {
    // Setup test data
    const customer = await createTestCustomer();
    const tailor = await createVerifiedTailor();
    
    const loginPage = new LoginPage(page);
    const ordersPage = new OrdersPage(page);
    const paymentPage = new PaymentPage(page);
    
    // Login as customer
    await loginPage.goto();
    await loginPage.login(customer.email, customer.password);
    
    // Create new order
    await ordersPage.goto();
    await ordersPage.clickCreateOrder();
    await ordersPage.selectTailor(tailor.businessName);
    await ordersPage.fillOrderDetails({
      garmentType: 'Custom Suit',
      fabricChoice: 'Navy Blue Wool',
      specialInstructions: 'Slim fit, working buttonholes'
    });
    await ordersPage.selectDeliveryDate(30); // 30 days from now
    await ordersPage.submitOrder();
    
    // Process deposit payment
    await expect(page.getByText('Order Created')).toBeVisible();
    await page.getByRole('button', { name: 'Pay Deposit' }).click();
    
    await paymentPage.selectProvider('MTN Mobile Money');
    await paymentPage.enterPhoneNumber(customer.phone);
    await paymentPage.confirmPayment();
    
    // Simulate mobile money approval (in test environment)
    await paymentPage.approveMobileMoneyPayment();
    
    // Verify order status
    await expect(page.getByText('Deposit Paid')).toBeVisible();
    await expect(page.getByText('IN_PROGRESS')).toBeVisible();
    
    // Simulate tailor milestone updates
    await context.newPage(); // Switch to tailor view
    // ... tailor workflow simulation
    
    // Verify completion
    await expect(page.getByText('DELIVERED')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Leave Review' })).toBeVisible();
  });
  
  test('handles payment failures gracefully', async ({ page }) => {
    // Test payment failure scenarios
    // Verify error messages and retry functionality
  });
  
  test('supports offline functionality', async ({ page, context }) => {
    // Test service worker offline capabilities
    await context.setOffline(true);
    
    // Verify cached pages still work
    await page.goto('/orders');
    await expect(page.getByText('Orders')).toBeVisible();
    
    // Verify offline queue for actions
    await page.getByRole('button', { name: 'Create Order' }).click();
    await expect(page.getByText('Action queued for sync')).toBeVisible();
  });
});
```
