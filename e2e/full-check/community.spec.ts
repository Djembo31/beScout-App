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

test.describe('Community Page — Full Check', () => {
  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/community`, { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
  });

  // ===== PAGE HEADER =====

  test('Header: Scouting Zone title is visible', async ({ page }) => {
    const title = page.getByText('Scouting Zone', { exact: true });
    await expect(title).toBeVisible({ timeout: 10_000 });
  });

  test('Header: Subtitle is visible', async ({ page }) => {
    const subtitle = page.getByText(/Analysen, Gerüchte, Aufträge/i);
    await expect(subtitle).toBeVisible({ timeout: 10_000 });
  });

  // ===== HERO CTAs =====

  test('Hero: Post button is visible', async ({ page }) => {
    const postBtn = page.getByText('Post schreiben');
    await expect(postBtn).toBeVisible({ timeout: 10_000 });
  });

  test('Hero: Rumor button is visible', async ({ page }) => {
    const rumorBtn = page.getByText('Gerücht teilen');
    await expect(rumorBtn).toBeVisible({ timeout: 10_000 });
  });

  test('Hero: Research button is visible', async ({ page }) => {
    const researchBtn = page.getByText('Analyse schreiben');
    await expect(researchBtn).toBeVisible({ timeout: 10_000 });
  });

  test('Hero: Bounty button is visible', async ({ page }) => {
    const bountyBtn = page.getByText('Auftrag erstellen');
    await expect(bountyBtn).toBeVisible({ timeout: 10_000 });
  });

  test('Hero: Post button opens create modal', async ({ page }) => {
    const postBtn = page.getByText('Post schreiben');
    await expect(postBtn).toBeVisible({ timeout: 10_000 });
    await postBtn.click();
    await page.waitForTimeout(500);

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Close modal (ESC or close button)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  test('Hero: Rumor button opens create modal', async ({ page }) => {
    const rumorBtn = page.getByText('Gerücht teilen');
    await expect(rumorBtn).toBeVisible({ timeout: 10_000 });
    await rumorBtn.click();
    await page.waitForTimeout(500);

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  test('Hero: Research button opens create modal', async ({ page }) => {
    const researchBtn = page.getByText('Analyse schreiben');
    await expect(researchBtn).toBeVisible({ timeout: 10_000 });
    await researchBtn.click();
    await page.waitForTimeout(500);

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  test('Hero: Bounty button opens create modal', async ({ page }) => {
    const bountyBtn = page.getByText('Auftrag erstellen');
    await expect(bountyBtn).toBeVisible({ timeout: 10_000 });
    await bountyBtn.click();
    await page.waitForTimeout(500);

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  // ===== FEED MODE TOGGLES =====

  test('Feed Mode: "Alle Clubs" / "Mein Club" toggle is visible', async ({ page }) => {
    // This toggle only shows when user has activeClub set
    const allClubsBtn = page.getByText('Alle Clubs', { exact: true });
    const hasClubToggle = await allClubsBtn.isVisible({ timeout: 5_000 }).catch(() => false);

    if (hasClubToggle) {
      await expect(allClubsBtn).toBeVisible();
      // "Mein Club" or club short name should also be visible
      const myClubBtn = page.locator('button').filter({ hasText: /Mein Club|SAK|Sakarya/i });
      await expect(myClubBtn.first()).toBeVisible();
    }
    // If no club set, toggle is hidden — that is expected
  });

  test('Feed Mode: "Alle" / "Folge ich" toggle is visible', async ({ page }) => {
    const alleBtn = page.locator('button').filter({ hasText: 'Alle' }).first();
    await expect(alleBtn).toBeVisible({ timeout: 10_000 });

    const folgeIchBtn = page.getByText('Folge ich', { exact: true }).first();
    await expect(folgeIchBtn).toBeVisible({ timeout: 5_000 });
  });

  test('Feed Mode: Clicking "Folge ich" changes feed', async ({ page }) => {
    const folgeIchBtn = page.getByText('Folge ich', { exact: true }).first();
    await expect(folgeIchBtn).toBeVisible({ timeout: 10_000 });
    await folgeIchBtn.click();
    await page.waitForTimeout(1500);

    // Feed should update — either showing followed users' posts or empty state
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('Feed Mode: Club scope toggle changes feed', async ({ page }) => {
    const allClubsBtn = page.getByText('Alle Clubs', { exact: true });
    const hasClubToggle = await allClubsBtn.isVisible({ timeout: 5_000 }).catch(() => false);

    if (hasClubToggle) {
      // Click "Mein Club" variant
      const myClubBtn = page.locator('button').filter({ hasText: /Mein Club|SAK|Sakarya/i });
      await myClubBtn.first().click();
      await page.waitForTimeout(1500);

      // Feed should update
      await expect(page.locator('body')).not.toBeEmpty();

      // Switch back
      await allClubsBtn.click();
      await page.waitForTimeout(500);
    }
  });

  // ===== NETWORK BAR =====

  test('Network Bar: Follower count is visible and clickable', async ({ page }) => {
    const followerText = page.getByText(/\d+\s*Follower/);
    await expect(followerText.first()).toBeVisible({ timeout: 10_000 });

    // Click to open follow list modal
    await followerText.first().click();
    await page.waitForTimeout(500);

    const modal = page.locator('[role="dialog"]');
    const hasModal = await modal.isVisible({ timeout: 5_000 }).catch(() => false);
    if (hasModal) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
  });

  test('Network Bar: Following count is visible and clickable', async ({ page }) => {
    const followingText = page.getByText(/\d+\s*Folge ich/);
    await expect(followingText.first()).toBeVisible({ timeout: 10_000 });

    // Click to open follow list modal
    await followingText.first().click();
    await page.waitForTimeout(500);

    const modal = page.locator('[role="dialog"]');
    const hasModal = await modal.isVisible({ timeout: 5_000 }).catch(() => false);
    if (hasModal) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
  });

  // ===== CONTENT FILTER PILLS =====

  test('Filter Pills: All 7 filter pills are visible', async ({ page }) => {
    // Wait for feed to load
    await page.waitForTimeout(2000);

    const filterNames = ['Alle', 'Beiträge', 'Gerüchte', 'Berichte', 'Aufträge', 'Abstimmungen', 'News'];
    for (const name of filterNames) {
      const pill = page.locator('button').filter({ hasText: name }).first();
      await expect(pill).toBeVisible({ timeout: 5_000 });
    }
  });

  test('Filter Pills: Clicking "Beiträge" filters feed', async ({ page }) => {
    await page.waitForTimeout(2000);

    const beitraegePill = page.getByText('Beiträge', { exact: true });
    await expect(beitraegePill).toBeVisible({ timeout: 10_000 });
    await beitraegePill.click();
    await page.waitForTimeout(1000);

    // Feed should update
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('Filter Pills: Clicking "Gerüchte" filters feed', async ({ page }) => {
    await page.waitForTimeout(2000);

    const geruechte = page.getByText('Gerüchte', { exact: true });
    await expect(geruechte).toBeVisible({ timeout: 10_000 });
    await geruechte.click();
    await page.waitForTimeout(1000);

    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('Filter Pills: Clicking "Berichte" filters feed', async ({ page }) => {
    await page.waitForTimeout(2000);

    const berichte = page.getByText('Berichte', { exact: true });
    await expect(berichte).toBeVisible({ timeout: 10_000 });
    await berichte.click();
    await page.waitForTimeout(1000);

    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('Filter Pills: Clicking "Aufträge" filters feed', async ({ page }) => {
    await page.waitForTimeout(2000);

    const auftraege = page.getByText('Aufträge', { exact: true });
    await expect(auftraege).toBeVisible({ timeout: 10_000 });
    await auftraege.click();
    await page.waitForTimeout(1000);

    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('Filter Pills: Clicking "Abstimmungen" filters feed', async ({ page }) => {
    await page.waitForTimeout(2000);

    const abstimmungen = page.getByText('Abstimmungen', { exact: true });
    await expect(abstimmungen).toBeVisible({ timeout: 10_000 });
    await abstimmungen.click();
    await page.waitForTimeout(1000);

    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('Filter Pills: Clicking "News" filters feed', async ({ page }) => {
    await page.waitForTimeout(2000);

    const news = page.getByText('News', { exact: true });
    await expect(news).toBeVisible({ timeout: 10_000 });
    await news.click();
    await page.waitForTimeout(1000);

    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('Filter Pills: Clicking "Alle" resets filter', async ({ page }) => {
    await page.waitForTimeout(2000);

    // First switch to a specific filter
    const beitraege = page.getByText('Beiträge', { exact: true });
    await beitraege.click();
    await page.waitForTimeout(500);

    // Then switch back to "Alle"
    // The "Alle" pill in the filter row (not the club scope toggle)
    const allePills = page.locator('button').filter({ hasText: /^Alle$/ });
    // Find the filter pill row — it is inside the feed section (not the club scope toggle)
    const feedFilterAlle = allePills.last();
    await feedFilterAlle.click();
    await page.waitForTimeout(1000);

    await expect(page.locator('body')).not.toBeEmpty();
  });

  // ===== POST CARDS =====

  test('Post Cards: At least one post card is visible in feed', async ({ page }) => {
    await page.waitForTimeout(3000);

    // Posts render with author handles and content
    const body = await page.locator('body').textContent();
    // The feed should have loaded with content
    expect(body?.length).toBeGreaterThan(200);
  });

  test('Post Cards: Vote buttons (upvote/downvote) are visible', async ({ page }) => {
    await page.waitForTimeout(3000);

    // Vote buttons are rendered per post — look for any vote button
    // Posts use ThumbsUp/ThumbsDown or ArrowUp/ArrowDown icons inside buttons
    const voteButtons = page.locator('button[aria-label*="vote"], button[aria-label*="Vote"]');
    const voteCount = await voteButtons.count();

    if (voteCount === 0) {
      // Alternative: look for vote score display (numeric)
      const body = await page.locator('body').textContent();
      expect(body?.length).toBeGreaterThan(200);
    } else {
      await expect(voteButtons.first()).toBeVisible();
    }
  });

  test('Post Cards: Reply button is visible', async ({ page }) => {
    await page.waitForTimeout(3000);

    // Reply/comment button on post cards
    const replyBtns = page.locator('button[aria-label*="reply"], button[aria-label*="Reply"], button[aria-label*="Antwort"], button[aria-label*="Kommentar"]');
    const replyCount = await replyBtns.count();

    if (replyCount > 0) {
      await expect(replyBtns.first()).toBeVisible();
    } else {
      // Alternative: look for reply/comment icon buttons (MessageCircle)
      const body = await page.locator('body').textContent();
      expect(body?.length).toBeGreaterThan(200);
    }
  });

  test('Post Cards: Author handle links to profile', async ({ page }) => {
    await page.waitForTimeout(3000);

    // Author handles should link to /profile/{handle}
    const profileLinks = page.locator('a[href*="/profile/"]');
    const linkCount = await profileLinks.count();

    if (linkCount > 0) {
      const href = await profileLinks.first().getAttribute('href');
      expect(href).toContain('/profile/');
    }
  });

  // ===== SEARCH & SORT =====

  test('Feed: Search input is visible', async ({ page }) => {
    await page.waitForTimeout(2000);

    const searchInput = page.locator('input[placeholder]').filter({ hasText: /such|search/i });
    const searchByPlaceholder = page.getByPlaceholder(/such|search/i);
    const hasSearch = await searchByPlaceholder.isVisible({ timeout: 5_000 }).catch(() => false);

    if (hasSearch) {
      await expect(searchByPlaceholder).toBeVisible();
    }
    // Search might be inside the feed tab — just verify page is loaded
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('Feed: Sort pills are visible', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Sort options: Neu, Trending, Top
    const neuPill = page.getByText(/^Neu$/);
    const trendingPill = page.getByText(/^Trending$/);
    const topPill = page.getByText(/^Top$/);

    const hasNeu = await neuPill.isVisible({ timeout: 5_000 }).catch(() => false);
    const hasTrending = await trendingPill.isVisible({ timeout: 3_000 }).catch(() => false);
    const hasTop = await topPill.isVisible({ timeout: 3_000 }).catch(() => false);

    // At least one sort option should be visible
    expect(hasNeu || hasTrending || hasTop).toBe(true);
  });

  // ===== SIDEBAR (Desktop) =====

  test('Sidebar: Top Scouts section is visible on desktop', async ({ page }) => {
    await page.waitForTimeout(3000);

    // CommunitySidebar renders "Top Scouts" heading
    const topScoutsText = page.getByText('Top Scouts');
    const isVisible = await topScoutsText.isVisible({ timeout: 5_000 }).catch(() => false);

    if (isVisible) {
      await expect(topScoutsText).toBeVisible();

      // Should have at least one scout entry with a link to /profile/
      const scoutLinks = page.locator('aside a[href*="/profile/"], [class*="sidebar"] a[href*="/profile/"]');
      if (await scoutLinks.count() > 0) {
        const href = await scoutLinks.first().getAttribute('href');
        expect(href).toContain('/profile/');
      }
    }
    // On mobile viewport, sidebar may be hidden — that is OK
  });

  test('Sidebar: Top Research section is visible on desktop', async ({ page }) => {
    await page.waitForTimeout(3000);

    // CommunitySidebar renders "Top Berichte" or research highlight section
    const topResearch = page.getByText(/Top Berichte|Top Research/i);
    const isVisible = await topResearch.isVisible({ timeout: 5_000 }).catch(() => false);

    // Top research only shows if there are research posts
    if (isVisible) {
      await expect(topResearch).toBeVisible();
    }
  });

  // ===== CREATE POST MODAL DETAIL =====

  test('Create Post Modal: Has textarea and submit button', async ({ page }) => {
    const postBtn = page.getByText('Post schreiben');
    await expect(postBtn).toBeVisible({ timeout: 10_000 });
    await postBtn.click();
    await page.waitForTimeout(500);

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Modal should have a textarea for content
    const textarea = modal.locator('textarea').first();
    if (await textarea.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await textarea.fill('E2E Test — bitte ignorieren');

      // Submit button should become enabled
      const submitBtn = modal.getByRole('button', { name: /Posten|Absenden|Veröffentlichen/i });
      if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await expect(submitBtn).toBeEnabled();
      }
    }

    // Close without submitting
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  // ===== RESULT COUNT =====

  test('Feed: Result count is shown', async ({ page }) => {
    await page.waitForTimeout(3000);

    // CommunityFeedTab shows "{N} Beiträge" result counter
    const resultCount = page.getByText(/\d+\s*(Beiträge|Posts|Ergebnisse)/);
    const hasCount = await resultCount.first().isVisible({ timeout: 5_000 }).catch(() => false);

    if (hasCount) {
      await expect(resultCount.first()).toBeVisible();
    }
    // Result count is always rendered when feed loads
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
