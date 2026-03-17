import { chromium } from 'playwright';

const BASE = 'http://localhost:3004';

async function run() {
  const browser = await chromium.launch();

  // Desktop
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const dp = await desktop.newPage();
  await dp.goto(`${BASE}/login`);
  await dp.waitForTimeout(2000);

  // Click "Als Fan testen" demo button
  const fanBtn = dp.getByText('Als Fan testen');
  if (await fanBtn.isVisible()) {
    await fanBtn.click();
    await dp.waitForTimeout(3000);
  }

  // Navigate to profile
  await dp.goto(`${BASE}/profile`);
  await dp.waitForTimeout(5000);
  await dp.screenshot({ path: 'qa-profile-desktop.png', fullPage: true });

  // Mobile
  const mobile = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true });
  // Copy cookies from desktop to mobile context
  const cookies = await desktop.cookies();
  await mobile.addCookies(cookies);

  const mp = await mobile.newPage();
  await mp.goto(`${BASE}/profile`);
  await mp.waitForTimeout(5000);
  await mp.screenshot({ path: 'qa-profile-mobile.png', fullPage: true });

  await browser.close();
  console.log('Done: qa-profile-desktop.png + qa-profile-mobile.png');
}

run().catch(err => { console.error(err); process.exit(1); });
