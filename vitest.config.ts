import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// Integration tests hit the live Supabase (read-only). They need
// SUPABASE_SERVICE_ROLE_KEY in .env.local to run. In CI without that secret
// we skip them so the rest of the unit suite stays green.
const skipIntegration = !!process.env.CI && !process.env.SUPABASE_SERVICE_ROLE_KEY;

const integrationGlobs = [
  'src/lib/__tests__/auth/rls-checks.test.ts',
  'src/lib/__tests__/boundaries/**',
  'src/lib/__tests__/bug-regression.test.ts',
  'src/lib/__tests__/concurrency/**',
  'src/lib/__tests__/contracts/**',
  'src/lib/__tests__/db-invariants.test.ts',
  'src/lib/__tests__/flows/**',
  'src/lib/__tests__/money/**',
  'src/lib/__tests__/state-machines/**',
  'src/lib/__tests__/unicode/**',
];

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    exclude: [
      'backup/**',
      'node_modules/**',
      '.next/**',
      'e2e/**',
      '.claude/**',
      ...(skipIntegration ? integrationGlobs : []),
    ],
    css: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
