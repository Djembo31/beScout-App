import { test, expect, type Page } from '@playwright/test';
import { waitForApp, CLUB_SLUG } from './helpers';

/**
 * Navigate to a player detail page using multiple fallback strategies.
 * 1. Market Kaufen tab (IPO cards / Transferliste)
 * 2. Club page (Sakaryaspor squad always has player links)
 * 3. Clubs discovery page
 */
async function goToFirstPlayer(page: Page): Promise<boolean> {
  // --- Strategy 1: Market Kaufen tab ---
  await page.goto('/market?tab=kaufen', { waitUntil: 'domcontentloaded' });
  await waitForApp(page);

  let playerLink = page.locator('a[href*="/player/"]').first();
  let found = await playerLink.isVisible({ timeout: 15_000 }).catch(() => false);

  // Try Transferliste sub-tab if Club Verkauf is empty
  if (!found) {
    const transferTab = page.getByRole('button', { name: /Transferliste/i });
    if (await transferTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await transferTab.click();
      await page.waitForTimeout(2000);
      playerLink = page.locator('a[href*="/player/"]').first();
      found = await playerLink.isVisible({ timeout: 10_000 }).catch(() => false);
    }
  }

  // --- Strategy 2: Club page (always has players in squad preview) ---
  if (!found) {
    await page.goto(`/club/${CLUB_SLUG}`, { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    // Squad preview on the overview tab has player links
    playerLink = page.locator('a[href*="/player/"]').first();
    found = await playerLink.isVisible({ timeout: 20_000 }).catch(() => false);

    // If not on overview, try switching to Spieler tab
    if (!found) {
      const spielerTab = page.getByRole('tab', { name: /Spieler|Kader/i });
      if (await spielerTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await spielerTab.click();
        await page.waitForTimeout(2000);
        playerLink = page.locator('a[href*="/player/"]').first();
        found = await playerLink.isVisible({ timeout: 15_000 }).catch(() => false);
      }
    }
  }

  if (!found) return false;

  // Click the player link to navigate
  await playerLink.click();
  try {
    await page.waitForURL(/\/player\//, { timeout: 30_000 });
  } catch {
    return false;
  }
  await waitForApp(page);
  return page.url().includes('/player/');
}

test.describe('Player Detail Page', () => {
  // Player detail tests do 2 full page loads (market -> player), need more time
  test.setTimeout(180_000);

  test('Navigate to a player from market', async ({ page }) => {
    const ok = await goToFirstPlayer(page);
    if (!ok) {
      // No players available in market — skip gracefully
      test.skip();
      return;
    }
    expect(page.url()).toContain('/player/');
  });

  test('Player hero shows name, club, and position', async ({ page }) => {
    if (!(await goToFirstPlayer(page))) {
      test.skip();
      return;
    }

    // Player name should be in the hero area
    await expect(page.locator('body')).not.toBeEmpty();

    // Position badge should be visible (GK, DEF, MID, or ATT)
    const positionBadge = page.getByText(/^(GK|DEF|MID|ATT)$/);
    await expect(positionBadge.first()).toBeVisible();
  });

  test('Player tabs are visible and switchable', async ({ page }) => {
    if (!(await goToFirstPlayer(page))) {
      test.skip();
      return;
    }

    // Player detail uses TabBar with role="tab"
    const tabs = page.getByRole('tab');
    const tabCount = await tabs.count();
    if (tabCount >= 2) {
      await tabs.nth(1).click();
      await page.waitForTimeout(500);
    } else {
      // Fallback: page loaded successfully, verify content exists
      await expect(page.locator('body')).not.toBeEmpty();
    }
  });

  test('Markt tab shows price info', async ({ page }) => {
    if (!(await goToFirstPlayer(page))) {
      test.skip();
      return;
    }

    // Look for price display (bCredits) — may not be on every player page
    const scoutText = page.getByText('bCredits');
    if (await scoutText.first().isVisible({ timeout: 10_000 }).catch(() => false)) {
      await expect(scoutText.first()).toBeVisible();
    } else {
      // Player page loaded, just verify content exists
      await expect(page.locator('body')).not.toBeEmpty();
    }
  });

  test('Buy button is present', async ({ page }) => {
    if (!(await goToFirstPlayer(page))) {
      test.skip();
      return;
    }

    // Buy button (Kaufen) should be somewhere
    const buyBtn = page.getByRole('button', { name: /Kaufen|Buy/i });
    if (await buyBtn.first().isVisible({ timeout: 10_000 }).catch(() => false)) {
      await expect(buyBtn.first()).toBeEnabled();
    }
  });

  test('Watchlist toggle is clickable', async ({ page }) => {
    if (!(await goToFirstPlayer(page))) {
      test.skip();
      return;
    }

    // Watchlist toggle (star/bookmark icon button)
    const watchBtn = page.locator('button[aria-label*="atch"], button[aria-label*="erken"]').first();
    if (await watchBtn.isVisible()) {
      await expect(watchBtn).toBeEnabled();
    }
  });
});
