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
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await waitForApp(page);

  // Dismiss cookie consent if visible
  const acceptBtn = page.getByRole('button', { name: 'Akzeptieren' });
  if (await acceptBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await acceptBtn.click();
    await page.waitForTimeout(300);
  }

  // Wait for React hydration — ensure the form's JS handlers are attached.
  // Without this, clicking Anmelden can trigger a native form submit (adding ?)
  // instead of React's onSubmit with e.preventDefault().
  await page.waitForFunction(() => {
    const btn = document.querySelector('button[type="submit"]');
    if (!btn) return false;
    // Check React internal props (fiber or props prefix, or __reactEvents)
    const keys = Object.keys(btn);
    const hasReact = keys.some(k =>
      k.startsWith('__reactFiber') ||
      k.startsWith('__reactProps') ||
      k.startsWith('__reactEvents')
    );
    if (hasReact) return true;
    // Fallback: if Next.js has loaded its scripts, hydration is likely done
    return !!document.querySelector('script[src*="/_next/"]');
  }, { timeout: 30_000 });

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

  // Dismiss welcome bonus modal so it doesn't block future tests
  await page.evaluate(() => localStorage.setItem('bescout-welcome-shown', '1'));

  // Save auth state (includes localStorage)
  await page.context().storageState({ path: savePath });
}

setup.setTimeout(120_000);

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
