import { test, expect, Page } from '@playwright/test';

const EMAIL = process.env.SMOKE_EMAIL ?? 'jarvis-qa@bescout.net';
const PASSWORD = process.env.SMOKE_PASSWORD ?? 'JarvisQA2026!';

/**
 * Lightweight nav for smoke. No full React-hydration wait — just:
 * - goto with 30s hard cap
 * - status < 500
 * - <main> visible in 15s
 */
async function smokeNavigate(page: Page, url: string, label: string) {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  expect(response?.status(), `${label}: server error (status ${response?.status()})`).toBeLessThan(500);
  await expect(
    page.locator('main, [role="main"]'),
    `${label}: <main> not rendered`
  ).toBeVisible({ timeout: 15_000 });
}

async function dismissModals(page: Page) {
  const later = page.getByText(/Später|Later/i).first();
  if (await later.isVisible({ timeout: 800 }).catch(() => false)) {
    await later.click().catch(() => {});
  }
  const accept = page.getByRole('button', { name: 'Akzeptieren' });
  if (await accept.isVisible({ timeout: 800 }).catch(() => false)) {
    await accept.click().catch(() => {});
  }
}

test.describe('Beta Smoke Suite', () => {
  test.describe.configure({ retries: 0 });

  test('10 critical flows — bescout.net post-deploy check', async ({ browser }) => {
    test.setTimeout(300_000); // 5 min global budget
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();

    await test.step('1. /home (unauth) lädt ohne 5xx', async () => {
      const response = await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30_000 });
      expect(response?.status(), '/home server error').toBeLessThan(500);
      await expect(page.locator('body')).not.toBeEmpty();
    });

    await test.step('2. Login mit QA-Account → redirect weg von /login', async () => {
      await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await dismissModals(page);

      await page.getByPlaceholder('E-Mail Adresse').fill(EMAIL, { timeout: 15_000 });
      await page.getByPlaceholder('Passwort').fill(PASSWORD);
      await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
      await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 });
      await dismissModals(page);
    });

    await test.step('3. /market lädt (authenticated)', async () => {
      await smokeNavigate(page, '/market', '/market');
    });

    await test.step('4. Player-Detail via Click auf Market-Card', async () => {
      const playerLink = page.locator('a[href*="/player/"]').first();
      await expect(playerLink, 'no /player/ link on /market').toBeVisible({ timeout: 15_000 });
      await playerLink.click();
      await page.waitForURL(/\/player\//, { timeout: 15_000 });
      await expect(page.locator('main, [role="main"]')).toBeVisible({ timeout: 15_000 });
    });

    await test.step('5. /manager (Manager-Hub) lädt', async () => {
      await smokeNavigate(page, '/manager', '/manager');
    });

    await test.step('6. /fantasy lädt', async () => {
      await smokeNavigate(page, '/fantasy', '/fantasy');
    });

    await test.step('7. /community lädt (Following-Feed)', async () => {
      await smokeNavigate(page, '/community', '/community');
    });

    await test.step('8. /missions lädt', async () => {
      await smokeNavigate(page, '/missions', '/missions');
    });

    await test.step('9. /transactions lädt', async () => {
      await smokeNavigate(page, '/transactions', '/transactions');
    });

    await test.step('10. /founding lädt (Founding Pass)', async () => {
      await smokeNavigate(page, '/founding', '/founding');
    });

    await context.close();
  });
});
