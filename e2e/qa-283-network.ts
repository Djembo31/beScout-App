/**
 * Slice 283 Live-Verify (AC-01/02) — Network-Trace /market + /manager (eingeloggt).
 * Beweist: kein GET /api/players (full) auf Default-Tab; Nachladen erst bei
 * Marktplatz-Tab-Klick. Run: npx tsx e2e/qa-283-network.ts
 */
import { chromium } from '@playwright/test';

const BASE_URL = process.env.QA_BASE_URL ?? 'https://www.bescout.net';
const EMAIL = 'jarvis-qa@bescout.net';
const PASSWORD = 'JarvisQA2026!';

type Req = { url: string; size: number };

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
  const page = await context.newPage();

  const requests: Req[] = [];
  page.on('response', async (res) => {
    try {
      const body = await res.body().catch(() => Buffer.alloc(0));
      requests.push({ url: res.url(), size: body.length });
    } catch { /* detached */ }
  });
  const playersFull = () => requests.filter((r) => r.url.includes('/api/players') && !r.url.includes('movers=true'));
  const byIds = () => requests.filter((r) => r.url.includes('/rest/v1/players') && r.url.includes('id=in.'));

  // Login
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const accept = page.getByRole('button', { name: 'Akzeptieren' });
  if (await accept.isVisible({ timeout: 800 }).catch(() => false)) await accept.click().catch(() => {});
  await page.getByPlaceholder('E-Mail Adresse').fill(EMAIL);
  await page.getByPlaceholder('Passwort').fill(PASSWORD);
  await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 });

  // ── /market Default-Tab (portfolio) ──
  requests.length = 0;
  await page.goto(`${BASE_URL}/market`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(5000);
  const marketDefaultFull = playersFull().length;
  const marketDefaultByIds = byIds().length;
  console.log(`/market (Default portfolio): /api/players(full)=${marketDefaultFull} ${marketDefaultFull === 0 ? '✅' : '❌'} | byIds=${marketDefaultByIds}`);
  await page.screenshot({ path: 'qa-screenshots/283-market-portfolio.png' });

  // ── Marktplatz-Tab-Klick → full-list lädt nach ──
  requests.length = 0;
  await page.getByRole('tab').nth(1).click();
  await page.waitForTimeout(8000);
  const afterTabFull = playersFull();
  console.log(`/market nach Marktplatz-Klick: /api/players(full)=${afterTabFull.length} ${afterTabFull.length >= 1 ? '✅ lazy nachgeladen' : '❌ NICHT geladen'}${afterTabFull[0] ? ` (${(afterTabFull[0].size / 1024 / 1024).toFixed(1)} MB decoded)` : ''}`);
  await page.screenshot({ path: 'qa-screenshots/283-market-marktplatz.png' });

  // ── /manager ──
  requests.length = 0;
  await page.goto(`${BASE_URL}/manager`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(5000);
  console.log(`/manager: /api/players(full)=${playersFull().length} ${playersFull().length === 0 ? '✅' : '⚠️ (Market-Tab-Store-Erbe F-07?)'} | byIds=${byIds().length}`);
  await page.screenshot({ path: 'qa-screenshots/283-manager.png' });

  await browser.close();
  process.exit(marketDefaultFull === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
