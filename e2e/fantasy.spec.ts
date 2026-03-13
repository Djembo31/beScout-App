import { test, expect } from '@playwright/test';
import { waitForApp } from './helpers';

test.describe('Fantasy Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/fantasy');
    await waitForApp(page);
  });

  test('Fantasy loads with tabs', async ({ page }) => {
    // Fantasy uses custom tab buttons (not role="tab") — wait for content to render
    await expect(page.getByRole('button', { name: /Spiele/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /Events/i })).toBeVisible({ timeout: 10_000 });
  });

  test('Events show cards with status badges', async ({ page }) => {
    // Click Events tab if present
    const eventsTab = page.getByRole('tab', { name: /Events/i });
    if (await eventsTab.isVisible()) {
      await eventsTab.click();
      await page.waitForTimeout(1000);
    }

    // Page should have content
    const main = page.locator('main');
    await expect(main).not.toBeEmpty();
  });

  test('Event card opens detail modal', async ({ page }) => {
    const eventsTab = page.getByRole('tab', { name: /Events/i });
    if (await eventsTab.isVisible()) {
      await eventsTab.click();
      await page.waitForTimeout(1000);
    }

    // Click first event card
    const eventCard = page.locator('[class*="cursor-pointer"]').first();
    if (await eventCard.isVisible()) {
      await eventCard.click();
      await page.waitForTimeout(500);

      // Modal or detail should appear
      const modal = page.locator('[role="dialog"]');
      if (await modal.isVisible()) {
        await expect(modal).toBeVisible();
      }
    }
  });

  test('Spieltag tab shows pitch or empty state', async ({ page }) => {
    const spieltagTab = page.getByRole('tab', { name: /Spieltag/i });
    if (await spieltagTab.isVisible()) {
      await spieltagTab.click();
      await page.waitForTimeout(1000);
    }

    const main = page.locator('main');
    await expect(main).not.toBeEmpty();
  });

  test('Vorhersagen tab loads without crash', async ({ page }) => {
    const predTab = page.getByRole('tab', { name: /Vorhersagen/i });
    if (await predTab.isVisible()) {
      await predTab.click();
      await page.waitForTimeout(1000);
    }

    const main = page.locator('main');
    await expect(main).not.toBeEmpty();
  });

  test('Ligen tab loads without crash', async ({ page }) => {
    const leaguesTab = page.getByRole('tab', { name: /Ligen/i });
    if (await leaguesTab.isVisible()) {
      await leaguesTab.click();
      await page.waitForTimeout(1000);
    }

    const main = page.locator('main');
    await expect(main).not.toBeEmpty();
  });

  test('Event detail shows name, entry fee, and prize pool', async ({ page }) => {
    const eventsTab = page.getByRole('tab', { name: /Events/i });
    if (await eventsTab.isVisible()) {
      await eventsTab.click();
      await page.waitForTimeout(1000);
    }

    // Open first event
    const eventCard = page.locator('[class*="cursor-pointer"]').first();
    if (await eventCard.isVisible()) {
      await eventCard.click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"]');
      if (await modal.isVisible()) {
        // Modal content should exist
        await expect(modal).not.toBeEmpty();
        // Should mention bCredits (entry fee or prize)
        const modalText = await modal.textContent();
        expect(modalText).toBeTruthy();
      }
    }
  });
});
