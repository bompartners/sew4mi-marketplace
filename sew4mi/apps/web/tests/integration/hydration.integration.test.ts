/**
 * Integration test to verify hydration issues are resolved
 * This test ensures that the ClientOnly component prevents hydration mismatches
 */

import { test, expect } from '@playwright/test'

test.describe('Hydration Integration Tests', () => {
  test('should not have hydration errors on auth pages', async ({ page }) => {
    // Capture console errors to detect hydration mismatches
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // Navigate to an auth page that uses ClientOnly
    await page.goto('/login')

    // Wait for the page to be fully loaded and hydrated
    await page.waitForLoadState('networkidle')
    
    // Check that no hydration errors occurred
    const hydrationErrors = consoleErrors.filter(error => 
      error.includes('Hydration failed') || 
      error.includes('hydration mismatch') ||
      error.includes('server rendered HTML didn\'t match')
    )

    expect(hydrationErrors).toHaveLength(0)

    // Verify the page content loaded correctly
    await expect(page.locator('h1')).toBeVisible()
  })

  test('should handle auth layout transitions without hydration errors', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // Test navigation between auth pages
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Navigate to registration page
    await page.click('a[href="/register"]')
    await page.waitForLoadState('networkidle')

    // Check for any hydration errors during navigation
    const hydrationErrors = consoleErrors.filter(error => 
      error.includes('Hydration failed') || 
      error.includes('hydration mismatch') ||
      error.includes('server rendered HTML didn\'t match')
    )

    expect(hydrationErrors).toHaveLength(0)
  })
})