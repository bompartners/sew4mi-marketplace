/**
 * End-to-End tests for Group Order Management
 * Tests the complete group order workflow from creation to completion
 * @file group-order-management.spec.ts
 */

import { test, expect, type Page } from '@playwright/test';
import { EventType, PaymentMode, DeliveryStrategy, GroupOrderStatus } from '@sew4mi/shared/types/group-order';

/**
 * Test configuration
 */
const TEST_CONFIG = {
  baseUrl: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
  apiUrl: process.env.PLAYWRIGHT_API_URL || 'http://localhost:3000/api',
  customerId: 'test-customer-group-001',
  tailorId: 'test-tailor-001',
  familyProfiles: [
    { id: 'profile-001', name: 'Mother Akosua', garmentType: 'Traditional Kente Gown' },
    { id: 'profile-002', name: 'Father Kwame', garmentType: 'Agbada' },
    { id: 'profile-003', name: 'Child Ama', garmentType: 'Children\'s Traditional Dress' },
  ],
};

/**
 * Mock group order data
 */
const mockGroupOrderData = {
  groupName: 'Smith Family Wedding',
  eventType: EventType.WEDDING,
  eventDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
  sharedFabric: true,
  fabricDetails: {
    fabricType: 'KENTE',
    fabricColor: 'Royal Blue and Gold',
    totalYardage: 30,
    costPerYard: 50,
    fabricSource: 'TAILOR_SOURCED' as const,
  },
  paymentMode: PaymentMode.SINGLE_PAYER,
  deliveryStrategy: DeliveryStrategy.ALL_TOGETHER,
  coordinationNotes: 'All outfits should coordinate with traditional Ashanti wedding theme',
};

/**
 * Setup test user with authentication
 */
const setupTestUser = async (page: Page, userId: string, userRole: 'customer' | 'tailor') => {
  await page.addInitScript(`
    window.localStorage.setItem('auth_token', 'test-token-${userId}');
    window.localStorage.setItem('user_role', '${userRole}');
    window.localStorage.setItem('user_id', '${userId}');
  `);
};

/**
 * Navigate to group order creation page
 */
const navigateToGroupOrderCreation = async (page: Page) => {
  await page.goto(`${TEST_CONFIG.baseUrl}/(customer)/orders/group/create`);
  await expect(page.locator('h1')).toContainText(/create.*group.*order/i);
};

/**
 * Fill out event details step
 */
const fillEventDetails = async (page: Page, data: typeof mockGroupOrderData) => {
  // Wait for the wizard to load
  await page.waitForSelector('[data-testid="group-order-wizard"]', { state: 'visible' });
  
  // Fill in group name
  await page.fill('[data-testid="input-group-name"]', data.groupName);
  
  // Select event type
  await page.selectOption('[data-testid="select-event-type"]', data.eventType);
  
  // Fill event date
  const eventDateStr = data.eventDate.toISOString().split('T')[0];
  await page.fill('[data-testid="input-event-date"]', eventDateStr);
  
  // Click next
  await page.click('[data-testid="btn-next-step"]');
};

/**
 * Select family members and garments
 */
const selectFamilyMembers = async (page: Page) => {
  // Wait for family selection step
  await expect(page.locator('[data-testid="family-selection-step"]')).toBeVisible();
  
  // Select each family member
  for (const profile of TEST_CONFIG.familyProfiles) {
    await page.click(`[data-testid="add-family-member-btn"]`);
    await page.selectOption(`[data-testid="select-profile"]`, profile.id);
    await page.fill(`[data-testid="input-garment-type"]`, profile.garmentType);
  }
  
  // Verify bulk discount message appears (3+ items = 15% discount)
  await expect(page.locator('[data-testid="bulk-discount-message"]')).toContainText(/15%/);
  
  // Click next
  await page.click('[data-testid="btn-next-step"]');
};

/**
 * Configure fabric coordination
 */
