import { test, expect } from '@playwright/test';
import { waitForApp } from './helpers';

test.describe('Spotlight Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
  });

  test('Search opens on click', async ({ page }) => {
    // Click search button in TopBar
    const searchBtn = page.locator('[data-tour-id="topbar-search"]');
    await expect(searchBtn).toBeVisible();
    await searchBtn.click();
    await page.waitForTimeout(500);

    // Search overlay / input should appear
    const searchInput = page.getByPlaceholder(/such|search/i);
    await expect(searchInput).toBeVisible();
  });

  test('Search for player name shows results', async ({ page }) => {
    const searchBtn = page.locator('[data-tour-id="topbar-search"]');
    await searchBtn.click();
    await page.waitForTimeout(500);

    const searchInput = page.getByPlaceholder(/such|search/i);
    await searchInput.fill('Sakarya');
    await page.waitForTimeout(1500);

    // Results should appear
    const results = page.locator('a[href*="/player/"], a[href*="/club/"]');
    const resultCount = await results.count();
    expect(resultCount).toBeGreaterThan(0);
  });

  test('Click on search result navigates to player', async ({ page }) => {
    const searchBtn = page.locator('[data-tour-id="topbar-search"]');
    await searchBtn.click();
    await page.waitForTimeout(500);

    const searchInput = page.getByPlaceholder(/such|search/i);
    await searchInput.fill('Sakarya');
    await page.waitForTimeout(1500);

    // Click first result link
    const resultLink = page.locator('a[href*="/player/"], a[href*="/club/"]').first();
    if (await resultLink.isVisible()) {
      await resultLink.click();
      await page.waitForTimeout(1000);

      // Should navigate away from home
      const url = page.url();
      expect(url).toMatch(/\/(player|club)\//);
    }
  });
});
