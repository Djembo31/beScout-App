/**
 * Slice 284 Phase-A Live-Walkthrough — Console-Error-Capture über die 5
 * Stabilisierungs-Domains (Spieltag/Markt/Rankings/Auswertung/Wettbewerbe).
 * Run: npx tsx e2e/qa-284-stab-walk.ts
 */
import { chromium } from '@playwright/test';

const BASE_URL = process.env.QA_BASE_URL ?? 'https://www.bescout.net';
const EMAIL = 'jarvis-qa@bescout.net';
const PASSWORD = 'JarvisQA2026!';

const PAGES = [
  { url: '/fantasy', slug: 'fantasy', extraWait: 6000 },
  { url: '/market', slug: 'market-portfolio', extraWait: 5000 },
  { url: '/rankings', slug: 'rankings', extraWait: 5000 },
  { url: '/manager?tab=historie', slug: 'manager-historie', extraWait: 6000 },
  { url: '/manager', slug: 'manager-kader', extraWait: 5000 },
];

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
  const page = await context.newPage();

  const errors: { page: string; type: string; text: string }[] = [];
  let current = 'login';
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      const text = msg.text();
      if (/Download the React DevTools|third-party cookie|apple-mobile-web-app/i.test(text)) return;
      errors.push({ page: current, type: msg.type(), text: text.slice(0, 220) });
    }
  });
  page.on('pageerror', (err) => errors.push({ page: current, type: 'PAGEERROR', text: String(err).slice(0, 220) }));
  page.on('response', (res) => {
    if (res.status() >= 400 && !res.url().includes('posthog') && !res.url().includes('sentry')) {
      errors.push({ page: current, type: `HTTP${res.status()}`, text: res.url().slice(0, 180) });
    }
  });

  // Login
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const accept = page.getByRole('button', { name: 'Akzeptieren' });
  if (await accept.isVisible({ timeout: 800 }).catch(() => false)) await accept.click().catch(() => {});
  await page.getByPlaceholder('E-Mail Adresse').fill(EMAIL);
  await page.getByPlaceholder('Passwort').fill(PASSWORD);
  await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 });

  for (const p of PAGES) {
    current = p.slug;
    await page.goto(`${BASE_URL}${p.url}`, { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch((e) => {
      errors.push({ page: p.slug, type: 'NAV-FAIL', text: String(e).slice(0, 150) });
    });
    await page.waitForTimeout(p.extraWait);
    await page.screenshot({ path: `qa-screenshots/284-${p.slug}.png`, fullPage: true }).catch(() => {});
  }

  // Marktplatz-Tab zusätzlich
  current = 'market-marktplatz';
  await page.goto(`${BASE_URL}/market?tab=marktplatz`, { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(9000);
  await page.screenshot({ path: 'qa-screenshots/284-market-marktplatz.png', fullPage: true }).catch(() => {});

  console.log('=== Slice 284 Stab-Walk — Console/HTTP-Befund ===');
  if (errors.length === 0) console.log('0 Errors/Warnings auf allen Pages ✅');
  const byPage = new Map<string, typeof errors>();
  errors.forEach((e) => { const a = byPage.get(e.page) ?? []; a.push(e); byPage.set(e.page, a); });
  byPage.forEach((list, pg) => {
    console.log(`\n--- ${pg} (${list.length}) ---`);
    const seen = new Set<string>();
    list.forEach((e) => {
      const key = e.type + e.text.slice(0, 80);
      if (seen.has(key)) return;
      seen.add(key);
      console.log(`[${e.type}] ${e.text}`);
    });
  });

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
