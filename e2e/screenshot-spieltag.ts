import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const screenshotDir = path.join(__dirname, 'screenshots', 'mobile');
fs.mkdirSync(screenshotDir, { recursive: true });

const BASE = 'http://localhost:5555';
const EMAIL = 'test@gmx.de';
const PASSWORD = 'BeScout2026!';

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 402, height: 874 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[ERR]', msg.text());
  });

  console.log('Logging in...');
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Accept cookie banner if visible
  try {
    const btn = page.getByRole('button', { name: 'Akzeptieren' });
    if (await btn.isVisible({ timeout: 2000 })) { await btn.click(); await page.waitForTimeout(500); }
  } catch {}

  // Fill login form
  await page.getByPlaceholder('E-Mail Adresse').fill(EMAIL);
  await page.getByPlaceholder('Passwort').fill(PASSWORD);
  await page.waitForTimeout(300);

  // Submit via button click
  await page.getByRole('button', { name: 'Anmelden', exact: true }).click();

  // Wait for auth redirect
  try {
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });
    console.log('Logged in:', page.url());
  } catch {
    console.log('Login may have failed. URL:', page.url());
    await page.screenshot({ path: path.join(screenshotDir, 'debug-auth3.png'), fullPage: true });
    // Try continuing anyway - maybe just slow redirect
  }

  await page.waitForTimeout(3000);

  // Navigate to Fantasy/Spieltag
  console.log('Navigating to /fantasy...');
  await page.goto(`${BASE}/fantasy`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(8000);

  const finalUrl = page.url();
  console.log('Final URL:', finalUrl);

  if (finalUrl.includes('/login')) {
    console.log('Not authenticated, aborting.');
    await browser.close(); return;
  }

  // Full page screenshot
  console.log('Screenshot spieltag-full...');
  await page.screenshot({ path: path.join(screenshotDir, 'spieltag-full.png'), fullPage: true });

  // Viewport-only screenshot
  console.log('Screenshot spieltag-viewport...');
  await page.screenshot({ path: path.join(screenshotDir, 'spieltag-viewport.png'), fullPage: false });

  console.log('Done!');
  await browser.close();
}
main().catch(console.error);
