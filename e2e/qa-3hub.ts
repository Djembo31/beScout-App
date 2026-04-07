import { chromium, ConsoleMessage } from 'playwright';
import path from 'path';
import fs from 'fs';

const screenshotDir = path.join(__dirname, 'screenshots', '3hub-qa');
fs.mkdirSync(screenshotDir, { recursive: true });

const BASE = 'http://localhost:3000';
const EMAIL = 'jarvis-qa@bescout.net';
const PASSWORD = 'JarvisQA2026!';

const consoleErrors: { url: string; msg: string }[] = [];
const pageErrors: { url: string; msg: string }[] = [];

async function login(page: any) {
  console.log('Logging in...');
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);
  try {
    const btn = page.getByRole('button', { name: 'Akzeptieren' });
    if (await btn.isVisible({ timeout: 2000 })) { await btn.click(); await page.waitForTimeout(300); }
  } catch {}
  try {
    await page.locator('input[type="email"]').first().fill(EMAIL);
    await page.locator('input[type="password"]').first().fill(PASSWORD);
    await page.waitForTimeout(300);
    await page.locator('button[type="submit"]').first().click();
  } catch (e) {
    console.log('Login form interaction failed:', e);
  }
  try {
    await page.waitForURL((url: URL) => !url.pathname.includes('/login') && !url.pathname.includes('/welcome'), { timeout: 20000 });
    console.log('Logged in:', page.url());
    return true;
  } catch {
    console.log('Login failed, current URL:', page.url());
    return false;
  }
}

async function captureRoute(page: any, route: string, label: string) {
  consoleErrors.length = 0;
  pageErrors.length = 0;
  console.log(`\n=== ${label} (${route}) ===`);
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000); // Let data load (skeleton → content)
  try {
    await page.waitForLoadState('networkidle', { timeout: 10000 });
  } catch {}
  await page.waitForTimeout(1000);

  // Get visible text content for verification
  const visibleText = await page.evaluate(() => {
    const main = document.querySelector('main') || document.body;
    return main?.innerText || '';
  });

  // Check for raw i18n keys (P1 bug indicator)
  const rawKeys = visibleText.match(/[a-z]+\.[a-z][a-zA-Z]+(?:\.[a-zA-Z]+)*/g) || [];
  const suspiciousKeys = rawKeys.filter(k => 
    k.includes('nav.') || 
    k.includes('inventory.') || 
    k.includes('mission.') ||
    k.includes('profile.') ||
    k.includes('common.') ||
    k.includes('home.') ||
    /^[a-z]+\.[a-z][a-zA-Z]+$/.test(k)
  ).filter(k => !k.includes('@') && !k.includes('bescout.net') && !k.includes('localhost'));

  return { visibleText, suspiciousKeys, currentUrl: page.url() };
}

async function main() {
  const browser = await chromium.launch();
  const ctxMobile = await browser.newContext({
    viewport: { width: 360, height: 800 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  });
  const pageMobile = await ctxMobile.newPage();
  pageMobile.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ url: pageMobile.url(), msg: msg.text() });
    }
  });
  pageMobile.on('pageerror', (err: Error) => {
    pageErrors.push({ url: pageMobile.url(), msg: err.message });
  });

  const loggedIn = await login(pageMobile);
  if (!loggedIn) {
    await pageMobile.screenshot({ path: path.join(screenshotDir, 'debug-login-mobile.png'), fullPage: true });
    console.error('LOGIN FAILED ON MOBILE');
    await browser.close();
    return;
  }

  // Reuse session for desktop
  const storage = await ctxMobile.storageState();
  const ctxDesktop = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
    storageState: storage,
  });
  const pageDesktop = await ctxDesktop.newPage();
  pageDesktop.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ url: pageDesktop.url(), msg: msg.text() });
    }
  });
  pageDesktop.on('pageerror', (err: Error) => {
    pageErrors.push({ url: pageDesktop.url(), msg: err.message });
  });

  const routes = [
    { path: '/', label: '01-home' },
    { path: '/inventory', label: '02-inventory' },
    { path: '/inventory?tab=cosmetics', label: '02b-inventory-cosmetics' },
    { path: '/inventory?tab=wildcards', label: '02c-inventory-wildcards' },
    { path: '/inventory?tab=mystery', label: '02d-inventory-mystery' },
    { path: '/missions', label: '03-missions' },
    { path: '/profile', label: '04-profile' },
  ];

  const results: any[] = [];

  for (const route of routes) {
    // Mobile
    const mobileResult = await captureRoute(pageMobile, route.path, `${route.label} mobile`);
    const mobilePath = path.join(screenshotDir, `${route.label}-mobile.png`);
    await pageMobile.screenshot({ path: mobilePath, fullPage: true });
    console.log(`  saved: ${mobilePath}`);

    // Desktop
    const desktopResult = await captureRoute(pageDesktop, route.path, `${route.label} desktop`);
    const desktopPath = path.join(screenshotDir, `${route.label}-desktop.png`);
    await pageDesktop.screenshot({ path: desktopPath, fullPage: true });
    console.log(`  saved: ${desktopPath}`);

    results.push({
      route: route.path,
      label: route.label,
      mobile: { path: mobilePath, ...mobileResult },
      desktop: { path: desktopPath, ...desktopResult },
      consoleErrors: [...consoleErrors],
      pageErrors: [...pageErrors],
    });
    consoleErrors.length = 0;
    pageErrors.length = 0;
  }

  // Save results JSON for analysis
  fs.writeFileSync(
    path.join(screenshotDir, 'qa-results.json'),
    JSON.stringify(results, null, 2)
  );

  console.log('\n=== DONE ===');
  console.log(`Screenshots in: ${screenshotDir}`);
  await browser.close();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
