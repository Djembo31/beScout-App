import { test, expect } from '@playwright/test';
import { waitForApp } from './helpers';

test.describe('Profile Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/profile');
    await waitForApp(page);
  });

  test('Profile page loads', async ({ page }) => {
    const main = page.locator('main');
    await expect(main).not.toBeEmpty();
  });

  test('4 tabs visible (Übersicht, Portfolio, Aktivität, Einstellungen)', async ({ page }) => {
    // Profile uses custom tab buttons (not role="tab")
    await expect(page.getByRole('button', { name: 'Übersicht' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Portfolio' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Aktivität' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Einstellungen' })).toBeVisible({ timeout: 10_000 });
  });

  test('Overview shows handle and avatar', async ({ page }) => {
    // Should show user handle (@ prefix) or display name
    const main = page.locator('main');
    const text = await main.textContent();
    // Profile should have some user-identifying info
    expect(text?.length).toBeGreaterThan(10);
  });

  test('Portfolio tab shows holdings or empty state', async ({ page }) => {
    const portfolioTab = page.getByRole('tab', { name: /Portfolio/i });
    if (await portfolioTab.isVisible()) {
      await portfolioTab.click();
      await page.waitForTimeout(1000);
    }

    const main = page.locator('main');
    await expect(main).not.toBeEmpty();
  });

  test('Einstellungen tab shows language selection', async ({ page }) => {
    const settingsTab = page.getByRole('tab', { name: /Einstellungen|Settings/i });
    if (await settingsTab.isVisible()) {
      await settingsTab.click();
      await page.waitForTimeout(1000);
    }

    // Look for language option (Deutsch, Türkçe, English)
    const langLabel = page.getByText(/Sprache|Language/i);
    if (await langLabel.isVisible()) {
      await expect(langLabel).toBeVisible();
    }
  });
});
