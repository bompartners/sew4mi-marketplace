# Playwright Documentation

Playwright is a framework for Web Testing and Automation that allows testing modern web apps across all major browsers including Chromium, Firefox, and WebKit. It's used in Sew4Mi for end-to-end testing to ensure quality and reliability.

## Core Concepts for Sew4Mi

### Browser Automation
- **Cross-browser testing**: Test on Chromium, Firefox, and WebKit engines
- **Mobile testing**: Emulate mobile devices for responsive design testing
- **Auto-wait**: Automatically wait for elements to be ready before actions
- **Parallel execution**: Run tests concurrently for faster feedback

### Test Organization
- **Test projects**: Configure different environments (desktop, mobile, browsers)
- **Page Object Model**: Organize test code with reusable components
- **Fixtures**: Set up test data and browser contexts
- **Reporters**: Multiple output formats for test results

## Key Integration Patterns

### Basic E2E Test Structure

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('user can register as customer', async ({ page }) => {
    await page.goto('/register')
    
    // Fill registration form
    await page.fill('[data-testid="email"]', 'customer@example.com')
    await page.fill('[data-testid="password"]', 'securePassword123')
    await page.fill('[data-testid="fullName"]', 'John Doe')
    await page.selectOption('[data-testid="role"]', 'customer')
    
    // Submit form
    await page.click('[data-testid="register-button"]')
    
    // Verify success
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('[data-testid="welcome-message"]')).toHaveText('Welcome, John!')
  })

  test('user can login with valid credentials', async ({ page }) => {
    await page.goto('/login')
    
    await page.fill('[data-testid="email"]', 'existing@customer.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="login-button"]')
    
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })
})
```

### Tailor Application Testing

```typescript
// tests/e2e/tailor-application.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Tailor Application Process', () => {
  test('tailor can submit application', async ({ page }) => {
    await page.goto('/apply-tailor')
    
    // Personal information
    await page.fill('[data-testid="business-name"]', 'Kwame\'s Tailoring')
    await page.fill('[data-testid="location"]', 'Accra, Ghana')
    await page.fill('[data-testid="experience"]', '5 years')
    
    // Specialties
    await page.check('[data-testid="specialty-traditional"]')
    await page.check('[data-testid="specialty-modern"]')
    
    // Portfolio upload
    const fileInput = page.locator('[data-testid="portfolio-upload"]')
    await fileInput.setInputFiles(['tests/fixtures/portfolio1.jpg', 'tests/fixtures/portfolio2.jpg'])
    
    // Verification documents
    await page.setInputFiles(
      '[data-testid="id-document"]', 
      'tests/fixtures/ghana-id.pdf'
    )
    
    // WhatsApp contact
    await page.fill('[data-testid="whatsapp-number"]', '+233245123456')
    
    await page.click('[data-testid="submit-application"]')
    
    // Verify submission success
    await expect(page.locator('[data-testid="success-message"]')).toHaveText(
      'Application submitted successfully. We will review and contact you within 48 hours.'
    )
    
    // Check for WhatsApp confirmation message
    await expect(page.locator('[data-testid="whatsapp-confirmation"]')).toContainText(
      'Confirmation sent to WhatsApp'
    )
  })
})
```

### Order Management Testing

```typescript
// tests/e2e/order-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Order Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as customer
    await page.goto('/login')
    await page.fill('[data-testid="email"]', 'customer@test.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="login-button"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('customer can place order with measurements', async ({ page }) => {
    // Browse tailors
    await page.goto('/tailors')
    await page.click('[data-testid="tailor-card"]:first-child')
    
    // Select service
    await page.click('[data-testid="service-traditional-dress"]')
    await page.fill('[data-testid="deadline"]', '2024-12-25')
    
    // Add measurements
    await page.click('[data-testid="add-measurements"]')
    await page.fill('[data-testid="chest"]', '36')
    await page.fill('[data-testid="waist"]', '32')
    await page.fill('[data-testid="hip"]', '38')
    await page.fill('[data-testid="length"]', '45')
    
    // Upload reference images
    await page.setInputFiles(
      '[data-testid="reference-images"]',
      ['tests/fixtures/dress-reference1.jpg', 'tests/fixtures/dress-reference2.jpg']
    )
    
    // Special instructions
    await page.fill('[data-testid="instructions"]', 'Please use Kente cloth with gold accents')
    
    // Submit order
    await page.click('[data-testid="place-order"]')
    
    // Verify order creation
    await expect(page).toHaveURL(/\/orders\/[a-zA-Z0-9-]+/)
    await expect(page.locator('[data-testid="order-status"]')).toHaveText('Pending')
    await expect(page.locator('[data-testid="estimated-price"]')).toBeVisible()
  })

  test('customer can track order status', async ({ page }) => {
    // Go to orders page
    await page.goto('/orders')
    
    // Click on an order
    await page.click('[data-testid="order-item"]:first-child')
    
    // Verify order details are visible
    await expect(page.locator('[data-testid="order-timeline"]')).toBeVisible()
    await expect(page.locator('[data-testid="tailor-contact"]')).toBeVisible()
    await expect(page.locator('[data-testid="whatsapp-chat"]')).toBeVisible()
    
    // Test status updates
    const statusHistory = page.locator('[data-testid="status-history"] li')
    await expect(statusHistory).toHaveCount.toBeGreaterThan(0)
  })
})
```

### Mobile Testing Configuration

```typescript
// tests/e2e/mobile.spec.ts
import { test, expect, devices } from '@playwright/test'

