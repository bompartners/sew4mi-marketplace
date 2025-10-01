/**
 * End-to-End tests for complete order tracking workflow
 * Tests the entire customer journey from order creation to completion
 * @file order-tracking-workflow.spec.ts
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { OrderStatus } from '@sew4mi/shared/types/order-creation';
import { MilestoneStage, MilestoneApprovalStatus } from '@sew4mi/shared';

/**
 * Test data and configuration
 */
const TEST_CONFIG = {
  baseUrl: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
  apiUrl: process.env.PLAYWRIGHT_API_URL || 'http://localhost:3000/api',
  tailorId: 'test-tailor-001',
  customerId: 'test-customer-001',
  orderId: 'test-order-001',
  measurementProfileId: 'test-measurement-001',
};

/**
 * Mock data for test scenarios
 */
const mockOrderData = {
  customerId: TEST_CONFIG.customerId,
  tailorId: TEST_CONFIG.tailorId,
  measurementProfileId: TEST_CONFIG.measurementProfileId,
  garmentType: 'Traditional Kente Dress',
  specialInstructions: 'Please use gold thread for embellishments',
  totalAmount: 450.00,
  estimatedDelivery: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
  urgencyLevel: 'STANDARD'
};

const mockMilestones = [
  {
    stage: MilestoneStage.FABRIC_SELECTED,
    name: 'Fabric Selection',
    photoUrl: 'https://example.com/fabric.jpg',
    notes: 'Beautiful kente fabric selected',
    estimatedDays: 1
  },
  {
    stage: MilestoneStage.CUTTING_STARTED,
    name: 'Cutting Started',
    photoUrl: 'https://example.com/cutting.jpg',
    notes: 'Precise cutting in progress',
    estimatedDays: 2
  },
  {
    stage: MilestoneStage.INITIAL_ASSEMBLY,
    name: 'Initial Assembly',
    photoUrl: 'https://example.com/assembly.jpg',
    notes: 'Initial stitching completed',
    estimatedDays: 4
  },
  {
    stage: MilestoneStage.FITTING_READY,
    name: 'Fitting Ready',
    photoUrl: 'https://example.com/fitting.jpg',
    notes: 'Ready for fitting appointment',
    estimatedDays: 7
  },
  {
    stage: MilestoneStage.ADJUSTMENTS_COMPLETE,
    name: 'Adjustments Complete',
    photoUrl: 'https://example.com/adjustments.jpg',
    notes: 'All adjustments made',
    estimatedDays: 10
  },
  {
    stage: MilestoneStage.FINAL_PRESSING,
    name: 'Final Pressing',
    photoUrl: 'https://example.com/pressing.jpg',
    notes: 'Final pressing and quality check',
    estimatedDays: 12
  },
  {
    stage: MilestoneStage.READY_FOR_DELIVERY,
    name: 'Ready for Delivery',
    photoUrl: 'https://example.com/delivery.jpg',
    notes: 'Garment ready for pickup/delivery',
    estimatedDays: 14
  }
];

/**
 * Setup and utility functions
 */
const setupTestUser = async (page: Page, userType: 'customer' | 'tailor') => {
  const userId = userType === 'customer' ? TEST_CONFIG.customerId : TEST_CONFIG.tailorId;
  
  // Mock authentication
  await page.addInitScript(`
    window.localStorage.setItem('auth_token', '${userId}');
    window.localStorage.setItem('user_role', '${userType}');
    window.localStorage.setItem('user_id', '${userId}');
  `);
  
  // Mock API responses for authentication
  await page.route('**/api/auth/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: userId,
          role: userType,
          email: `${userType}@example.com`,
          name: `Test ${userType.charAt(0).toUpperCase() + userType.slice(1)}`
        }
      })
    });
  });
};

