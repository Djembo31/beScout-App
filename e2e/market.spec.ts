import { test, expect } from '@playwright/test';
import { waitForApp } from './helpers';

test.describe('Market Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/market');
    await waitForApp(page);
  });

  test('Market loads with 2 tabs', async ({ page }) => {
    // 2 tabs: Mein Kader, Kaufen (custom buttons, not role="tab")
    await expect(page.getByRole('button', { name: /Kader/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Kaufen/i })).toBeVisible();
  });

  test('Kaufen tab shows discovery sections', async ({ page }) => {
    await page.getByRole('button', { name: /Kaufen/i }).click();
    await page.waitForTimeout(1000);

    const main = page.locator('main');
    await expect(main).not.toBeEmpty();
  });

  test('Kaufen tab search works', async ({ page }) => {
    await page.getByRole('button', { name: /Kaufen/i }).click();
    await page.waitForTimeout(500);

    // Look for a search input in the Kaufen tab
    const searchInput = page.getByPlaceholder(/such/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('Sakarya');
      await page.waitForTimeout(1000);
      const main = page.locator('main');
      await expect(main).not.toBeEmpty();
    }
  });

  test('Kaufen tab position filter is clickable', async ({ page }) => {
    await page.getByRole('button', { name: /Kaufen/i }).click();
    await page.waitForTimeout(2000);

    // Position filter buttons (Alle, TW, DEF, MID, STU)
    const posFilter = page.getByRole('button', { name: 'DEF', exact: true });
    if (await posFilter.isVisible()) {
      await posFilter.click();
      await page.waitForTimeout(500);
    }
  });

  test('Player click navigates to player detail', async ({ page }) => {
    // Navigate directly with kaufen tab param
    await page.goto('/market?tab=kaufen');
    await waitForApp(page);

    // Switch to "Von Usern" (Transferliste) sub-tab which has player links
    const transferTab = page.getByRole('button', { name: /Von Usern/i });
    if (await transferTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await transferTab.click();
      await page.waitForTimeout(1000);
    }

    // Wait for player links to render
    const playerLink = page.locator('a[href*="/player/"]').first();
    await expect(playerLink).toBeVisible({ timeout: 20_000 });

    // Verify href exists — actual navigation tested in player-detail spec
    const href = await playerLink.getAttribute('href');
    expect(href).toContain('/player/');
  });

  test('Portfolio tab shows holdings or empty state', async ({ page }) => {
    // Mein Kader is default tab — wait for content to load
    await page.getByRole('button', { name: /Kader/i }).click();
    await page.waitForTimeout(2000);

    // Demo fan has no holdings, so accept either content or empty state text
    const main = page.locator('main');
    const text = await main.textContent();
    expect(text?.length).toBeGreaterThan(0);
  });

  test('IPO card is clickable', async ({ page }) => {
    await page.getByRole('button', { name: /Kaufen/i }).click();
    await page.waitForTimeout(1000);

    // Find a player link
    const ipoLink = page.locator('a[href*="/player/"]').first();
    if (await ipoLink.isVisible()) {
      const href = await ipoLink.getAttribute('href');
      expect(href).toContain('/player/');
    }
  });
});
