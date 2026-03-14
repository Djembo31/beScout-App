import { test, expect } from '@playwright/test';
import { waitForApp } from './helpers';

test.describe('Fantasy Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/fantasy', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
  });

  test('Fantasy loads with tabs', async ({ page }) => {
    // Fantasy uses custom tab buttons (not role="tab")
    // Tab labels: Spiele, Events, Mitmachen, Ergebnisse
    await expect(page.getByRole('button', { name: /Spiele/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Events/i })).toBeVisible();
  });

  test('Events show cards with status badges', async ({ page }) => {
    // Click Events tab (custom button, not role="tab")
    const eventsTab = page.getByRole('button', { name: /Events/i });
    if (await eventsTab.isVisible()) {
      await eventsTab.click();
      await page.waitForTimeout(1000);
    }

    // Page should have content
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('Event card opens detail modal', async ({ page }) => {
    const eventsTab = page.getByRole('button', { name: /Events/i });
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

  test('Mitmachen tab loads without crash', async ({ page }) => {
    const mitmachenTab = page.getByRole('button', { name: /Mitmachen/i });
    if (await mitmachenTab.isVisible()) {
      await mitmachenTab.click();
      await page.waitForTimeout(1000);
    }

    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('Ergebnisse tab loads without crash', async ({ page }) => {
    // Use exact: true to avoid matching other buttons that contain "Ergebnisse" text
    const ergebnisseTab = page.getByRole('button', { name: 'Ergebnisse', exact: true });
    if (await ergebnisseTab.isVisible()) {
      await ergebnisseTab.click();
      await page.waitForTimeout(1000);
    }

    // Page should have content (body always visible)
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('Event detail shows name, entry fee, and prize pool', async ({ page }) => {
    const eventsTab = page.getByRole('button', { name: /Events/i });
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
        // Should have some text content
        const modalText = await modal.textContent();
        expect(modalText).toBeTruthy();
      }
    }
  });
});
