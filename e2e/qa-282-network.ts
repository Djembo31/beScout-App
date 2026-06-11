/**
 * Slice 282 Live-Verify (AC-01 + AC-07) — Network-Trace auf Home (eingeloggt).
 * Beweist: kein GET /api/players (ohne ?movers) mehr + Transfer-Size-Summe.
 * Run: npx tsx e2e/qa-282-network.ts
 */
import { chromium } from '@playwright/test';

const BASE_URL = process.env.QA_BASE_URL ?? 'https://www.bescout.net';
const EMAIL = 'jarvis-qa@bescout.net';
const PASSWORD = 'JarvisQA2026!';

type Req = { url: string; size: number; status: number };

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
  const page = await context.newPage();

  const requests: Req[] = [];
  page.on('response', async (res) => {
    try {
      const body = await res.body().catch(() => Buffer.alloc(0));
      requests.push({ url: res.url(), size: body.length, status: res.status() });
    } catch { /* detached */ }
  });

  // Login
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const accept = page.getByRole('button', { name: 'Akzeptieren' });
  if (await accept.isVisible({ timeout: 800 }).catch(() => false)) {
    await accept.click().catch(() => {});
    await page.waitForTimeout(300);
  }
  await page.getByPlaceholder('E-Mail Adresse').fill(EMAIL);
  await page.getByPlaceholder('Passwort').fill(PASSWORD);
  await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 });

  // Fresh trace nur für Home
  requests.length = 0;
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(4000); // deferred below-fold Queries (800ms-Timer) + settle

  const playersFull = requests.filter(
    (r) => r.url.includes('/api/players') && !r.url.includes('movers=true'),
  );
  const playersMovers = requests.filter((r) => r.url.includes('movers=true'));
  const byIds = requests.filter((r) => r.url.includes('/rest/v1/players') && r.url.includes('id=in.'));
  const totalBytes = requests.reduce((s, r) => s + r.size, 0);

  console.log('=== Slice 282 Live-Network-Verify (Home, eingeloggt, 393px) ===');
  console.log(`Requests total: ${requests.length} | Transfer-Sum (response bodies): ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`AC-01 — GET /api/players (full): ${playersFull.length} ${playersFull.length === 0 ? '✅ ELIMINIERT' : '❌ NOCH DA'}`);
  playersFull.forEach((r) => console.log(`   ❌ ${r.url} (${(r.size / 1024).toFixed(0)} KB)`));
  console.log(`Movers-Endpoint (erwartet 1): ${playersMovers.length}${playersMovers[0] ? ` — ${(playersMovers[0].size / 1024).toFixed(1)} KB` : ''}`);
  console.log(`byIds-Mini-Fetches (rest/v1 players id=in.): ${byIds.length}`);
  byIds.forEach((r) => console.log(`   • ${(r.size / 1024).toFixed(1)} KB`));

  await page.screenshot({ path: 'qa-screenshots/282-home-mobile.png', fullPage: false });
  console.log('Screenshot: qa-screenshots/282-home-mobile.png');

  await browser.close();
  process.exit(playersFull.length === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
