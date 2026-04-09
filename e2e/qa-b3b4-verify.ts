/**
 * QA verification for post-fix state of commit `66b8935`
 *
 *   B3 — EventDetailModal "Deine Spieler" row click must quick-add the player
 *        into the first free slot (no new tab, no window.open).
 *        Fix: src/components/fantasy/event-tabs/LineupPanel.tsx:790
 *
 *   B4 — Any query touching `fantasy_league_members` must return HTTP 200
 *        (previously looped → HTTP 500 due to RLS self-recursion).
 *        Fix: supabase/migrations/20260409150000_fix_fantasy_league_members_rls_recursion.sql
 *
 * Tab layout on /fantasy (default = "paarungen" = matchcenter):
 *   1. Spiele (paarungen)   — fixtures/matches
 *   2. Events (events)      — all events → click card opens EventDetailModal (B3)
 *   3. Mitmachen (mitmachen)— joined events + LeaguesSection compact (B4)
 *   4. Ergebnisse           — scored events history
 */
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE = process.env.QA_BASE_URL ?? 'https://www.bescout.net';
const EMAIL = 'jarvis-qa@bescout.net';
const PASSWORD = 'JarvisQA2026!';

const screenshotDir = path.join(__dirname, 'screenshots', 'b3b4-verify');
fs.mkdirSync(screenshotDir, { recursive: true });

type Verdict = { name: string; ok: boolean; detail: string };
const verdicts: Verdict[] = [];
const record = (v: Verdict) => {
  verdicts.push(v);
  console.log(`[${v.ok ? 'PASS' : 'FAIL'}] ${v.name} — ${v.detail}`);
};

async function login(page: Page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);
  try {
    const cookieBtn = page.getByRole('button', { name: 'Akzeptieren' });
    if (await cookieBtn.isVisible({ timeout: 2500 })) {
      await cookieBtn.click();
      await page.waitForTimeout(500);
    }
  } catch {}
  try {
    await page.getByPlaceholder('E-Mail Adresse').fill(EMAIL);
    const pw = page.getByPlaceholder('Passwort');
    await pw.click();
    await pw.fill(PASSWORD);
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
  } catch {
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.waitForTimeout(400);
    await page.locator('button[type="submit"]').click();
  }
  await page.waitForURL('**/', { timeout: 30000 });
  console.log(`[LOGIN] OK: ${page.url()}`);
}

async function clickTab(page: Page, label: string) {
  // FantasyNav renders a list of <button> with the tab label as text
  const tab = page.getByRole('button', { name: new RegExp(`^${label}`, 'i') }).first();
  await tab.click({ timeout: 8000 });
  await page.waitForTimeout(1500);
}

