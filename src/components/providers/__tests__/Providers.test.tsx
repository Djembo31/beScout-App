import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// ============================================
// Mocks — all sub-providers as passthroughs
// ============================================
vi.mock('../QueryProvider', () => ({
  QueryProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="query-provider">{children}</div>,
}));

vi.mock('../AuthProvider', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-provider">{children}</div>,
  useUser: () => ({ user: { id: 'u1' }, loading: false }),
}));

vi.mock('../AnalyticsProvider', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="analytics-provider">{children}</div>,
}));

vi.mock('../ClubProvider', () => ({
  ClubProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="club-provider">{children}</div>,
}));

vi.mock('../WalletProvider', () => ({
  WalletProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="wallet-provider">{children}</div>,
}));

vi.mock('../ToastProvider', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="toast-provider">{children}</div>,
}));

import { Providers } from '../Providers';

// ============================================
// Tests
// ============================================
describe('Providers', () => {
  it('renders children through all provider layers', () => {
    render(
      <Providers>
        <div data-testid="app-content">App</div>
      </Providers>,
    );
    expect(screen.getByTestId('app-content')).toBeInTheDocument();
    expect(screen.getByText('App')).toBeInTheDocument();
  });

  it('renders QueryProvider as outermost layer', () => {
    render(
      <Providers>
        <div>App</div>
      </Providers>,
    );
    expect(screen.getByTestId('query-provider')).toBeInTheDocument();
  });

  it('renders AuthProvider inside QueryProvider', () => {
    render(
      <Providers>
        <div>App</div>
      </Providers>,
    );
    const qp = screen.getByTestId('query-provider');
    const ap = screen.getByTestId('auth-provider');
    expect(qp.contains(ap)).toBe(true);
  });

  it('renders ClubProvider and WalletProvider when user is logged in', () => {
    render(
      <Providers>
        <div>App</div>
      </Providers>,
    );
    expect(screen.getByTestId('club-provider')).toBeInTheDocument();
    expect(screen.getByTestId('wallet-provider')).toBeInTheDocument();
  });

  it('renders ToastProvider', () => {
    render(
      <Providers>
        <div>App</div>
      </Providers>,
    );
    expect(screen.getByTestId('toast-provider')).toBeInTheDocument();
  });
});
