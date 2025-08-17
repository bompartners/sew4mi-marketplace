/**
 * Comprehensive hydration test to verify all hydration issues are resolved
 * This test ensures that all pages and components handle SSR/CSR differences correctly
 */

import { test, expect } from '@playwright/test'

test.describe('Complete Hydration Resolution Tests', () => {
  test('should have no hydration errors on any auth page', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // Test all auth pages
    const authPages = ['/login', '/register', '/reset-password']
    
    for (const authPage of authPages) {
      await page.goto(authPage)
      await page.waitForLoadState('networkidle')
      
      // Check for hydration errors on this specific page
      const hydrationErrors = consoleErrors.filter(error => 
        error.includes('Hydration failed') || 
        error.includes('hydration mismatch') ||
        error.includes('server rendered HTML didn\'t match')
      )

      expect(hydrationErrors, `Hydration errors found on ${authPage}: ${hydrationErrors.join(', ')}`).toHaveLength(0)
      
      // Reset errors array for next page
      consoleErrors.length = 0
    }
  })

  test('should handle Suspense components without hydration issues', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // Visit page with Suspense components
    await page.goto('/reset-password')
    await page.waitForLoadState('networkidle')

    // Verify no Suspense-related hydration errors
    const suspenseErrors = consoleErrors.filter(error => 
      error.includes('Suspense') ||
      error.includes('fallback') ||
      error.includes('hidden={true}') ||
      error.includes('hidden={null}')
    )

    expect(suspenseErrors).toHaveLength(0)
  })

  test('should handle ClientOnly components correctly', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // Visit pages that use ClientOnly wrapper (auth layout)
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Wait for any client-side hydration to complete
    await page.waitForTimeout(1000)

    // Check for ClientOnly related hydration errors
    const clientOnlyErrors = consoleErrors.filter(error => 
      error.includes('ClientOnly') ||
      error.includes('mounted') ||
      error.includes('hasMounted')
    )

    expect(clientOnlyErrors).toHaveLength(0)
  })

  test('should handle conditional rendering without errors', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // Test dashboard page which has conditional mounted state
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Wait for component mounting to complete
    await page.waitForTimeout(1000)

    // Check for conditional rendering hydration errors
    const conditionalErrors = consoleErrors.filter(error => 
      error.includes('useState') ||
      error.includes('mounted') ||
      error.includes('loading')
    )

    expect(conditionalErrors).toHaveLength(0)
  })

  test('should verify suppressHydrationWarning attributes are properly applied', async ({ page }) => {
    // Check that suppressHydrationWarning is present where needed
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Verify suppressHydrationWarning is applied to wrapper elements
    const wrapperElements = await page.locator('[suppresshydrationwarning]').count()
    expect(wrapperElements).toBeGreaterThan(0)
  })

  test('should handle navigation between pages without hydration errors', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // Navigate through multiple pages
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await page.goto('/register')
    await page.waitForLoadState('networkidle')

    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Check for any hydration errors during navigation
    const navigationErrors = consoleErrors.filter(error => 
      error.includes('Hydration failed') || 
      error.includes('hydration mismatch') ||
      error.includes('server rendered HTML didn\'t match')
    )

    expect(navigationErrors).toHaveLength(0)
  })
})