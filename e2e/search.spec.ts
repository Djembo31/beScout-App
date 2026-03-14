import { test, expect } from '@playwright/test';
import { waitForApp } from './helpers';

test.describe('Spotlight Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
  });

  test('Search opens on click', async ({ page }) => {
    // Click search button in TopBar — wait longer for it to appear
    const searchBtn = page.locator('[data-tour-id="topbar-search"]');
    await expect(searchBtn).toBeVisible({ timeout: 30_000 });
    await searchBtn.click();
    await page.waitForTimeout(500);

    // Search overlay / input should appear
    const searchInput = page.getByPlaceholder(/such|search/i);
    await expect(searchInput).toBeVisible();
  });

  test('Search for player name shows results', async ({ page }) => {
    const searchBtn = page.locator('[data-tour-id="topbar-search"]');
    await expect(searchBtn).toBeVisible({ timeout: 30_000 });
    await searchBtn.click();
    await page.waitForTimeout(500);

    const searchInput = page.getByPlaceholder(/such|search/i);
    await searchInput.fill('Sakarya');

    // Search results are button[role="option"] (not <a> links)
    const results = page.locator('[role="option"]');
    await expect(results.first()).toBeVisible({ timeout: 15_000 });
  });

  test('Click on search result navigates to player or club', async ({ page }) => {
    const searchBtn = page.locator('[data-tour-id="topbar-search"]');
    await expect(searchBtn).toBeVisible({ timeout: 30_000 });
    await searchBtn.click();
    await page.waitForTimeout(500);

    const searchInput = page.getByPlaceholder(/such|search/i);
    await searchInput.fill('Sakarya');

    // Wait for search results (role="option" buttons)
    const resultBtn = page.locator('[role="option"]').first();
    await expect(resultBtn).toBeVisible({ timeout: 15_000 });

    await resultBtn.click();
    await page.waitForURL(/\/(player|club|profile)\//, { timeout: 30_000 });
    expect(page.url()).toMatch(/\/(player|club|profile)\//);
  });
});
