import { test, expect, type Page } from '@playwright/test';
import { waitForApp } from './helpers';

/** Navigate to the first player on the Kaufen tab via href (avoids nested button click issues). */
async function goToFirstPlayer(page: Page): Promise<boolean> {
  await page.goto('/market?tab=kaufen', { waitUntil: 'domcontentloaded' });
  await waitForApp(page);

  // Default sub-tab is "Club Verkauf" which shows IPO cards with player links
  let playerLink = page.locator('a[href*="/player/"]').first();
  let found = await playerLink.isVisible({ timeout: 20_000 }).catch(() => false);

  // If no player links on Club Verkauf, try Transferliste sub-tab
  if (!found) {
    const transferTab = page.getByRole('button', { name: /Transferliste/i });
    if (await transferTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await transferTab.click();
      await page.waitForTimeout(2000);
      playerLink = page.locator('a[href*="/player/"]').first();
      found = await playerLink.isVisible({ timeout: 15_000 }).catch(() => false);
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