// Use mobile device
test.use({ ...devices['Pixel 5'] })

test.describe('Mobile Experience', () => {
  test('mobile navigation works correctly', async ({ page }) => {
    await page.goto('/')
    
    // Mobile menu
    await page.click('[data-testid="mobile-menu-trigger"]')
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible()
    
    // Navigation items
    await page.click('[data-testid="nav-tailors"]')
    await expect(page).toHaveURL('/tailors')
    
    // Responsive layout
    await expect(page.locator('[data-testid="tailor-grid"]')).toHaveCSS('grid-template-columns', /1fr/)
  })

  test('mobile order flow optimized for Ghana', async ({ page }) => {
    await page.goto('/login')
    
    // Test mobile form
    await page.fill('[data-testid="mobile-email"]', 'mobile@test.com')
    await page.fill('[data-testid="mobile-password"]', 'password123')
    await page.click('[data-testid="mobile-login"]')
    
    // Quick order features for mobile
    await page.goto('/quick-order')
    
    // WhatsApp integration
    await page.click('[data-testid="whatsapp-order"]')
    await expect(page.locator('[data-testid="whatsapp-dialog"]')).toBeVisible()
    
    // Location services for nearby tailors
    await page.click('[data-testid="find-nearby"]')
    // Note: In real tests, you'd mock geolocation
  })
})
```

## Configuration for Sew4Mi

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI (for debugging)
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
  ],
  
  use: {
    // Base URL for all tests
    baseURL: 'http://localhost:3000',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Global timeout for each test
    actionTimeout: 10000,
    
    // Ignore HTTPS errors for local development
    ignoreHTTPSErrors: true,
  },

  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Mobile devices (important for Ghana market)
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    
    // Slow connection testing (3G simulation for Ghana)
    {
      name: 'Slow 3G',
      use: {
        ...devices['Desktop Chrome'],
        extraHTTPHeaders: {
          'Connection': 'keep-alive',
        },
        launchOptions: {
          args: [
            '--enable-features=NetworkService',
            '--throttling=cpu:4',
          ],
        },
      },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'pnpm dev --filter=web',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes
  },
})
```

### Page Object Model for Reusability

```typescript
// tests/page-objects/LoginPage.ts
import { Page, Locator } from '@playwright/test'

export class LoginPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly loginButton: Locator
  readonly errorMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.emailInput = page.locator('[data-testid="email"]')
    this.passwordInput = page.locator('[data-testid="password"]')
    this.loginButton = page.locator('[data-testid="login-button"]')
    this.errorMessage = page.locator('[data-testid="error-message"]')
  }

  async goto() {
    await this.page.goto('/login')
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.loginButton.click()
  }

  async expectErrorMessage(message: string) {
    await this.errorMessage.waitFor()
    await expect(this.errorMessage).toHaveText(message)
  }
}

// tests/page-objects/TailorApplicationPage.ts
export class TailorApplicationPage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async fillBasicInfo(data: {
    businessName: string
    location: string
    experience: string
    whatsappNumber: string
  }) {
    await this.page.fill('[data-testid="business-name"]', data.businessName)
    await this.page.fill('[data-testid="location"]', data.location)
    await this.page.fill('[data-testid="experience"]', data.experience)
    await this.page.fill('[data-testid="whatsapp-number"]', data.whatsappNumber)
  }

  async selectSpecialties(specialties: string[]) {
    for (const specialty of specialties) {
      await this.page.check(`[data-testid="specialty-${specialty}"]`)
    }
  }

  async uploadPortfolio(filePaths: string[]) {
    await this.page.setInputFiles('[data-testid="portfolio-upload"]', filePaths)
  }

  async submit() {
    await this.page.click('[data-testid="submit-application"]')
  }
}
```

### Test Fixtures for Authentication

