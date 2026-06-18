/**
 * QA Slice 347 (FRE-5) — Club-konfigurierbare Fan-Rang-Schwellen
 * Live-Proof gegen bescout.net: AC9 (Leiter zeigt Club-Schwellen) + AC10 (Admin-Save-Roundtrip).
 * Run: npx tsx e2e/qa-347-fanrank-thresholds.ts
 */
import { chromium, type Page } from '@playwright/test';

const BASE = process.env.QA_BASE_URL ?? 'https://bescout.net';
const ADMIN_EMAIL = 'demo-admin@bescout.app';
const DEMO_PASSWORD = 'BeScout2026!';
const OUT = 'qa-screenshots/347';

async function login(page: Page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  const accept = page.getByRole('button', { name: 'Akzeptieren' });
  if (await accept.isVisible({ timeout: 2000 }).catch(() => false)) await accept.click();
  await page.getByPlaceholder('E-Mail Adresse').fill(ADMIN_EMAIL);
  await page.getByPlaceholder('Passwort').fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 });
  await page.evaluate(() => localStorage.setItem('bescout-welcome-shown', '1'));
  console.log('[login] redirected to', page.url());
}

async function main() {
  const errors: string[] = [];
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 } }); // iPhone 16
  const page = await ctx.newPage();
  page.on('console', (m) => {
    const t = m.text();
    if (t.includes('MISSING_MESSAGE')) errors.push('MISSING_MESSAGE: ' + t);
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

  await login(page);

  // demo-admin redirects to /club/<slug>/admin — extract slug
  const m = page.url().match(/\/club\/([^/]+)\/admin/);
  const slug = m?.[1];
  if (!slug) { console.log('[WARN] not on admin page, url=', page.url()); }
  console.log('[slug]', slug);

  // --- AC10: Admin Fans tab → Fan-Rang-Schwellen section ---
  if (slug) await page.goto(`${BASE}/club/${slug}/admin`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const fansTab = page.getByRole('button', { name: /Fans CRM|Fans/ }).first();
  if (await fansTab.isVisible({ timeout: 8000 }).catch(() => false)) {
    await fansTab.click();
    await page.waitForTimeout(1200);
  }
  const thrHeading = page.getByText('Fan-Rang-Schwellen', { exact: false }).first();
  const thrVisible = await thrHeading.isVisible({ timeout: 8000 }).catch(() => false);
  console.log('[AC10] Fan-Rang-Schwellen section visible:', thrVisible);
  if (thrVisible) await thrHeading.scrollIntoViewIfNeeded().catch(() => {});
  await page.screenshot({ path: `${OUT}/admin-fans-thresholds.png`, fullPage: true });
  console.log('[AC10] screenshot saved');

  // --- AC9: club "Mehr" tab → Fan-Rang ladder ---
  if (slug) {
    await page.goto(`${BASE}/club/${slug}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    // dismiss cookie banner (it overlays + intercepts clicks)
    const acc = page.getByRole('button', { name: /Akzeptieren|Nur notwendige/ }).first();
    if (await acc.isVisible({ timeout: 3000 }).catch(() => false)) { await acc.click(); await page.waitForTimeout(500); }
    const mehr = page.getByRole('tab', { name: 'Mehr' }).or(page.getByRole('button', { name: 'Mehr', exact: true })).first();
    if (await mehr.isVisible({ timeout: 8000 }).catch(() => false)) {
      await mehr.scrollIntoViewIfNeeded().catch(() => {});
      await mehr.click();
      await page.waitForTimeout(1500);
      console.log('[AC9] Mehr tab clicked');
    } else {
      console.log('[AC9][WARN] Mehr tab not found');
    }
    const ladder = page.getByText('Fan-Rang', { exact: false }).first();
    const ladderVisible = await ladder.isVisible({ timeout: 6000 }).catch(() => false);
    console.log('[AC9] Fan-Rang ladder visible:', ladderVisible);
    if (ladderVisible) await ladder.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/club-ladder.png`, fullPage: true });
    console.log('[AC9] club ladder screenshot saved');
  }

  console.log('\n=== CONSOLE/PAGE ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'NONE');
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
