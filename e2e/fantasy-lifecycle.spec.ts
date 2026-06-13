import { test, expect, type Page } from '@playwright/test';
import { loginViaUI, dismissOverlays } from './helpers';

/**
 * Slice 293 — Deterministic Fantasy Lifecycle E2E (contract-level).
 *
 * Closes the 5×-repeated demo-green E2E caveat from Hermes' Page-Contract
 * audits S1–S3: every page landed "demo-yellow" partly because no deterministic
 * page-contract E2E existed — only conditional render-smoke (`fantasy.spec.ts`,
 * where every assertion hides behind `if (await X.isVisible())` and can never fail).
 *
 * Design: assert the CONTRACT (structure + data-path-resolved + no errors), NOT
 * volatile values (specific events/scores). The contract is stable across any
 * gameweek state, so it's deterministic against live prod data.
 *
 * Runs own-login (no storageState) against bescout.net, mirroring beta-smoke.
 */

const EMAIL = process.env.SMOKE_EMAIL ?? 'jarvis-qa@bescout.net';
const PASSWORD = process.env.SMOKE_PASSWORD ?? 'JarvisQA2026!';

// Stable anchors verified from source (Slice 293 code-reading):
// - FantasyContent.tsx:219  <FantasyDisclaimer variant="card" />  → legal.fantasyDisclaimer
// - FantasyNav.tsx:39-44     tabs: Spiele / Events / Mitmachen / Ergebnisse
// - FantasyNav.tsx:66-68     active tab gets class `text-gold`
// - FantasyError.tsx:20      fantasy.dataLoadFailed = "Daten konnten nicht geladen werden"
const DISCLAIMER_ANCHOR = /Fantasy-Turniere sind Unterhaltungsangebote/i;
const DATA_LOAD_FAILED = 'Daten konnten nicht geladen werden';
const TABS = ['Spiele', 'Events', 'Mitmachen', 'Ergebnisse'] as const;

// Raw i18n-key leak detector: namespace-prefixed dotted keys that escaped t().
// Best-effort allowlist of the namespaces in scope on /fantasy — not exhaustive
// (a leak in an unlisted namespace would escape). Tight pattern (lowercase letter
// immediately after the dot) avoids false-positives on German sentence boundaries.
const I18N_LEAK = /\b(fantasy|events|manager|common|errors|meta|legal|geo|tips)\.[a-z][a-zA-Z]{2,}\b/;

function tabButton(page: Page, name: string) {
  return page.getByRole('button', { name, exact: true });
}

test.describe('Fantasy Lifecycle — deterministic contract (bescout.net)', () => {
  // retries:1 → Vercel Cold-Start nach Deploy kann 15-30s dauern (Slice SO-4).
  test.describe.configure({ retries: 1 });

  test('authenticated /fantasy contract: auth+geo, disclaimer, 4-tab walk, data-path, no errors, mobile', async ({ browser }) => {
    test.setTimeout(300_000);
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();

    // AC-06: collect uncaught page exceptions across the entire walk.
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await test.step('login (own-login, jarvis-qa)', async () => {
      await loginViaUI(page, EMAIL, PASSWORD);
    });

    await test.step('AC-01: /fantasy reachable — no /login redirect, no GeoGate block, main visible', async () => {
      const response = await page.goto('/fantasy', { waitUntil: 'domcontentloaded', timeout: 30_000 });
      expect(response?.status(), '/fantasy server error').toBeLessThan(500);
      await dismissOverlays(page);
      // Client-side auth redirect (Slice 282b): if not authed, app bounces to /login.
      expect(new URL(page.url()).pathname, 'redirected away from /fantasy (auth/geo block)').toBe('/fantasy');
      await expect(page.locator('main, [role="main"]'), 'main not rendered').toBeVisible({ timeout: 15_000 });
    });

    await test.step('AC-02: FantasyDisclaimer visible (compliance contract)', async () => {
      await expect(
        page.getByText(DISCLAIMER_ANCHOR),
        'FantasyDisclaimer missing — compliance regression'
      ).toBeVisible({ timeout: 15_000 });
    });

    await test.step('AC-03 + AC-04: 4 tabs present (skeleton resolved) AND no FantasyError (data-path wired)', async () => {
      // Tabs only render after FantasyContent's loading early-return clears — so
      // all 4 tabs visible already proves FantasySkeleton resolved (AC-04 part 1).
      for (const label of TABS) {
        await expect(tabButton(page, label), `tab "${label}" missing`).toBeVisible({ timeout: 20_000 });
      }
      // AC-04 part 2: events query resolved (not the error early-return).
      // exact:true binds to FantasyError's no-period string and avoids substring-
      // matching the period-variants common.errorLoadFailed / fantasy.loadError
      // (Slice 293 review F-2).
      await expect(
        page.getByText(DATA_LOAD_FAILED, { exact: true }),
        'FantasyError shown — events data-path failed'
      ).toHaveCount(0);
    });

    await test.step('AC-05: tab walk — each tab activates (text-gold) without crashing the page', async () => {
      for (const label of TABS) {
        const btn = tabButton(page, label);
        await btn.click();
        await expect(btn, `tab "${label}" did not become active`).toHaveClass(/text-gold/, { timeout: 10_000 });
        // page must not have collapsed into the full-page error after switching.
        await expect(page.getByText(DATA_LOAD_FAILED, { exact: true })).toHaveCount(0);
      }
    });

    await test.step('AC-07: no raw i18n-key leak in visible text', async () => {
      const bodyText = await page.locator('main, [role="main"]').first().innerText();
      const leak = bodyText.match(I18N_LEAK);
      expect(leak, `raw i18n key leaked: ${leak?.[0]}`).toBeNull();
    });

    await test.step('AC-08: mobile 393px — tabs reachable, no horizontal overflow', async () => {
      await page.setViewportSize({ width: 393, height: 852 });
      await page.goto('/fantasy', { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await dismissOverlays(page);
      await expect(page.locator('main, [role="main"]')).toBeVisible({ timeout: 15_000 });
      // All 4 tabs reachable (horizontal scroll container).
      for (const label of TABS) {
        await expect(tabButton(page, label), `tab "${label}" unreachable on mobile`).toBeVisible({ timeout: 15_000 });
      }
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `horizontal overflow on mobile: ${overflow}px`).toBeLessThanOrEqual(1);
    });

    await test.step('AC-06: zero uncaught page exceptions during the walk', async () => {
      expect(pageErrors, `uncaught page exceptions: ${pageErrors.join(' | ')}`).toHaveLength(0);
    });

    await context.close();
  });
});
