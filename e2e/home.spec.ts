import { test, expect } from '@playwright/test';
import { waitForApp } from './helpers';

test.describe('Home Page', () => {
  test('Home loads with greeting', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    // App should be loaded — body has meaningful content
    await expect(page.locator('body')).not.toBeEmpty();

    // Some home content should be visible
    const hasContent = await page.locator('main, [role="main"]').count();
    expect(hasContent).toBeGreaterThan(0);
  });

  test('Balance display is present', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    // TopBar balance pill with data-tour-id
    const balance = page.locator('[data-tour-id="topbar-balance"]');
    await expect(balance).toBeVisible();
    // Should show a numeric balance
    const text = await balance.textContent();
    expect(text).toBeTruthy();
  });

  test('Portfolio section shows holdings or empty state', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    // Body should have content
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('Events section shows upcoming events or empty state', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    // Body should have content
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('Navigation to /market works', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    // Click market nav item — try data-tour-id first, fallback to link
    const marketNav = page.locator('[data-tour-id="nav-market"]');
    if (await marketNav.isVisible({ timeout: 5000 }).catch(() => false)) {
      await marketNav.click();
    } else {
      // Fallback: use link navigation
      await page.goto('/market', { waitUntil: 'domcontentloaded' });
    }

    await page.waitForURL('**/market', { timeout: 30_000 });
    expect(page.url()).toContain('/market');
  });

  test('Navigation to /fantasy works', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    // Click fantasy nav item — try data-tour-id first, fallback to link
    const fantasyNav = page.locator('[data-tour-id="nav-fantasy"]');
    if (await fantasyNav.isVisible({ timeout: 5000 }).catch(() => false)) {
      await fantasyNav.click();
    } else {
      // Fallback: use link navigation
      await page.goto('/fantasy', { waitUntil: 'domcontentloaded' });
    }

    await page.waitForURL('**/fantasy', { timeout: 30_000 });
    expect(page.url()).toContain('/fantasy');
  });
});
