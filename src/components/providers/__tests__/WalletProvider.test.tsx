import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { WalletProvider, useWallet } from '../WalletProvider';

// ============================================
// Mocks
// ============================================
const stableUser = { id: 'u1' };
const mockUseUser = vi.fn();
vi.mock('@/components/providers/AuthProvider', () => ({
  useUser: () => mockUseUser(),
}));

const mockGetWallet = vi.fn();
vi.mock('@/lib/services/wallet', () => ({
  getWallet: (...args: unknown[]) => mockGetWallet(...args),
}));

vi.mock('@/lib/utils', () => ({
  withTimeout: (promise: Promise<unknown>) => promise,
}));

// ============================================
// Test consumer
// ============================================
function WalletInspector() {
  const { balanceCents, lockedBalanceCents, refreshBalance } = useWallet();
  return (
    <div>
      <span data-testid="balance">{balanceCents ?? 'null'}</span>
      <span data-testid="locked">{lockedBalanceCents ?? 'null'}</span>
      <button onClick={() => refreshBalance()}>refresh</button>
    </div>
  );
}

// ============================================
// Tests
// ============================================
describe('WalletProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear sessionStorage
    try { sessionStorage.clear(); } catch { /* jsdom may not have it */ }
  });

  it('renders children', () => {
    mockUseUser.mockReturnValue({ user: null });
    render(
      <WalletProvider><div data-testid="child">Hi</div></WalletProvider>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('starts with null balance when no user', () => {
    mockUseUser.mockReturnValue({ user: null });
    render(
      <WalletProvider><WalletInspector /></WalletProvider>,
    );
    expect(screen.getByTestId('balance').textContent).toBe('null');
    expect(screen.getByTestId('locked').textContent).toBe('null');
  });

  it('fetches wallet when user is available', async () => {
    mockUseUser.mockReturnValue({ user: stableUser });
    mockGetWallet.mockResolvedValue({ balance: 50000, locked_balance: 1000 });
    render(
      <WalletProvider><WalletInspector /></WalletProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('balance').textContent).toBe('50000');
      expect(screen.getByTestId('locked').textContent).toBe('1000');
    });
    expect(mockGetWallet).toHaveBeenCalledWith('u1');
  });

  it('sets balance to 0 when wallet is null', async () => {
    mockUseUser.mockReturnValue({ user: stableUser });
    mockGetWallet.mockResolvedValue(null);
    render(
      <WalletProvider><WalletInspector /></WalletProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('balance').textContent).toBe('0');
    });
  });

  it('useWallet returns context value', () => {
    mockUseUser.mockReturnValue({ user: null });
    let value: ReturnType<typeof useWallet> | null = null;
    function Inspector() { value = useWallet(); return null; }
    render(<WalletProvider><Inspector /></WalletProvider>);
    expect(value).not.toBeNull();
    expect(typeof value!.setBalanceCents).toBe('function');
    expect(typeof value!.refreshBalance).toBe('function');
  });
});
