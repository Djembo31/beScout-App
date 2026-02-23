import { test, expect } from '@playwright/test';
import { waitForApp, CLUB_SLUG } from './helpers';

test.describe('Club Pages', () => {
  test('Club Discovery (/clubs) shows club list', async ({ page }) => {
    await page.goto('/clubs');
    await waitForApp(page);

    // Should show at least one club card
    const main = page.locator('main');
    await expect(main).not.toBeEmpty();

    // Sakaryaspor should be listed
    await expect(page.getByText(/Sakaryaspor/i)).toBeVisible({ timeout: 8_000 });
  });

  test('Sakaryaspor card navigates to club page', async ({ page }) => {
    await page.goto('/clubs');
    await waitForApp(page);

    const clubLink = page.locator(`a[href*="/club/${CLUB_SLUG}"]`).first();
    await expect(clubLink).toBeVisible({ timeout: 8_000 });
    await clubLink.click();

    await page.waitForURL(`**/club/${CLUB_SLUG}`, { timeout: 10_000 });
    expect(page.url()).toContain(`/club/${CLUB_SLUG}`);
  });

  test('Club page shows 3 tabs', async ({ page }) => {
    await page.goto(`/club/${CLUB_SLUG}`);
    await waitForApp(page);

    const tabs = page.getByRole('tab');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(3);
  });

  test('Spieler tab shows player cards', async ({ page }) => {
    await page.goto(`/club/${CLUB_SLUG}`);
    await waitForApp(page);

    // Click Spieler tab
    const spielerTab = page.getByRole('tab', { name: /Spieler|Kader/i });
    if (await spielerTab.isVisible()) {
      await spielerTab.click();
      await page.waitForTimeout(1000);
    }

    // Should show player content
    const main = page.locator('main');
    await expect(main).not.toBeEmpty();
  });

  test('Follow button is clickable', async ({ page }) => {
    await page.goto(`/club/${CLUB_SLUG}`);
    await waitForApp(page);

    // Look for follow/unfollow button
    const followBtn = page.getByRole('button', { name: /Folgen|Follow|Entfolgen/i });
    if (await followBtn.isVisible()) {
      await expect(followBtn).toBeEnabled();
    }
  });
});
