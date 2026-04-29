import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// Integration tests hit the live Supabase (read-only). They depend on
// DB state which can change independently of code, so we always skip
// them in CI. Run locally with: npx vitest run src/lib/__tests__/
//
// Slice 255 erweitert: src/lib/services/__tests__/* RPC-Existence/Schema-Tests
// fallen auch in diese Klasse — sie verbinden sich zu Live-Supabase und
// failen bei Service-Role-Key-Drift oder nicht-applied Migration.
const skipIntegration = !!process.env.CI;

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
  // Slice 255 — Service-RPC-Existence-Tests (TDD-FAIL-mode bis Migration applied
  // ODER Live-Supabase-Connection-Required). Failten am 2026-04-29 mit 22 Tests
  // wegen revoked Service-Role-Key — pre-push blocked. Klassifiziert als Integration.
  'src/lib/services/__tests__/club-most-owned.test.ts',
  'src/lib/services/__tests__/club-most-owned-batch.test.ts',
  'src/lib/services/__tests__/differentials.test.ts',
  'src/lib/services/__tests__/events-difficulty.test.ts',
  'src/lib/services/__tests__/leaderboards.test.ts',
  'src/lib/services/__tests__/lineup-auto-sub.test.ts',
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
