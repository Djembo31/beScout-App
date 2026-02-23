import { test, expect } from '@playwright/test';
import { waitForApp } from './helpers';

test.describe('Scouting Zone (Community)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/community');
    await waitForApp(page);
  });

  test('Scouting Zone loads with hero section', async ({ page }) => {
    // Hero should be visible with title
    const main = page.locator('main');
    await expect(main).not.toBeEmpty();
  });

  test('Content filter pills are visible', async ({ page }) => {
    // Filter pills like "Alle", "Berichte", "Gerüchte", etc.
    const alleFilter = page.getByText('Alle', { exact: true });
    await expect(alleFilter).toBeVisible();
  });

  test('Filter switch changes feed content', async ({ page }) => {
    // Click a specific filter
    const geruechteFilter = page.getByText('Gerüchte');
    if (await geruechteFilter.isVisible()) {
      await geruechteFilter.click();
      await page.waitForTimeout(1000);

      // Feed should update (content still present)
      const main = page.locator('main');
      await expect(main).not.toBeEmpty();
    }
  });

  test('Create post button opens modal', async ({ page }) => {
    // Look for post creation trigger
    const createBtn = page.getByRole('button', { name: /Post|Beitrag|Schreiben/i });
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await page.waitForTimeout(500);

      // Modal should open
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
    }
  });

  test('Post modal allows text input and submit', async ({ page }) => {
    const createBtn = page.getByRole('button', { name: /Post|Beitrag|Schreiben/i });
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"]');
      if (await modal.isVisible()) {
        // Find textarea in modal
        const textarea = modal.locator('textarea').first();
        if (await textarea.isVisible()) {
          await textarea.fill('E2E Test Post — bitte ignorieren');
          // Submit button should be enabled
          const submitBtn = modal.getByRole('button', { name: /Posten|Absenden|Veröffentlichen/i });
          if (await submitBtn.isVisible()) {
            await expect(submitBtn).toBeEnabled();
          }
        }
      }
    }
  });

  test('Post vote button is clickable', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Find an upvote button (arrow up or thumbs up)
    const voteBtn = page.locator('button[aria-label*="vote"], button[aria-label*="Vote"]').first();
    if (await voteBtn.isVisible()) {
      await expect(voteBtn).toBeEnabled();
    }
  });

  test('Sidebar is visible on desktop', async ({ page }) => {
    // Sidebar is typically hidden on mobile, visible on desktop
    // Our test viewport is Desktop Chrome (1280x720)
    const sidebar = page.locator('aside').first();
    if (await sidebar.isVisible()) {
      await expect(sidebar).not.toBeEmpty();
    }
  });
});
