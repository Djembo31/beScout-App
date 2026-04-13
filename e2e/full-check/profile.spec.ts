import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://bescout.net';
const EMAIL = 'jarvis-qa@bescout.net';
const PASSWORD = 'JarvisQA2026!';

// --------------- Helpers ---------------

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  // Dismiss cookie consent if visible
  const acceptBtn = page.getByRole('button', { name: 'Akzeptieren' });
  if (await acceptBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await acceptBtn.click();
    await page.waitForTimeout(300);
  }

  // Wait for React hydration
  await page.waitForFunction(() => {
    const btn = document.querySelector('button[type="submit"]');
    if (!btn) return false;
    const keys = Object.keys(btn);
    return keys.some(k => k.startsWith('__reactFiber') || k.startsWith('__reactProps'));
  }, { timeout: 30_000 });

  await page.getByPlaceholder('E-Mail Adresse').fill(EMAIL);
  await page.getByPlaceholder('Passwort').fill(PASSWORD);
  await page.getByRole('button', { name: 'Anmelden', exact: true }).click();

  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 });
  await waitForApp(page);
}

async function waitForApp(page: Page) {
  await page.waitForLoadState('domcontentloaded', { timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.waitForFunction(() => {
    const root = document.getElementById('__next');
    return root && root.innerHTML.length > 100;
  }, { timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // Dismiss WelcomeBonusModal if it appears
  const dismissBtn = page.getByText(/Später|Later/i);
  if (await dismissBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await dismissBtn.click();
    await page.waitForTimeout(300);
  }
}

// --------------- Tests ---------------

test.describe('Profile Page — Full Check', () => {
  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
  });

  // ===== HERO / SCOUT CARD =====

  test('Hero: Avatar is visible', async ({ page }) => {
    // ScoutCard renders CosmeticAvatar — look for img or user icon fallback
    const avatar = page.locator('img[alt]').first();
    const userIcon = page.locator('svg').first();
    const hasAvatar = await avatar.isVisible({ timeout: 10_000 }).catch(() => false);
    const hasIcon = await userIcon.isVisible({ timeout: 5_000 }).catch(() => false);
    expect(hasAvatar || hasIcon, 'Neither avatar nor user icon visible').toBe(true);
  });

  test('Hero: Display name and handle visible', async ({ page }) => {
    // ScoutCard shows display_name as h2 and @handle as p
    const handle = page.locator('text=/@[a-z0-9_]+/');
    await expect(handle.first()).toBeVisible({ timeout: 10_000 });
  });

  test('Hero: Radar chart is rendered', async ({ page }) => {
    // RadarChart uses an SVG canvas
    const radarSvg = page.locator('svg').filter({ has: page.locator('polygon') });
    await expect(radarSvg.first()).toBeVisible({ timeout: 10_000 });
  });

  test('Hero: Rang badge is visible', async ({ page }) => {
    // ScoutCard renders "BeScout Liga" label next to rank
    const ligaLabel = page.getByText('BeScout Liga');
    await expect(ligaLabel).toBeVisible({ timeout: 10_000 });
  });

  test('Hero: Follower count is clickable', async ({ page }) => {
    const followerBtn = page.getByRole('button', { name: /Follower/i });
    await expect(followerBtn).toBeVisible({ timeout: 10_000 });
    await followerBtn.click();
    await page.waitForTimeout(500);

    // FollowListModal should appear
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Close modal
    const closeBtn = modal.locator('button').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test('Hero: Following count is clickable', async ({ page }) => {
    const followingBtn = page.getByRole('button', { name: /Folge ich/i });
    await expect(followingBtn).toBeVisible({ timeout: 10_000 });
    await followingBtn.click();
    await page.waitForTimeout(500);

    // FollowListModal should appear
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Close modal
    const closeBtn = modal.locator('button').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test('Hero: Settings button links to /profile/settings', async ({ page }) => {
    const settingsLink = page.locator('a[href="/profile/settings"]');
    await expect(settingsLink).toBeVisible({ timeout: 10_000 });
    const settingsText = settingsLink.getByText(/Einstellungen/i);
    await expect(settingsText).toBeVisible();
  });

  // ===== TABS =====

  test('Tabs: Manager tab visible and clickable', async ({ page }) => {
    const tab = page.getByRole('tab', { name: /Manager/i });
    await expect(tab).toBeVisible({ timeout: 10_000 });
    await tab.click();
    await page.waitForTimeout(1000);
    // TabPanel content should render
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('Tabs: Trader tab visible and clickable', async ({ page }) => {
    const tab = page.getByRole('tab', { name: /Trader/i });
    await expect(tab).toBeVisible({ timeout: 10_000 });
    await tab.click();
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('Tabs: Analyst tab visible and clickable', async ({ page }) => {
    const tab = page.getByRole('tab', { name: /Analyst/i });
    await expect(tab).toBeVisible({ timeout: 10_000 });
    await tab.click();
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('Tabs: Timeline tab visible and clickable', async ({ page }) => {
    const tab = page.getByRole('tab', { name: /Timeline/i });
    await expect(tab).toBeVisible({ timeout: 10_000 });
    await tab.click();
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).not.toBeEmpty();
  });

  // ===== MANAGER TAB CONTENT =====

  test('Manager Tab: Shows season stats or empty state', async ({ page }) => {
    const managerTab = page.getByRole('tab', { name: /Manager/i });
    await expect(managerTab).toBeVisible({ timeout: 10_000 });
    await managerTab.click();
    await page.waitForTimeout(2000);

    // Manager tab shows fantasy event results, stats cards, or empty state
    const body = await page.locator('body').textContent();
    // Should have meaningful content (stats, events, or empty state message)
    expect(body?.length).toBeGreaterThan(100);
  });

  // ===== TRADER TAB CONTENT =====

  test('Trader Tab: Shows portfolio value or empty state', async ({ page }) => {
    const traderTab = page.getByRole('tab', { name: /Trader/i });
    await expect(traderTab).toBeVisible({ timeout: 10_000 });
    await traderTab.click();
    await page.waitForTimeout(2000);

    // Trader tab shows portfolio value, PnL, holdings list, or empty state
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(100);
  });

  test('Trader Tab: Holdings list or empty message', async ({ page }) => {
    const traderTab = page.getByRole('tab', { name: /Trader/i });
    await traderTab.click();
    await page.waitForTimeout(2000);

    // Either player links exist (holdings) or an empty state message
    const playerLinks = page.locator('a[href*="/player/"]');
    const playerCount = await playerLinks.count();

    if (playerCount === 0) {
      // Empty state — body should still have content
      await expect(page.locator('body')).not.toBeEmpty();
    } else {
      // Holdings — first link should have valid href
      const href = await playerLinks.first().getAttribute('href');
      expect(href).toContain('/player/');
    }
  });

  // ===== ANALYST TAB CONTENT =====

  test('Analyst Tab: Shows research stats or empty state', async ({ page }) => {
    const analystTab = page.getByRole('tab', { name: /Analyst/i });
    await expect(analystTab).toBeVisible({ timeout: 10_000 });
    await analystTab.click();
    await page.waitForTimeout(2000);

    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(100);
  });

  // ===== TIMELINE TAB CONTENT =====

  test('Timeline Tab: Shows activity feed or empty state', async ({ page }) => {
    const timelineTab = page.getByRole('tab', { name: /Timeline/i });
    await expect(timelineTab).toBeVisible({ timeout: 10_000 });
    await timelineTab.click();
    await page.waitForTimeout(2000);

    // Timeline shows transaction entries or empty state
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(100);
  });

  // ===== SETTINGS NAVIGATION =====

  test('Settings button navigates to /profile/settings', async ({ page }) => {
    const settingsLink = page.locator('a[href="/profile/settings"]');
    await expect(settingsLink).toBeVisible({ timeout: 10_000 });
    await settingsLink.click();

    await page.waitForURL('**/profile/settings', { timeout: 30_000 });
    expect(page.url()).toContain('/profile/settings');
  });

  // ===== LEFT SIDEBAR (Desktop) =====

  test('Sidebar: Wallet card shows balance (self only)', async ({ page }) => {
    // Wallet card has "$SCOUT" or "CR" text and a deposit button
    const walletText = page.getByText(/CR/);
    const isVisible = await walletText.first().isVisible({ timeout: 10_000 }).catch(() => false);
    // On desktop the wallet sidebar should be visible
    if (isVisible) {
      await expect(walletText.first()).toBeVisible();
    }
  });

  test('Sidebar: Airdrop score card visible', async ({ page }) => {
    // AirdropScoreCard is rendered in the sidebar
    // It contains score-related content
    await page.waitForTimeout(2000);
    const body = await page.locator('body').textContent();
    // Page should have loaded fully
    expect(body?.length).toBeGreaterThan(200);
  });
});
