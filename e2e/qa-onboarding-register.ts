import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const SDIR = path.join(__dirname, '..', 'qa-screenshots', 'onboarding');
fs.mkdirSync(SDIR, { recursive: true });

const BASE = 'http://localhost:3000';

async function main() {
  const browser = await chromium.launch({ headless: true });

  // ======== MOBILE: Register mode ========
  console.log('--- MOBILE: Register Mode ---');
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const mp = await mobileCtx.newPage();

  await mp.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await mp.waitForTimeout(3000);

  // Accept cookies if shown
  try {
    const btn = mp.getByRole('button', { name: 'Akzeptieren' });
    if (await btn.isVisible({ timeout: 2000 })) { await btn.click(); await mp.waitForTimeout(500); }
  } catch {}

  // Click "Noch kein Konto? Registrieren" button
  try {
    const regBtn = mp.getByRole('button', { name: /Registrieren|kein Konto/i });
    if (await regBtn.isVisible({ timeout: 3000 })) {
      await regBtn.click();
      await mp.waitForTimeout(1000);
      console.log('Switched to register mode');
    }
  } catch (e) {
    console.log('Could not find register button:', (e as Error).message);
  }

  await mp.screenshot({ path: path.join(SDIR, '11-mobile-register.png'), fullPage: true });
  console.log('  -> register screenshot saved');

  // Now click "Magic Link" mode too
  await mp.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await mp.waitForTimeout(2000);
  try {
    const magicBtn = mp.getByRole('button', { name: /Magic Link/i });
    if (await magicBtn.isVisible({ timeout: 3000 })) {
      await magicBtn.click();
      await mp.waitForTimeout(1000);
    }
  } catch {}
  await mp.screenshot({ path: path.join(SDIR, '12-mobile-magic-link.png'), fullPage: true });
  console.log('  -> magic link screenshot saved');

  await mobileCtx.close();

  // ======== DESKTOP: Register mode ========
  console.log('--- DESKTOP: Register Mode ---');
  const desktopCtx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });
  const dp = await desktopCtx.newPage();

  await dp.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await dp.waitForTimeout(3000);

  try {
    const btn = dp.getByRole('button', { name: 'Akzeptieren' });
    if (await btn.isVisible({ timeout: 2000 })) { await btn.click(); await dp.waitForTimeout(500); }
  } catch {}

  try {
    const regBtn = dp.getByRole('button', { name: /Registrieren|kein Konto/i });
    if (await regBtn.isVisible({ timeout: 3000 })) {
      await regBtn.click();
      await dp.waitForTimeout(1000);
    }
  } catch {}

  await dp.screenshot({ path: path.join(SDIR, '13-desktop-register.png'), fullPage: true });
  console.log('  -> desktop register screenshot saved');

  await desktopCtx.close();
  await browser.close();
  console.log('\nDone!');
}

main().catch(console.error);
