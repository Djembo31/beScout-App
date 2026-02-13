import { test, expect } from '@playwright/test';

/**
 * Smoke tests: verify core pages load without crashing.
 * These do not require authentication — they just check that
 * the page renders some main content or redirects gracefully.
 */

test.describe('Navigation smoke tests', () => {
  test('Home page (/) loads', async ({ page }) => {
    await page.goto('/');
    // Should render some content — either the app or redirect to login
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('Market page (/market) loads', async ({ page }) => {
    await page.goto('/market');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('Fantasy page (/fantasy) loads', async ({ page }) => {
    await page.goto('/fantasy');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('Community page (/community) loads', async ({ page }) => {
    await page.goto('/community');
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