const configureFabric = async (page: Page, data: typeof mockGroupOrderData) => {
  // Wait for fabric coordination step
  await expect(page.locator('[data-testid="fabric-coordination-step"]')).toBeVisible();
  
  if (data.sharedFabric && data.fabricDetails) {
    // Enable shared fabric
    await page.check('[data-testid="checkbox-shared-fabric"]');
    
    // Fill fabric details
    await page.selectOption('[data-testid="select-fabric-type"]', data.fabricDetails.fabricType);
    await page.fill('[data-testid="input-fabric-color"]', data.fabricDetails.fabricColor);
    await page.fill('[data-testid="input-total-yardage"]', data.fabricDetails.totalYardage.toString());
    await page.fill('[data-testid="input-cost-per-yard"]', data.fabricDetails.costPerYard.toString());
    await page.selectOption('[data-testid="select-fabric-source"]', data.fabricDetails.fabricSource);
    
    // Verify fabric cost calculation
    const expectedCost = data.fabricDetails.totalYardage * 1.1 * data.fabricDetails.costPerYard; // 10% buffer
    await expect(page.locator('[data-testid="total-fabric-cost"]')).toContainText(expectedCost.toString());
  }
  
  // Click next
  await page.click('[data-testid="btn-next-step"]');
};

/**
 * Configure payment and delivery
 */
const configurePaymentAndDelivery = async (page: Page, data: typeof mockGroupOrderData) => {
  // Wait for payment & delivery step
  await expect(page.locator('[data-testid="payment-delivery-step"]')).toBeVisible();
  
  // Select payment mode
  await page.selectOption('[data-testid="select-payment-mode"]', data.paymentMode);
  
  // Select delivery strategy
  await page.selectOption('[data-testid="select-delivery-strategy"]', data.deliveryStrategy);
  
  // Add coordination notes
  await page.fill('[data-testid="textarea-coordination-notes"]', data.coordinationNotes);
  
  // Click next to review
  await page.click('[data-testid="btn-next-step"]');
};

/**
 * Review and submit group order
 */
const reviewAndSubmit = async (page: Page) => {
  // Wait for summary step
  await expect(page.locator('[data-testid="summary-step"]')).toBeVisible();
  
  // Verify key information is displayed
  await expect(page.locator('[data-testid="summary-event-name"]')).toBeVisible();
  await expect(page.locator('[data-testid="summary-family-count"]')).toContainText('3');
  await expect(page.locator('[data-testid="summary-bulk-discount"]')).toContainText('15%');
  
  // Confirm and submit
  await page.check('[data-testid="checkbox-confirm"]');
  await page.click('[data-testid="btn-submit-group-order"]');
  
  // Wait for success message
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible({ timeout: 10000 });
};

/**
 * Test Suite: Group Order Management
 */
