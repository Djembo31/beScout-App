import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

/**
 * Slice 368e Visual-Proof — Markteintritt-Modell (D101).
 * Verifiziert gegen Prod (bescout.net), dass nach der Reader-Konsolidierung
 * "Markteintritt" (TradingTab) und "Dein Einstieg" (RewardsTab) aus EINER Quelle
 * (prices.ipoPrice) kommen → identischer Wert, kein NaN, kein i18n-Key-Leak.
 * Mobile 393px (iPhone 16). 2 Spieler.
 */

const BASE = process.env.QA_BASE_URL ?? 'https://www.bescout.net';
const EMAIL = process.env.QA_EMAIL ?? 'jarvis-qa@bescout.net';
const PASSWORD = process.env.QA_PASSWORD ?? 'JarvisQA2026!';

const outDir = path.join(__dirname, '..', 'worklog', 'proofs');
fs.mkdirSync(outDir, { recursive: true });
const REPORT = path.join(outDir, '368e-playwright-report.md');

type Sample = {
  href: string;
  markteintritt: string | null;
  deinEinstieg: string | null;
  match: boolean;
  hasNaN: boolean;
  i18nLeak: string[];
};

const I18N_LEAK = /\b(player|market|rewards|common|trading)\.[a-z][a-zA-Z]{2,}\b/;

async function clickTabByText(page: import('playwright').Page, re: RegExp) {
  const btn = page.getByRole('tab', { name: re }).or(page.getByRole('button', { name: re })).first();
  if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await btn.click().catch(() => {});
    await page.waitForTimeout(1200);
    return true;
  }
  return false;
}

/** Text after a label within the same enclosing block. */
async function readNear(page: import('playwright').Page, labelRe: RegExp): Promise<string | null> {
  const loc = page.getByText(labelRe).first();
  if (!(await loc.isVisible({ timeout: 1500 }).catch(() => false))) return null;
  // Walk up to a container and grab its text, then strip the label.
  const txt = await loc.evaluate((el) => {
    let node: HTMLElement | null = el as HTMLElement;
    for (let i = 0; i < 3 && node; i++) node = node.parentElement;
    return (node?.textContent ?? el.textContent ?? '').replace(/\s+/g, ' ').trim();
  }).catch(() => null);
  return txt;
}

/** First number that appears AFTER the label inside the container text
 *  (readNear walks up parents → container may contain sibling values like
 *  "letzterPreis: 550 Markteintritt: 500 +10%"; we want the one after the label). */
function extractAfter(s: string | null, label: string): string | null {
  if (!s) return null;
  const idx = s.indexOf(label);
  const tail = idx >= 0 ? s.slice(idx + label.length) : s;
  const m = tail.match(/(\d{1,3}(?:[.\s]\d{3})*(?:,\d+)?|\d+)/);
  return m ? m[1].replace(/\s/g, '') : null;
}

async function main() {
  console.log(`[368e] Target ${BASE}`);
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 }, // iPhone 16
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') {
      const t = m.text();
      if (!t.includes('favicon') && !t.includes('React DevTools')) consoleErrors.push(t);
    }
  });

  const samples: Sample[] = [];
  try {
    // Login
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    const accept = page.getByRole('button', { name: 'Akzeptieren' });
    if (await accept.isVisible({ timeout: 1500 }).catch(() => false)) { await accept.click().catch(() => {}); await page.waitForTimeout(400); }
    await page.getByPlaceholder('E-Mail Adresse').fill(EMAIL);
    await page.getByPlaceholder('Passwort').fill(PASSWORD);
    await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 });
    console.log('[368e] Login OK');

    // Collect 2 player hrefs from /market
    await page.goto(`${BASE}/market`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2500);
    const hrefs: string[] = [];
    const links = page.locator('a[href^="/player/"]');
    const n = Math.min(await links.count(), 8);
    for (let i = 0; i < n && hrefs.length < 2; i++) {
      const h = await links.nth(i).getAttribute('href').catch(() => null);
      if (h && !hrefs.includes(h)) hrefs.push(h);
    }
    console.log(`[368e] Players: ${hrefs.join(', ')}`);

    for (const href of hrefs) {
      // ?tab=rewards klappt RewardsTab ("Dein Einstieg") in der TradingTab-Ansicht auf;
      // "Markteintritt" steht ohnehin im Haupt-TradingTab-Body → beide auf einer Seite.
      await page.goto(`${BASE}${href}?tab=rewards`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForTimeout(3000);

      const mkText = await readNear(page, /Markteintritt/i);
      const einText = await readNear(page, /Dein Einstieg/i);
      const markteintritt = extractAfter(mkText, 'Markteintritt');
      const deinEinstieg = extractAfter(einText, 'Dein Einstieg');

      const body = (await page.locator('body').textContent().catch(() => '')) ?? '';
      const hasNaN = /NaN/.test(body);
      const leak = body.match(new RegExp(I18N_LEAK, 'g')) ?? [];

      const slug = href.split('/').pop() ?? 'p';
      await page.screenshot({ path: path.join(outDir, `368e-${slug}.png`), fullPage: true }).catch(() => {});

      samples.push({
        href,
        markteintritt,
        deinEinstieg,
        match: !!markteintritt && markteintritt === deinEinstieg,
        hasNaN,
        i18nLeak: Array.from(new Set(leak)).slice(0, 5),
      });
      console.log(`[368e] ${href}: Markteintritt=${markteintritt} DeinEinstieg=${deinEinstieg} match=${markteintritt === deinEinstieg} NaN=${hasNaN}`);
    }

    const allMatch = samples.every((s) => s.match);
    const noNaN = samples.every((s) => !s.hasNaN);
    const noLeak = samples.every((s) => s.i18nLeak.length === 0);
    const verdict = allMatch && noNaN && noLeak && consoleErrors.length === 0;

    const report = [
      `# Slice 368e Playwright-Proof — Markteintritt == Dein Einstieg (eine Quelle)`,
      ``, `**Datum:** ${new Date().toISOString()}`, `**Target:** ${BASE} · Mobile 393px`, ``,
      `| Player | Markteintritt | Dein Einstieg | match | NaN | i18n-leak |`,
      `|--------|---------------|---------------|-------|-----|-----------|`,
      ...samples.map((s) => `| ${s.href} | ${s.markteintritt ?? '—'} | ${s.deinEinstieg ?? '—'} | ${s.match ? '✅' : '❌'} | ${s.hasNaN ? '❌' : '✅'} | ${s.i18nLeak.length ? s.i18nLeak.join(',') : '✅'} |`),
      ``, `**Console-Errors:** ${consoleErrors.length}`,
      ...(consoleErrors.length ? ['```', ...consoleErrors.slice(0, 8), '```'] : []),
      ``, `## Verdict: ${verdict ? '✅ PASS' : '⚠ REVIEW'}`,
      `- Markteintritt == Dein Einstieg (eine Quelle): ${allMatch ? 'PASS' : 'FAIL'}`,
      `- Kein NaN: ${noNaN ? 'PASS' : 'FAIL'} · Kein i18n-Leak: ${noLeak ? 'PASS' : 'FAIL'}`,
      ``,
    ].join('\n');
    fs.writeFileSync(REPORT, report);
    console.log(`[368e] Report: ${REPORT}`);
    console.log(`[368e] VERDICT: ${verdict ? 'PASS' : 'REVIEW'}`);
  } catch (err) {
    console.error('[368e] FAILED:', err);
    await page.screenshot({ path: path.join(outDir, '368e-error.png') }).catch(() => {});
    throw err;
  } finally {
    await browser.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
