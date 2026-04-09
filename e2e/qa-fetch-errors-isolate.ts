/**
 * Isolation test for the "TypeError: Failed to fetch" errors observed during
 * qa-b3b4-verify.
 *
 * Hypothesis A (navigation abort): Playwright's goto('/fantasy') aborts the
 *   in-flight layout queries (Tickets, Sponsors, Trending, WelcomeBonus,
 *   LoginStreak) → Chromium rejects pending fetches with "Failed to fetch".
 *   Expected behavior, not a real bug.
 *
 * Hypothesis B (real network issue): The fetches really fail on prod, even
 *   without navigation interruption.
 *
 * Test: login → goto('/') → wait 20s on home → collect all console errors.
 * If the 5 errors don't show up → navigation abort is the cause.
 * If they do → real bug, deeper investigation needed.
 */
import { chromium, Page } from 'playwright';

const BASE = process.env.QA_BASE_URL ?? 'https://www.bescout.net';
const EMAIL = 'jarvis-qa@bescout.net';
const PASSWORD = 'JarvisQA2026!';

const TARGET_ERRORS = [
  '[Tickets] getUserTickets',
  '[Sponsors] getSponsorForPlacement',
  '[Trading] getTrendingPlayers',
  '[WelcomeBonus] claimWelcomeBonus',
  '[Home] Login streak record failed',
];

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

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      errors.push(text);
    }
  });

  // Track all fetches to Supabase REST/RPC
  const fetchFailures: { url: string; method: string }[] = [];
  const fetchOk: { url: string; status: number; method: string }[] = [];
  page.on('requestfailed', (req) => {
    if (req.url().includes('supabase')) {
      fetchFailures.push({ url: req.url(), method: req.method() });
    }
  });
  page.on('response', (resp) => {
    const u = resp.url();
    if (u.includes('supabase.co/rest') || u.includes('supabase.co/rpc')) {
      fetchOk.push({ url: u, status: resp.status(), method: resp.request().method() });
    }
  });

  await login(page);

  // Stay on home, wait 20s, DO NOT navigate — no goto, no click.
  console.log('[WAIT] holding on / for 20s to let all layout queries settle...');
  await page.waitForTimeout(20000);

  await browser.close();

  // ── Analysis ──
  console.log('\n────── Console errors observed ──────');
  const relevantErrors = errors.filter((e) =>
    TARGET_ERRORS.some((t) => e.includes(t)),
  );

  for (const target of TARGET_ERRORS) {
    const hit = errors.find((e) => e.includes(target));
    console.log(`${hit ? '✗' : '✓'} ${target} — ${hit ? 'STILL ERRORED' : 'no error'}`);
  }

  console.log('\n────── Supabase fetch metrics ──────');
  console.log(`Total responses: ${fetchOk.length}`);
  console.log(`Request failures: ${fetchFailures.length}`);
  const non2xx = fetchOk.filter((r) => r.status >= 400);
  console.log(`Non-2xx responses: ${non2xx.length}`);
  if (non2xx.length > 0) {
    console.log('Failing responses:');
    for (const r of non2xx) console.log(`  ${r.status} ${r.method} ${r.url.substring(0, 100)}`);
  }
  if (fetchFailures.length > 0) {
    console.log('Failed requests:');
    for (const r of fetchFailures) console.log(`  ${r.method} ${r.url.substring(0, 100)}`);
  }

  console.log('\n────── Verdict ──────');
  if (relevantErrors.length === 0) {
    console.log('✓ All 5 fetch errors GONE when holding on /.');
    console.log('→ Navigation abort is the likely cause.');
    console.log('→ Fix: demote console.error to console.warn for TypeError: Failed to fetch.');
  } else {
    console.log(`✗ ${relevantErrors.length} errors STILL present without any navigation:`);
    for (const e of relevantErrors) console.log(`  ${e.substring(0, 200)}`);
    console.log('→ Real bug — deeper investigation needed.');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
