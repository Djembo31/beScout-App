import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const SDIR = path.join(__dirname, '..', 'qa-screenshots', 'onboarding');
fs.mkdirSync(SDIR, { recursive: true });

const BASE = 'http://localhost:3000';
const EMAIL = 'jarvis-qa@bescout.net';
const PASSWORD = 'JarvisQA2026!';

async function main() {
  const browser = await chromium.launch({ headless: true });

  // ======== MOBILE (390px) ========
  console.log('--- MOBILE 390px ---');
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
  });
  const mp = await mobileCtx.newPage();

  // 1) Mobile: Login page (unauthenticated)
  console.log('1) Mobile: /login');
  await mp.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await mp.waitForTimeout(3000);
  await mp.screenshot({ path: path.join(SDIR, '01-mobile-login.png'), fullPage: true });
  console.log('  -> screenshot saved');

  // 2) Mobile: Try /onboarding without auth (expect redirect)
  console.log('2) Mobile: /onboarding (no auth)');
  await mp.goto(`${BASE}/onboarding`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await mp.waitForTimeout(3000);
  const onbUrl = mp.url();
  console.log('  -> redirected to:', onbUrl);
  await mp.screenshot({ path: path.join(SDIR, '02-mobile-onboarding-noauth.png'), fullPage: true });

  // 3) Mobile: Login with test account
  console.log('3) Mobile: Logging in...');
  await mp.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await mp.waitForTimeout(2000);

  // Accept cookie banner if present
  try {
    const btn = mp.getByRole('button', { name: 'Akzeptieren' });
    if (await btn.isVisible({ timeout: 2000 })) { await btn.click(); await mp.waitForTimeout(500); }
  } catch {}

  // Fill login form
  try {
    await mp.getByPlaceholder('E-Mail Adresse').fill(EMAIL);
    const pw = mp.getByPlaceholder('Passwort');
    await pw.click(); await pw.fill(PASSWORD);
    await mp.waitForTimeout(500);
    await mp.getByRole('button', { name: 'Anmelden', exact: true }).click();
  } catch {
    await mp.locator('input[type="email"]').fill(EMAIL);
    await mp.locator('input[type="password"]').fill(PASSWORD);
    await mp.waitForTimeout(500);
    await mp.locator('button[type="submit"]').click();
  }

  try {
    await mp.waitForURL('**/', { timeout: 15000 });
    console.log('  -> logged in at:', mp.url());
  } catch {
    console.log('  -> login might have failed, current URL:', mp.url());
    await mp.screenshot({ path: path.join(SDIR, '03-mobile-login-result.png'), fullPage: true });
  }
  await mp.waitForTimeout(3000);

  // 4) Mobile: Navigate to /onboarding after auth
  console.log('4) Mobile: /onboarding (authenticated)');
  await mp.goto(`${BASE}/onboarding`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await mp.waitForTimeout(3000);
  const onbUrl2 = mp.url();
  console.log('  -> URL:', onbUrl2);
  await mp.screenshot({ path: path.join(SDIR, '04-mobile-onboarding-step1.png'), fullPage: true });

  // If we're on onboarding, try to interact with Step 1
  if (onbUrl2.includes('/onboarding')) {
    // Check for step 2 by filling step 1 and clicking next
    console.log('5) Mobile: Try to advance to step 2');
    // Look for any "Weiter" or "Next" button
    try {
      const nextBtn = mp.getByRole('button', { name: /weiter|next/i });
      if (await nextBtn.isVisible({ timeout: 3000 })) {
        await nextBtn.click();
        await mp.waitForTimeout(2000);
        await mp.screenshot({ path: path.join(SDIR, '05-mobile-onboarding-step2.png'), fullPage: true });
        console.log('  -> step 2 screenshot saved');
      } else {
        console.log('  -> no Next button found');
      }
    } catch (e) {
      console.log('  -> could not advance:', (e as Error).message);
    }
  }

  await mobileCtx.close();

  // ======== DESKTOP (1280px) ========
  console.log('--- DESKTOP 1280px ---');
  const desktopCtx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });
  const dp = await desktopCtx.newPage();

  // 6) Desktop: Login page
  console.log('6) Desktop: /login');
  await dp.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await dp.waitForTimeout(3000);
  await dp.screenshot({ path: path.join(SDIR, '06-desktop-login.png'), fullPage: true });

  // 7) Desktop: /onboarding without auth
  console.log('7) Desktop: /onboarding (no auth)');
  await dp.goto(`${BASE}/onboarding`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await dp.waitForTimeout(3000);
  console.log('  -> URL:', dp.url());
  await dp.screenshot({ path: path.join(SDIR, '07-desktop-onboarding-noauth.png'), fullPage: true });

  // 8) Desktop: Login
  console.log('8) Desktop: Logging in...');
  await dp.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await dp.waitForTimeout(2000);
  try {
    const btn = dp.getByRole('button', { name: 'Akzeptieren' });
    if (await btn.isVisible({ timeout: 2000 })) { await btn.click(); await dp.waitForTimeout(500); }
  } catch {}
  try {
    await dp.getByPlaceholder('E-Mail Adresse').fill(EMAIL);
    const pw = dp.getByPlaceholder('Passwort');
    await pw.click(); await pw.fill(PASSWORD);
    await dp.waitForTimeout(500);
    await dp.getByRole('button', { name: 'Anmelden', exact: true }).click();
  } catch {
    await dp.locator('input[type="email"]').fill(EMAIL);
    await dp.locator('input[type="password"]').fill(PASSWORD);
    await dp.waitForTimeout(500);
    await dp.locator('button[type="submit"]').click();
  }
  try {
    await dp.waitForURL('**/', { timeout: 15000 });
    console.log('  -> logged in at:', dp.url());
  } catch {
    console.log('  -> login result:', dp.url());
  }
  await dp.waitForTimeout(3000);

  // 9) Desktop: /onboarding after auth
  console.log('9) Desktop: /onboarding (authenticated)');
  await dp.goto(`${BASE}/onboarding`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await dp.waitForTimeout(3000);
  const desktopOnbUrl = dp.url();
  console.log('  -> URL:', desktopOnbUrl);
  await dp.screenshot({ path: path.join(SDIR, '09-desktop-onboarding-step1.png'), fullPage: true });

  if (desktopOnbUrl.includes('/onboarding')) {
    try {
      const nextBtn = dp.getByRole('button', { name: /weiter|next/i });
      if (await nextBtn.isVisible({ timeout: 3000 })) {
        await nextBtn.click();
        await dp.waitForTimeout(2000);
        await dp.screenshot({ path: path.join(SDIR, '10-desktop-onboarding-step2.png'), fullPage: true });
        console.log('  -> step 2 screenshot saved');
      }
    } catch (e) {
      console.log('  -> could not advance:', (e as Error).message);
    }
  }

  await desktopCtx.close();
  await browser.close();
  console.log('\nDone! Screenshots in:', SDIR);
}

main().catch(console.error);
