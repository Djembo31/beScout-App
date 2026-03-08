import { test } from '@playwright/test';

test('register demo-fan account', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Dismiss cookie consent
  const acceptBtn = page.getByRole('button', { name: 'Akzeptieren' });
  if (await acceptBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await acceptBtn.click();
    await page.waitForTimeout(300);
  }

  // Click register
  await page.getByRole('button', { name: /Registrieren/i }).click();
  await page.waitForTimeout(500);

  // Take screenshot to see registration form
  await page.screenshot({ path: 'e2e/screenshots/register-form.png', fullPage: true });
});
