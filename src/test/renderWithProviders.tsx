/**
 * Test Utility — renderWithProviders
 *
 * Wraps components with all necessary providers for component testing:
 * - React Query (real QueryClient, no cache between tests)
 * - next-intl (mocked useTranslations → returns key)
 * - next/navigation (mocked useRouter, usePathname, useSearchParams)
 *
 * Usage:
 *   import { renderWithProviders } from '@/test/renderWithProviders';
 *   renderWithProviders(<MyComponent prop="value" />);
 */
import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

// ============================================
// Mock next-intl
// ============================================
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (!params) return key;
    // ICU-light: bei params returnen wir die joined values (z.B. t('minute', {minute: 67}) → "67").
    // Reicht für display-text-checks in Tests; echte ICU-Interpolation ist Production-Concern.
    return Object.values(params).map(String).join('');
  },
  useLocale: () => 'de',
  useFormatter: () => ({
    number: (n: number) => String(n),
    dateTime: (d: Date) => d.toISOString(),
  }),
}));

// ============================================
// Mock next/navigation
// ============================================
const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};

const mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/',
  useSearchParams: () => mockSearchParams,
  useParams: () => ({}),
}));

// ============================================
// Mock next/image
// ============================================
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) =>
    React.createElement('img', {
      ...props,
      // next/image requires width/height but test doesn't need layout
      loading: undefined,
    }),
}));

// ============================================
// Provider wrapper
// ============================================

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

interface ProviderOptions {
  queryClient?: QueryClient;
}

function createWrapper(options: ProviderOptions = {}) {
  const queryClient = options.queryClient ?? createTestQueryClient();

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

// ============================================
// Exports
// ============================================

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & ProviderOptions,
) {
  const { queryClient, ...renderOptions } = options ?? {};
  return render(ui, {
    wrapper: createWrapper({ queryClient }),
    ...renderOptions,
  });
}

export { mockRouter, mockSearchParams, createTestQueryClient };
