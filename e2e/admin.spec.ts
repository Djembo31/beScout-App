import { test, expect } from '@playwright/test';
import { waitForApp, CLUB_SLUG } from './helpers';

test.describe('Club Admin Page', () => {
  test('Club admin page loads for admin user', async ({ page }) => {
    await page.goto(`/club/${CLUB_SLUG}/admin`);
    await waitForApp(page);

    // Should not redirect away — admin has access
    expect(page.url()).toContain('/admin');

    const main = page.locator('main');
    await expect(main).not.toBeEmpty();
  });

  test('At least 4 admin tabs visible', async ({ page }) => {
    await page.goto(`/club/${CLUB_SLUG}/admin`);
    await waitForApp(page);

    // Admin uses custom tab buttons (not role="tab")
    await expect(page.getByText('Übersicht', { exact: true })).toBeVisible();
    await expect(page.getByText('Spieler', { exact: true })).toBeVisible();
    await expect(page.getByText('Events', { exact: true })).toBeVisible();
    await expect(page.getByText('Aufträge', { exact: true })).toBeVisible();
  });

  test('Overview tab shows dashboard statistics', async ({ page }) => {
    await page.goto(`/club/${CLUB_SLUG}/admin`);
    await waitForApp(page);

    // Overview should show club stats like IPO Umsatz, Follower, Trading Vol
    await expect(page.getByText('IPO Umsatz')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Follower')).toBeVisible({ timeout: 10_000 });
  });
});
