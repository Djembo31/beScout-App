import { type Page, expect } from '@playwright/test';

// --------------- Credentials ---------------
export const FAN_EMAIL = 'demo-fan@bescout.app';
export const ADMIN_EMAIL = 'demo-admin@bescout.app';
export const DEMO_PASSWORD = 'BeScout2026!';

// --------------- Known slugs / IDs ---------------
export const CLUB_SLUG = 'sakaryaspor';

// --------------- Timeouts ---------------
export const LONG_TIMEOUT = 30_000;

// --------------- Helpers ---------------

/**
 * Wait until the app skeleton is gone and the page is interactive.
 * Works for both authenticated and unauthenticated pages.
 * Uses domcontentloaded + networkidle-with-fallback to handle dev server cold compilation.
 */
export async function waitForApp(page: Page) {
  // Wait for DOM to be ready first (fast, always works)
  await page.waitForLoadState('domcontentloaded', { timeout: 60_000 });

  // Try networkidle but don't fail if it times out (HMR keeps connections open in dev)
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {
    // networkidle may never fire in dev mode due to HMR websocket — that's OK
  });

  // Wait for React to render meaningful content in #__next
  await page.waitForFunction(() => {
    const root = document.getElementById('__next');
    return root && root.innerHTML.length > 100;
  }, { timeout: 60_000 }).catch(() => {
    // Fallback: page may have rendered outside __next
  });

  // Give React hydration a moment
  await page.waitForTimeout(1000);

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
