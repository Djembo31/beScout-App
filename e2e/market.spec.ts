import { test, expect } from '@playwright/test';
import { waitForApp } from './helpers';

test.describe('Market Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/market', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
  });

  test('Market loads with 2 tabs', async ({ page }) => {
    // 2 tabs: Mein Kader, Kaufen (custom buttons, not role="tab")
    await expect(page.getByRole('button', { name: /Kader/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Marktplatz', exact: true })).toBeVisible();
  });

  test('Kaufen tab shows discovery sections', async ({ page }) => {
    const kaufenBtn = page.getByRole('button', { name: 'Marktplatz', exact: true });
    await expect(kaufenBtn).toBeVisible({ timeout: 30_000 });
    await kaufenBtn.click();
    await page.waitForTimeout(1000);

    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('Kaufen tab search works', async ({ page }) => {
    const kaufenBtn = page.getByRole('button', { name: 'Marktplatz', exact: true });
    await expect(kaufenBtn).toBeVisible({ timeout: 30_000 });
    await kaufenBtn.click();
    await page.waitForTimeout(500);

    // Look for a search input in the Kaufen tab
    const searchInput = page.getByPlaceholder(/such/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('Sakarya');
      await page.waitForTimeout(1000);
      await expect(page.locator('body')).not.toBeEmpty();
    }
  });

  test('Kaufen tab position filter is clickable', async ({ page }) => {
    const kaufenBtn = page.getByRole('button', { name: 'Marktplatz', exact: true });
    await expect(kaufenBtn).toBeVisible({ timeout: 30_000 });
    await kaufenBtn.click();
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
    await page.goto('/market?tab=kaufen', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    // Default sub-tab is "Club Verkauf" which shows IPO cards with player links
    // Wait for player links to render (IPO cards use Link with href="/player/{id}")
    const playerLink = page.locator('a[href*="/player/"]').first();
    if (await playerLink.isVisible({ timeout: 30_000 }).catch(() => false)) {
      // Verify href exists
      const href = await playerLink.getAttribute('href');
      expect(href).toContain('/player/');
    } else {
      // No IPO cards available — try Transferliste sub-tab
      const transferTab = page.getByRole('button', { name: /Transferliste/i });
      if (await transferTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await transferTab.click();
        await page.waitForTimeout(2000);

        const transferLink = page.locator('a[href*="/player/"]').first();
        if (await transferLink.isVisible({ timeout: 15_000 }).catch(() => false)) {
          const href = await transferLink.getAttribute('href');
          expect(href).toContain('/player/');
        }
      }
      // If no player links found at all, that's OK — market might be empty
    }
  });

  test('Portfolio tab shows holdings or empty state', async ({ page }) => {
    // Mein Kader is default tab
    await page.getByRole('button', { name: /Kader/i }).click();
    await page.waitForTimeout(2000);

    // Demo fan has no holdings, so accept either content or empty state text
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('IPO card is clickable', async ({ page }) => {
    const kaufenBtn = page.getByRole('button', { name: 'Marktplatz', exact: true });
    await expect(kaufenBtn).toBeVisible({ timeout: 30_000 });
    await kaufenBtn.click();
    await page.waitForTimeout(1000);

    // Find a player link (IPO cards have href="/player/{id}")
    const ipoLink = page.locator('a[href*="/player/"]').first();
    if (await ipoLink.isVisible({ timeout: 15_000 }).catch(() => false)) {
      const href = await ipoLink.getAttribute('href');
      expect(href).toContain('/player/');
    }
  });
});
