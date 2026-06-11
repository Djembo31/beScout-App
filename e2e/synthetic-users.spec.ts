import { test, expect, Page, BrowserContext } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

const EMAIL = process.env.SMOKE_EMAIL ?? 'jarvis-qa@bescout.net';
const PASSWORD = process.env.SMOKE_PASSWORD ?? 'JarvisQA2026!';
const SCREENSHOT_ROOT = path.join(process.cwd(), 'qa-screenshots', 'synthetic');

// Entry pages every user sees (Profile A — Discovery)
const DISCOVERY_PAGES = [
  { url: '/', slug: 'home' },
  { url: '/market', slug: 'market' },
  { url: '/manager', slug: 'manager' },
  { url: '/fantasy', slug: 'fantasy' },
  { url: '/community', slug: 'community' },
  { url: '/missions', slug: 'missions' },
  { url: '/transactions', slug: 'transactions' },
  { url: '/founding', slug: 'founding' },
  { url: '/inventory', slug: 'inventory' },
  { url: '/rankings', slug: 'rankings' },
  { url: '/airdrop', slug: 'airdrop' },
  { url: '/profile', slug: 'profile' },
];

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

async function loginJarvis(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 30_000 });

  const accept = page.getByRole('button', { name: 'Akzeptieren' });
  if (await accept.isVisible({ timeout: 800 }).catch(() => false)) {
    await accept.click().catch(() => {});
    await page.waitForTimeout(300);
  }

  await page.getByPlaceholder('E-Mail Adresse').fill(EMAIL);
  await page.getByPlaceholder('Passwort').fill(PASSWORD);
  await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 });

  const later = page.getByText(/Später|Later/i).first();
  if (await later.isVisible({ timeout: 800 }).catch(() => false)) {
    await later.click().catch(() => {});
  }
}

type ConsoleCapture = { type: string; text: string; url: string };

function attachConsoleAndNetworkCapture(page: Page, capture: ConsoleCapture[]) {
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      capture.push({ type: msg.type(), text: msg.text(), url: page.url() });
    }
  });
  page.on('pageerror', (err) => {
    capture.push({ type: 'pageerror', text: err.message, url: page.url() });
  });
  page.on('requestfailed', (req) => {
    capture.push({
      type: 'requestfailed',
      text: `${req.method()} ${req.url()} — ${req.failure()?.errorText ?? 'unknown'}`,
      url: page.url(),
    });
  });
}

async function writeReport(outDir: string, profile: string, capture: ConsoleCapture[]) {
  await ensureDir(outDir);
  const lines = [
    `# Synthetic User Report — ${profile}`,
    `Run: ${new Date().toISOString()}`,
    `Target: ${process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'}`,
    ``,
    `## Errors + Warnings Captured (${capture.length})`,
    ``,
  ];
  if (capture.length === 0) {
    lines.push('Zero console errors, zero page errors, zero failed requests.');
  } else {
    const grouped = capture.reduce<Record<string, ConsoleCapture[]>>((acc, c) => {
      (acc[c.type] ??= []).push(c);
      return acc;
    }, {});
    for (const [type, items] of Object.entries(grouped)) {
      lines.push(`### ${type} (${items.length})`);
      items.forEach((c) => lines.push(`- [${c.url}] ${c.text}`));
      lines.push('');
    }
  }
  await fs.writeFile(path.join(outDir, 'report.md'), lines.join('\n'), 'utf-8');
}

// retries: 1 für alle 3 Synthetic-Profile — Cold-Start-Resilience gegen bescout.net.
// Global CI-retries würde 2 sein, aber 1 reicht hier + hält Screenshots deterministisch.
test.describe.configure({ retries: 1 });

test.describe('Synthetic Users — Profile A: Discovery (all entry pages)', () => {
  test('visit all 12 entry pages + screenshot each', async ({ browser }) => {
    test.setTimeout(600_000);
    const outDir = path.join(SCREENSHOT_ROOT, 'profile-a-discovery');
    await ensureDir(outDir);

    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();
    const capture: ConsoleCapture[] = [];
    attachConsoleAndNetworkCapture(page, capture);

    await loginJarvis(page);

    for (const { url, slug } of DISCOVERY_PAGES) {
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      }).catch(() => null);
      await page.waitForTimeout(1500);
      const status = response?.status() ?? 0;
      await page.screenshot({
        path: path.join(outDir, `${slug}_${status}.png`),
        fullPage: true,
      }).catch(() => {});
    }

    await writeReport(outDir, 'Profile A: Discovery', capture);
    await context.close();
  });
});

