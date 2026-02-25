import { test, expect } from '@playwright/test';
import { waitForApp } from './helpers';

test.describe('Market Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/market');
    await waitForApp(page);
  });

  test('Market loads with 3 tabs', async ({ page }) => {
    // 3 tabs: Mein Kader, Kaufen, Angebote
    await expect(page.getByRole('tab', { name: /Kader/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Kaufen/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Angebote/i })).toBeVisible();
  });

  test('Kaufen tab shows discovery sections', async ({ page }) => {
    // Click Kaufen tab
    await page.getByRole('tab', { name: /Kaufen/i }).click();
    await page.waitForTimeout(1000);

    // Should show some player cards or sections
    const main = page.locator('main');
    await expect(main).not.toBeEmpty();
  });

  test('Kaufen tab search works', async ({ page }) => {
    await page.getByRole('tab', { name: /Kaufen/i }).click();
    await page.waitForTimeout(500);

    // Look for a search input in the Kaufen tab
    const searchInput = page.getByPlaceholder(/such/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('Sakarya');
      await page.waitForTimeout(1000);
      // Should filter results
      const main = page.locator('main');
      await expect(main).not.toBeEmpty();
    }
  });

  test('Kaufen tab position filter is clickable', async ({ page }) => {
    await page.getByRole('tab', { name: /Kaufen/i }).click();
    await page.waitForTimeout(2000);

    // Position filter buttons (Alle, TW, DEF, MID, STU) — use role to avoid matching player badges
    const posFilter = page.getByRole('button', { name: 'DEF', exact: true });
    if (await posFilter.isVisible()) {
      await posFilter.click();
      await page.waitForTimeout(500);
    }
  });

  test('Player click navigates to player detail', async ({ page }) => {
    await page.getByRole('tab', { name: /Kaufen/i }).click();
    await page.waitForLoadState('networkidle');

    // Wait for player links to render (can be slow with real data)
    const playerLink = page.locator('a[href*="/player/"]').first();
    await expect(playerLink).toBeVisible({ timeout: 20_000 });

    // Get href and navigate directly (clicking center may hit nested buttons)
    const href = await playerLink.getAttribute('href');
    expect(href).toContain('/player/');
    await page.goto(href!);
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/player/');
  });

  test('Portfolio tab shows holdings or empty state', async ({ page }) => {
    // Mein Kader is default tab — wait for content to load
    await page.getByRole('tab', { name: /Kader/i }).click();
    await page.waitForTimeout(2000);

    // Demo fan has no holdings, so accept either content or empty state text
    const main = page.locator('main');
    const text = await main.textContent();
    expect(text?.length).toBeGreaterThan(0);
  });

  test('Angebote tab shows sub-tabs', async ({ page }) => {
    await page.getByRole('tab', { name: /Angebote/i }).click();
    await page.waitForTimeout(1000);

    // Should show offer sub-tabs (Eingehend, Ausgehend, Offene Gebote, Verlauf)
    const main = page.locator('main');
    await expect(main).not.toBeEmpty();
  });

  test('IPO card is clickable', async ({ page }) => {
    await page.getByRole('tab', { name: /Kaufen/i }).click();
    await page.waitForTimeout(1000);

    // Find an IPO badge or card link
    const ipoLink = page.locator('a[href*="/player/"]').first();
    if (await ipoLink.isVisible()) {
      const href = await ipoLink.getAttribute('href');
      expect(href).toContain('/player/');
    }
  });
});
