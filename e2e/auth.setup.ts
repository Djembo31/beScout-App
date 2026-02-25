import { test as setup } from '@playwright/test';
import path from 'path';
import { FAN_EMAIL, ADMIN_EMAIL, DEMO_PASSWORD, waitForApp } from './helpers';

const authDir = path.join(__dirname, '..', '.auth');

async function loginAndSave(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
  savePath: string,
) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Dismiss cookie consent if visible
  const acceptBtn = page.getByRole('button', { name: 'Akzeptieren' });
  if (await acceptBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await acceptBtn.click();
    await page.waitForTimeout(300);
  }

  // Fill credentials
  await page.getByPlaceholder('E-Mail Adresse').fill(email);
  await page.getByPlaceholder('Passwort').fill(password);

  // Submit
  await page.getByRole('button', { name: 'Anmelden', exact: true }).click();

  // Wait for redirect away from login (admins go to /club/.../admin, fans to /)
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
    timeout: 30_000,
  });
  await waitForApp(page);

  // Save auth state
  await page.context().storageState({ path: savePath });
}

setup('authenticate as demo-fan', async ({ page }) => {
  await loginAndSave(
    page,
    FAN_EMAIL,
    DEMO_PASSWORD,
    path.join(authDir, 'fan.json'),
  );
});

setup('authenticate as demo-admin', async ({ page }) => {
  await loginAndSave(
    page,
    ADMIN_EMAIL,
    DEMO_PASSWORD,
    path.join(authDir, 'admin.json'),
  );
});
