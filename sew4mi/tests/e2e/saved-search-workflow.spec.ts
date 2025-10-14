import { test, expect, Page } from '@playwright/test';

test.describe('Saved Search Workflow', () => {
  let page: Page;

  // Helper function to login
  async function loginAsCustomer(page: Page) {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'customer@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  }

  // Helper function to apply search filters
  async function applySearchFilters(page: Page, filters: {
    query?: string;
    city?: string;
    occasions?: string[];
    styleCategories?: string[];
    fabricPreferences?: string[];
    deliveryTimeframeMin?: string;
    deliveryTimeframeMax?: string;
  }) {
    if (filters.query) {
      await page.fill('input[placeholder*="Search by tailor name"]', filters.query);
    }

    // Open filters panel if not visible
    const filtersButton = page.locator('button:has-text("Filters")');
    if (await filtersButton.isVisible()) {
      await filtersButton.click();
    }

    if (filters.city) {
      await page.click('button:has-text("Location")');
      await page.selectOption('select[aria-label*="City"]', filters.city);
    }

    if (filters.occasions && filters.occasions.length > 0) {
      await page.click('button:has-text("Occasions")');
      for (const occasion of filters.occasions) {
        await page.check(`input[type="checkbox"][value="${occasion}"]`);
      }
    }

    if (filters.styleCategories && filters.styleCategories.length > 0) {
      await page.click('button:has-text("Style")');
      for (const style of filters.styleCategories) {
        await page.check(`input[type="checkbox"][value="${style}"]`);
      }
    }

    if (filters.fabricPreferences && filters.fabricPreferences.length > 0) {
      await page.click('button:has-text("Fabrics")');
      for (const fabric of filters.fabricPreferences) {
        await page.check(`input[type="checkbox"][value="${fabric}"]`);
      }
    }

    if (filters.deliveryTimeframeMin) {
      await page.click('button:has-text("Delivery Time")');
      await page.selectOption('select[aria-label*="Minimum Days"]', filters.deliveryTimeframeMin);
    }

    if (filters.deliveryTimeframeMax) {
      await page.click('button:has-text("Delivery Time")');
      await page.selectOption('select[aria-label*="Maximum Days"]', filters.deliveryTimeframeMax);
    }

    // Trigger search
    await page.press('input[placeholder*="Search by tailor name"]', 'Enter');
    await page.waitForLoadState('networkidle');
  }

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Search and Save Workflow', () => {
    test('should save a search with filters and alerts', async () => {
      await loginAsCustomer(page);

      // Navigate to tailors search page
      await page.goto('/tailors');

      // Apply search filters
      await applySearchFilters(page, {
        query: 'wedding',
        city: 'Accra',
        occasions: ['Wedding', 'Engagement'],
        styleCategories: ['traditional'],
        fabricPreferences: ['Kente', 'Ankara'],
        deliveryTimeframeMin: '7',
        deliveryTimeframeMax: '14',
      });

      // Wait for results to load
      await expect(page.locator('text=/Tailors Found/')).toBeVisible();

      // Click Save Search button
      const saveSearchButton = page.locator('button:has-text("Save Search")');
      await expect(saveSearchButton).toBeVisible();
      await saveSearchButton.click();

      // Fill in save search dialog
      await expect(page.locator('text="Save Search"')).toBeVisible();

      // Enter search name
      await page.fill('input[aria-label*="Search Name"]', 'Wedding Tailors in Accra');

      // Verify alerts are enabled by default
      const alertCheckbox = page.locator('input[type="checkbox"]').first();
      await expect(alertCheckbox).toBeChecked();

      // Select alert frequency
      await page.click('button[role="combobox"]');
      await page.click('text="Daily (8:00 AM)"');

      // Save the search
      await page.click('button:has-text("Save Search"):not(:has-text("Cancel"))');

      // Wait for success message
      await expect(page.locator('text=/Search saved successfully/')).toBeVisible();

      // Verify the dialog closed
      await expect(page.locator('text="Save Search"')).not.toBeVisible();
    });

    test('should save a search without alerts', async () => {
      await loginAsCustomer(page);
      await page.goto('/tailors');

      // Apply minimal filters
      await applySearchFilters(page, {
        query: 'tailor',
      });

      // Save search
      await page.click('button:has-text("Save Search")');

      // Enter search name
      await page.fill('input[aria-label*="Search Name"]', 'General Tailors');

      // Disable alerts
      const alertCheckbox = page.locator('input[type="checkbox"]').first();
      await alertCheckbox.uncheck();

      // Verify frequency selector is hidden
      await expect(page.locator('text="Alert Frequency"')).not.toBeVisible();

      // Save
      await page.click('button:has-text("Save Search"):not(:has-text("Cancel"))');
      await expect(page.locator('text=/Search saved successfully/')).toBeVisible();
    });

    test('should show validation error when name is empty', async () => {
      await loginAsCustomer(page);
      await page.goto('/tailors');

      await applySearchFilters(page, { query: 'test' });
      await page.click('button:has-text("Save Search")');

      // Try to save without entering name
      const saveButton = page.locator('button:has-text("Save Search"):not(:has-text("Cancel"))');
      await expect(saveButton).toBeDisabled();

      // Enter name and verify button enables
      await page.fill('input[aria-label*="Search Name"]', 'Test Search');
      await expect(saveButton).not.toBeDisabled();
    });
  });

  test.describe('Saved Searches Management', () => {
    test('should display and manage saved searches', async () => {
      await loginAsCustomer(page);

      // Navigate to saved searches page
      await page.goto('/saved-searches');

      // Verify page title
      await expect(page.locator('h1:has-text("Saved Searches")')).toBeVisible();

      // Check for existing saved searches or empty state
      const emptyState = page.locator('text="No Saved Searches"');
      const savedSearchesList = page.locator('[data-testid="saved-searches-list"]');

      if (await emptyState.isVisible()) {
        // Verify empty state message
        await expect(emptyState).toBeVisible();
        await expect(page.locator('text=/Save your search criteria/')).toBeVisible();
      } else {
        // Verify saved searches are displayed
        await expect(savedSearchesList).toBeVisible();
      }

      // Click "Search Tailors" button
      await page.click('button:has-text("Search Tailors")');
      await expect(page).toHaveURL(/\/tailors/);
    });

    test('should edit saved search alert settings', async () => {
      await loginAsCustomer(page);

      // First create a saved search
      await page.goto('/tailors');
      await applySearchFilters(page, { query: 'edit test' });
      await page.click('button:has-text("Save Search")');
      await page.fill('input[aria-label*="Search Name"]', 'Test Edit Search');
      await page.click('button:has-text("Save Search"):not(:has-text("Cancel"))');

      // Navigate to saved searches
      await page.goto('/saved-searches');

      // Find the created search and click edit
      const searchCard = page.locator('text="Test Edit Search"').locator('..');
      await searchCard.locator('button[title="Edit alert settings"]').click();

      // Edit dialog should open
      await expect(page.locator('text="Edit Search Alert"')).toBeVisible();

      // Change the name
      const nameInput = page.locator('input[id="name"]');
      await nameInput.clear();
      await nameInput.fill('Updated Search Name');

      // Toggle alerts off
      await page.locator('input[type="checkbox"]').uncheck();

      // Save changes
      await page.click('button:has-text("Save Changes")');

      // Verify dialog closes
      await expect(page.locator('text="Edit Search Alert"')).not.toBeVisible();

      // Verify the name was updated
      await expect(page.locator('text="Updated Search Name"')).toBeVisible();
    });

    test('should delete a saved search', async () => {
      await loginAsCustomer(page);

      // First create a saved search
      await page.goto('/tailors');
      await applySearchFilters(page, { query: 'delete test' });
      await page.click('button:has-text("Save Search")');
      await page.fill('input[aria-label*="Search Name"]', 'Test Delete Search');
      await page.click('button:has-text("Save Search"):not(:has-text("Cancel"))');

      // Navigate to saved searches
      await page.goto('/saved-searches');

      // Find the created search and click delete
      const searchCard = page.locator('text="Test Delete Search"').locator('..');
      await searchCard.locator('button[title="Delete search"]').click();

      // Confirmation dialog should appear
      await expect(page.locator('text="Delete Saved Search?"')).toBeVisible();
      await expect(page.locator('text=/This will permanently delete/')).toBeVisible();

      // Confirm deletion
      await page.click('button:has-text("Delete"):not(:has-text("Cancel"))');

      // Verify the search is removed
      await expect(page.locator('text="Test Delete Search"')).not.toBeVisible();
    });

    test('should check for new matches', async () => {
      await loginAsCustomer(page);

      // Navigate to saved searches with existing searches
      await page.goto('/saved-searches');

      // If there are saved searches, try to check matches
      const checkButton = page.locator('button[title="Check for new matches"]').first();
      if (await checkButton.isVisible()) {
        await checkButton.click();

        // Wait for check to complete
        await page.waitForLoadState('networkidle');

        // Should show result message
        const alertDialog = page.locator('[role="alert"]');
        await expect(alertDialog.locator('text=/Found \d+ new matching tailors|No new matches found/')).toBeVisible();
      }
    });

    test('should load saved search filters', async () => {
      await loginAsCustomer(page);

      // First create a saved search with specific filters
      await page.goto('/tailors');
      await applySearchFilters(page, {
        query: 'load test',
        city: 'Kumasi',
        occasions: ['Wedding'],
      });
      await page.click('button:has-text("Save Search")');
      await page.fill('input[aria-label*="Search Name"]', 'Test Load Search');
      await page.click('button:has-text("Save Search"):not(:has-text("Cancel"))');

      // Navigate to saved searches
      await page.goto('/saved-searches');

      // Find the created search and click load
      const searchCard = page.locator('text="Test Load Search"').locator('..');
      await searchCard.locator('button[title="Load search"]').click();

      // Should navigate to tailors page with filters applied
      await expect(page).toHaveURL(/\/tailors/);

      // Verify filters are applied
      await expect(page.locator('input[placeholder*="Search by tailor name"]')).toHaveValue('load test');

      // Verify filter badges are shown
      await expect(page.locator('text="Kumasi"')).toBeVisible();
      await expect(page.locator('text="Wedding"')).toBeVisible();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should work on mobile viewport', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await loginAsCustomer(page);
      await page.goto('/tailors');

      // Apply filters on mobile
      await page.click('button:has-text("Filters")');

      // Filters should open as bottom sheet or modal on mobile
      await expect(page.locator('text="Filters"').first()).toBeVisible();

      // Apply some filters
      await page.click('button:has-text("Occasions")');
      await page.check('input[type="checkbox"][value="Wedding"]');

      // Search
      await page.fill('input[placeholder*="Search by tailor name"]', 'mobile test');
      await page.press('input[placeholder*="Search by tailor name"]', 'Enter');

      // Save search should work on mobile
      await page.click('button:has-text("Save Search")');

      // Dialog should be responsive
      await expect(page.locator('text="Save Search"')).toBeVisible();
      await page.fill('input[aria-label*="Search Name"]', 'Mobile Test Search');
      await page.click('button:has-text("Save Search"):not(:has-text("Cancel"))');

      // Navigate to saved searches on mobile
      await page.goto('/saved-searches');
      await expect(page.locator('h1:has-text("Saved Searches")')).toBeVisible();

      // Cards should be responsive
      const searchCards = page.locator('[data-testid="saved-search-card"]');
      if (await searchCards.count() > 0) {
        const firstCard = searchCards.first();
        const cardWidth = await firstCard.boundingBox();
        expect(cardWidth?.width).toBeLessThanOrEqual(375);
      }
    });

    test('should handle touch interactions on mobile', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await loginAsCustomer(page);
      await page.goto('/tailors');

      // Tap filters button
      await page.tap('button:has-text("Filters")');

      // Swipe/scroll through filter options
      const filtersPanel = page.locator('[data-testid="filters-panel"]');
      if (await filtersPanel.isVisible()) {
        await filtersPanel.evaluate(el => el.scrollTop = 100);
      }

      // Tap to select filters
      await page.tap('button:has-text("Occasions")');
      await page.tap('input[type="checkbox"][value="Funeral"]');

      // Tap save search
      await page.tap('button:has-text("Save Search")');
      await page.fill('input[aria-label*="Search Name"]', 'Touch Test');
      await page.tap('button:has-text("Save Search"):not(:has-text("Cancel"))');
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels and roles', async () => {
      await loginAsCustomer(page);
      await page.goto('/tailors');

      // Check search input accessibility
      const searchInput = page.locator('input[placeholder*="Search by tailor name"]');
      await expect(searchInput).toHaveAttribute('aria-label', /search/i);

      // Check filter panel accessibility
      await page.click('button:has-text("Filters")');
      const filterPanel = page.locator('[role="region"][aria-label*="filter"]');
      if (await filterPanel.isVisible()) {
        await expect(filterPanel).toHaveAttribute('aria-label', /filter/i);
      }

      // Check save search dialog accessibility
      await page.fill('input[placeholder*="Search by tailor name"]', 'test');
      await page.press('input[placeholder*="Search by tailor name"]', 'Enter');
      await page.click('button:has-text("Save Search")');

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveAttribute('aria-label', /save search/i);

      // Check form inputs have labels
      const nameInput = page.locator('input[aria-label*="Search Name"]');
      await expect(nameInput).toHaveAttribute('aria-required', 'true');
    });

    test('should be keyboard navigable', async () => {
      await loginAsCustomer(page);
      await page.goto('/tailors');

      // Tab to search input
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.type('keyboard test');
      await page.keyboard.press('Enter');

      // Tab to Save Search button
      let focusedElement = await page.evaluate(() => document.activeElement?.textContent);
      while (focusedElement !== 'Save Search') {
        await page.keyboard.press('Tab');
        focusedElement = await page.evaluate(() => document.activeElement?.textContent);
        if (!focusedElement) break;
      }
      await page.keyboard.press('Enter');

      // Navigate dialog with keyboard
      await page.keyboard.type('Keyboard Test Search');
      await page.keyboard.press('Tab'); // Move to checkbox
      await page.keyboard.press('Space'); // Toggle checkbox
      await page.keyboard.press('Tab'); // Move to frequency selector
      await page.keyboard.press('Enter'); // Open dropdown
      await page.keyboard.press('ArrowDown'); // Select option
      await page.keyboard.press('Enter'); // Confirm selection

      // Tab to Save button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
    });
  });
});