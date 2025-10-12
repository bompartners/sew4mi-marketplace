import { test, expect } from '@playwright/test';

test('app is running and responds', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Check if page is accessible
  expect(page.url()).toContain('localhost:3000');

  // Check for any content
  const body = await page.locator('body');
  await expect(body).toBeVisible();

  console.log('✅ App is running successfully!');
});
