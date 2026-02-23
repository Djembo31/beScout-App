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

    const tabs = page.getByRole('tab');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(4);
  });

  test('Overview tab shows dashboard statistics', async ({ page }) => {
    await page.goto(`/club/${CLUB_SLUG}/admin`);
    await waitForApp(page);

    // Overview should be the first/default tab with stats
    const main = page.locator('main');
    await expect(main).not.toBeEmpty();

    // Should contain some numeric stat or card
    const statCards = page.locator('[class*="stat"], [class*="card"]');
    const count = await statCards.count();
    expect(count).toBeGreaterThan(0);
  });
});
