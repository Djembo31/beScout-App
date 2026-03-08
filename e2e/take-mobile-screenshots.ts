import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const screenshotDir = path.join(__dirname, 'screenshots', 'mobile');
fs.mkdirSync(screenshotDir, { recursive: true });

const BASE = 'http://localhost:3000';
const EMAIL = 'test@gmx.de';
const PASSWORD = 'BeScout2026!';

async function main() {
  const browser = await chromium.launch();

  // iPhone 14 Pro viewport
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });

  const page = await context.newPage();

  // --- Public pages ---
  console.log('📱 01-login...');
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(screenshotDir, '01-login.png'), fullPage: true });

  // Dismiss cookie consent
  try {
    const btn = page.getByRole('button', { name: 'Akzeptieren' });
    if (await btn.isVisible({ timeout: 2000 })) {
      await btn.click();
      await page.waitForTimeout(300);
    }
  } catch {}

  console.log('📱 02-pitch...');
  await page.goto(`${BASE}/pitch`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(screenshotDir, '02-pitch.png'), fullPage: true });

  // --- Login ---
  console.log('🔐 Logging in...');
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Dismiss cookie consent again
  try {
    const acceptBtn = page.getByRole('button', { name: 'Akzeptieren' });
    if (await acceptBtn.isVisible({ timeout: 2000 })) {
      await acceptBtn.click();
      await page.waitForTimeout(300);
    }
  } catch {}

  await page.getByPlaceholder('E-Mail Adresse').fill(EMAIL);
  const pwField = page.getByPlaceholder('Passwort');
  await pwField.click();
  await pwField.fill(PASSWORD);
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Anmelden', exact: true }).click();

  try {
    await page.waitForURL('**/', { timeout: 15000 });
    const url = page.url();
    if (url.includes('/login') || url.includes('/welcome')) {
      throw new Error('Still on login');
    }
    console.log('✅ Logged in:', url);
  } catch {
    console.log('❌ Login failed');
    await page.screenshot({ path: path.join(screenshotDir, '00-auth-error.png'), fullPage: true });
    await browser.close();
    return;
  }

  await page.waitForTimeout(3000);

  // --- Authenticated pages ---
  const routes = [
    { name: '03-home', path: '/' },
    { name: '04-market', path: '/market' },
    { name: '05-fantasy', path: '/fantasy' },
    { name: '06-community', path: '/community' },
    { name: '07-clubs', path: '/clubs' },
    { name: '08-club-sakaryaspor', path: '/club/sakaryaspor' },
    { name: '09-profile', path: '/profile' },
    { name: '10-compare', path: '/compare' },
    { name: '11-airdrop', path: '/airdrop' },
  ];

  for (const route of routes) {
    console.log(`📱 ${route.name}...`);
    await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(screenshotDir, `${route.name}.png`), fullPage: true });
  }

  console.log('✅ All mobile screenshots taken!');
  await browser.close();
}

main().catch(console.error);
