import { test, expect } from '@playwright/test';

/**
 * Auth redirect test: unauthenticated users visiting protected routes
 * should be redirected to /login.
 */

test.describe('Auth redirects', () => {
  test('Unauthenticated user visiting /profile redirects to /login', async ({ page }) => {
    await page.goto('/profile');

    // Wait for navigation to settle
    await page.waitForLoadState('networkidle');

    // Should be redirected to login page
    const url = page.url();
    expect(url).toContain('/login');
  });
});
