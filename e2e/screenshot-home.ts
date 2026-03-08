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

  console.log('🔐 Logging in...');
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  try {
    const btn = page.getByRole('button', { name: 'Akzeptieren' });
    if (await btn.isVisible({ timeout: 3000 })) { await btn.click(); await page.waitForTimeout(500); }
  } catch {}
  try {
    await page.getByPlaceholder('E-Mail Adresse').fill(EMAIL);
    const pw = page.getByPlaceholder('Passwort');
    await pw.click(); await pw.fill(PASSWORD);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
  } catch {
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.waitForTimeout(500);
    await page.locator('button[type="submit"]').click();
  }
  try {
    await page.waitForURL('**/', { timeout: 15000 });
    const url = page.url();
    if (url.includes('/login') || url.includes('/welcome')) throw new Error('Still on login');
    console.log('✅ Logged in:', url);
  } catch {
    console.log('❌ Login failed');
    await page.screenshot({ path: path.join(screenshotDir, 'debug-auth.png'), fullPage: true });
    await browser.close(); return;
  }

  // Wait for data to load (skeleton → real content)
  await page.waitForTimeout(8000);
  console.log('📱 home-redesign...');
  await page.screenshot({ path: path.join(screenshotDir, 'home-redesign.png'), fullPage: true });

  console.log('✅ Done!');
  await browser.close();
}
main().catch(console.error);
