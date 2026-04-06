import { test } from '@playwright/test';

const BASE_URL = 'https://www.bescout.net';
const EMAIL = 'jarvis-qa@bescout.net';
const PASSWORD = 'JarvisQA2026!';
const SDIR = 'C:/bescout-app/qa-screenshots';

test.describe('Mystery Box Visual QA', () => {
  test.setTimeout(180_000);

  test('Full visual QA', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();

    // LOGIN
    console.log('Navigating to login...');
    await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);

    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');

    if (await emailInput.isVisible({ timeout: 5000 })) {
      await emailInput.fill(EMAIL);
      await passwordInput.fill(PASSWORD);
      const loginBtn = page.locator('button[type="submit"]');
      await loginBtn.click();
      await page.waitForTimeout(5000);
      await page.waitForLoadState('networkidle');
    }

    console.log('URL after login: ' + page.url());

    // Accept cookies if banner visible
    try {
      const cookieBtn = page.locator('button:has-text("Akzeptieren")');
      if (await cookieBtn.isVisible({ timeout: 2000 })) {
        await cookieBtn.click();
        await page.waitForTimeout(500);
      }
    } catch {}

    // DESKTOP HOME
    await page.waitForTimeout(2000);
    await page.screenshot({ path: SDIR + '/d01-desktop-home.png', fullPage: false });
    await page.screenshot({ path: SDIR + '/d02-desktop-home-full.png', fullPage: true });

    // Scroll to see more content
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(500);
    await page.screenshot({ path: SDIR + '/d03-desktop-scrolled.png', fullPage: false });

    // Log page text
    const allText = await page.locator('body').innerText();
    console.log('Page text: ' + allText.substring(0, 2500));

    // Find Mystery Box button
    const sels = [
      'button:has-text("Mystery")',
      'button:has-text("Star Drop")',
      'button:has-text("Box")',
      'a:has-text("Mystery")',
      'text=Mystery Box',
      'text=Star Drop',
    ];

    let clicked = false;
    for (const sel of sels) {
      const btn = page.locator(sel).first();
      try {
        if (await btn.isVisible({ timeout: 1500 })) {
          console.log('Found: ' + sel);
          await btn.scrollIntoViewIfNeeded();
          await page.waitForTimeout(300);
          await page.screenshot({ path: SDIR + '/d04-desktop-cta.png', fullPage: false });
          await btn.click();
          await page.waitForTimeout(2000);
          clicked = true;
          break;
        }
      } catch {}
    }

    if (!clicked) {
      console.log('No Mystery Box button found directly. Checking nav...');
      const navItems = page.locator('nav a, aside a, [role="navigation"] a');
      const count = await navItems.count();
      for (let i = 0; i < Math.min(count, 20); i++) {
        const txt = await navItems.nth(i).innerText().catch(() => '');
        console.log('  Nav ' + i + ': ' + txt.trim().substring(0, 40));
      }
    }

    if (clicked) {
      await page.screenshot({ path: SDIR + '/d05-desktop-modal.png', fullPage: false });
      const modal = page.locator('[role="dialog"]').first();
      try {
        if (await modal.isVisible({ timeout: 2000 })) {
          await modal.screenshot({ path: SDIR + '/d06-desktop-modal-el.png' });
        }
      } catch {}

      // Check tiers
      for (const t of ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic']) {
        try {
          if (await page.locator('text=' + t).first().isVisible({ timeout: 300 })) console.log('Tier: ' + t);
        } catch {}
      }

      // Try open
      const openBtn = page.locator('button:has-text("ffnen")').first();
      try {
        if (await openBtn.isVisible({ timeout: 1500 })) {
          const dis = await openBtn.isDisabled();
          console.log('Open btn disabled=' + dis);
          if (!dis) {
            await openBtn.click();
            await page.waitForTimeout(6000);
            await page.screenshot({ path: SDIR + '/d07-desktop-reveal.png', fullPage: false });
          }
        }
      } catch {}

      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // MOBILE
    console.log('Mobile (390x844)...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    try {
      const cb = page.locator('button:has-text("Akzeptieren")');
      if (await cb.isVisible({ timeout: 1000 })) { await cb.click(); await page.waitForTimeout(300); }
    } catch {}

    await page.screenshot({ path: SDIR + '/m01-mobile-home.png', fullPage: false });
    await page.screenshot({ path: SDIR + '/m02-mobile-home-full.png', fullPage: true });

    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(500);
    await page.screenshot({ path: SDIR + '/m03-mobile-scrolled.png', fullPage: false });

    clicked = false;
    for (const sel of sels) {
      const btn = page.locator(sel).first();
      try {
        if (await btn.isVisible({ timeout: 1500 })) {
          console.log('[Mobile] Found: ' + sel);
          await btn.scrollIntoViewIfNeeded();
          await page.waitForTimeout(300);
          await page.screenshot({ path: SDIR + '/m04-mobile-cta.png', fullPage: false });
          await btn.click();
          await page.waitForTimeout(2000);
          clicked = true;
          break;
        }
      } catch {}
    }

    if (clicked) {
      await page.screenshot({ path: SDIR + '/m05-mobile-modal.png', fullPage: false });
      const mm = page.locator('[role="dialog"]').first();
      try {
        if (await mm.isVisible({ timeout: 2000 })) {
          await mm.screenshot({ path: SDIR + '/m06-mobile-modal-el.png' });
        }
      } catch {}

      const ob = page.locator('button:has-text("ffnen")').first();
      try {
        if (await ob.isVisible({ timeout: 1500 })) {
          const dis = await ob.isDisabled();
          console.log('[Mobile] Open btn disabled=' + dis);
          if (!dis) {
            await ob.click();
            await page.waitForTimeout(6000);
            await page.screenshot({ path: SDIR + '/m07-mobile-reveal.png', fullPage: false });
          }
        }
      } catch {}
    }

    await context.close();
    console.log('Done.');
  });
});
