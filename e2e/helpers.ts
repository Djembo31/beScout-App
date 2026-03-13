import { type Page, expect } from '@playwright/test';

// --------------- Credentials ---------------
export const FAN_EMAIL = 'demo-fan@bescout.app';
export const ADMIN_EMAIL = 'demo-admin@bescout.app';
export const DEMO_PASSWORD = 'BeScout2026!';

// --------------- Known slugs / IDs ---------------
export const CLUB_SLUG = 'sakaryaspor';

// --------------- Timeouts ---------------
export const LONG_TIMEOUT = 15_000;

// --------------- Helpers ---------------

/**
 * Wait until the app skeleton is gone and the page is interactive.
 * Works for both authenticated and unauthenticated pages.
 */
export async function waitForApp(page: Page) {
  // Wait for network to settle and DOM to be ready
  await page.waitForLoadState('networkidle', { timeout: LONG_TIMEOUT });
  // Give React hydration a moment
  await page.waitForTimeout(500);

  // Dismiss WelcomeBonusModal if it appears (safety net)
  const dismissBtn = page.getByText(/Später|Later/i);
  if (await dismissBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await dismissBtn.click();
    await page.waitForTimeout(300);
  }
}

/**
 * Assert a toast notification appears with the given text.
 */
export async function expectToast(page: Page, text: string) {
  const toast = page.getByText(text);
  await expect(toast).toBeVisible({ timeout: 8_000 });
}
