/**
 * Slice 284c Live-Verify — Markt/Rankings-Fixes (FM-01..05,07).
 * Run: npx tsx e2e/qa-284c-verify.ts
 */
import { chromium } from '@playwright/test';

const BASE_URL = process.env.QA_BASE_URL ?? 'https://www.bescout.net';
const EMAIL = 'jarvis-qa@bescout.net';
const PASSWORD = 'JarvisQA2026!';

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
  const page = await context.newPage();
  const errors: string[] = [];
  let current = 'login';
  page.on('console', (m) => {
    if (m.type() === 'error') {
      const t = m.text();
      if (/React DevTools|third-party cookie|apple-mobile-web-app/i.test(t)) return;
      errors.push(`[${current}] ${t.slice(0, 200)}`);
    }
  });
  page.on('pageerror', (e) => errors.push(`[${current}] PAGEERROR ${String(e).slice(0, 200)}`));

  // Login
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const accept = page.getByRole('button', { name: 'Akzeptieren' });
  if (await accept.isVisible({ timeout: 800 }).catch(() => false)) await accept.click().catch(() => {});
  await page.getByPlaceholder('E-Mail Adresse').fill(EMAIL);
  await page.getByPlaceholder('Passwort').fill(PASSWORD);
  await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 });

  // ── /rankings: default + Veränderung-Tab + Liga-Filter ──
  current = 'rankings';
  await page.goto(`${BASE_URL}/rankings`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'qa-screenshots/284c-rankings-default.png', fullPage: true });

  // FM-02: "Veränderung"-Tab — darf KEINE Zufallsliste voller +0% sein
  const changeTab = page.getByRole('button', { name: /Veränderung|Değişim/i }).first();
  if (await changeTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await changeTab.click().catch(() => {});
    await page.waitForTimeout(2500);
    await page.screenshot({ path: 'qa-screenshots/284c-rankings-change.png', fullPage: true });
    const body = (await page.locator('body').textContent()) ?? '';
    // Empty-State ODER echte Bewegung — aber NICHT 20× "+0%"
    const zeroPctCount = (body.match(/\+0[.,]0\s*%/g) ?? []).length;
    console.log(`[FM-02] Veränderung-Tab: "+0,0%"-Vorkommen=${zeroPctCount} (erwartet 0 — sonst Zufallsliste)`);
  } else {
    console.log('[FM-02] Veränderung-Tab nicht gefunden (Tab-Label?)');
  }

  // ── /manager Kader ──
  current = 'manager-kader';
  await page.goto(`${BASE_URL}/manager`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'qa-screenshots/284c-manager-kader.png', fullPage: true });

  console.log('\n=== CONSOLE ERRORS ===');
  console.log(errors.length === 0 ? '✅ KEINE' : errors.join('\n'));
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
