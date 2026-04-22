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

vi.mock('../ClubProvider', () => ({
  ClubProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="club-provider">{children}</div>,
}));

// Slice 152d: WalletProvider entfernt — Wallet via useWallet Query-Hook.
// Kein Mock fuer WalletProvider mehr noetig.

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

  it('renders ClubProvider when user is logged in (Slice 152d: WalletProvider removed)', () => {
    render(
      <Providers>
        <div>App</div>
      </Providers>,
    );
    expect(screen.getByTestId('club-provider')).toBeInTheDocument();
    // wallet-provider testid no longer exists — useWallet Query-Hook
    // is consumed directly by components (see src/lib/hooks/useWallet.ts).
    expect(screen.queryByTestId('wallet-provider')).not.toBeInTheDocument();
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