const setupMockAPIs = async (page: Page) => {
  // Mock order creation API
  await page.route('**/api/orders', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: TEST_CONFIG.orderId,
          ...mockOrderData,
          status: OrderStatus.CREATED,
          createdAt: new Date(),
          milestones: []
        })
      });
    }
  });

  // Mock order details API
  await page.route(`**/api/orders/${TEST_CONFIG.orderId}`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: TEST_CONFIG.orderId,
        ...mockOrderData,
        status: OrderStatus.IN_PRODUCTION,
        progressPercentage: 45,
        milestones: mockMilestones.slice(0, 3).map((m, index) => ({
          id: `milestone-${index + 1}`,
          orderId: TEST_CONFIG.orderId,
          milestone: m.stage,
          photoUrl: m.photoUrl,
          notes: m.notes,
          verifiedAt: new Date(Date.now() - (3 - index) * 24 * 60 * 60 * 1000),
          verifiedBy: TEST_CONFIG.tailorId,
          approvalStatus: MilestoneApprovalStatus.APPROVED,
          createdAt: new Date(Date.now() - (3 - index) * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - (3 - index) * 24 * 60 * 60 * 1000)
        }))
      })
    });
  });

  // Mock order timeline API
  await page.route(`**/api/orders/${TEST_CONFIG.orderId}/timeline`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        orderId: TEST_CONFIG.orderId,
        currentStatus: OrderStatus.IN_PRODUCTION,
        progressPercentage: 45,
        estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        milestones: mockMilestones.slice(0, 3),
        nextMilestone: {
          type: MilestoneStage.FITTING_READY,
          estimatedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          description: 'Ready for fitting appointment'
        }
      })
    });
  });

  // Mock order messages API
  await page.route(`**/api/orders/${TEST_CONFIG.orderId}/messages`, async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          messages: [
            {
              id: 'msg-001',
              orderId: TEST_CONFIG.orderId,
              senderId: TEST_CONFIG.tailorId,
              senderType: 'TAILOR',
              senderName: 'John Tailor',
              message: 'Your garment is progressing well! The fabric selection looks great.',
              messageType: 'TEXT',
              isInternal: false,
              readBy: [],
              sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
              deliveredAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
            }
          ]
        })
      });
    } else if (route.request().method() === 'POST') {
      const body = await route.request().json();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'msg-' + Date.now(),
          orderId: TEST_CONFIG.orderId,
          senderId: body.senderId,
          senderType: body.senderType,
          senderName: body.senderName,
          message: body.message,
          messageType: body.messageType,
          isInternal: false,
          readBy: [],
          sentAt: new Date(),
          deliveredAt: new Date()
        })
      });
    }
  });

  // Mock order history API
  await page.route('**/api/orders/history', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        orders: [
          {
            id: TEST_CONFIG.orderId,
            garmentType: 'Traditional Kente Dress',
            status: OrderStatus.IN_PRODUCTION,
            progressPercentage: 45,
            totalAmount: 450.00,
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            tailorName: 'John Tailor'
          }
        ],
        total: 1,
        page: 1,
        limit: 10
      })
    });
  });
};

/**
 * Test suite configuration
 */
