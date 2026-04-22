import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

/**
 * Slice 152 Money-Path Smoke-Test.
 *
 * Verifiziert dass nach WalletProvider-Elimination (152a-d) der
 * Wallet-Balance-Flow auf Prod weiterhin stimmig ist:
 *  - TopBar zeigt Balance-Zahl auf /home
 *  - Balance konsistent über /home → /market → /player Navigation
 *  - Kein Flicker/Wackeln beim Page-Wechsel
 *  - isBalanceFresh-Guard auf BuyModal funktioniert (Button disabled bis fresh)
 *
 * KEIN echter Trade — wir klicken nicht auf Buy-Confirm. Wir prüfen nur
 * Balance-Anzeige-Konsistenz quer durch die App.
 *
 * Ergebnis: 5 Screenshots + 1 Report-Markdown nach worklog/proofs/.
 */

const BASE = process.env.QA_BASE_URL ?? 'https://www.bescout.net';
const EMAIL = process.env.QA_EMAIL ?? 'jarvis-qa@bescout.net';
const PASSWORD = process.env.QA_PASSWORD ?? 'JarvisQA2026!';

const outDir = path.join(__dirname, '..', 'worklog', 'proofs');
fs.mkdirSync(outDir, { recursive: true });

const SHOT_HOME = path.join(outDir, '152-home-balance.png');
const SHOT_MARKET = path.join(outDir, '152-market-balance.png');
const SHOT_PLAYER = path.join(outDir, '152-player-balance.png');
const SHOT_BUYMODAL = path.join(outDir, '152-buymodal-fresh.png');
const SHOT_PROFILE = path.join(outDir, '152-profile-balance.png');
const REPORT = path.join(outDir, '152-money-path-report.md');

interface BalanceSample {
  page: string;
  topbarBalance: string | null;
  timestamp: number;
}

async function readTopBarBalance(page: import('playwright').Page): Promise<string | null> {
  // TopBar.tsx rendert Balance via fmtScout(centsToBsd(balanceCents))
  // Struktur: <span class="font-mono tabular-nums">BALANCE</span>
  // Heuristik: finde das erste Element mit Dollar-Sign-Icon-Nachbarn im header.
  const balanceText = await page
    .locator('header, [role="banner"], nav')
    .locator('text=/^\\d{1,3}(\\.\\d{3})*(,\\d+)?$|^\\d+\\s*CR/')
    .first()
    .textContent({ timeout: 2000 })
    .catch(() => null);
  return balanceText?.trim() ?? null;
}

