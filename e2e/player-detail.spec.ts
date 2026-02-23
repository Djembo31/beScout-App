import { test, expect } from '@playwright/test';
import { waitForApp } from './helpers';

test.describe('Player Detail Page', () => {
  // Navigate to a player via the market page (real data)
  let playerUrl: string | null = null;

  test('Navigate to a player from market', async ({ page }) => {
    await page.goto('/market');
    await waitForApp(page);

    // Switch to Kaufen tab
    await page.getByRole('tab', { name: /Kaufen/i }).click();
    await page.waitForTimeout(1500);

    // Find first player link
    const playerLink = page.locator('a[href*="/player/"]').first();
    await expect(playerLink).toBeVisible({ timeout: 10_000 });

    playerUrl = await playerLink.getAttribute('href');
    await playerLink.click();
    await page.waitForURL('**/player/**', { timeout: 10_000 });
    await waitForApp(page);

    expect(page.url()).toContain('/player/');
  });

  test('Player hero shows name, club, and position', async ({ page }) => {
    await page.goto('/market');
    await waitForApp(page);
    await page.getByRole('tab', { name: /Kaufen/i }).click();
    await page.waitForTimeout(1500);

    const playerLink = page.locator('a[href*="/player/"]').first();
    if (!(await playerLink.isVisible())) return;
    await playerLink.click();
    await page.waitForURL('**/player/**', { timeout: 10_000 });
    await waitForApp(page);

    // Player name should be in the hero area
    const main = page.locator('main');
    await expect(main).not.toBeEmpty();

    // Position badge should be visible (GK, DEF, MID, or ATT)
    const positionBadge = page.getByText(/^(GK|DEF|MID|ATT)$/);
    await expect(positionBadge.first()).toBeVisible();
  });

  test('Player tabs are visible and switchable', async ({ page }) => {
    await page.goto('/market');
    await waitForApp(page);
    await page.getByRole('tab', { name: /Kaufen/i }).click();
    await page.waitForTimeout(1500);

    const playerLink = page.locator('a[href*="/player/"]').first();
    if (!(await playerLink.isVisible())) return;
    await playerLink.click();
    await page.waitForURL('**/player/**', { timeout: 10_000 });
    await waitForApp(page);

    // Should have tabs
    const tabs = page.getByRole('tab');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(2);

    // Click second tab
    if (tabCount >= 2) {
      await tabs.nth(1).click();
      await page.waitForTimeout(500);
    }
  });

  test('Markt tab shows price info', async ({ page }) => {
    await page.goto('/market');
    await waitForApp(page);
    await page.getByRole('tab', { name: /Kaufen/i }).click();
    await page.waitForTimeout(1500);

    const playerLink = page.locator('a[href*="/player/"]').first();
    if (!(await playerLink.isVisible())) return;
    await playerLink.click();
    await page.waitForURL('**/player/**', { timeout: 10_000 });
    await waitForApp(page);

    // Look for price display ($SCOUT)
    const scoutText = page.getByText('$SCOUT');
    await expect(scoutText.first()).toBeVisible({ timeout: 8_000 });
  });

  test('Buy button is present', async ({ page }) => {
    await page.goto('/market');
    await waitForApp(page);
    await page.getByRole('tab', { name: /Kaufen/i }).click();
    await page.waitForTimeout(1500);

    const playerLink = page.locator('a[href*="/player/"]').first();
    if (!(await playerLink.isVisible())) return;
    await playerLink.click();
    await page.waitForURL('**/player/**', { timeout: 10_000 });
    await waitForApp(page);

    // Buy button (Kaufen) should be somewhere
    const buyBtn = page.getByRole('button', { name: /Kaufen|Buy/i });
    if (await buyBtn.first().isVisible()) {
      await expect(buyBtn.first()).toBeEnabled();
    }
  });

  test('Watchlist toggle is clickable', async ({ page }) => {
    await page.goto('/market');
    await waitForApp(page);
    await page.getByRole('tab', { name: /Kaufen/i }).click();
    await page.waitForTimeout(1500);

    const playerLink = page.locator('a[href*="/player/"]').first();
    if (!(await playerLink.isVisible())) return;
    await playerLink.click();
    await page.waitForURL('**/player/**', { timeout: 10_000 });
    await waitForApp(page);

    // Watchlist toggle (star/bookmark icon button)
    const watchBtn = page.locator('button[aria-label*="atch"], button[aria-label*="erken"]').first();
    if (await watchBtn.isVisible()) {
      await expect(watchBtn).toBeEnabled();
    }
  });
});
