/**
 * Polish Sweep screenshot helper.
 *
 * Takes a fullPage screenshot at mobile 390×844 and desktop 1280×900
 * for a given page route + slug, dropping them into
 *   e2e/screenshots/polish-sweep/<slug>/{mobile,desktop}.png
 *
 * Supports optional tab/modal variants for multi-state pages:
 *   npx tsx e2e/qa-polish.ts --path=/fantasy --slug=fantasy --variant=events
 *     → e2e/screenshots/polish-sweep/fantasy/{mobile,desktop}-events.png
 *
 * Usage:
 *   npx tsx e2e/qa-polish.ts --path=/ --slug=home
 *   npx tsx e2e/qa-polish.ts --path=/market?tab=kaufen --slug=market --variant=kaufen
 *   npx tsx e2e/qa-polish.ts --path=/inventory?tab=equipment --slug=inventory --variant=equipment
 *
 * All against http://localhost:3000 unless QA_BASE_URL is set.
 */
import { chromium, BrowserContext, Page } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE = process.env.QA_BASE_URL ?? 'http://localhost:3000';
const EMAIL = 'jarvis-qa@bescout.net';
const PASSWORD = 'JarvisQA2026!';

// ── Parse CLI args ───────────────────────────────────────────────────
function arg(key: string): string | undefined {
  const pair = process.argv.find((a) => a.startsWith(`--${key}=`));
  return pair ? pair.slice(key.length + 3) : undefined;
}

const targetPath = arg('path');
const slug = arg('slug');
const variant = arg('variant');
const waitText = arg('wait'); // optional text to wait for before screenshot
const extraWait = Number(arg('delay') ?? '4000');

if (!targetPath || !slug) {
  console.error(
    'Usage: npx tsx e2e/qa-polish.ts --path=/market --slug=market [--variant=kaufen] [--wait="Kaufen"] [--delay=4000]',
  );
  process.exit(1);
}

const outDir = path.join(__dirname, 'screenshots', 'polish-sweep', slug);
fs.mkdirSync(outDir, { recursive: true });

async function login(page: Page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);
  try {
    const cookieBtn = page.getByRole('button', { name: 'Akzeptieren' });
    if (await cookieBtn.isVisible({ timeout: 2500 })) {
      await cookieBtn.click();
      await page.waitForTimeout(500);
    }
  } catch {}
  try {
    await page.getByPlaceholder('E-Mail Adresse').fill(EMAIL);
    const pw = page.getByPlaceholder('Passwort');
    await pw.click();
    await pw.fill(PASSWORD);
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
  } catch {
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.waitForTimeout(400);
    await page.locator('button[type="submit"]').click();
  }
  await page.waitForURL('**/', { timeout: 30000 });
}

async function shot(ctx: BrowserContext, viewport: 'mobile' | 'desktop') {
  const page = await ctx.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const t = msg.text();
      if (
        !t.includes('Failed to fetch RSC payload') &&
        !t.includes('cannot be a descendant')
      ) {
        console.log(`[${viewport.toUpperCase()} ERR]`, t.substring(0, 180));
      }
    }
  });

  try {
    await login(page);
    await page.goto(`${BASE}${targetPath}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.waitForTimeout(extraWait);

    if (waitText) {
      try {
        await page.getByText(waitText).first().waitFor({ state: 'visible', timeout: 8000 });
      } catch {
        console.log(`[${viewport}] wait text "${waitText}" not found, continuing`);
      }
    }

    const filename = variant
      ? `${viewport}-${variant}.png`
      : `${viewport}.png`;
    const outPath = path.join(outDir, filename);
    await page.screenshot({ path: outPath, fullPage: true });
    console.log(`[${viewport}] ${outPath}`);
  } catch (err) {
    console.error(`[${viewport}] failed:`, (err as Error).message.split('\n')[0]);
  }
  await page.close();
}

async function main() {
  const browser = await chromium.launch();

  const desktopCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await shot(desktopCtx, 'desktop');
  await desktopCtx.close();

  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  await shot(mobileCtx, 'mobile');
  await mobileCtx.close();

  await browser.close();
  console.log(`\nDone: ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
