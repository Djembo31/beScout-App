import { test, expect, type Page } from '@playwright/test';
import { loginViaUI, dismissOverlays, CLUB_SLUG } from './helpers';

/**
 * Slice 298 — /club + /clubs Contract-Level Lifecycle E2E (Demo-Step-8).
 *
 * Mirrors the Slice 293 Fantasy-Lifecycle blueprint: assert the CONTRACT
 * (structure + data-path-resolved + no errors + mobile-safe), NOT volatile
 * values (which clubs/players/scores). Deterministic across any backend state.
 *
 * Closes the demo-yellow E2E gap for the club pages — the existing
 * `club.spec.ts` is conditional render-smoke (every assert behind
 * `if (await X.isVisible())` → can never fail).
 *
 * Runs own-login (no storageState) against bescout.net, mirroring beta-smoke.
 */

const EMAIL = process.env.SMOKE_EMAIL ?? 'jarvis-qa@bescout.net';
const PASSWORD = process.env.SMOKE_PASSWORD ?? 'JarvisQA2026!';

// Stable anchors verified from source (Slice 298 code-reading):
// - clubs/page.tsx:142    h1 = clubs.discoverTitle = "Clubs entdecken"
// - clubs/page.tsx:155    <LeagueScopeHeader> → data-testid="league-scope-header" (Slice 286 cold-load anchor)
// - clubs/page.tsx:264    club card → <Link href="/club/{slug}">
// - ClubContent.tsx:84-87 TABS: uebersicht/spieler/spielplan/mehr (Slice 297 tab-split)
// - TabBar.tsx            role="tablist" / role="tab"; active tab uses accentColor INLINE STYLE,
//                         NOT text-gold → active anchor = aria-selected="true"
// - ui/index.tsx:253      ErrorState default = common.errorLoadFailed = "Daten konnten nicht geladen werden." (WITH period)
const CLUB_TABS = ['Übersicht', 'Spieler', 'Spielplan', 'Mehr'] as const;
// exact:true binds to the period-variant (common.errorLoadFailed) and avoids
// substring-matching the no-period fantasy.dataLoadFailed (Slice 293 review F-2).
const DATA_LOAD_FAILED = 'Daten konnten nicht geladen werden.';

// Raw i18n-key leak detector: namespace-prefixed dotted keys that escaped t().
// Best-effort allowlist of the namespaces in scope on /clubs + /club — not
// exhaustive. Tight pattern (lowercase letter immediately after the dot) avoids
// false-positives on German sentence boundaries.
const I18N_LEAK = /\b(clubs|club|fanWishes|common|errors|meta|geo|social|legal)\.[a-z][a-zA-Z]{2,}\b/;

function tabByName(page: Page, name: string) {
  return page.getByRole('tab', { name, exact: true });
}

