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

    // Wait for search results to appear (API call + render)
    const results = page.locator('a[href*="/player/"], a[href*="/club/"]');
    await expect(results.first()).toBeVisible({ timeout: 10_000 });
  });

  test('Click on search result navigates to player', async ({ page }) => {
    const searchBtn = page.locator('[data-tour-id="topbar-search"]');
    await searchBtn.click();
    await page.waitForTimeout(500);

    const searchInput = page.getByPlaceholder(/such|search/i);
    await searchInput.fill('Sakarya');

    // Wait for search results to appear
    const resultLink = page.locator('a[href*="/player/"], a[href*="/club/"]').first();
    await expect(resultLink).toBeVisible({ timeout: 10_000 });

    await resultLink.click();
    await page.waitForURL(/\/(player|club)\//, { timeout: 10_000 });
    expect(page.url()).toMatch(/\/(player|club)\//);
  });
});
