import { test, expect } from '@playwright/test';
import { FAN_EMAIL, DEMO_PASSWORD, waitForApp } from './helpers';

test.describe('Authentication', () => {
  test('Login page shows email and password form', async ({ page }) => {
    await page.goto('/login');
    await waitForApp(page);

    await expect(page.getByPlaceholder('E-Mail Adresse')).toBeVisible();
    await expect(page.getByPlaceholder('Passwort')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Anmelden', exact: true })).toBeVisible();
  });

  test('Login with demo-fan redirects to home', async ({ page }) => {
    await page.goto('/login');
    await waitForApp(page);

    await page.getByPlaceholder('E-Mail Adresse').fill(FAN_EMAIL);
    await page.getByPlaceholder('Passwort').fill(DEMO_PASSWORD);
    await page.getByRole('button', { name: 'Anmelden', exact: true }).click();

    await page.waitForURL('/', { timeout: 15_000 });
    expect(page.url()).not.toContain('/login');
  });

  test('Login with wrong password shows error', async ({ page }) => {
    await page.goto('/login');
    await waitForApp(page);

    await page.getByPlaceholder('E-Mail Adresse').fill(FAN_EMAIL);
    await page.getByPlaceholder('Passwort').fill('WrongPassword123!');
    await page.getByRole('button', { name: 'Anmelden', exact: true }).click();

    // Error message should appear
    await expect(page.getByText('E-Mail oder Passwort falsch')).toBeVisible({ timeout: 8_000 });
  });

  test('Unauthenticated user on /profile is redirected', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    expect(url).toMatch(/\/(welcome|login)/);
  });

  test('Unauthenticated user on /market sees content or is redirected', async ({ page }) => {
    await page.goto('/market');
    await page.waitForLoadState('networkidle');

    // Market may be publicly accessible or redirect to /login or /welcome
    const url = page.url();
    if (url.includes('/market')) {
      // Publicly accessible — verify page loads without error
      const body = page.locator('body');
      await expect(body).not.toBeEmpty();
    } else {
      // Redirected — should be login or welcome
      expect(url).toMatch(/\/(login|welcome)/);
    }
  });

  test('Demo account buttons visible with ?demo=true', async ({ page }) => {
    await page.goto('/login?demo=true');
    await waitForApp(page);

    await expect(page.getByText('Als Fan testen')).toBeVisible();
    await expect(page.getByText('Als Club-Admin testen')).toBeVisible();
  });
});