```typescript
// tests/fixtures/auth.fixture.ts
import { test as base } from '@playwright/test'
import { LoginPage } from '../page-objects/LoginPage'

type TestFixtures = {
  authenticatedPage: Page
  loginPage: LoginPage
}

export const test = base.extend<TestFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page)
    await use(loginPage)
  },

  authenticatedPage: async ({ page }, use) => {
    // Login before each test that uses this fixture
    await page.goto('/login')
    await page.fill('[data-testid="email"]', 'test@customer.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="login-button"]')
    await page.waitForURL('/dashboard')
    
    await use(page)
  },
})

export { expect } from '@playwright/test'
```

## Ghana Market Specific Testing

### Network Conditions Testing

```typescript
// tests/e2e/network-conditions.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Network Conditions (Ghana)', () => {
  test.beforeEach(async ({ page, context }) => {
    // Simulate slow 3G connection
    await context.setNetworkConditions({
      'download': 500 * 1024,  // 500 KB/s
      'upload': 150 * 1024,    // 150 KB/s 
      'latency': 300,          // 300ms latency
    })
  })

  test('app works on slow connection', async ({ page }) => {
    await page.goto('/')
    
    // Test progressive loading
    await expect(page.locator('[data-testid="skeleton-loader"]')).toBeVisible()
    await expect(page.locator('[data-testid="main-content"]')).toBeVisible({ timeout: 15000 })
    
    // Test image lazy loading
    await page.scroll('body', { bottom: true })
    await expect(page.locator('[data-testid="lazy-image"]').first()).toBeVisible()
  })

  test('offline capabilities work', async ({ page, context }) => {
    // Load page first
    await page.goto('/')
    await expect(page.locator('[data-testid="main-content"]')).toBeVisible()
    
    // Go offline
    await context.setOffline(true)
    await page.reload()
    
    // Should show offline message
    await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible()
    await expect(page.locator('[data-testid="offline-banner"]')).toHaveText(
      'You are offline. Some features may not be available.'
    )
  })
})
```

### WhatsApp Integration Testing

```typescript
// tests/e2e/whatsapp-integration.spec.ts
import { test, expect } from '@playwright/test'

test.describe('WhatsApp Integration', () => {
  test('whatsapp contact works for order updates', async ({ page, context }) => {
    // Mock WhatsApp API calls
    await context.route('**/api/whatsapp/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, messageId: 'wa_12345' })
      })
    })

    await page.goto('/orders/123')
    
    // Send WhatsApp message
    await page.click('[data-testid="contact-whatsapp"]')
    await page.fill('[data-testid="whatsapp-message"]', 'When will my dress be ready?')
    await page.click('[data-testid="send-whatsapp"]')
    
    // Verify success
    await expect(page.locator('[data-testid="whatsapp-success"]')).toHaveText(
      'Message sent to tailor via WhatsApp'
    )
  })

  test('phone number formatting for Ghana', async ({ page }) => {
    await page.goto('/apply-tailor')
    
    // Test various formats
    await page.fill('[data-testid="whatsapp-number"]', '0245123456')
    await page.blur('[data-testid="whatsapp-number"]')
    await expect(page.locator('[data-testid="whatsapp-number"]')).toHaveValue('+233245123456')
    
    await page.fill('[data-testid="whatsapp-number"]', '245123456')
    await page.blur('[data-testid="whatsapp-number"]')
    await expect(page.locator('[data-testid="whatsapp-number"]')).toHaveValue('+233245123456')
  })
})
```

### Payment Testing (Hubtel Integration)

```typescript
// tests/e2e/payment.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Payment Integration', () => {
  test.beforeEach(async ({ page, context }) => {
    // Mock Hubtel API
    await context.route('**/api/payments/hubtel/**', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            reference: 'HUB_12345',
            paymentUrl: 'https://pay.hubtel.com/12345'
          })
        })
      }
    })
  })

  test('mobile money payment flow', async ({ page }) => {
    await page.goto('/orders/123/payment')
    
    // Select mobile money
    await page.click('[data-testid="payment-momo"]')
    
    // Fill mobile money details
    await page.fill('[data-testid="momo-number"]', '0245123456')
    await page.selectOption('[data-testid="momo-network"]', 'MTN')
    
    // Submit payment
    await page.click('[data-testid="pay-now"]')
    
    // Should redirect to Hubtel
    await expect(page).toHaveURL(/pay\.hubtel\.com/)
    
    // Simulate successful payment (in real test, you'd use Hubtel's test environment)
    await page.goto('/orders/123/payment/success?reference=HUB_12345')
    
    await expect(page.locator('[data-testid="payment-success"]')).toHaveText(
      'Payment successful! Your order is confirmed.'
    )
  })
})
```

## Test Utilities and Helpers

### Test Data Management

