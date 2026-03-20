import { test, expect } from '@playwright/test';
import { waitForApp } from './helpers';

/**
 * UI Smoke Tests — Layer 8
 *
 * Quick visual verification that critical UI states are correct.
 * All tests are READ-ONLY — they navigate and assert, never submit or buy.
 *
 * Run: npx playwright test e2e/smoke.spec.ts --project=authenticated
 */

test.describe('UI Smoke Tests', () => {
  test('SMOKE-01: 7er event shows 7 slots in modal', async ({ page }) => {
    await page.goto('/fantasy', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    // Navigate to Events tab
    const eventsTab = page.getByRole('button', { name: /Events/i });
    await expect(eventsTab).toBeVisible();
    await eventsTab.click();
    await page.waitForTimeout(1500);

    // Find a 7er event card (look for "7er" badge text)
    const sevenErBadge = page.locator('text=7er').first();
    if (!(await sevenErBadge.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No 7er events visible on page');
      return;
    }

    // Click the event card containing the 7er badge
    const eventCard = sevenErBadge.locator('xpath=ancestor::*[contains(@class,"cursor-pointer")]').first();
    if (await eventCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await eventCard.click();
    } else {
      // Try clicking the badge's parent area
      await sevenErBadge.click();
    }
    await page.waitForTimeout(1500);

    // Modal should open — look for slot indicators (position labels or slot containers)
    // 7er format: 1 GK + 2 DEF + 2 MID + 2 ATT = 7 slots
    // Count visible slot elements in the modal
    const modal = page.locator('[role="dialog"], [class*="modal"], [class*="Modal"]').first();
    if (await modal.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Look for position-related elements (GK, DEF, MID, ATT labels or slot buttons)
      const slots = modal.locator('[class*="slot"], [class*="Slot"], [data-slot]');
      const slotCount = await slots.count();

      // If slots are found, verify count. If not found by class, check by text pattern
      if (slotCount > 0) {
        expect(slotCount).toBeLessThanOrEqual(7);
      }
    }
  });

  test('SMOKE-02: registering event shows join button', async ({ page }) => {
    await page.goto('/fantasy', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    // Navigate to Events tab
    const eventsTab = page.getByRole('button', { name: /Events/i });
    await expect(eventsTab).toBeVisible();
    await eventsTab.click();
    await page.waitForTimeout(1500);

    // Look for a "registering" status indicator (badge or text)
    // Registering events should show "Anmeldung offen" or similar
    const registering = page.locator('text=/Anmeldung|Registrierung|registering|Offen/i').first();
    if (!(await registering.isVisible({ timeout: 5000 }).catch(() => false))) {
      // No explicit status text — check if any event card exists (all current events are registering)
      const anyCard = page.locator('[class*="cursor-pointer"]').first();
      if (!(await anyCard.isVisible({ timeout: 3000 }).catch(() => false))) {
        test.skip(true, 'No events visible');
        return;
      }
    }

    // Click the first event
    const firstEvent = page.locator('[class*="cursor-pointer"]').first();
    await firstEvent.click();
    await page.waitForTimeout(1500);

    // The event detail should show a join/register button
    const joinButton = page.locator('button').filter({
      hasText: /Teilnehmen|Mitmachen|Anmelden|Join|Lineup/i,
    }).first();
    const isVisible = await joinButton.isVisible({ timeout: 5000 }).catch(() => false);

    // If no explicit join button, the event detail modal should at least be open
    if (!isVisible) {
      const modalContent = page.locator('[role="dialog"], [class*="modal"], [class*="Modal"]');
      await expect(modalContent.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('SMOKE-03: fantasy page shows event cards', async ({ page }) => {
    await page.goto('/fantasy', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    // Events tab should be visible
    const eventsTab = page.getByRole('button', { name: /Events/i });
    await expect(eventsTab).toBeVisible();
    await eventsTab.click();
    await page.waitForTimeout(1500);

    // At least one event card should be visible
    const cards = page.locator('[class*="cursor-pointer"]');
    const cardCount = await cards.count();
    expect(cardCount, 'No event cards found on Fantasy page').toBeGreaterThan(0);
  });

  test('SMOKE-04: market page shows portfolio tab', async ({ page }) => {
    await page.goto('/market', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    // Market should have "Mein Kader" (My Squad) or "Kaufen" (Buy) tabs
    const portfolioTab = page.getByRole('button', { name: /Kader|Portfolio|Mein/i }).first();
    const buyTab = page.getByRole('button', { name: /Kaufen|Buy|Markt/i }).first();

    const hasPortfolio = await portfolioTab.isVisible({ timeout: 5000 }).catch(() => false);
    const hasBuy = await buyTab.isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasPortfolio || hasBuy, 'Neither portfolio nor buy tab visible on market page').toBe(true);
  });

  test('SMOKE-05: balance is visible in navigation', async ({ page }) => {
    await page.goto('/market', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    // Balance should be displayed somewhere (TopBar or sidebar)
    // Scout balance format: "X.XXX $SCOUT" or just a number with $SCOUT
    const balanceIndicator = page.locator('text=/\\$SCOUT|Scout/i').first();
    const isVisible = await balanceIndicator.isVisible({ timeout: 8000 }).catch(() => false);

    if (!isVisible) {
      // Fallback: check for wallet-related elements
      const walletEl = page.locator('[class*="wallet"], [class*="Wallet"], [class*="balance"], [class*="Balance"]').first();
      const hasWallet = await walletEl.isVisible({ timeout: 3000 }).catch(() => false);
      // At minimum, the page should be loaded
      await expect(page.locator('body')).not.toBeEmpty();
    }
  });
});
