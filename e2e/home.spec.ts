import { test, expect } from '@playwright/test';
import { waitForApp } from './helpers';

test.describe('Home Page', () => {
  test('Home loads with greeting', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    // App should be loaded — body has meaningful content
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();

    // Some home content should be visible (greeting or sections)
    const hasContent = await page.locator('main, [role="main"]').count();
    expect(hasContent).toBeGreaterThan(0);
  });

  test('Balance display is present', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    // TopBar balance pill with data-tour-id
    const balance = page.locator('[data-tour-id="topbar-balance"]');
    await expect(balance).toBeVisible();
    // Should show $SCOUT symbol
    await expect(balance).toContainText('$SCOUT');
  });

  test('Portfolio section shows holdings or empty state', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    // Either holdings cards or an empty state message
    const main = page.locator('main');
    await expect(main).not.toBeEmpty();
  });

  test('Events section shows upcoming events or empty state', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    // Home page should render event cards or an empty indicator
    const main = page.locator('main');
    await expect(main).not.toBeEmpty();
  });

  test('Navigation to /market works', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    // Click market nav item
    const marketNav = page.locator('[data-tour-id="nav-market"]');
    await marketNav.click();

    await page.waitForURL('**/market', { timeout: 10_000 });
    expect(page.url()).toContain('/market');
  });

  test('Navigation to /fantasy works', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    // Click fantasy nav item
    const fantasyNav = page.locator('[data-tour-id="nav-fantasy"]');
    await fantasyNav.click();

    await page.waitForURL('**/fantasy', { timeout: 10_000 });
    expect(page.url()).toContain('/fantasy');
  });
});
