/**
 * End-to-End tests for Reorder and Loyalty Workflows
 * Tests Story 4.3 features including:
 * - Reorder workflow with modifications
 * - Loyalty points earning and redemption
 * - Favorites management
 * @file reorder-favorites.spec.ts
 */

import { test, expect, type Page } from '@playwright/test';

/**
 * Test configuration
 */
const TEST_CONFIG = {
  baseUrl: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
  apiUrl: process.env.PLAYWRIGHT_API_URL || 'http://localhost:3000/api',
  customerId: 'test-customer-reorder-001',
  tailorId: 'test-tailor-001',
  completedOrderId: 'test-order-completed-001',
};

/**
 * Setup test user with authentication
 */
const setupTestUser = async (page: Page, userId: string) => {
  await page.addInitScript(`
    window.localStorage.setItem('auth_token', 'test-token-${userId}');
    window.localStorage.setItem('user_role', 'customer');
    window.localStorage.setItem('user_id', '${userId}');
  `);
};

/**
 * Mock completed order data
 */
const mockCompletedOrder = {
  id: TEST_CONFIG.completedOrderId,
  customer_id: TEST_CONFIG.customerId,
  tailor_id: TEST_CONFIG.tailorId,
  garment_type: 'Custom Suit',
  fabric_details: {
    fabric: 'Wool',
    color: 'Navy',
  },
  total_amount: 500,
  status: 'COMPLETED',
};

test.describe('Reorder Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestUser(page, TEST_CONFIG.customerId);
  });

  test('should display reorder button on completed order', async ({ page }) => {
    // Navigate to order history
    await page.goto(`${TEST_CONFIG.baseUrl}/orders`);

    // Wait for order list to load
    await page.waitForSelector('[data-testid="order-list"]');

    // Find completed order
    const completedOrder = page.locator(`[data-testid="order-${TEST_CONFIG.completedOrderId}"]`);
    await expect(completedOrder).toBeVisible();

    // Check for reorder button
    const reorderButton = completedOrder.locator('[data-testid="reorder-button"]');
    await expect(reorderButton).toBeVisible();
    await expect(reorderButton).toHaveText(/Reorder|Order Again/i);
  });

  test('should preview reorder with original order details', async ({ page }) => {
    // Navigate to order details
    await page.goto(`${TEST_CONFIG.baseUrl}/orders/${TEST_CONFIG.completedOrderId}`);

    // Click reorder button
    await page.click('[data-testid="reorder-button"]');

    // Wait for reorder preview modal/page
    await page.waitForSelector('[data-testid="reorder-preview"]');

    // Verify original order details displayed
    await expect(page.locator('[data-testid="original-garment-type"]')).toContainText('Custom Suit');
    await expect(page.locator('[data-testid="original-fabric"]')).toContainText('Wool');
    await expect(page.locator('[data-testid="original-tailor"]')).toBeVisible();

    // Verify pricing displayed
    await expect(page.locator('[data-testid="base-price"]')).toContainText('500');
  });

  test('should allow fabric modification during reorder', async ({ page }) => {
    // Navigate to order details and start reorder
    await page.goto(`${TEST_CONFIG.baseUrl}/orders/${TEST_CONFIG.completedOrderId}`);
    await page.click('[data-testid="reorder-button"]');
    await page.waitForSelector('[data-testid="reorder-preview"]');

    // Click modify button
    await page.click('[data-testid="modify-order-button"]');

    // Wait for modification form
    await page.waitForSelector('[data-testid="fabric-selector"]');

    // Change fabric to silk
    await page.selectOption('[data-testid="fabric-selector"]', 'silk');

    // Verify pricing updates
    const newPrice = page.locator('[data-testid="total-price"]');
    await expect(newPrice).toContainText('550'); // Base 500 + 50 upcharge

    // Verify upcharge message
    await expect(page.locator('[data-testid="fabric-upcharge-notice"]')).toContainText('50');
  });

  test('should create reorder without modifications', async ({ page }) => {
    // Navigate to order details
    await page.goto(`${TEST_CONFIG.baseUrl}/orders/${TEST_CONFIG.completedOrderId}`);
    await page.click('[data-testid="reorder-button"]');
    await page.waitForSelector('[data-testid="reorder-preview"]');

    // Confirm reorder without modifications
    await page.click('[data-testid="confirm-reorder-button"]');

    // Wait for success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText(/Order created|Reorder successful/i);

    // Verify redirect to new order page
    await page.waitForURL(/\/orders\/order-\w+/);
    await expect(page.locator('[data-testid="order-status"]')).toContainText('PENDING');
  });

  test('should handle tailor unavailability gracefully', async ({ page }) => {
    // Mock unavailable tailor response
    await page.route(`${TEST_CONFIG.apiUrl}/orders/reorder`, async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Tailor is not available: Tailor is at capacity',
        }),
      });
    });

    // Try to reorder
    await page.goto(`${TEST_CONFIG.baseUrl}/orders/${TEST_CONFIG.completedOrderId}`);
    await page.click('[data-testid="reorder-button"]');
    await page.waitForSelector('[data-testid="reorder-preview"]');
    await page.click('[data-testid="confirm-reorder-button"]');

    // Verify error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/not available|at capacity/i);

    // Verify alternative tailors suggested
    await expect(page.locator('[data-testid="alternative-tailors"]')).toBeVisible();
  });
});

