import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const authDir = path.join(__dirname, '.auth');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  expect: {
    timeout: 8_000,
  },
  projects: [
    // --- Setup: login once, save auth state ---
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    // --- Unauthenticated tests (no storageState) ---
    {
      name: 'unauthenticated',
      testMatch: /auth\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    // --- Authenticated tests (fan) ---
    {
      name: 'authenticated',
      testIgnore: [/auth\.(setup|spec)\.ts/, /admin\.spec\.ts/],
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(authDir, 'fan.json'),
      },
    },
    // --- Admin tests ---
    {
      name: 'admin',
      testMatch: /admin\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(authDir, 'admin.json'),
      },
    },
  ],
  webServer: {
    command: 'npx next dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
