/**
 * Slice 152 — Tests fuer useWallet Query-Hook + Helpers.
 *
 * Spec: worklog/specs/152-wallet-provider-to-query.md
 * Style-Referenz: useSafeMutation.test.ts
 *
 * Der Hook ersetzt WalletProvider (207 LOC parallel-state) durch einen
 * React-Query-Entry. Tests decken die Public-API stand-alone ab — ohne
 * Zugriff auf die Implementation (TDD).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import {
  useWallet,
  useIsBalanceFresh,
  walletQueryKey,
  setWalletBalance,
  setWalletLockedBalance,
  invalidateWallet,
  removeWalletFromCache,
} from '../useWallet';
import type { DbWallet } from '@/types';

// ============================================
// Mocks
// ============================================
const getWalletMock = vi.fn();
const useUserMock = vi.fn();

vi.mock('@/lib/services/wallet', () => ({
  getWallet: (userId: string) => getWalletMock(userId),
}));

vi.mock('@/components/providers/AuthProvider', () => ({
  useUser: () => useUserMock(),
}));

// ============================================
// Fixtures
// ============================================
const USER_ID = 'user-uuid-42';
const OTHER_USER_ID = 'user-uuid-99';

function makeWallet(overrides: Partial<DbWallet> = {}): DbWallet {
  return {
    user_id: USER_ID,
    balance: 100_000,
    locked_balance: 5_000,
    created_at: '2026-04-01T10:00:00.000Z',
    updated_at: '2026-04-20T10:00:00.000Z',
    ...overrides,
  };
}

function createClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

function createWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

// ============================================
// Reset
// ============================================
beforeEach(() => {
  getWalletMock.mockReset();
  useUserMock.mockReset();
  // Default: user logged in. Overridden per test if needed.
  useUserMock.mockReturnValue({ user: { id: USER_ID } });
});

afterEach(() => {
  // Reset any fake timer installed by a test that used them.
  vi.useRealTimers();
});

// ============================================
// Tests
// ============================================

describe('useWallet — Query-Hook Lifecycle', () => {
  // Regression: wenn kein User, darf der Hook weder fetchen noch eine
  // "loading"-Falle erzeugen. Sonst zeigt TopBar ewig Skeleton bei logged-out.
  it('returns { balanceCents: null, lockedBalanceCents: null, isLoading: false } when no user', async () => {
    useUserMock.mockReturnValue({ user: null });
    const client = createClient();

    const { result } = renderHook(() => useWallet(), {
      wrapper: createWrapper(client),
    });

    // Warten bis React settled — initial-render kann 1 Mikro-Tick brauchen.
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.balanceCents).toBeNull();
    expect(result.current.lockedBalanceCents).toBeNull();
    expect(getWalletMock).not.toHaveBeenCalled();
  });

  // Regression: sobald User vorhanden, MUSS der Hook mit korrekter userId fetchen.
  // Wenn falsche oder stale userId durchgereicht wird → Cross-Account-Leak.
  it('fetches getWallet(userId) with the authenticated user id', async () => {
    getWalletMock.mockResolvedValue(makeWallet());
    const client = createClient();

    const { result } = renderHook(() => useWallet(), {
      wrapper: createWrapper(client),
    });

    await waitFor(() => expect(getWalletMock).toHaveBeenCalledTimes(1));
    expect(getWalletMock).toHaveBeenCalledWith(USER_ID);
    // Hook ist fertig bevor wir das return-shape pruefen.
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  // Regression: der Hook muss balance + locked_balance aus der Server-Response
  // korrekt in balanceCents + lockedBalanceCents mappen. Wenn das drifted,
  // zeigt die TopBar falsche Zahlen (Money-Path!).
  it('returns balance + lockedBalance from getWallet response', async () => {
    getWalletMock.mockResolvedValue(
      makeWallet({ balance: 100_000, locked_balance: 5_000 }),
    );
    const client = createClient();

    const { result } = renderHook(() => useWallet(), {
      wrapper: createWrapper(client),
    });

    await waitFor(() => {
      expect(result.current.balanceCents).toBe(100_000);
      expect(result.current.lockedBalanceCents).toBe(5_000);
    });
  });

  // Slice 372: refetch wird exponiert + löst einen erneuten Server-Read aus.
  // Self-Heal des BuyModal-Freshness-Gates (stale Balance → aktiv refetchen
  // statt passiv blockieren). Read-only — keine Buchung.
  it('exposes a refetch() that re-reads the wallet from the server', async () => {
    getWalletMock.mockResolvedValue(makeWallet());
    const client = createClient();

    const { result } = renderHook(() => useWallet(), {
      wrapper: createWrapper(client),
    });

    await waitFor(() => expect(getWalletMock).toHaveBeenCalledTimes(1));
    expect(typeof result.current.refetch).toBe('function');

    await result.current.refetch();
    await waitFor(() => expect(getWalletMock).toHaveBeenCalledTimes(2));
  });
});

describe('useIsBalanceFresh — Freshness Flag', () => {
  // Regression: BuyModal disable-until-fresh — bevor je geladen wurde darf
  // der Button NICHT klickbar sein. dataUpdatedAt === 0 bedeutet "nie geladen".
  it('returns false before the first successful load (dataUpdatedAt === 0)', async () => {
    useUserMock.mockReturnValue({ user: null }); // Query disabled, kein Fetch
    const client = createClient();

    const { result } = renderHook(() => useIsBalanceFresh(), {
      wrapper: createWrapper(client),
    });

    // Kein waitFor: ohne User ist dataUpdatedAt persistent 0 → fresh ist synchron false.
    expect(result.current).toBe(false);
  });

  // Regression: solange ein Fetch laeuft, darf der Flag nicht "true" sein.
  // Sonst nutzt der User eine veraltete Balance fuer Purchase-Confirm.
  it('returns false while a fetch is in flight (isFetching === true)', async () => {
    // Promise nicht aufloesen → Query bleibt in isFetching === true.
    let resolveFn: ((v: DbWallet) => void) | undefined;
    getWalletMock.mockImplementation(
      () =>
        new Promise<DbWallet>((resolve) => {
          resolveFn = resolve;
        }),
    );
    const client = createClient();

    const { result } = renderHook(
      () => {
        const wallet = useWallet();
        const fresh = useIsBalanceFresh();
        return { wallet, fresh };
      },
      { wrapper: createWrapper(client) },
    );

    // Warten bis Fetching tatsaechlich started hat.
    await waitFor(() => expect(result.current.wallet.isFetching).toBe(true));
    expect(result.current.fresh).toBe(false);

    // Cleanup: pending Promise aufloesen sonst haengt der Test-Teardown.
    resolveFn?.(makeWallet());
  });

  // Regression: direkt nach erfolgreichem Fetch MUSS fresh === true sein,
  // sonst blockt BuyModal den kompletten Trading-Flow.
  //
  // Strategy: Cache pre-seed statt echtem fetch, dann Date.now() spy.
  // Das vermeidet fake-timers + React-Query-promise-interplay-Timeout.
  it('returns true within 30s window after a successful fetch', async () => {
    const client = createClient();
    // Pre-seed: simulate successful fetch — Query laeuft nicht,
    // aber dataUpdatedAt wird gesetzt.
    client.setQueryData<DbWallet>(walletQueryKey(USER_ID), makeWallet());
    const seededAt = Date.now();
    // Freeze Date.now() auf T+5s seit seed (<30s → fresh).
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(seededAt + 5_000);

    const { result } = renderHook(
      () => {
        const wallet = useWallet();
        const fresh = useIsBalanceFresh();
        return { wallet, fresh };
      },
      { wrapper: createWrapper(client) },
    );

    await waitFor(() => expect(result.current.wallet.isFetching).toBe(false));
    await waitFor(() =>
      expect(result.current.wallet.dataUpdatedAt).toBeGreaterThan(0),
    );

    expect(result.current.fresh).toBe(true);
    nowSpy.mockRestore();
  });

  // Regression: nach 30s MUSS fresh === false werden, sonst akzeptiert der
  // UI alten Balance-Stand fuer Money-Aktionen (Stale-Read-Risiko).
  it('returns false after 30s have elapsed since the fetch (stale)', async () => {
    const client = createClient();
    client.setQueryData<DbWallet>(walletQueryKey(USER_ID), makeWallet());
    const seededAt = Date.now();
    // Start innerhalb frisch — wir rerendern spaeter mit ausgelaufener Zeit.
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(seededAt + 5_000);

    const { result, rerender } = renderHook(
      () => {
        const wallet = useWallet();
        const fresh = useIsBalanceFresh();
        return { wallet, fresh };
      },
      { wrapper: createWrapper(client) },
    );

    await waitFor(() => expect(result.current.wallet.isFetching).toBe(false));
    expect(result.current.fresh).toBe(true); // Sanity: vor 30s-Schwelle

    // Jetzt > 30s seit dataUpdatedAt. Re-render damit Hook Date.now() neu liest.
    nowSpy.mockReturnValue(seededAt + 30_001);
    rerender();

    expect(result.current.fresh).toBe(false);
    nowSpy.mockRestore();
  });
});

describe('setWalletBalance — Optimistic Cache Update', () => {
  // Regression: Trading-onSuccess ruft setWalletBalance(qc, uid, new_balance).
  // Wenn das locked_balance ueberschreibt, brechen aktive Offers
  // (escrow displayed als 0) → User-facing Geld-Bug.
  it('merges new balanceCents and preserves locked_balance + timestamps', () => {
    const client = createClient();
    const initial = makeWallet({ balance: 100_000, locked_balance: 5_000 });
    client.setQueryData<DbWallet>(walletQueryKey(USER_ID), initial);

    setWalletBalance(client, USER_ID, 80_000);

    const next = client.getQueryData<DbWallet>(walletQueryKey(USER_ID));
    expect(next).toEqual({
      user_id: USER_ID,
      balance: 80_000,
      locked_balance: 5_000,
      created_at: initial.created_at,
      updated_at: initial.updated_at,
    });
  });

  // Regression: wenn der Cache noch leer ist (User gerade eingeloggt,
  // Query noch nicht geladen), darf setWalletBalance KEIN synthetisches
  // Objekt anlegen. Sonst "erfindet" das UI user_id + timestamps.
  it('is a no-op when cache entry is undefined', () => {
    const client = createClient();
    // Kein setQueryData vorher — Cache leer.

    setWalletBalance(client, USER_ID, 100_000);

    const next = client.getQueryData<DbWallet>(walletQueryKey(USER_ID));
    expect(next).toBeUndefined();
  });

  // Regression: wenn same-value gesetzt wird (z.B. serverseitiger Echo),
  // darf KEIN neues Objekt erstellt werden — sonst laufen alle Consumer
  // unnoetig re-render (React Query emittet change, refs differieren).
  it('is reference-stable when the value is unchanged', () => {
    const client = createClient();
    const initial = makeWallet({ balance: 100_000, locked_balance: 5_000 });
    client.setQueryData<DbWallet>(walletQueryKey(USER_ID), initial);

    setWalletBalance(client, USER_ID, 100_000);

    const next = client.getQueryData<DbWallet>(walletQueryKey(USER_ID));
    expect(next).toBe(initial); // exakt gleiche Object-Referenz
  });
});

describe('setWalletLockedBalance — Escrow Cache Update', () => {
  // Regression: Create-Offer lockt Betrag via setWalletLockedBalance.
  // Wenn balance ueberschrieben wird, zeigt TopBar plötzlich falsche Zahl.
  it('merges new lockedCents and preserves balance + timestamps', () => {
    const client = createClient();
    const initial = makeWallet({ balance: 100_000, locked_balance: 5_000 });
    client.setQueryData<DbWallet>(walletQueryKey(USER_ID), initial);

    setWalletLockedBalance(client, USER_ID, 12_000);

    const next = client.getQueryData<DbWallet>(walletQueryKey(USER_ID));
    expect(next).toEqual({
      user_id: USER_ID,
      balance: 100_000,
      locked_balance: 12_000,
      created_at: initial.created_at,
      updated_at: initial.updated_at,
    });
  });
});

describe('invalidateWallet — Prefix-Invalidation', () => {
  // Regression: invalidateWallet muss ALLE user-scoped Entries treffen
  // (prefix-match auf ['wallet', ...]). Sonst blieben nach Logout/Login
  // stale Eintraege eines anderen Users im Cache.
  it('invalidates every ["wallet", ...] entry (prefix-match)', async () => {
    const client = createClient();
    client.setQueryData<DbWallet>(walletQueryKey(USER_ID), makeWallet());
    client.setQueryData<DbWallet>(
      walletQueryKey(OTHER_USER_ID),
      makeWallet({ user_id: OTHER_USER_ID }),
    );

    await invalidateWallet(client);

    const state1 = client
      .getQueryCache()
      .find({ queryKey: walletQueryKey(USER_ID) })
      ?.state;
    const state2 = client
      .getQueryCache()
      .find({ queryKey: walletQueryKey(OTHER_USER_ID) })
      ?.state;

    expect(state1?.isInvalidated).toBe(true);
    expect(state2?.isInvalidated).toBe(true);
  });
});

describe('removeWalletFromCache — Hard Wipe', () => {
  // Regression: beim Logout muss der Wallet-Cache komplett geleert werden,
  // sonst sieht der naechste User die Balance des vorherigen (Account-Leak).
  it('removes every ["wallet", ...] entry (both entries gone)', () => {
    const client = createClient();
    client.setQueryData<DbWallet>(walletQueryKey(USER_ID), makeWallet());
    client.setQueryData<DbWallet>(
      walletQueryKey(OTHER_USER_ID),
      makeWallet({ user_id: OTHER_USER_ID }),
    );

    removeWalletFromCache(client);

    expect(client.getQueryData(walletQueryKey(USER_ID))).toBeUndefined();
    expect(client.getQueryData(walletQueryKey(OTHER_USER_ID))).toBeUndefined();
  });
});

// ============================================
// Slice 268 — Cold-Start Cache-Mirror via placeholderData
// ============================================
describe('useWallet — Slice 268 placeholderData Cold-Start-Mirror', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // AC-01: warm-cache mit lsSet vor Hook-Mount → placeholderData liefert
  // sofort Wallet-Werte → balanceCents non-null bevor getWallet resolved.
  it('reads UID-keyed localStorage as placeholderData on mount', async () => {
    localStorage.setItem(
      `bs_wallet_${USER_ID}`,
      JSON.stringify(makeWallet({ balance: 99_000, locked_balance: 1_000 })),
    );
    // getWallet "hangt" für Test — wir prüfen dass Cache placeholderData liefert
    let resolveFetch!: (v: DbWallet) => void;
    getWalletMock.mockImplementation(() => new Promise<DbWallet>((res) => { resolveFetch = res; }));
    const client = createClient();

    const { result } = renderHook(() => useWallet(), { wrapper: createWrapper(client) });

    // Während getWallet pending ist, sollte placeholderData rendern.
    await waitFor(() => expect(result.current.balanceCents).toBe(99_000));
    expect(result.current.lockedBalanceCents).toBe(1_000);

    // AC-09: Money-Path-Schutz — dataUpdatedAt MUSS 0 sein während placeholderData,
    // damit useIsBalanceFresh false returnt und BuyModal-Confirm disabled bleibt.
    expect(result.current.dataUpdatedAt).toBe(0);

    // Resolve fetch — Real-Data übernimmt
    resolveFetch(makeWallet({ balance: 100_000, locked_balance: 5_000 }));
    await waitFor(() => expect(result.current.balanceCents).toBe(100_000));
    expect(result.current.dataUpdatedAt).toBeGreaterThan(0);
  });

  // AC-09: Während placeholderData rendert, MUSS useIsBalanceFresh false returnen
  // (dataUpdatedAt=0 + isFetching=true) — BuyModal-Confirm bleibt disabled.
  it('useIsBalanceFresh stays false while placeholderData renders (Money-Path-protection)', async () => {
    localStorage.setItem(
      `bs_wallet_${USER_ID}`,
      JSON.stringify(makeWallet({ balance: 99_000 })),
    );
    let resolveFetch!: (v: DbWallet) => void;
    getWalletMock.mockImplementation(() => new Promise<DbWallet>((res) => { resolveFetch = res; }));
    const client = createClient();

    const { result } = renderHook(() => ({ wallet: useWallet(), fresh: useIsBalanceFresh() }), {
      wrapper: createWrapper(client),
    });

    // Initial: placeholderData rendert, fetch läuft, fresh muss false sein.
    await waitFor(() => expect(result.current.wallet.balanceCents).toBe(99_000));
    expect(result.current.fresh).toBe(false);

    // Nach Resolve: dataUpdatedAt > 0 + isFetching false → fresh wird true.
    resolveFetch(makeWallet({ balance: 100_000 }));
    await waitFor(() => expect(result.current.fresh).toBe(true));
  });

  // UID-Isolation: User-A's lsSet darf nicht User-B's placeholder werden.
  it('UID-keyed isolation: User-B sees no placeholder from User-A slot', async () => {
    localStorage.setItem(
      `bs_wallet_${USER_ID}`,
      JSON.stringify(makeWallet({ balance: 99_999 })),
    );
    useUserMock.mockReturnValue({ user: { id: OTHER_USER_ID } });
    let resolveFetch!: (v: DbWallet) => void;
    getWalletMock.mockImplementation(() => new Promise<DbWallet>((res) => { resolveFetch = res; }));
    const client = createClient();

    const { result } = renderHook(() => useWallet(), { wrapper: createWrapper(client) });

    // User-B hat kein eigener Slot → balanceCents bleibt null bis fetch resolved.
    expect(result.current.balanceCents).toBeNull();
    resolveFetch(makeWallet({ user_id: OTHER_USER_ID, balance: 5_000 }));
    await waitFor(() => expect(result.current.balanceCents).toBe(5_000));
  });

  // Mirror-Write nach erfolgreichem Fetch: Slot wird befüllt für nächsten Mount.
  it('writes wallet to UID-keyed slot after successful fetch', async () => {
    getWalletMock.mockResolvedValue(makeWallet({ balance: 42_000 }));
    const client = createClient();

    renderHook(() => useWallet(), { wrapper: createWrapper(client) });

    await waitFor(() => {
      const stored = localStorage.getItem(`bs_wallet_${USER_ID}`);
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.balance).toBe(42_000);
    });
  });
});
