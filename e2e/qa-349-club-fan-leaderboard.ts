/**
 * QA Slice 349 (W2-B) — Club-Fan-Treue-Board ("Treueste Fans")
 * Live-Proof gegen bescout.net: Board rendert auf /club/sakaryaspor Tab "Mehr"
 * (desktop 1280 + mobile 393px) + Console-Scan auf MISSING_MESSAGE.
 * Run: npx tsx e2e/qa-349-club-fan-leaderboard.ts
 */
import { chromium, type Page } from '@playwright/test';

const BASE = process.env.QA_BASE_URL ?? 'https://bescout.net';
const FAN_EMAIL = 'demo-fan@bescout.app';
const DEMO_PASSWORD = 'BeScout2026!';
const SLUG = 'sakaryaspor';
const BOARD_TITLE = 'Treueste Fans';
const OUT = 'qa-screenshots/349';

async function login(page: Page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  const accept = page.getByRole('button', { name: 'Akzeptieren' });
  if (await accept.isVisible({ timeout: 2000 }).catch(() => false)) await accept.click();
  await page.getByPlaceholder('E-Mail Adresse').fill(FAN_EMAIL);
  await page.getByPlaceholder('Passwort').fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 });
  await page.evaluate(() => localStorage.setItem('bescout-welcome-shown', '1'));
  console.log('[login] redirected to', page.url());
}

async function openMoreTab(page: Page) {
  await page.goto(`${BASE}/club/${SLUG}`, { waitUntil: 'domcontentloaded' });
  // wait for hydration: the tablist must be interactive
  await page.getByRole('tablist').first().waitFor({ timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const moreTab = page.getByRole('tab', { name: 'Mehr', exact: true }).first();
  await moreTab.click({ timeout: 10_000 });
  // wait for tabpanel to switch + board query to resolve
  await page.waitForTimeout(2500);
}

async function main() {
  const errors: string[] = [];
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    const t = m.text();
    if (t.includes('MISSING_MESSAGE')) errors.push('MISSING_MESSAGE: ' + t);
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

  await login(page);
  await openMoreTab(page);

  // Desktop
  const titleDesktop = page.getByText(BOARD_TITLE, { exact: true }).first();
  const desktopVisible = await titleDesktop.isVisible({ timeout: 8000 }).catch(() => false);
  if (desktopVisible) await titleDesktop.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/desktop-more.png`, fullPage: true });
  // targeted card screenshot (the Card ancestor of the board title)
  const boardCard = titleDesktop.locator('xpath=ancestor::*[contains(@class,"p-5")][1]');
  if (await boardCard.isVisible({ timeout: 3000 }).catch(() => false)) {
    await boardCard.screenshot({ path: `${OUT}/board-card.png` }).catch(() => {});
  }
  console.log(`[desktop] "${BOARD_TITLE}" sichtbar:`, desktopVisible);

  // count rows under the board (Link rows inside the board card)
  let rowCount = 0;
  if (desktopVisible) {
    rowCount = await page.locator(`a[href^="/profile/"]`).count();
  }
  console.log('[desktop] profile-row links (Board-Einträge inkl. evtl. andere):', rowCount);

  // Mobile 393
  await page.setViewportSize({ width: 393, height: 852 });
  await page.waitForTimeout(800);
  const mobileVisible = await page.getByText(BOARD_TITLE, { exact: true }).first().isVisible({ timeout: 5000 }).catch(() => false);
  await page.screenshot({ path: `${OUT}/mobile-more.png`, fullPage: true });
  console.log(`[mobile 393] "${BOARD_TITLE}" sichtbar:`, mobileVisible);

  console.log('\n=== RESULT ===');
  console.log('desktop board visible :', desktopVisible);
  console.log('mobile  board visible :', mobileVisible);
  console.log('MISSING_MESSAGE / errors:', errors.length === 0 ? 'NONE ✅' : errors);
  console.log('screenshots:', `${OUT}/desktop-more.png`, `${OUT}/mobile-more.png`);

  await browser.close();
  const ok = desktopVisible && mobileVisible && errors.length === 0;
  console.log(ok ? '\n✅ PASS' : '\n⚠️ CHECK (siehe oben + screenshots)');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