test.describe('Group Order Management E2E', () => {
  
  test.beforeEach(async ({ page }) => {
    // Setup test user
    await setupTestUser(page, TEST_CONFIG.customerId, 'customer');
    
    // Mock API responses for family profiles
    await page.route('**/api/profiles/family', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          profiles: TEST_CONFIG.familyProfiles,
        }),
      });
    });
  });

  test('should create a complete group order with all steps', async ({ page }) => {
    // Navigate to group order creation
    await navigateToGroupOrderCreation(page);
    
    // Step 1: Event Details
    await fillEventDetails(page, mockGroupOrderData);
    
    // Step 2: Family Member Selection
    await selectFamilyMembers(page);
    
    // Step 3: Fabric Coordination
    await configureFabric(page, mockGroupOrderData);
    
    // Step 4: Payment & Delivery
    await configurePaymentAndDelivery(page, mockGroupOrderData);
    
    // Step 5: Review & Submit
    await reviewAndSubmit(page);
    
    // Verify redirect to group order dashboard
    await expect(page).toHaveURL(/\/orders\/group\/[a-zA-Z0-9-]+$/);
    
    // Verify group order details are displayed
    await expect(page.locator('[data-testid="group-order-name"]')).toContainText(mockGroupOrderData.groupName);
  });

  test('should show bulk discount tiers correctly', async ({ page }) => {
    await navigateToGroupOrderCreation(page);
    await fillEventDetails(page, mockGroupOrderData);
    
    // On family selection page, check discount calculator
    await expect(page.locator('[data-testid="family-selection-step"]')).toBeVisible();
    
    // Add 3 members - should show 15% discount
    for (let i = 0; i < 3; i++) {
      await page.click('[data-testid="add-family-member-btn"]');
      await page.selectOption(`[data-testid="select-profile-${i}"]`, TEST_CONFIG.familyProfiles[i].id);
    }
    await expect(page.locator('[data-testid="discount-tier"]')).toContainText('15%');
    
    // Add 3 more members - should show 20% discount
    for (let i = 3; i < 6; i++) {
      await page.click('[data-testid="add-family-member-btn"]');
    }
    await expect(page.locator('[data-testid="discount-tier"]')).toContainText('20%');
  });

  test('should validate minimum participants requirement', async ({ page }) => {
    await navigateToGroupOrderCreation(page);
    await fillEventDetails(page, mockGroupOrderData);
    
    // Try to proceed with only 1 family member
    await expect(page.locator('[data-testid="family-selection-step"]')).toBeVisible();
    await page.click('[data-testid="add-family-member-btn"]');
    await page.selectOption('[data-testid="select-profile-0"]', TEST_CONFIG.familyProfiles[0].id);
    
    // Try to go to next step
    await page.click('[data-testid="btn-next-step"]');
    
    // Should see validation error
    await expect(page.locator('[data-testid="validation-error"]')).toContainText(/minimum.*participants/i);
  });

  test('should require fabric details when shared fabric is enabled', async ({ page }) => {
    await navigateToGroupOrderCreation(page);
    await fillEventDetails(page, mockGroupOrderData);
    await selectFamilyMembers(page);
    
    // Enable shared fabric but don't fill details
    await page.check('[data-testid="checkbox-shared-fabric"]');
    
    // Try to proceed
    await page.click('[data-testid="btn-next-step"]');
    
    // Should see validation errors
    await expect(page.locator('[data-testid="fabric-validation-error"]')).toBeVisible();
  });

  test('should display group order progress dashboard', async ({ page }) => {
    // Create a group order first (using API)
    const groupOrderId = 'test-group-order-001';
    
    // Mock API response for group order summary
    await page.route(`**/api/orders/group/${groupOrderId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          groupOrder: {
            id: groupOrderId,
            groupName: mockGroupOrderData.groupName,
            eventType: mockGroupOrderData.eventType,
            status: GroupOrderStatus.IN_PROGRESS,
            totalOrders: 3,
            overallProgressPercentage: 45,
          },
          items: [
            { id: '1', familyMemberName: 'Mother Akosua', status: 'IN_PROGRESS', progressPercentage: 60 },
            { id: '2', familyMemberName: 'Father Kwame', status: 'IN_PROGRESS', progressPercentage: 40 },
            { id: '3', familyMemberName: 'Child Ama', status: 'PENDING', progressPercentage: 0 },
          ],
          paymentTracking: [],
          deliverySchedules: [],
          progressPercentage: 45,
          nextActions: ['Review and approve Mother Akosua\'s fitting milestone'],
        }),
      });
    });
    
    // Navigate to group order page
    await page.goto(`${TEST_CONFIG.baseUrl}/(customer)/orders/group/${groupOrderId}`);
    
    // Verify progress dashboard is displayed
    await expect(page.locator('[data-testid="group-progress-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="overall-progress"]')).toContainText('45%');
    
    // Verify individual progress cards
    await expect(page.locator('[data-testid="progress-card-1"]')).toContainText('Mother Akosua');
    await expect(page.locator('[data-testid="progress-card-2"]')).toContainText('Father Kwame');
    await expect(page.locator('[data-testid="progress-card-3"]')).toContainText('Child Ama');
  });

  test('should handle split payment mode', async ({ page }) => {
    await navigateToGroupOrderCreation(page);
    await fillEventDetails(page, mockGroupOrderData);
    await selectFamilyMembers(page);
    await configureFabric(page, mockGroupOrderData);
    
    // Select split payment mode
    await expect(page.locator('[data-testid="payment-delivery-step"]')).toBeVisible();
    await page.selectOption('[data-testid="select-payment-mode"]', PaymentMode.SPLIT_PAYMENT);
    
    // Verify split payment options appear
    await expect(page.locator('[data-testid="split-payment-options"]')).toBeVisible();
    
    // Should show payment responsibility assignment
    await expect(page.locator('[data-testid="payment-assignment"]')).toBeVisible();
  });

  test('should handle staggered delivery mode', async ({ page }) => {
    await navigateToGroupOrderCreation(page);
    await fillEventDetails(page, mockGroupOrderData);
    await selectFamilyMembers(page);
    await configureFabric(page, mockGroupOrderData);
    
    // Select staggered delivery
    await expect(page.locator('[data-testid="payment-delivery-step"]')).toBeVisible();
    await page.selectOption('[data-testid="select-delivery-strategy"]', DeliveryStrategy.STAGGERED);
    
    // Verify staggered delivery options appear
    await expect(page.locator('[data-testid="staggered-delivery-options"]')).toBeVisible();
    
    // Should show delivery priority selection
    await expect(page.locator('[data-testid="delivery-priority-options"]')).toBeVisible();
  });

  test('should show coordination suggestions for wedding events', async ({ page }) => {
    await navigateToGroupOrderCreation(page);
    
    // Fill event details with wedding event type
    const weddingData = { ...mockGroupOrderData, eventType: EventType.WEDDING };
    await fillEventDetails(page, weddingData);
    await selectFamilyMembers(page);
    await configureFabric(page, weddingData);
    await configurePaymentAndDelivery(page, weddingData);
    
    // On summary page, should see coordination suggestions
    await expect(page.locator('[data-testid="coordination-suggestions"]')).toBeVisible();
    await expect(page.locator('[data-testid="coordination-suggestions"]')).toContainText(/matching.*accessories/i);
  });

  test('should calculate fabric buffer correctly', async ({ page }) => {
    await navigateToGroupOrderCreation(page);
    await fillEventDetails(page, mockGroupOrderData);
    await selectFamilyMembers(page);
    
    // Enable shared fabric
    await page.check('[data-testid="checkbox-shared-fabric"]');
    await page.fill('[data-testid="input-total-yardage"]', '30');
    await page.fill('[data-testid="input-cost-per-yard"]', '50');
    
    // Should show fabric with 10% buffer (33 yards)
    await expect(page.locator('[data-testid="fabric-with-buffer"]')).toContainText('33');
    
    // Total cost should be 33 * 50 = 1650
    await expect(page.locator('[data-testid="total-fabric-cost"]')).toContainText('1650');
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network failure
    await page.route('**/api/orders/group', async (route) => {
      await route.abort('failed');
    });
    
    await navigateToGroupOrderCreation(page);
    await fillEventDetails(page, mockGroupOrderData);
    await selectFamilyMembers(page);
    await configureFabric(page, mockGroupOrderData);
    await configurePaymentAndDelivery(page, mockGroupOrderData);
    
    // Confirm and submit
    await page.check('[data-testid="checkbox-confirm"]');
    await page.click('[data-testid="btn-submit-group-order"]');
    
    // Should show network error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/network.*error/i);
    
    // Should offer retry option
    await expect(page.locator('[data-testid="btn-retry"]')).toBeVisible();
  });

  test('should validate event date is in the future', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseUrl}/(customer)/orders/group/create`);
    
    // Try to set event date in the past
    const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const pastDateStr = pastDate.toISOString().split('T')[0];
    
    await page.fill('[data-testid="input-group-name"]', 'Test Event');
    await page.selectOption('[data-testid="select-event-type"]', EventType.WEDDING);
    await page.fill('[data-testid="input-event-date"]', pastDateStr);
    
    // Try to proceed
    await page.click('[data-testid="btn-next-step"]');
    
    // Should show validation error
    await expect(page.locator('[data-testid="date-validation-error"]')).toContainText(/future/i);
  });
});

