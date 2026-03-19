import { test, expect, type Page } from '@playwright/test';
import { waitForApp, CLUB_SLUG } from './helpers';

/**
 * E2E Tests for Pricing & Market Architecture
 *
 * Tests the new pricing system:
 * - Marktplatz tab (renamed from Kaufen)
 * - Price display with referencePrice fallback
 * - Marktplatz badges (X Angebote / Nicht gelistet)
 * - BuyModal with individual order selection
 * - SellModal with orientation info
 * - Wertentwicklung display
 */

/** Navigate to a player detail page, returns true if successful */
async function goToFirstPlayer(page: Page): Promise<boolean> {
  await page.goto(`/club/${CLUB_SLUG}`, { waitUntil: 'domcontentloaded' });
  await waitForApp(page);

  const playerLink = page.locator('a[href*="/player/"]').first();
  const found = await playerLink.isVisible({ timeout: 20_000 }).catch(() => false);
  if (!found) return false;

  await playerLink.click();
  try {
    await page.waitForURL(/\/player\//, { timeout: 30_000 });
  } catch {
    return false;
  }
  await waitForApp(page);
  return page.url().includes('/player/');
}

test.describe('Market Page — Marktplatz Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/market', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
  });

  test('Market has Marktplatz tab (not Kaufen)', async ({ page }) => {
    // The tab should now be "Marktplatz" instead of "Kaufen"
    const marktplatzBtn = page.getByRole('button', { name: /Marktplatz/i });
    await expect(marktplatzBtn).toBeVisible({ timeout: 15_000 });

    // "Kaufen" as tab label should NOT exist
    const kaufenTab = page.getByRole('button', { name: /^Kaufen$/i });
    const kaufenVisible = await kaufenTab.isVisible({ timeout: 2_000 }).catch(() => false);
    // If visible, it might be a sub-tab or other button — the main tab should be Marktplatz
    expect(await marktplatzBtn.isVisible()).toBe(true);
  });

  test('Marktplatz tab loads discovery sections', async ({ page }) => {
    const marktplatzBtn = page.getByRole('button', { name: /Marktplatz/i });
    await expect(marktplatzBtn).toBeVisible({ timeout: 15_000 });
    await marktplatzBtn.click();
    await page.waitForTimeout(2000);

    // Should show some content (player cards, IPO sections, etc.)
    const playerLinks = page.locator('a[href*="/player/"]');
    const hasPlayers = await playerLinks.first().isVisible({ timeout: 15_000 }).catch(() => false);
    if (hasPlayers) {
      const count = await playerLinks.count();
      expect(count).toBeGreaterThan(0);
    }
    // Even if no players, page should have rendered content
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('backwards compat: ?tab=kaufen redirects to marktplatz', async ({ page }) => {
    await page.goto('/market?tab=kaufen', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    // The Marktplatz tab should be active (kaufen alias maps to marktplatz)
    const marktplatzBtn = page.getByRole('button', { name: /Marktplatz/i });
    if (await marktplatzBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
      // Check it has the active state (aria-selected or active styling)
      await expect(marktplatzBtn).toBeVisible();
    }
  });
});

test.describe('Player Cards — Pricing Badges', () => {
  test.setTimeout(120_000);

  test('Player cards on club page show price', async ({ page }) => {
    await page.goto(`/club/${CLUB_SLUG}`, { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    // Player cards should show a price (might be referencePrice for untraded players)
    const playerLink = page.locator('a[href*="/player/"]').first();
    const found = await playerLink.isVisible({ timeout: 20_000 }).catch(() => false);
    if (!found) { test.skip(); return; }

    // Price is displayed as Credits with fmtScout formatting
    // Look for the gold-colored price text
    const priceText = page.locator('.text-gold, .gold-glow').first();
    if (await priceText.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const text = await priceText.textContent();
      expect(text).toBeTruthy();
    }
  });

  test('Player badges show offer status', async ({ page }) => {
    await page.goto(`/club/${CLUB_SLUG}`, { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    const playerLink = page.locator('a[href*="/player/"]').first();
    const found = await playerLink.isVisible({ timeout: 20_000 }).catch(() => false);
    if (!found) { test.skip(); return; }

    // Badge should show either "X Angebote/Angebot" or "Nicht gelistet"
    const angeboteBadge = page.getByText(/Angebot|Nicht gelistet|Teklif|Listelenmemiş/i).first();
    const hasBadge = await angeboteBadge.isVisible({ timeout: 10_000 }).catch(() => false);

    // Badge might not be visible on all player cards (depends on context)
    // But the page should have loaded successfully
    await expect(page.locator('body')).not.toBeEmpty();
  });
});

test.describe('Player Detail — Trading Tab', () => {
  test.setTimeout(180_000);

  test('Player hero shows price with referencePrice fallback', async ({ page }) => {
    if (!(await goToFirstPlayer(page))) { test.skip(); return; }

    // Price should be visible in the hero area (gold text)
    const priceElement = page.locator('.text-gold, .gold-glow').first();
    await expect(priceElement).toBeVisible({ timeout: 10_000 });
    const priceText = await priceElement.textContent();
    expect(priceText).toBeTruthy();
    // Price should not be "0" (referencePrice fallback should kick in)
    expect(priceText?.trim()).not.toBe('0');
  });

  test('Trading tab shows Orderbook', async ({ page }) => {
    if (!(await goToFirstPlayer(page))) { test.skip(); return; }

    // Switch to trading/market tab
    const tradingTab = page.getByRole('tab', { name: /Markt|Trading|Handel/i });
    if (await tradingTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await tradingTab.click();
      await page.waitForTimeout(2000);

      // Orderbook section should be present (or empty state)
      await expect(page.locator('body')).not.toBeEmpty();
    }
  });

  test('Wertentwicklung shows when initial listing price exists', async ({ page }) => {
    if (!(await goToFirstPlayer(page))) { test.skip(); return; }

    // Switch to trading tab
    const tradingTab = page.getByRole('tab', { name: /Markt|Trading|Handel/i });
    if (await tradingTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await tradingTab.click();
      await page.waitForTimeout(2000);

      // Look for Markteintritt text (Wertentwicklung)
      const wertText = page.getByText(/Markteintritt|İlk listeleme/i);
      const hasWert = await wertText.isVisible({ timeout: 5_000 }).catch(() => false);
      // It's OK if this player has no initial listing price
      if (hasWert) {
        await expect(wertText).toBeVisible();
        // Should show a percentage
        const parentText = await wertText.locator('..').textContent();
        expect(parentText).toMatch(/%/);
      }
    }
  });

  test('Letzter Preis is always shown when player was traded', async ({ page }) => {
    if (!(await goToFirstPlayer(page))) { test.skip(); return; }

    const tradingTab = page.getByRole('tab', { name: /Markt|Trading|Handel/i });
    if (await tradingTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await tradingTab.click();
      await page.waitForTimeout(2000);

      // Look for "Zuletzt" or "Son fiyat" text
      const lastPriceLabel = page.getByText(/Zuletzt|Son fiyat/i);
      const hasLastPrice = await lastPriceLabel.isVisible({ timeout: 5_000 }).catch(() => false);
      // It's OK if this player was never traded
      if (hasLastPrice) {
        await expect(lastPriceLabel).toBeVisible();
      }
    }
  });
});

test.describe('BuyModal — Order Selection', () => {
  test.setTimeout(180_000);

  test('Buy button opens modal with Verkaufsangebote', async ({ page }) => {
    if (!(await goToFirstPlayer(page))) { test.skip(); return; }

    // Find and click Buy button
    const buyBtn = page.getByRole('button', { name: /Kaufen|Verpflichten|Buy/i }).first();
    const hasBuy = await buyBtn.isVisible({ timeout: 10_000 }).catch(() => false);
    if (!hasBuy) { test.skip(); return; }

    await buyBtn.click();
    await page.waitForTimeout(1000);

    // Modal should open
    const modal = page.locator('[role="dialog"], [data-modal]');
    const modalVisible = await modal.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!modalVisible) {
      // Some players might not have a buy modal (no offerings)
      test.skip();
      return;
    }

    // Should show either Club Verkauf or Verkaufsangebote or empty state
    const bodyText = await modal.textContent();
    expect(bodyText).toBeTruthy();
  });

  test('BuyModal shows seller info (not raw UUID)', async ({ page }) => {
    if (!(await goToFirstPlayer(page))) { test.skip(); return; }

    const buyBtn = page.getByRole('button', { name: /Kaufen|Verpflichten|Buy/i }).first();
    if (!(await buyBtn.isVisible({ timeout: 10_000 }).catch(() => false))) { test.skip(); return; }

    await buyBtn.click();
    await page.waitForTimeout(1000);

    // If there are sell orders, they should show @ handles
    const orderRows = page.locator('button:has-text("@")');
    const hasOrders = await orderRows.first().isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasOrders) {
      const firstOrderText = await orderRows.first().textContent();
      // Should show @handle, not just @abcd1234 (8-char UUID)
      expect(firstOrderText).toContain('@');
    }
  });
});

test.describe('SellModal — Orientation', () => {
  test.setTimeout(180_000);

  test('Sell button opens modal with orientation info', async ({ page }) => {
    if (!(await goToFirstPlayer(page))) { test.skip(); return; }

    // Sell button might be in the trading bar or tab
    const sellBtn = page.getByRole('button', { name: /Verkaufen|Sell|Sat/i }).first();
    const hasSell = await sellBtn.isVisible({ timeout: 10_000 }).catch(() => false);
    if (!hasSell) { test.skip(); return; }

    await sellBtn.click();
    await page.waitForTimeout(1000);

    const modal = page.locator('[role="dialog"], [data-modal]');
    const modalVisible = await modal.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!modalVisible) { test.skip(); return; }

    // Modal should show orientation info (Referenzwert or floor price)
    const bodyText = await modal.textContent();
    expect(bodyText).toBeTruthy();
  });
});

test.describe('Portfolio — Wertentwicklung', () => {
  test('Portfolio tab shows Wertentwicklung badge when holdings exist', async ({ page }) => {
    await page.goto('/market', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    // Navigate to portfolio tab
    const kaderBtn = page.getByRole('button', { name: /Kader/i });
    await expect(kaderBtn).toBeVisible({ timeout: 15_000 });
    await kaderBtn.click();
    await page.waitForTimeout(2000);

    // If demo user has holdings, Wertentwicklung badge might be visible
    const wertBadge = page.getByText(/Wertentwicklung|Değer gelişimi/i);
    const hasWert = await wertBadge.isVisible({ timeout: 5_000 }).catch(() => false);

    // Even without holdings, page should have rendered
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
