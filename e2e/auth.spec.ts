import { test, expect } from '@playwright/test';
import { FAN_EMAIL, DEMO_PASSWORD, waitForApp } from './helpers';

test.describe('Authentication', () => {
  test('Login page shows email and password form', async ({ page }) => {
    await page.goto('/login');
    await waitForApp(page);

    await expect(page.getByPlaceholder('E-Mail Adresse')).toBeVisible();
    await expect(page.getByPlaceholder('Passwort')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Anmelden' })).toBeVisible();
  });

  test('Login with demo-fan redirects to home', async ({ page }) => {
    await page.goto('/login');
    await waitForApp(page);

    await page.getByPlaceholder('E-Mail Adresse').fill(FAN_EMAIL);
    await page.getByPlaceholder('Passwort').fill(DEMO_PASSWORD);
    await page.getByRole('button', { name: 'Anmelden' }).click();

    await page.waitForURL('/', { timeout: 15_000 });
    expect(page.url()).not.toContain('/login');
  });

  test('Login with wrong password shows error', async ({ page }) => {
    await page.goto('/login');
    await waitForApp(page);

    await page.getByPlaceholder('E-Mail Adresse').fill(FAN_EMAIL);
    await page.getByPlaceholder('Passwort').fill('WrongPassword123!');
    await page.getByRole('button', { name: 'Anmelden' }).click();

    // Error message should appear
    await expect(page.getByText('E-Mail oder Passwort falsch')).toBeVisible({ timeout: 8_000 });
  });

  test('Unauthenticated user on /profile is redirected', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    expect(url).toMatch(/\/(welcome|login)/);
  });

  test('Unauthenticated user on /market is redirected', async ({ page }) => {
    await page.goto('/market');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    expect(url).toMatch(/\/(welcome|login)/);
  });

  test('Demo account buttons visible with ?demo=true', async ({ page }) => {
    await page.goto('/login?demo=true');
    await waitForApp(page);

    await expect(page.getByText('Demo: Fan anmelden')).toBeVisible();
    await expect(page.getByText('Demo: Admin anmelden')).toBeVisible();
  });
});
