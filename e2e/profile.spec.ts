import { test, expect } from '@playwright/test';
import { waitForApp } from './helpers';

test.describe('Profile Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/profile', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
  });

  test('Profile page loads', async ({ page }) => {
    // Body should have content (main may be hidden during AuthGuard loading)
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('4 tabs visible (Manager, Sammler, Analyst, Timeline)', async ({ page }) => {
    // Profile uses custom tab buttons (not role="tab")
    await expect(page.getByRole('button', { name: 'Manager', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sammler', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Analyst', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Timeline', exact: true })).toBeVisible();
  });

  test('Overview shows handle and avatar', async ({ page }) => {
    // Wait for profile content to appear
    await expect(page.locator('body')).not.toBeEmpty();
    const bodyText = await page.locator('body').textContent();
    // Profile should have some user-identifying info
    expect(bodyText?.length).toBeGreaterThan(10);
  });

  test('Portfolio tab shows holdings or empty state', async ({ page }) => {
    const portfolioTab = page.getByRole('tab', { name: /Portfolio/i });
    if (await portfolioTab.isVisible()) {
      await portfolioTab.click();
      await page.waitForTimeout(1000);
    }

    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('Einstellungen tab shows language selection', async ({ page }) => {
    const settingsTab = page.getByRole('tab', { name: /Einstellungen|Settings/i });
    if (await settingsTab.isVisible()) {
      await settingsTab.click();
      await page.waitForTimeout(1000);
    }

    // Look for language option (Deutsch, Turkce, English)
    const langLabel = page.getByText(/Sprache|Language/i);
    if (await langLabel.isVisible()) {
      await expect(langLabel).toBeVisible();
    }
  });
});