test.describe('Synthetic Users — Profile B: Power User (deep interactions)', () => {
  test('buy-flow UI check + lineup + mission-detail', async ({ browser }) => {
    test.setTimeout(300_000);
    const outDir = path.join(SCREENSHOT_ROOT, 'profile-b-power');
    await ensureDir(outDir);

    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();
    const capture: ConsoleCapture[] = [];
    attachConsoleAndNetworkCapture(page, capture);

    await loginJarvis(page);

    await test.step('market → click first card → player detail', async () => {
      await page.goto('/market', { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(outDir, '01_market_list.png'), fullPage: true });

      // Slice 282a: /market re-rendert live (Preis-/Realtime-Updates) — das first()-Element
      // ist visible, wird aber nie click-"stable" (33/36 Daily-Fails als locator.click-Timeout).
      // href-Extraktion + goto statt click: Synthetic prüft Player-Detail-Render-Coverage,
      // Click-Mechanik deckt die Post-Deploy-Smoke-Suite ab.
      const playerLink = page.locator('a[href*="/player/"]').first();
      const playerHref = (await playerLink.isVisible({ timeout: 10_000 }).catch(() => false))
        ? await playerLink.getAttribute('href').catch(() => null)
        : null;
      if (playerHref) {
        await page.goto(playerHref, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(outDir, '02_player_detail.png'), fullPage: true });

        // Try to open BuyModal (UI-only, no confirm)
        const buyBtn = page.getByRole('button', { name: /Kaufen|Buy/i }).first();
        if (await buyBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await buyBtn.click();
          await page.waitForTimeout(1500);
          await page.screenshot({ path: path.join(outDir, '03_buy_modal.png'), fullPage: true });
          // Close via ESC
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
        }
      }
    });

    await test.step('manager → Kader view', async () => {
      await page.goto('/manager', { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(outDir, '04_manager.png'), fullPage: true });
    });

    await test.step('fantasy → spieltag/lineup', async () => {
      await page.goto('/fantasy', { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(outDir, '05_fantasy.png'), fullPage: true });
    });

    await test.step('missions tab', async () => {
      await page.goto('/missions', { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(outDir, '06_missions.png'), fullPage: true });
    });

    await test.step('transactions history', async () => {
      await page.goto('/transactions', { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(outDir, '07_transactions.png'), fullPage: true });
    });

    await writeReport(outDir, 'Profile B: Power User', capture);
    await context.close();
  });
});

test.describe('Synthetic Users — Profile C: TR Locale (string scan)', () => {
  test('all discovery pages in TR + dump visible strings', async ({ browser }) => {
    test.setTimeout(600_000);
    const outDir = path.join(SCREENSHOT_ROOT, 'profile-c-tr-locale');
    await ensureDir(outDir);

    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();
    const capture: ConsoleCapture[] = [];
    attachConsoleAndNetworkCapture(page, capture);

    // Login FIRST on default DE locale (so "Anmelden" button matches).
    // THEN set TR cookie for all subsequent navigation.
    await loginJarvis(page);

    // Leading dot = cookie valid for hostname + ALL subdomains
    // (bescout.net → www.bescout.net). Without dot, cookie won't be sent to www.
    const baseHost = new URL(process.env.PLAYWRIGHT_BASE_URL ?? 'https://bescout.net').hostname;
    const cookieDomain = baseHost.startsWith('www.') ? baseHost.slice(4) : baseHost;
    await context.addCookies([
      {
        name: 'bescout-locale',
        value: 'tr',
        domain: `.${cookieDomain}`,
        path: '/',
      },
    ]);

    const allStrings = new Set<string>();

    for (const { url, slug } of DISCOVERY_PAGES) {
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      }).catch(() => null);
      await page.waitForTimeout(1500);
      const status = response?.status() ?? 0;
      await page.screenshot({
        path: path.join(outDir, `${slug}_${status}.png`),
        fullPage: true,
      }).catch(() => {});

      // Scrape visible strings (headings, buttons, links, paragraphs, list items)
      const pageStrings = await page.$$eval(
        'h1, h2, h3, h4, h5, button, a, p, li, span[class*="title"], [data-testid]',
        (els) =>
          els
            .map((e) => (e as HTMLElement).innerText?.trim() ?? '')
            .filter((s) => s.length > 0 && s.length < 200),
      ).catch(() => [] as string[]);

      for (const s of pageStrings) {
        // Skip obvious numeric/symbol-only strings
        if (/^[0-9\s.,:%\-+€$*#]+$/.test(s)) continue;
        if (s.length < 3) continue;
        allStrings.add(`[${slug}] ${s}`);
      }
    }

    const sorted = Array.from(allStrings).sort();
    await fs.writeFile(
      path.join(outDir, 'tr-strings.txt'),
      [
        `# TR Locale String Dump`,
        `Run: ${new Date().toISOString()}`,
        `Target: ${process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'}`,
        `Total unique strings: ${sorted.length}`,
        ``,
        ...sorted,
      ].join('\n'),
      'utf-8',
    );

    await writeReport(outDir, 'Profile C: TR Locale', capture);
    await context.close();
  });
});