test.describe('Loyalty Points Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestUser(page, TEST_CONFIG.customerId);
  });

  test('should display loyalty points balance in header', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseUrl}/dashboard`);

    // Check loyalty badge in header
    const loyaltyBadge = page.locator('[data-testid="loyalty-points-badge"]');
    await expect(loyaltyBadge).toBeVisible();
    await expect(loyaltyBadge).toContainText(/\d+/); // Contains numbers
  });

  test('should show points earned after order completion', async ({ page }) => {
    // Mock order completion notification
    await page.goto(`${TEST_CONFIG.baseUrl}/orders/${TEST_CONFIG.completedOrderId}`);

    // Verify completion status
    await expect(page.locator('[data-testid="order-status"]')).toContainText('COMPLETED');

    // Check for points earned notification
    const pointsNotification = page.locator('[data-testid="points-earned-notification"]');
    await expect(pointsNotification).toBeVisible();
    await expect(pointsNotification).toContainText(/earned|points/i);
  });

  test('should navigate to loyalty dashboard', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseUrl}/dashboard`);

    // Click loyalty points badge
    await page.click('[data-testid="loyalty-points-badge"]');

    // Verify navigation to loyalty page
    await page.waitForURL(/\/loyalty/);

    // Verify loyalty dashboard elements
    await expect(page.locator('[data-testid="loyalty-account-balance"]')).toBeVisible();
    await expect(page.locator('[data-testid="loyalty-tier-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="available-rewards"]')).toBeVisible();
    await expect(page.locator('[data-testid="transaction-history"]')).toBeVisible();
  });

  test('should display tier progression information', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseUrl}/loyalty`);

    // Check tier badge
    const tierBadge = page.locator('[data-testid="current-tier"]');
    await expect(tierBadge).toContainText(/(BRONZE|SILVER|GOLD|PLATINUM)/);

    // Check points to next tier
    const nextTierInfo = page.locator('[data-testid="next-tier-info"]');
    await expect(nextTierInfo).toBeVisible();
  });

  test('should list available rewards', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseUrl}/loyalty`);

    // Wait for rewards to load
    await page.waitForSelector('[data-testid="rewards-gallery"]');

    // Verify rewards displayed
    const rewards = page.locator('[data-testid^="reward-card-"]');
    await expect(rewards).toHaveCount(await rewards.count());
    expect(await rewards.count()).toBeGreaterThan(0);

    // Check reward card structure
    const firstReward = rewards.first();
    await expect(firstReward.locator('[data-testid="reward-name"]')).toBeVisible();
    await expect(firstReward.locator('[data-testid="reward-cost"]')).toContainText(/\d+\s*points/i);
  });

  test('should redeem reward with sufficient points', async ({ page }) => {
    // Mock account with sufficient points
    await page.route(`${TEST_CONFIG.apiUrl}/loyalty/account`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          account: {
            userId: TEST_CONFIG.customerId,
            totalPoints: 1000,
            availablePoints: 1000,
            lifetimePoints: 1500,
            tier: 'SILVER',
          },
          recentTransactions: [],
        }),
      });
    });

    await page.goto(`${TEST_CONFIG.baseUrl}/loyalty`);

    // Find redeemable reward (500 points)
    const affordableReward = page.locator('[data-testid="reward-card-500"]');
    await affordableReward.scrollIntoViewIfNeeded();
    await affordableReward.click('[data-testid="redeem-button"]');

    // Confirm redemption in modal
    await page.waitForSelector('[data-testid="redeem-confirmation-modal"]');
    await expect(page.locator('[data-testid="points-to-deduct"]')).toContainText('500');
    await page.click('[data-testid="confirm-redeem-button"]');

    // Verify success message
    await expect(page.locator('[data-testid="redemption-success"]')).toContainText(/redeemed|success/i);

    // Verify points balance updated
    await expect(page.locator('[data-testid="available-points"]')).toContainText('500'); // 1000 - 500
  });

  test('should prevent redemption with insufficient points', async ({ page }) => {
    // Mock account with low points
    await page.route(`${TEST_CONFIG.apiUrl}/loyalty/account`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          account: {
            userId: TEST_CONFIG.customerId,
            totalPoints: 300,
            availablePoints: 300,
            lifetimePoints: 500,
            tier: 'BRONZE',
          },
          recentTransactions: [],
        }),
      });
    });

    await page.goto(`${TEST_CONFIG.baseUrl}/loyalty`);

    // Find expensive reward (1000 points)
    const expensiveReward = page.locator('[data-testid="reward-card-1000"]');
    await expensiveReward.scrollIntoViewIfNeeded();

    // Verify redeem button is disabled
    const redeemButton = expensiveReward.locator('[data-testid="redeem-button"]');
    await expect(redeemButton).toBeDisabled();

    // Verify insufficient points message
    await expect(expensiveReward.locator('[data-testid="insufficient-points-notice"]')).toBeVisible();
  });

  test('should display transaction history with correct details', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseUrl}/loyalty`);

    // Scroll to transaction history
    await page.locator('[data-testid="transaction-history"]').scrollIntoViewIfNeeded();

    // Verify history items
    const transactions = page.locator('[data-testid^="transaction-"]');
    expect(await transactions.count()).toBeGreaterThan(0);

    // Check first transaction structure
    const firstTransaction = transactions.first();
    await expect(firstTransaction.locator('[data-testid="transaction-type"]')).toContainText(/(EARN|REDEEM|BONUS)/);
    await expect(firstTransaction.locator('[data-testid="transaction-points"]')).toContainText(/[+-]?\d+/);
    await expect(firstTransaction.locator('[data-testid="transaction-date"]')).toBeVisible();
  });
});

test.describe('Favorites Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestUser(page, TEST_CONFIG.customerId);
  });

  test('should add order to favorites', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseUrl}/orders/${TEST_CONFIG.completedOrderId}`);

    // Click "Add to Favorites" button
    await page.click('[data-testid="add-to-favorites-button"]');

    // Wait for favorites modal
    await page.waitForSelector('[data-testid="favorites-modal"]');

    // Enter nickname
    await page.fill('[data-testid="favorite-nickname-input"]', 'My Perfect Suit');

    // Confirm
    await page.click('[data-testid="save-favorite-button"]');

    // Verify success message
    await expect(page.locator('[data-testid="favorite-success"]')).toContainText(/added to favorites/i);

    // Verify button changes to "Favorited"
    await expect(page.locator('[data-testid="add-to-favorites-button"]')).toContainText(/Favorited|★/);
  });

  test('should navigate to favorites page', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseUrl}/dashboard`);

    // Click favorites navigation
    await page.click('[data-testid="favorites-nav-link"]');

    // Verify navigation
    await page.waitForURL(/\/favorites/);

    // Verify favorites list displayed
    await expect(page.locator('[data-testid="favorites-list"]')).toBeVisible();
  });

  test('should display favorite orders with nicknames', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseUrl}/favorites`);

    // Wait for favorites to load
    await page.waitForSelector('[data-testid="favorites-list"]');

    // Check favorite cards
    const favoriteCards = page.locator('[data-testid^="favorite-card-"]');
    expect(await favoriteCards.count()).toBeGreaterThan(0);

    // Verify card structure
    const firstFavorite = favoriteCards.first();
    await expect(firstFavorite.locator('[data-testid="favorite-nickname"]')).toBeVisible();
    await expect(firstFavorite.locator('[data-testid="garment-type"]')).toBeVisible();
    await expect(firstFavorite.locator('[data-testid="reorder-from-favorite-button"]')).toBeVisible();
  });

  test('should reorder from favorite', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseUrl}/favorites`);
    await page.waitForSelector('[data-testid="favorites-list"]');

    // Click reorder on first favorite
    const firstFavorite = page.locator('[data-testid^="favorite-card-"]').first();
    await firstFavorite.click('[data-testid="reorder-from-favorite-button"]');

    // Verify navigation to reorder flow
    await page.waitForSelector('[data-testid="reorder-preview"]');
    await expect(page.locator('[data-testid="reorder-source"]')).toContainText(/favorite/i);
  });

  test('should remove favorite', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseUrl}/favorites`);
    await page.waitForSelector('[data-testid="favorites-list"]');

    // Click remove on first favorite
    const firstFavorite = page.locator('[data-testid^="favorite-card-"]').first();
    await firstFavorite.click('[data-testid="remove-favorite-button"]');

    // Confirm removal
    await page.waitForSelector('[data-testid="confirm-remove-modal"]');
    await page.click('[data-testid="confirm-remove-button"]');

    // Verify success message
    await expect(page.locator('[data-testid="remove-success"]')).toContainText(/removed/i);
  });
});

test.describe('Combined Workflow: Reorder with Loyalty', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestUser(page, TEST_CONFIG.customerId);
  });

  test('should apply loyalty discount to reorder', async ({ page }) => {
    // Navigate to reorder
    await page.goto(`${TEST_CONFIG.baseUrl}/orders/${TEST_CONFIG.completedOrderId}`);
    await page.click('[data-testid="reorder-button"]');
    await page.waitForSelector('[data-testid="reorder-preview"]');

    // Check for loyalty rewards option
    await expect(page.locator('[data-testid="apply-loyalty-reward"]')).toBeVisible();

    // Select 10% discount reward
    await page.click('[data-testid="select-reward-button"]');
    await page.waitForSelector('[data-testid="rewards-list"]');
    await page.click('[data-testid="reward-10-percent"]');

    // Verify discount applied to pricing
    const discountAmount = page.locator('[data-testid="discount-amount"]');
    await expect(discountAmount).toContainText('50'); // 10% of 500

    const finalTotal = page.locator('[data-testid="final-total"]');
    await expect(finalTotal).toContainText('450'); // 500 - 50
  });
});