async function runChecks(label: string, context: BrowserContext, page: Page) {
  // ── Network listener for the whole flow ───────────────────────────────
  const lmResponses: { status: number; url: string }[] = [];
  page.on('response', (resp) => {
    const u = resp.url();
    if (u.includes('fantasy_league_members')) {
      lmResponses.push({ status: resp.status(), url: u });
    }
  });

  // ── Navigate to /fantasy ──
  await page.goto(`${BASE}/fantasy`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000); // give React Query, auth, events a chance to settle

  await page.screenshot({
    path: path.join(screenshotDir, `${label}-01-fantasy-default.png`),
    fullPage: true,
  });

  // ════════════════════════════════════════════════════════════════════
  // B3 — Events tab → open event detail modal → click "Deine Spieler" row
  // ════════════════════════════════════════════════════════════════════
  try {
    await clickTab(page, 'Events');
    await page.waitForTimeout(2500);
  } catch (err) {
    record({ name: `${label} — B3 events tab`, ok: false, detail: 'could not click Events tab' });
    return;
  }

  await page.screenshot({
    path: path.join(screenshotDir, `${label}-02-events-tab.png`),
    fullPage: true,
  });

  // Strategy: scope to the outer EventCardView container by looking for an
  // element (div role="button" after the nested-button HTML fix, or legacy
  // <button> on old builds) that contains an <h3> with the target event name.
  // EventCardView.tsx:71 renders `<h3 class="font-black">` for each event title.
  let modalOpen = false;
  const card = page
    .locator('[role="button"], button')
    .filter({ has: page.locator('h3', { hasText: 'Adidas Elite Cup' }) })
    .first();

  try {
    await card.waitFor({ state: 'visible', timeout: 10000 });
    await card.scrollIntoViewIfNeeded();
    console.log(`[${label}] clicking Adidas Elite Cup card — URL before: ${page.url()}`);
    await card.click();
    await page.waitForTimeout(500);
    console.log(`[${label}] URL after click: ${page.url()}`);
    await page.getByText('Deine Spieler').first().waitFor({ state: 'visible', timeout: 12000 });
    modalOpen = true;
  } catch (err) {
    console.log(`[${label}] event card click failed: ${(err as Error).message.split('\n')[0]}`);
  }

  if (!modalOpen) {
    // Fallback: dispatch click directly on the DOM via evaluate
    try {
      const clicked = await page.evaluate(() => {
        const titles = Array.from(document.querySelectorAll('h3'));
        const match = titles.find((el) => el.textContent?.trim() === 'Adidas Elite Cup');
        // Try both new (div role="button") and legacy (<button>) wrappers
        const btn =
          match?.closest('[role="button"]') ??
          match?.closest('button');
        if (btn) {
          (btn as HTMLElement).click();
          return true;
        }
        return false;
      });
      console.log(`[${label}] DOM-dispatch fallback: ${clicked ? 'fired' : 'no match'}`);
      if (clicked) {
        await page.getByText('Deine Spieler').first().waitFor({ state: 'visible', timeout: 10000 });
        modalOpen = true;
      }
    } catch (err) {
      console.log(`[${label}] DOM-dispatch fallback failed: ${(err as Error).message.split('\n')[0]}`);
    }
  }

  if (!modalOpen) {
    record({
      name: `${label} — B3 modal open`,
      ok: false,
      detail: 'could not open EventDetailModal to reach "Deine Spieler" list',
    });
    await page.screenshot({
      path: path.join(screenshotDir, `${label}-03-modal-FAIL.png`),
      fullPage: true,
    });
  } else {
    await page.screenshot({
      path: path.join(screenshotDir, `${label}-03-modal-open.png`),
      fullPage: true,
    });

    // ── Click test ──
    const pagesBefore = context.pages().length;

    // FantasyPlayerRow renders inside the "Deine Spieler" section. Pick the
    // first row by container: the label + all sibling buttons are inside the
    // same parent space-y-0.5 div.
    await page.getByText('Deine Spieler').first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Strategy: pick the first button that contains a position label (GK/DEF/MID/ATT)
    // AND is below the "Deine Spieler" heading. The picker modal uses the same rows,
    // so we wait for any modal-close first (picker shouldn't be open yet).
    let clickedRow = false;
    try {
      // Most specific: directly under the "Deine Spieler" parent div
      const row = page
        .locator('div:has(> div:has-text("Deine Spieler")) button')
        .nth(0);
      await row.waitFor({ state: 'visible', timeout: 4000 });
      await row.click();
      clickedRow = true;
    } catch {
      try {
        // Fallback: first element containing a position + L5 score shape
        const loose = page
          .locator('button')
          .filter({ hasText: /MID|DEF|ATT|GK/ })
          .filter({ hasText: /\d{2,3}/ })
          .first();
        await loose.click({ timeout: 4000 });
        clickedRow = true;
      } catch {}
    }

    await page.waitForTimeout(1500);
    const pagesAfter = context.pages().length;
    const newTabOpened = pagesAfter > pagesBefore;

    record({
      name: `${label} — B3 no new tab`,
      ok: clickedRow && !newTabOpened,
      detail: clickedRow
        ? `pages before=${pagesBefore}, after=${pagesAfter} ${newTabOpened ? '(LEAK!)' : '(ok)'}`
        : 'could not click any player row',
    });

    await page.screenshot({
      path: path.join(screenshotDir, `${label}-04-after-click.png`),
      fullPage: true,
    });

    // Close the modal to continue the flow
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1500);
  }

  // ════════════════════════════════════════════════════════════════════
  // B4 — Mitmachen tab → LeaguesSection rendered → fantasy_league_members
  //      query fires. Expect status 200, no 5xx.
  // ════════════════════════════════════════════════════════════════════
  try {
    await clickTab(page, 'Mitmachen');
    await page.waitForTimeout(4500); // dynamic import + React Query fetch
  } catch {
    record({ name: `${label} — B4 mitmachen tab`, ok: false, detail: 'could not click Mitmachen tab' });
  }

  await page.screenshot({
    path: path.join(screenshotDir, `${label}-05-mitmachen-tab.png`),
    fullPage: true,
  });

  const lm5xx = lmResponses.filter((r) => r.status >= 500);
  const lm200 = lmResponses.filter((r) => r.status >= 200 && r.status < 300);
  record({
    name: `${label} — B4 fantasy_league_members`,
    ok: lmResponses.length > 0 && lm5xx.length === 0,
    detail:
      lmResponses.length === 0
        ? 'NO query seen (LeaguesSection may not have rendered)'
        : `${lmResponses.length} response(s): ${lm200.length}× 2xx, ${lm5xx.length}× 5xx`,
  });
}

async function main() {
  const browser: Browser = await chromium.launch();

  // ── Desktop 1280x900 ──
  const desktopCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const desktopPage = await desktopCtx.newPage();
  desktopPage.on('console', (msg) => {
    if (msg.type() === 'error') {
      const t = msg.text();
      if (!t.includes('Failed to fetch RSC payload')) console.log('[DESKTOP ERR]', t);
    }
  });

  try {
    await login(desktopPage);
    await runChecks('desktop', desktopCtx, desktopPage);
  } catch (err) {
    console.error('[DESKTOP] unhandled', err);
    await desktopPage.screenshot({
      path: path.join(screenshotDir, 'desktop-error.png'),
      fullPage: true,
    });
  }
  await desktopCtx.close();

  // ── Mobile 390x844 ──
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileCtx.newPage();
  mobilePage.on('console', (msg) => {
    if (msg.type() === 'error') {
      const t = msg.text();
      if (!t.includes('Failed to fetch RSC payload')) console.log('[MOBILE ERR]', t);
    }
  });

  try {
    await login(mobilePage);
    await runChecks('mobile', mobileCtx, mobilePage);
  } catch (err) {
    console.error('[MOBILE] unhandled', err);
    await mobilePage.screenshot({
      path: path.join(screenshotDir, 'mobile-error.png'),
      fullPage: true,
    });
  }
  await mobileCtx.close();

  await browser.close();

  console.log('\n────── Summary ──────');
  for (const v of verdicts) console.log(`${v.ok ? '✓' : '✗'} ${v.name} — ${v.detail}`);
  console.log(`\nScreenshots: ${screenshotDir}`);
  const failed = verdicts.filter((v) => !v.ok).length;
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
