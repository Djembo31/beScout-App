import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const authDir = path.join(__dirname, '.auth');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 1,
  reporter: 'html',
  timeout: 120_000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
  },
  expect: {
    timeout: 20_000,
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
      testIgnore: [/auth\.(setup|spec)\.ts/, /admin\.spec\.ts/, /create-demo-accounts\.spec\.ts/],
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
    url: 'http://localhost:3000/login',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