test.describe('Order Tracking E2E Workflow', () => {
  let context: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    // Create a new context for each test to ensure isolation
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      permissions: ['notifications'] // Grant notification permissions for PWA features
    });
  });

  test.afterEach(async () => {
    await context.close();
  });

  test.describe('Customer Order Tracking Journey', () => {
    test('should complete full order tracking workflow from creation to delivery', async () => {
      const page = await context.newPage();
      
      // Setup test user and mock APIs
      await setupTestUser(page, 'customer');
      await setupMockAPIs(page);

      // Step 1: Navigate to order tracking page
      await page.goto(`${TEST_CONFIG.baseUrl}/orders/${TEST_CONFIG.orderId}`);
      
      // Step 2: Verify order details are displayed
      await expect(page.locator('[data-testid="order-details"]')).toBeVisible();
      await expect(page.locator('text=Traditional Kente Dress')).toBeVisible();
      await expect(page.locator('text=GHS 450.00')).toBeVisible();

      // Step 3: Check progress timeline
      await expect(page.locator('[data-testid="progress-timeline"]')).toBeVisible();
      await expect(page.locator('text=45%')).toBeVisible();
      
      // Verify completed milestones
      await expect(page.locator('text=Fabric Selection')).toBeVisible();
      await expect(page.locator('text=Cutting Started')).toBeVisible();
      await expect(page.locator('text=Initial Assembly')).toBeVisible();

      // Step 4: Test photo gallery functionality
      await expect(page.locator('[data-testid="milestone-photo-gallery"]')).toBeVisible();
      
      // Click on a milestone photo to open modal
      await page.click('[data-testid="milestone-photo"]:first-child');
      await expect(page.locator('[data-testid="photo-modal"]')).toBeVisible();
      
      // Test photo navigation in modal
      const nextButton = page.locator('[data-testid="photo-next-button"]');
      if (await nextButton.isVisible()) {
        await nextButton.click();
      }
      
      // Close modal
      await page.click('[data-testid="photo-modal-close"]');
      await expect(page.locator('[data-testid="photo-modal"]')).not.toBeVisible();

      // Step 5: Test messaging functionality
      await expect(page.locator('[data-testid="order-chat"]')).toBeVisible();
      
      // Verify existing messages are displayed
      await expect(page.locator('text=Your garment is progressing well!')).toBeVisible();
      
      // Send a new message
      const messageInput = page.locator('[data-testid="message-input"]');
      await messageInput.fill('When will it be ready for fitting?');
      await page.click('[data-testid="send-message-button"]');
      
      // Verify message was sent
      await expect(page.locator('text=When will it be ready for fitting?')).toBeVisible();

      // Step 6: Test countdown and delivery information
      await expect(page.locator('[data-testid="delivery-countdown"]')).toBeVisible();
      await expect(page.locator('text=days remaining')).toBeVisible();

      // Step 7: Test notification settings
      await page.click('[data-testid="notification-settings-button"]');
      await expect(page.locator('[data-testid="notification-settings"]')).toBeVisible();
      
      // Toggle a notification preference
      await page.click('[data-testid="milestone-notifications-toggle"]');
      await page.click('[data-testid="save-notification-settings"]');

      // Step 8: Test external actions
      const whatsappButton = page.locator('[data-testid="whatsapp-button"]');
      if (await whatsappButton.isVisible()) {
        await whatsappButton.click();
        // Note: In real scenario, this would open WhatsApp
        // For E2E test, we just verify the button works
      }

      await page.close();
    });

    test('should handle order history and search functionality', async () => {
      const page = await context.newPage();
      
      await setupTestUser(page, 'customer');
      await setupMockAPIs(page);

      // Navigate to order history page
      await page.goto(`${TEST_CONFIG.baseUrl}/orders/history`);

      // Verify order history is displayed
      await expect(page.locator('[data-testid="order-history"]')).toBeVisible();
      await expect(page.locator('text=Traditional Kente Dress')).toBeVisible();

      // Test order filtering
      await page.click('[data-testid="filter-status-dropdown"]');
      await page.click('[data-testid="filter-in-production"]');
      
      // Verify filtered results
      await expect(page.locator('[data-testid="order-card"]')).toBeVisible();

      // Test order search
      const searchInput = page.locator('[data-testid="order-search-input"]');
      await searchInput.fill('Kente');
      await page.keyboard.press('Enter');
      
      // Verify search results
      await expect(page.locator('text=Traditional Kente Dress')).toBeVisible();

      // Click on an order to view details
      await page.click('[data-testid="order-card"]:first-child');
      await expect(page.url()).toContain(`/orders/${TEST_CONFIG.orderId}`);

      await page.close();
    });

    test('should handle real-time updates and notifications', async () => {
      const page = await context.newPage();
      
      await setupTestUser(page, 'customer');
      await setupMockAPIs(page);

      // Navigate to order tracking page
      await page.goto(`${TEST_CONFIG.baseUrl}/orders/${TEST_CONFIG.orderId}`);

      // Mock WebSocket connection for real-time updates
      await page.addInitScript(() => {
        let mockWebSocket: any;
        
        // Override WebSocket constructor
        (window as any).WebSocket = class MockWebSocket {
          url: string;
          readyState: number = 1; // OPEN
          onopen: ((event: Event) => void) | null = null;
          onmessage: ((event: MessageEvent) => void) | null = null;
          onclose: ((event: CloseEvent) => void) | null = null;
          onerror: ((event: Event) => void) | null = null;

          constructor(url: string) {
            this.url = url;
            mockWebSocket = this;
            
            // Simulate connection opening
            setTimeout(() => {
              if (this.onopen) {
                this.onopen(new Event('open'));
              }
            }, 100);
          }

          send(data: string) {
            // Mock echo response for testing
            setTimeout(() => {
              if (this.onmessage) {
                this.onmessage(new MessageEvent('message', { data }));
              }
            }, 50);
          }

          close() {
            this.readyState = 3; // CLOSED
            if (this.onclose) {
              this.onclose(new CloseEvent('close'));
            }
          }

          // Method to simulate receiving a message from server
          simulateMessage(data: any) {
            if (this.onmessage) {
              this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
            }
          }
        };

        // Make mockWebSocket available globally for test manipulation
        (window as any).mockWebSocket = mockWebSocket;
      });

      // Wait for page to load and WebSocket to connect
      await page.waitForTimeout(500);

      // Simulate a real-time milestone update
      await page.evaluate(() => {
        const mockWs = (window as any).mockWebSocket;
        if (mockWs) {
          mockWs.simulateMessage({
            type: 'milestone_update',
            data: {
              orderId: 'test-order-001',
              milestone: 'FITTING_READY',
              photoUrl: 'https://example.com/fitting-new.jpg',
              notes: 'Ready for your fitting appointment - updated',
              timestamp: new Date().toISOString()
            }
          });
        }
      });

      // Verify the update is reflected in the UI
      await expect(page.locator('text=Ready for your fitting appointment - updated')).toBeVisible();

      // Simulate a new message notification
      await page.evaluate(() => {
        const mockWs = (window as any).mockWebSocket;
        if (mockWs) {
          mockWs.simulateMessage({
            type: 'message',
            message: {
              id: 'msg-new',
              orderId: 'test-order-001',
              senderId: 'test-tailor-001',
              senderName: 'John Tailor',
              message: 'Please come in tomorrow for fitting at 2 PM',
              messageType: 'TEXT',
              sentAt: new Date().toISOString()
            }
          });
        }
      });

      // Verify the new message appears
      await expect(page.locator('text=Please come in tomorrow for fitting at 2 PM')).toBeVisible();

      await page.close();
    });
  });

  test.describe('Mobile-First Experience', () => {
    test('should provide optimal mobile experience for order tracking', async () => {
      const page = await context.newPage();
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await setupTestUser(page, 'customer');
      await setupMockAPIs(page);

      await page.goto(`${TEST_CONFIG.baseUrl}/orders/${TEST_CONFIG.orderId}`);

      // Verify mobile-optimized layout
      await expect(page.locator('[data-testid="mobile-progress-card"]')).toBeVisible();
      
      // Test mobile photo gallery
      await page.click('[data-testid="milestone-photo"]:first-child');
      await expect(page.locator('[data-testid="photo-modal"]')).toBeVisible();
      
      // Test swipe gestures (simulated)
      const modal = page.locator('[data-testid="photo-modal"]');
      await modal.dispatchEvent('touchstart', { 
        touches: [{ clientX: 200, clientY: 300 }] 
      });
      await modal.dispatchEvent('touchmove', { 
        touches: [{ clientX: 100, clientY: 300 }] 
      });
      await modal.dispatchEvent('touchend');

      // Test mobile chat interface
      await page.click('[data-testid="photo-modal-close"]');
      const chatToggle = page.locator('[data-testid="mobile-chat-toggle"]');
      if (await chatToggle.isVisible()) {
        await chatToggle.click();
      }
      
      await expect(page.locator('[data-testid="mobile-chat-interface"]')).toBeVisible();

      await page.close();
    });
  });

  test.describe('PWA and Offline Functionality', () => {
    test('should work offline with cached data', async () => {
      const page = await context.newPage();
      
      await setupTestUser(page, 'customer');
      await setupMockAPIs(page);

      // First, load the page with data
      await page.goto(`${TEST_CONFIG.baseUrl}/orders/${TEST_CONFIG.orderId}`);
      await expect(page.locator('[data-testid="order-details"]')).toBeVisible();

      // Simulate offline mode
      await context.setOffline(true);

      // Reload the page to test offline functionality
      await page.reload();

      // Verify cached content is still available
      await expect(page.locator('[data-testid="order-details"]')).toBeVisible();
      
      // Verify offline indicator is shown
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();

      // Test offline photo viewing
      await page.click('[data-testid="milestone-photo"]:first-child');
      await expect(page.locator('[data-testid="photo-modal"]')).toBeVisible();

      // Restore online mode
      await context.setOffline(false);
      await page.waitForTimeout(1000);

      // Verify online indicator returns
      await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();

      await page.close();
    });

    test('should queue messages when offline and send when online', async () => {
      const page = await context.newPage();
      
      await setupTestUser(page, 'customer');
      await setupMockAPIs(page);

      await page.goto(`${TEST_CONFIG.baseUrl}/orders/${TEST_CONFIG.orderId}`);

      // Go offline
      await context.setOffline(true);

      // Try to send a message while offline
      const messageInput = page.locator('[data-testid="message-input"]');
      await messageInput.fill('This is an offline message');
      await page.click('[data-testid="send-message-button"]');

      // Verify message is queued (shown with pending indicator)
      await expect(page.locator('text=This is an offline message')).toBeVisible();
      await expect(page.locator('[data-testid="message-pending-indicator"]')).toBeVisible();

      // Go back online
      await context.setOffline(false);
      await page.waitForTimeout(1000);

      // Verify message is now sent (pending indicator removed)
      await expect(page.locator('[data-testid="message-pending-indicator"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="message-sent-indicator"]')).toBeVisible();

      await page.close();
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle API errors gracefully', async () => {
      const page = await context.newPage();
      
      await setupTestUser(page, 'customer');

      // Mock API error responses
      await page.route(`**/api/orders/${TEST_CONFIG.orderId}`, async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });

      await page.goto(`${TEST_CONFIG.baseUrl}/orders/${TEST_CONFIG.orderId}`);

      // Verify error state is displayed
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('text=Failed to load order details')).toBeVisible();

      // Test retry functionality
      const retryButton = page.locator('[data-testid="retry-button"]');
      if (await retryButton.isVisible()) {
        await retryButton.click();
        // Verify retry attempt is made
        await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
      }

      await page.close();
    });

    test('should handle network timeouts and show appropriate feedback', async () => {
      const page = await context.newPage();
      
      await setupTestUser(page, 'customer');

      // Mock slow API response
      await page.route(`**/api/orders/${TEST_CONFIG.orderId}`, async route => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: TEST_CONFIG.orderId })
        });
      });

      await page.goto(`${TEST_CONFIG.baseUrl}/orders/${TEST_CONFIG.orderId}`);

      // Verify loading state is shown
      await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
      
      // Verify timeout message appears
      await expect(page.locator('text=Loading is taking longer than usual')).toBeVisible({ timeout: 10000 });

      await page.close();
    });

    test('should handle invalid order IDs', async () => {
      const page = await context.newPage();
      
      await setupTestUser(page, 'customer');

      // Mock 404 response for invalid order
      await page.route('**/api/orders/invalid-order-id', async route => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Order not found' })
        });
      });

      await page.goto(`${TEST_CONFIG.baseUrl}/orders/invalid-order-id`);

      // Verify 404 error state
      await expect(page.locator('[data-testid="order-not-found"]')).toBeVisible();
      await expect(page.locator('text=Order not found')).toBeVisible();

      // Test navigation back to order history
      const backButton = page.locator('[data-testid="back-to-history-button"]');
      if (await backButton.isVisible()) {
        await backButton.click();
        await expect(page.url()).toContain('/orders/history');
      }

      await page.close();
    });
  });

  test.describe('Performance and Accessibility', () => {
    test('should meet performance benchmarks', async () => {
      const page = await context.newPage();
      
      await setupTestUser(page, 'customer');
      await setupMockAPIs(page);

      // Start performance measurement
      await page.goto(`${TEST_CONFIG.baseUrl}/orders/${TEST_CONFIG.orderId}`);

      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');

      // Verify key elements load quickly
      await expect(page.locator('[data-testid="order-details"]')).toBeVisible({ timeout: 3000 });
      await expect(page.locator('[data-testid="progress-timeline"]')).toBeVisible({ timeout: 3000 });

      // Test image loading performance
      const firstPhoto = page.locator('[data-testid="milestone-photo"]:first-child img');
      await expect(firstPhoto).toBeVisible({ timeout: 5000 });

      await page.close();
    });

    test('should be accessible to screen readers', async () => {
      const page = await context.newPage();
      
      await setupTestUser(page, 'customer');
      await setupMockAPIs(page);

      await page.goto(`${TEST_CONFIG.baseUrl}/orders/${TEST_CONFIG.orderId}`);

      // Check for proper ARIA labels and roles
      await expect(page.locator('[role="main"]')).toBeVisible();
      await expect(page.locator('[role="progressbar"]')).toBeVisible();
      
      // Check for alt text on images
      const milestonePhotos = page.locator('[data-testid="milestone-photo"] img');
      const count = await milestonePhotos.count();
      
      for (let i = 0; i < count; i++) {
        const photo = milestonePhotos.nth(i);
        const altText = await photo.getAttribute('alt');
        expect(altText).toBeTruthy();
        expect(altText).toMatch(/.*photo$/); // Should end with "photo"
      }

      // Check for proper heading hierarchy
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('h2')).toBeVisible();

      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Verify focus is visible
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();

      await page.close();
    });
  });
});