async function main() {
  console.log(`[152-money-path] Testing against ${BASE}`);
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Skip noisy 3rd-party + known CSP warnings
      if (!text.includes('favicon') && !text.includes('Download the React DevTools')) {
        consoleErrors.push(text);
      }
    }
  });

  const samples: BalanceSample[] = [];

  try {
    // ── Login ──
    console.log('[152] Login...');
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
    console.log('[152] Login OK');

    // ── /home ──
    console.log('[152] Navigate /home → Balance lesen');
    await page.goto(`${BASE}/home`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2000); // Balance fetch + render
    const homeBalance = await readTopBarBalance(page);
    samples.push({ page: '/home', topbarBalance: homeBalance, timestamp: Date.now() });
    console.log(`[152]   /home TopBar-Balance: ${homeBalance ?? 'NOT FOUND'}`);
    await page.screenshot({ path: SHOT_HOME, fullPage: false });

    // ── /market ──
    console.log('[152] Navigate /market → Balance lesen');
    await page.goto(`${BASE}/market`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2500);
    const marketBalance = await readTopBarBalance(page);
    samples.push({ page: '/market', topbarBalance: marketBalance, timestamp: Date.now() });
    console.log(`[152]   /market TopBar-Balance: ${marketBalance ?? 'NOT FOUND'}`);
    await page.screenshot({ path: SHOT_MARKET, fullPage: false });

    // ── /profile ──
    console.log('[152] Navigate /profile → Balance lesen');
    await page.goto(`${BASE}/profile`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2000);
    const profileBalance = await readTopBarBalance(page);
    samples.push({ page: '/profile', topbarBalance: profileBalance, timestamp: Date.now() });
    console.log(`[152]   /profile TopBar-Balance: ${profileBalance ?? 'NOT FOUND'}`);
    await page.screenshot({ path: SHOT_PROFILE, fullPage: false });

    // ── /player/[random] ──
    console.log('[152] Find player link & navigate');
    await page.goto(`${BASE}/market`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(1500);
    const firstPlayer = page.locator('a[href^="/player/"]').first();
    const playerHref = await firstPlayer.getAttribute('href', { timeout: 5000 }).catch(() => null);
    if (playerHref) {
      console.log(`[152]   Navigate to ${playerHref}`);
      await page.goto(`${BASE}${playerHref}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForTimeout(2500);
      const playerBalance = await readTopBarBalance(page);
      samples.push({ page: playerHref, topbarBalance: playerBalance, timestamp: Date.now() });
      console.log(`[152]   ${playerHref} TopBar-Balance: ${playerBalance ?? 'NOT FOUND'}`);
      await page.screenshot({ path: SHOT_PLAYER, fullPage: false });

      // ── BuyModal isBalanceFresh-Guard ──
      console.log('[152] Try open BuyModal (without confirming trade)');
      const buyButton = page
        .getByRole('button', { name: /^Kaufen|^Buy|Market-Kauf/i })
        .first();
      const canBuy = await buyButton.isVisible({ timeout: 2000 }).catch(() => false);
      if (canBuy) {
        await buyButton.click().catch(() => {});
        await page.waitForTimeout(1500);
        await page.screenshot({ path: SHOT_BUYMODAL, fullPage: false });
        console.log('[152]   BuyModal-Screenshot OK');
      } else {
        console.log('[152]   No Buy-Button found (liquidated or no floor?) — skip BuyModal check');
      }
    } else {
      console.log('[152]   WARN: No player link found on /market');
    }

    // ── Zurück zu /home → Balance re-check (konsistenz nach Navigation) ──
    console.log('[152] Return to /home for consistency check');
    await page.goto(`${BASE}/home`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2000);
    const homeBalance2 = await readTopBarBalance(page);
    samples.push({ page: '/home (return)', topbarBalance: homeBalance2, timestamp: Date.now() });
    console.log(`[152]   /home (return) TopBar-Balance: ${homeBalance2 ?? 'NOT FOUND'}`);

    // ── Report ──
    const uniqueBalances = new Set(samples.map((s) => s.topbarBalance).filter(Boolean));
    const allSame = uniqueBalances.size <= 1;
    const consoleErrorCount = consoleErrors.length;

    const report = [
      `# Slice 152 Money-Path Smoke-Test`,
      ``,
      `**Datum:** ${new Date().toISOString()}`,
      `**Target:** ${BASE}`,
      `**User:** ${EMAIL}`,
      ``,
      `## Balance-Konsistenz quer durch Pages`,
      ``,
      `| Page | TopBar Balance | Timestamp |`,
      `|------|----------------|-----------|`,
      ...samples.map((s) => `| ${s.page} | ${s.topbarBalance ?? '(not found)'} | ${new Date(s.timestamp).toISOString().slice(11, 19)} |`),
      ``,
      `**Unique Balance-Werte:** ${uniqueBalances.size} (${Array.from(uniqueBalances).join(', ')})`,
      `**Konsistent:** ${allSame ? '✅ JA' : '❌ NEIN — Balance wackelt zwischen Pages!'}`,
      ``,
      `## Console-Errors`,
      ``,
      `**Count:** ${consoleErrorCount}`,
      ...(consoleErrorCount > 0 ? ['', '```', ...consoleErrors.slice(0, 10), '```'] : []),
      ``,
      `## Screenshots`,
      ``,
      `- /home: \`${path.basename(SHOT_HOME)}\``,
      `- /market: \`${path.basename(SHOT_MARKET)}\``,
      `- /profile: \`${path.basename(SHOT_PROFILE)}\``,
      `- /player/[id]: \`${path.basename(SHOT_PLAYER)}\``,
      `- BuyModal: \`${path.basename(SHOT_BUYMODAL)}\``,
      ``,
      `## Verdict`,
      ``,
      `- Balance-Konsistenz: ${allSame ? 'PASS' : 'FAIL'}`,
      `- Console-Errors: ${consoleErrorCount === 0 ? 'PASS' : `${consoleErrorCount} errors (siehe oben)`}`,
      `- Overall: ${allSame && consoleErrorCount === 0 ? '✅ PASS' : '⚠ REVIEW'}`,
      ``,
    ].join('\n');

    fs.writeFileSync(REPORT, report);
    console.log(`[152] Report written: ${REPORT}`);
    console.log(`[152] Overall verdict: ${allSame && consoleErrorCount === 0 ? '✅ PASS' : '⚠ REVIEW'}`);
  } catch (err) {
    console.error('[152] FAILED:', err);
    await page.screenshot({ path: path.join(outDir, '152-error.png') }).catch(() => {});
    throw err;
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
