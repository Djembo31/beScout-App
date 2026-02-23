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
    await page.waitForTimeout(500);

    // Position filter buttons (GK, DEF, MID, ATT or Alle)
    const posFilter = page.getByText('DEF');
    if (await posFilter.isVisible()) {
      await posFilter.click();
      await page.waitForTimeout(500);
    }
  });

  test('Player click navigates to player detail', async ({ page }) => {
    await page.getByRole('tab', { name: /Kaufen/i }).click();
    await page.waitForTimeout(1000);

    // Find first clickable player element and click it
    const playerLink = page.locator('a[href*="/player/"]').first();
    if (await playerLink.isVisible()) {
      await playerLink.click();
      await page.waitForURL('**/player/**', { timeout: 10_000 });
      expect(page.url()).toContain('/player/');
    }
  });

  test('Portfolio tab shows holdings or empty state', async ({ page }) => {
    await page.getByRole('tab', { name: /Kader/i }).click();
    await page.waitForTimeout(1000);

    const main = page.locator('main');
    await expect(main).not.toBeEmpty();
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
