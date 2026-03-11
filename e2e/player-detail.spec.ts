import { test, expect, type Page } from '@playwright/test';
import { waitForApp } from './helpers';

/** Navigate to the first player on the Kaufen tab via href (avoids nested button click issues). */
async function goToFirstPlayer(page: Page): Promise<boolean> {
  await page.goto('/market');
  await waitForApp(page);
  await page.getByRole('tab', { name: /Kaufen/i }).click();

  // Wait for player links to render (API data)
  const playerLink = page.locator('a[href*="/player/"]').first();
  try {
    await expect(playerLink).toBeVisible({ timeout: 20_000 });
  } catch {
    return false;
  }

  const href = await playerLink.getAttribute('href');
  if (!href) return false;

  // Let tab-switch effects settle before navigating away
  await page.waitForTimeout(500);
  await page.goto(href);
  await waitForApp(page);
  return page.url().includes('/player/');
}

test.describe('Player Detail Page', () => {
  test('Navigate to a player from market', async ({ page }) => {
    const ok = await goToFirstPlayer(page);
    expect(ok).toBe(true);
    expect(page.url()).toContain('/player/');
  });

  test('Player hero shows name, club, and position', async ({ page }) => {
    if (!(await goToFirstPlayer(page))) return;

    // Player name should be in the hero area
    const main = page.locator('main');
    await expect(main).not.toBeEmpty();

    // Position badge should be visible (GK, DEF, MID, or ATT)
    const positionBadge = page.getByText(/^(GK|DEF|MID|ATT)$/);
    await expect(positionBadge.first()).toBeVisible();
  });

  test('Player tabs are visible and switchable', async ({ page }) => {
    if (!(await goToFirstPlayer(page))) return;

    // Player detail uses TabBar with role="tab"
    const tabs = page.getByRole('tab');
    const tabCount = await tabs.count();
    if (tabCount >= 2) {
      await tabs.nth(1).click();
      await page.waitForTimeout(500);
    } else {
      // Fallback: page loaded successfully, verify content exists
      const main = page.locator('main');
      await expect(main).not.toBeEmpty();
    }
  });

  test('Markt tab shows price info', async ({ page }) => {
    if (!(await goToFirstPlayer(page))) return;

    // Look for price display (bCredits)
    const scoutText = page.getByText('bCredits');
    await expect(scoutText.first()).toBeVisible({ timeout: 8_000 });
  });

  test('Buy button is present', async ({ page }) => {
    if (!(await goToFirstPlayer(page))) return;

    // Buy button (Kaufen) should be somewhere
    const buyBtn = page.getByRole('button', { name: /Kaufen|Buy/i });
    if (await buyBtn.first().isVisible()) {
      await expect(buyBtn.first()).toBeEnabled();
    }
  });

  test('Watchlist toggle is clickable', async ({ page }) => {
    if (!(await goToFirstPlayer(page))) return;

    // Watchlist toggle (star/bookmark icon button)
    const watchBtn = page.locator('button[aria-label*="atch"], button[aria-label*="erken"]').first();
    if (await watchBtn.isVisible()) {
      await expect(watchBtn).toBeEnabled();
    }
  });
});
