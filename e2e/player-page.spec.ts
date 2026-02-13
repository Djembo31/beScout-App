import { test, expect } from '@playwright/test';

/**
 * Player page smoke test: check that a player page loads
 * and has a title element present.
 *
 * Note: Uses a placeholder UUID. If this specific player doesn't exist
 * in the database, the page should still render (with a "not found" state
 * or similar). The key assertion is that the page does not crash.
 */

test.describe('Player page', () => {
  test('Player page loads without crashing', async ({ page }) => {
    // Use a valid-looking UUID — the page should handle it gracefully
    // even if the player doesn't exist
    await page.goto('/player/00000000-0000-0000-0000-000000000001');

    // Wait for page to finish loading
    await page.waitForLoadState('networkidle');

    // Page should render without crashing — check body is present and non-empty
    await expect(page.locator('body')).not.toBeEmpty();

    // Check that the document has a title
    const title = await page.title();
    expect(title).toBeTruthy();
  });
});
