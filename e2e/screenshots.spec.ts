import { test } from '@playwright/test';
import path from 'path';

const authDir = path.join(__dirname, '..', '.auth');

// All public/unauthenticated routes
const publicRoutes = [
  { name: '01-login', path: '/login' },
  { name: '02-pitch', path: '/pitch' },
];

// All authenticated routes (fan user)
const appRoutes = [
  { name: '03-home', path: '/' },
  { name: '04-market', path: '/market' },
  { name: '05-fantasy', path: '/fantasy' },
  { name: '06-community', path: '/community' },
  { name: '07-clubs', path: '/clubs' },
  { name: '08-club-sakaryaspor', path: '/club/sakaryaspor' },
  { name: '09-profile', path: '/profile' },
  { name: '10-compare', path: '/compare' },
  { name: '11-airdrop', path: '/airdrop' },
  { name: '12-welcome', path: '/welcome' },
];

// Screenshot helper
async function takeScreenshot(page: any, name: string, route: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60000 });
  // Wait for content to render (extra time for dev server cold compilation)
  await page.waitForTimeout(3000);
  await page.screenshot({
    path: `e2e/screenshots/${name}.png`,
    fullPage: true,
  });
}

test.describe('Public Routes', () => {
  for (const route of publicRoutes) {
    test(`screenshot ${route.name}`, async ({ page }) => {
      await takeScreenshot(page, route.name, route.path);
    });
  }
});

test.describe('App Routes (authenticated)', () => {
  test.use({ storageState: path.join(authDir, 'fan.json') });

  for (const route of appRoutes) {
    test(`screenshot ${route.name}`, async ({ page }) => {
      await takeScreenshot(page, route.name, route.path);
    });
  }
});
