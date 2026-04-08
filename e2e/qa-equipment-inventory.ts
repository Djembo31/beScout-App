import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const screenshotDir = path.join(__dirname, 'screenshots', 'equipment');
fs.mkdirSync(screenshotDir, { recursive: true });

const BASE = 'http://localhost:3000';
const EMAIL = 'jarvis-qa@bescout.net';
const PASSWORD = 'JarvisQA2026!';

async function login(page: any) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);
  try {
    const btn = page.getByRole('button', { name: 'Akzeptieren' });
    if (await btn.isVisible({ timeout: 3000 })) {
      await btn.click();
      await page.waitForTimeout(500);
    }
  } catch {}
  try {
    await page.getByPlaceholder('E-Mail Adresse').fill(EMAIL);
    const pw = page.getByPlaceholder('Passwort');
    await pw.click();
    await pw.fill(PASSWORD);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
  } catch {
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.waitForTimeout(500);
    await page.locator('button[type="submit"]').click();
  }
  await page.waitForURL('**/', { timeout: 15000 });
  const url = page.url();
  if (url.includes('/login') || url.includes('/welcome')) {
    throw new Error(`Still on ${url} after login`);
  }
  console.log('[LOGIN] OK:', url);
}

async function captureTab(
  page: any,
  label: string,
  action: () => Promise<void>,
) {
  await action();
  await page.waitForTimeout(1500);
  const file = path.join(screenshotDir, `${label}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`[CAPTURE] ${label} → ${file}`);
}

async function main() {
  const browser = await chromium.launch();
  // ===== MOBILE =====
  {
    console.log('\n========== MOBILE 402x874 ==========');
    const context = await browser.newContext({
      viewport: { width: 402, height: 874 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    page.on('console', (msg: any) => {
      if (msg.type() === 'error') console.log('[BROWSER ERROR]', msg.text());
    });
    await login(page);

    // Inventory → Equipment tab (default)
    await captureTab(page, 'mobile-01-inventory-all', async () => {
      await page.goto(`${BASE}/inventory?tab=equipment`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
    });

    // Click "Aktiv" toggle
    await captureTab(page, 'mobile-02-inventory-active', async () => {
      await page.getByRole('tab', { name: 'Aktiv', exact: true }).click();
      await page.waitForTimeout(500);
    });

    // Click "Verbraucht" toggle
    await captureTab(page, 'mobile-03-inventory-consumed', async () => {
      await page.getByRole('tab', { name: 'Verbraucht', exact: true }).click();
      await page.waitForTimeout(500);
    });

    // Back to Alle
    await page.getByRole('tab', { name: 'Alle', exact: true }).click();
    await page.waitForTimeout(500);

    // Position filter GK
    await captureTab(page, 'mobile-04-inventory-filter-gk', async () => {
      await page.getByRole('button', { name: 'GK', exact: true }).click();
      await page.waitForTimeout(500);
    });

    // Reset filter
    await page.getByRole('button', { name: 'Alle', exact: true }).first().click();
    await page.waitForTimeout(500);

    // Manager Aufstellen tab
    await captureTab(page, 'mobile-05-manager-aufstellen', async () => {
      await page.goto(`${BASE}/manager`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3500);
    });

    // Manager Kader tab
    await captureTab(page, 'mobile-06-manager-kader', async () => {
      const kaderTab = page.getByRole('tab', { name: /Kader/i }).first();
      if (await kaderTab.isVisible({ timeout: 3000 })) {
        await kaderTab.click();
        await page.waitForTimeout(2000);
      }
    });

    await context.close();
  }

  // ===== DESKTOP =====
  {
    console.log('\n========== DESKTOP 1280x800 ==========');
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    page.on('console', (msg: any) => {
      if (msg.type() === 'error') console.log('[BROWSER ERROR]', msg.text());
    });
    await login(page);

    await captureTab(page, 'desktop-01-inventory-all', async () => {
      await page.goto(`${BASE}/inventory?tab=equipment`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
    });

    await captureTab(page, 'desktop-02-inventory-active', async () => {
      await page.getByRole('tab', { name: 'Aktiv', exact: true }).click();
      await page.waitForTimeout(500);
    });

    await captureTab(page, 'desktop-03-inventory-consumed', async () => {
      await page.getByRole('tab', { name: 'Verbraucht', exact: true }).click();
      await page.waitForTimeout(500);
    });

    await captureTab(page, 'desktop-04-manager-aufstellen', async () => {
      await page.goto(`${BASE}/manager`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3500);
    });

    await captureTab(page, 'desktop-05-manager-kader', async () => {
      const kaderTab = page.getByRole('tab', { name: /Kader/i }).first();
      if (await kaderTab.isVisible({ timeout: 3000 })) {
        await kaderTab.click();
        await page.waitForTimeout(2000);
      }
    });

    await context.close();
  }

  await browser.close();
  console.log('\n[DONE] Screenshots in', screenshotDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