test.describe('Club Lifecycle — deterministic contract (bescout.net)', () => {
  // retries:1 → Vercel Cold-Start nach Deploy kann 15-30s dauern (Slice SO-4).
  test.describe.configure({ retries: 1 });

  test('A — /clubs discovery contract: reachable, league-filter, data-path, no leak, mobile', async ({ browser }) => {
    test.setTimeout(300_000);
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await test.step('login (own-login, jarvis-qa)', async () => {
      await loginViaUI(page, EMAIL, PASSWORD);
    });

    await test.step('AC-A1: /clubs reachable — no /login redirect, main visible', async () => {
      const response = await page.goto('/clubs', { waitUntil: 'domcontentloaded', timeout: 30_000 });
      expect(response?.status(), '/clubs server error').toBeLessThan(500);
      await dismissOverlays(page);
      expect(new URL(page.url()).pathname, 'redirected away from /clubs (auth/geo block)').toBe('/clubs');
      await expect(page.locator('main, [role="main"]'), 'main not rendered').toBeVisible({ timeout: 15_000 });
    });

    await test.step('AC-A2: league-scope filter renders (Slice 286 cold-load anchor)', async () => {
      const header = page.locator('[data-testid="league-scope-header"]');
      await expect(header, 'league-scope-header missing').toBeVisible({ timeout: 15_000 });
      const buttonCount = await header.getByRole('button').count();
      expect(buttonCount, 'league-scope-header has 0 buttons (cold-load race regression)').toBeGreaterThan(0);
    });

    await test.step('AC-A3: data-path resolved — club card present AND no ErrorState', async () => {
      // Skeleton cleared + a club card link rendered → query resolved (not "data exists").
      await expect(
        page.locator('a[href*="/club/"]').first(),
        'no club card rendered — data-path failed'
      ).toBeVisible({ timeout: 20_000 });
      await expect(
        page.getByText(DATA_LOAD_FAILED, { exact: true }),
        'ErrorState shown — /clubs data-path failed'
      ).toHaveCount(0);
    });

    await test.step('AC-A4: no raw i18n-key leak in visible text', async () => {
      const bodyText = await page.locator('main, [role="main"]').first().innerText();
      const leak = bodyText.match(I18N_LEAK);
      expect(leak, `raw i18n key leaked: ${leak?.[0]}`).toBeNull();
    });

    await test.step('AC-A5: mobile 393px — no horizontal overflow', async () => {
      await page.setViewportSize({ width: 393, height: 852 });
      await page.goto('/clubs', { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await dismissOverlays(page);
      await expect(page.locator('main, [role="main"]')).toBeVisible({ timeout: 15_000 });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `horizontal overflow on mobile: ${overflow}px`).toBeLessThanOrEqual(1);
    });

    expect(pageErrors, `uncaught page exceptions on /clubs: ${pageErrors.join(' | ')}`).toHaveLength(0);
    await context.close();
  });

  test('B — /club/[slug] detail contract: public, 4-tab walk (Slice 297), data-path, no crash, mobile', async ({ browser }) => {
    test.setTimeout(300_000);
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await test.step('login (own-login, jarvis-qa)', async () => {
      await loginViaUI(page, EMAIL, PASSWORD);
    });

    await test.step('AC-B1: /club/[slug] reachable (public) — no redirect, main visible', async () => {
      const response = await page.goto(`/club/${CLUB_SLUG}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      expect(response?.status(), '/club server error').toBeLessThan(500);
      await dismissOverlays(page);
      expect(new URL(page.url()).pathname, 'redirected away from /club/[slug]').toBe(`/club/${CLUB_SLUG}`);
      await expect(page.locator('main, [role="main"]'), 'main not rendered').toBeVisible({ timeout: 15_000 });
    });

    await test.step('AC-B2 + AC-B3: 4 tabs present (Slice 297 split, skeleton resolved) AND no ErrorState', async () => {
      for (const label of CLUB_TABS) {
        await expect(tabByName(page, label), `club tab "${label}" missing`).toBeVisible({ timeout: 20_000 });
      }
      await expect(
        page.getByText(DATA_LOAD_FAILED, { exact: true }),
        'ErrorState shown — /club data-path failed'
      ).toHaveCount(0);
    });

    await test.step('AC-B4: tab walk — each tab activates (aria-selected) without crashing', async () => {
      for (const label of CLUB_TABS) {
        const tab = tabByName(page, label);
        await tab.click();
        // TabBar active state = aria-selected (accentColor inline-style, not text-gold).
        await expect(tab, `club tab "${label}" did not become active`).toHaveAttribute('aria-selected', 'true', { timeout: 10_000 });
        await expect(page.getByText(DATA_LOAD_FAILED, { exact: true })).toHaveCount(0);
      }
    });

    await test.step('AC-B5: no raw i18n-key leak in visible text', async () => {
      const bodyText = await page.locator('main, [role="main"]').first().innerText();
      const leak = bodyText.match(I18N_LEAK);
      expect(leak, `raw i18n key leaked: ${leak?.[0]}`).toBeNull();
    });

    await test.step('AC-B6: mobile 393px — 4 tabs reachable, no horizontal overflow (Slice 297 AC-5 regression)', async () => {
      await page.setViewportSize({ width: 393, height: 852 });
      await page.goto(`/club/${CLUB_SLUG}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await dismissOverlays(page);
      await expect(page.locator('main, [role="main"]')).toBeVisible({ timeout: 15_000 });
      for (const label of CLUB_TABS) {
        await expect(tabByName(page, label), `club tab "${label}" unreachable on mobile`).toBeVisible({ timeout: 15_000 });
      }
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `horizontal overflow on mobile: ${overflow}px`).toBeLessThanOrEqual(1);
    });

    await test.step('AC-B7: zero uncaught page exceptions during the walk', async () => {
      expect(pageErrors, `uncaught page exceptions: ${pageErrors.join(' | ')}`).toHaveLength(0);
    });

    await context.close();
  });
});
