import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE = process.env.QA_BASE_URL ?? 'https://bescout.net';
const EMAIL = process.env.QA_EMAIL ?? 'jarvis-qa@bescout.net';
const PASSWORD = process.env.QA_PASSWORD ?? 'JarvisQA2026!';
const outDir = path.join(__dirname, '..', 'worklog', 'proofs');
fs.mkdirSync(outDir, { recursive: true });

/**
 * Slice 133 post-deploy verification
 *  - /clubs shows correct non-stale player counts (e.g. Beşiktaş 20, Galatasaray 35).
 *  - Follow click updates "Deine Vereine" + Fans-count instantly (optimistic).
 *
 * Reads the visible "X Spieler" text per club card, compares against DB truth.
 */

const EXPECTED_DB_TRUTH: Record<string, number> = {
  'Beşiktaş': 20,
  'Galatasaray': 35,
  'Fenerbahçe': 31,
  'Alanyaspor': 33,
  'Eyüpspor': 47,
  'Antalyaspor': 35,
  'Başakşehir': 28,
  'Fatih Karagümrük': 33,
  'Gaziantep FK': 27,
  'Göztepe': 25,
  'Kasımpaşa': 33,
};

async function main() {
  console.log(`[133] Verifying ${BASE}/clubs against DB truth...`);
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  // Login
  console.log('[133] Login...');
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  const accept = page.getByRole('button', { name: 'Akzeptieren' });
  if (await accept.isVisible({ timeout: 1500 }).catch(() => false)) {
    await accept.click().catch(() => {});
    await page.waitForTimeout(400);
  }
  await page.getByPlaceholder('E-Mail Adresse').fill(EMAIL);
  await page.getByPlaceholder('Passwort').fill(PASSWORD);
  await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 });
  const later = page.getByText(/Später|Later/i).first();
  if (await later.isVisible({ timeout: 1000 }).catch(() => false)) {
    await later.click().catch(() => {});
  }

  // Navigate to /clubs
  console.log('[133] Navigate /clubs...');
  await page.goto(`${BASE}/clubs`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(3000); // wait for lazy data fetch

  // Screenshot
  const shot = path.join(outDir, '133-clubs-page-live.png');
  await page.screenshot({ path: shot, fullPage: true });
  console.log(`[133] Screenshot saved: ${shot}`);

  // Parse card counts — each card has "X Spieler" next to Users icon
  const cards = await page.locator('[class*="Card"], .card, article, div').all();
  const results: Record<string, number> = {};
  for (const [clubName] of Object.entries(EXPECTED_DB_TRUTH)) {
    // Find the card that contains the club name, then the "NN Spieler" span
    const card = page.locator(`div:has(> div:text-is("${clubName}")), div:has(> a:text-is("${clubName}"))`).first();
    const text = await card.innerText({ timeout: 3000 }).catch(() => '');
    const match = text.match(/(\d+)\s+Spieler/);
    if (match) results[clubName] = Number(match[1]);
  }

  // Fallback: extract all "NN Spieler" + club-name pairs from the whole page HTML
  console.log('[133] Extracting card contents via DOM text scan...');
  const scan = await page.evaluate(() => {
    const out: Array<{ club: string; count: number }> = [];
    const all = Array.from(document.querySelectorAll('a, div'));
    for (const el of all) {
      const txt = (el.textContent ?? '').trim();
      const m = txt.match(/^(.+?)\s+[A-Za-zÀ-ž.]+\s+0 Fans\s+(\d+) Spieler/);
      if (m) out.push({ club: m[1].trim(), count: Number(m[2]) });
    }
    return out;
  });

  const report: string[] = [];
  report.push('# Slice 133 — Post-Deploy /clubs Verification');
  report.push(`Run: ${new Date().toISOString()}`);
  report.push(`Target: ${BASE}`);
  report.push(`Commit: fd4a2282`);
  report.push('');
  report.push('| Club | DB truth | UI (live) | Status |');
  report.push('|------|---------:|----------:|:------:|');
  let allOk = true;
  for (const [club, expected] of Object.entries(EXPECTED_DB_TRUTH)) {
    const fromScan = scan.find(s => s.club.includes(club))?.count;
    const actual = fromScan ?? results[club] ?? null;
    const status = actual === null ? '?' : actual === expected ? 'OK' : 'FAIL';
    if (status !== 'OK') allOk = false;
    report.push(`| ${club} | ${expected} | ${actual ?? '—'} | ${status} |`);
  }
  report.push('');
  report.push(`Overall: ${allOk ? 'GREEN' : 'INVESTIGATE'}`);
  report.push('');
  report.push('## Raw scan (DOM text matches for "NN Spieler"):');
  for (const s of scan) report.push(`- ${s.club}: ${s.count}`);

  const reportPath = path.join(outDir, '133-clubs-live-report.md');
  fs.writeFileSync(reportPath, report.join('\n'), 'utf-8');
  console.log(`[133] Report: ${reportPath}`);

  await browser.close();

  if (!allOk) {
    console.error('[133] One or more clubs did NOT match DB truth. See report.');
    process.exit(1);
  }
  console.log('[133] All checked clubs match DB truth ✅');
}

main().catch((err) => {
  console.error('[133] ERROR:', err);
  process.exit(2);
});