```typescript
// tests/utils/test-data.ts
export const testUsers = {
  customer: {
    email: 'customer@test.com',
    password: 'password123',
    name: 'John Customer',
  },
  tailor: {
    email: 'tailor@test.com',
    password: 'password123',
    name: 'Kwame Tailor',
    businessName: 'Kwame\'s Tailoring',
    location: 'Accra',
  }
}

export const testOrders = {
  traditional: {
    type: 'Traditional Dress',
    deadline: '2024-12-25',
    measurements: {
      chest: 36,
      waist: 32,
      hip: 38,
      length: 45,
    },
    instructions: 'Use Kente cloth with gold accents'
  }
}

// Database helpers for test data
export async function createTestUser(type: 'customer' | 'tailor') {
  const user = testUsers[type]
  // Implementation would use your API to create test users
  return user
}

export async function cleanupTestData() {
  // Clean up test users, orders, etc.
  // Implementation would use your API or database connection
}
```

### Screenshot and Visual Testing

```typescript
// tests/e2e/visual.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Visual Regression Tests', () => {
  test('homepage looks correct', async ({ page }) => {
    await page.goto('/')
    
    // Wait for images to load
    await page.waitForLoadState('networkidle')
    
    // Full page screenshot
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      threshold: 0.2, // Allow 20% difference for anti-aliasing
    })
  })

  test('tailor card component', async ({ page }) => {
    await page.goto('/tailors')
    
    const tailorCard = page.locator('[data-testid="tailor-card"]').first()
    await tailorCard.waitFor()
    
    // Component-level screenshot
    await expect(tailorCard).toHaveScreenshot('tailor-card.png')
  })

  test('mobile responsive design', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE
    await page.goto('/')
    
    await expect(page).toHaveScreenshot('homepage-mobile.png')
  })
})
```

## Performance Testing

```typescript
// tests/e2e/performance.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Performance Tests', () => {
  test('page load performance', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    const loadTime = Date.now() - startTime
    
    // Should load within 3 seconds on 3G
    expect(loadTime).toBeLessThan(3000)
    
    // Check Core Web Vitals
    const firstContentfulPaint = await page.evaluate(() => {
      return new Promise(resolve => {
        new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              resolve(entry.startTime)
            }
          }
        }).observe({ entryTypes: ['paint'] })
      })
    })
    
    expect(firstContentfulPaint).toBeLessThan(2000) // 2 seconds
  })

  test('bundle size check', async ({ page }) => {
    await page.goto('/')
    
    // Get all JavaScript files
    const jsRequests = []
    page.on('request', request => {
      if (request.url().endsWith('.js') && !request.url().includes('node_modules')) {
        jsRequests.push(request)
      }
    })
    
    await page.waitForLoadState('networkidle')
    
    // Check total JS bundle size
    let totalSize = 0
    for (const request of jsRequests) {
      const response = await request.response()
      if (response) {
        const headers = await response.allHeaders()
        const contentLength = headers['content-length']
        if (contentLength) {
          totalSize += parseInt(contentLength)
        }
      }
    }
    
    // Should be under 200KB for Ghana's network conditions
    expect(totalSize).toBeLessThan(200 * 1024)
  })
})
```

## Running Tests

### Development Commands

```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test tests/e2e/auth.spec.ts

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run tests on specific browser
npx playwright test --project=webkit

# Run tests in debug mode
npx playwright test --debug

# Run only mobile tests
npx playwright test --project="Mobile Chrome"

# Generate test report
npx playwright show-report
```

### CI/CD Integration

```yaml
# .github/workflows/playwright.yml
name: Playwright Tests
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - uses: actions/setup-node@v3
      with:
        node-version: 18
        
    - name: Install dependencies
      run: pnpm install
      
    - name: Install Playwright Browsers
      run: npx playwright install --with-deps
      
    - name: Run Playwright tests
      run: npx playwright test
      
    - uses: actions/upload-artifact@v3
      if: always()
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30
```

## Best Practices for Sew4Mi

1. **Test Data**: Use `data-testid` attributes for reliable element selection
2. **Page Objects**: Organize tests with reusable page object classes  
3. **Fixtures**: Set up common test scenarios (authenticated users, test data)
4. **Parallel Execution**: Run tests concurrently for faster feedback
5. **Visual Testing**: Include screenshot comparisons for UI consistency
6. **Mobile First**: Test mobile experience thoroughly for Ghana market
7. **Network Conditions**: Test on slow connections typical in Ghana
8. **Integration Testing**: Mock external APIs (WhatsApp, Hubtel) appropriately

This configuration provides comprehensive E2E testing coverage for Sew4Mi, ensuring quality across all user journeys and device types while accounting for Ghana's specific market conditions.