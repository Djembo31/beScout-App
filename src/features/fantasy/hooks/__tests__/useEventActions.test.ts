/**
 * Slice 156 — Tests fuer useEventActions Ferrari-Refactor.
 *
 * Pro Mutation-Hook geprueft:
 * - mutationFn ruft den korrekten Service mit den richtigen Args
 * - onMutate schreibt Optimistic-State + snapshot
 * - onError rollbackt aus snapshot (inkl. Phantom-Rollback-Fix bei undefined)
 * - onSuccess: Server-Truth-Writes (setWalletBalance, invalidates)
 * - Slice 156 P2.3: setWalletBalance NICHT gerufen wenn balanceAfter=null
 * - onSettled ruft invalidateWallet (pgBouncer-safe)
 * - errorTag an logSilentCatch via useSafeMutation
 *
 * Blueprint: `src/features/market/mutations/__tests__/trading.test.ts` (153a).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ============================================
// Service Mocks (hoisted)
// ============================================
const lockEventEntryMock = vi.fn();
const unlockEventEntryMock = vi.fn();
const submitLineupServiceMock = vi.fn();
const setWalletBalanceMock = vi.fn();
const invalidateWalletMock = vi.fn();
const invalidateAfterLineupSaveMock = vi.fn();
const addToastMock = vi.fn();
const logSilentCatchMock = vi.fn();
const closeEventMock = vi.fn();
const missionsMock = vi.fn();
const activityLogMock = vi.fn();

vi.mock('@/features/fantasy/services/events.mutations', () => ({
  lockEventEntry: (...a: unknown[]) => lockEventEntryMock(...a),
  unlockEventEntry: (...a: unknown[]) => unlockEventEntryMock(...a),
}));

vi.mock('@/features/fantasy/services/lineups.mutations', () => ({
  submitLineup: (...a: unknown[]) => submitLineupServiceMock(...a),
}));

vi.mock('@/lib/hooks/useWallet', () => ({
  setWalletBalance: (...a: unknown[]) => setWalletBalanceMock(...a),
  invalidateWallet: (...a: unknown[]) => invalidateWalletMock(...a),
}));

vi.mock('@/features/fantasy/queries/invalidation', () => ({
  invalidateAfterLineupSave: (...a: unknown[]) => invalidateAfterLineupSaveMock(...a),
}));

vi.mock('@/components/providers/ToastProvider', () => ({
  useToast: () => ({ addToast: addToastMock }),
}));

vi.mock('@/components/providers/AuthProvider', () => ({
  useUser: () => ({ user: { id: 'u1' } }),
}));

vi.mock('@/features/fantasy/store/fantasyStore', () => ({
  useFantasyStore: () => ({ closeEvent: closeEventMock }),
}));

vi.mock('next-intl', () => ({
  // Stub translator — returns the key (so toast assertions stay readable).
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/lib/observability/silentRejects', () => ({
  logSilentCatch: (tag: string, err: unknown) => logSilentCatchMock(tag, err),
  logSilentRejects: () => {},
}));

vi.mock('@/lib/errorMessages', () => ({
  mapErrorToKey: (_err: unknown) => 'errorGeneric',
  normalizeError: (err: unknown) => err,
}));

vi.mock('@/lib/services/missions', () => ({
  triggerMissionProgress: (...a: unknown[]) => missionsMock(...a),
}));

vi.mock('@/lib/services/activityLog', () => ({
  logActivity: (...a: unknown[]) => activityLogMock(...a),
}));

// Stub global fetch so cache-bust fire-and-forget doesn't hit real URL.
global.fetch = vi.fn(() => Promise.resolve(new Response())) as unknown as typeof fetch;

// ============================================
// Imports AFTER mocks
// ============================================
import { useEventActions } from '../useEventActions';
import { qk } from '@/lib/queries/keys';

// ============================================
// Helpers
// ============================================
function makeClient() {
  // gcTime > 0 — sonst GC'd optimistic writes ohne Observer (siehe 153a).
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 60_000 },
      mutations: { retry: false },
    },
  });
}

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

// Minimal FantasyEvent-Stub mit Feldern die useEventActions anfasst.
type EventStub = {
  id: string;
  name: string;
  status: string;
  format: string;
  participants: number;
  maxParticipants?: number;
  ticketCost: number;
  buyIn: number;
  minScPerSlot?: number;
  maxWildcardsPerLineup?: number;
};

function makeEvent(overrides: Partial<EventStub> = {}): EventStub {
  return {
    id: 'e1',
    name: 'Test Event',
    status: 'registering',
    format: '4-4-2',
    participants: 0,
    maxParticipants: 100,
    ticketCost: 5,
    buyIn: 500,
    minScPerSlot: 1,
    maxWildcardsPerLineup: 0,
    ...overrides,
  };
}

// ============================================
// Tests
// ============================================

beforeEach(() => {
  vi.clearAllMocks();
});

// ───────────────────────────────────────────────────
// joinEvent
// ───────────────────────────────────────────────────
describe('useEventActions.joinEvent (Ferrari-Refactor)', () => {
  it('calls lockEventEntry and runs success-path on happy outcome', async () => {
    lockEventEntryMock.mockResolvedValue({ ok: true, balanceAfter: 420000 });
    const qc = makeClient();
    const { result } = renderHook(() => useEventActions('club-1'), { wrapper: wrapperFor(qc) });

    const event = makeEvent();
    await act(async () => {
      await result.current.joinEvent(event as never);
    });

    expect(lockEventEntryMock).toHaveBeenCalledWith('e1');
    await waitFor(() =>
      expect(setWalletBalanceMock).toHaveBeenCalledWith(qc, 'u1', 420000),
    );
    expect(addToastMock).toHaveBeenCalledWith('joinedSuccess', 'success');
  });

  it('optimistically adds eventId to joinedIds and increments events.all', async () => {
    lockEventEntryMock.mockImplementation(() => new Promise(() => {}));
    const qc = makeClient();
    qc.setQueryData(qk.events.joinedIds('u1'), ['e0']);
    qc.setQueryData(qk.events.all, [{ id: 'e1', current_entries: 2 }]);

    const { result } = renderHook(() => useEventActions('club-1'), { wrapper: wrapperFor(qc) });

    act(() => {
      result.current.joinEvent(makeEvent() as never);
    });

    await waitFor(() => {
      expect(qc.getQueryData(qk.events.joinedIds('u1'))).toEqual(['e0', 'e1']);
      expect(qc.getQueryData(qk.events.all)).toEqual([
        { id: 'e1', current_entries: 3 },
      ]);
    });
  });

  it('rolls back optimistic joinedIds + events.all on server error', async () => {
    lockEventEntryMock.mockResolvedValue({ ok: false, error: 'insufficient_balance' });
    const qc = makeClient();
    qc.setQueryData(qk.events.joinedIds('u1'), ['e0']);
    qc.setQueryData(qk.events.all, [{ id: 'e1', current_entries: 2 }]);

    const { result } = renderHook(() => useEventActions('club-1'), { wrapper: wrapperFor(qc) });

    await act(async () => {
      await result.current.joinEvent(makeEvent() as never);
    });

    await waitFor(() => {
      expect(qc.getQueryData(qk.events.joinedIds('u1'))).toEqual(['e0']);
      expect(qc.getQueryData(qk.events.all)).toEqual([
        { id: 'e1', current_entries: 2 },
      ]);
    });
    expect(setWalletBalanceMock).not.toHaveBeenCalled();
  });

  it('removes phantom-optimistic when no prev snapshot exists (Finding #1 fix)', async () => {
    lockEventEntryMock.mockResolvedValue({ ok: false, error: 'boom' });
    const qc = makeClient();
    // No pre-set for joinedIds or events.all.

    const { result } = renderHook(() => useEventActions('club-1'), { wrapper: wrapperFor(qc) });

    await act(async () => {
      await result.current.joinEvent(makeEvent() as never);
    });

    await waitFor(() => {
      expect(qc.getQueryData(qk.events.joinedIds('u1'))).toBeUndefined();
      expect(qc.getQueryData(qk.events.all)).toBeUndefined();
    });
  });

  it('Slice 156: skips setWalletBalance when balanceAfter is null (Free-Event)', async () => {
    lockEventEntryMock.mockResolvedValue({ ok: true, balanceAfter: null });
    const qc = makeClient();
    const { result } = renderHook(() => useEventActions('club-1'), { wrapper: wrapperFor(qc) });

    await act(async () => {
      await result.current.joinEvent(makeEvent({ ticketCost: 0 }) as never);
    });

    expect(lockEventEntryMock).toHaveBeenCalledWith('e1');
    expect(setWalletBalanceMock).not.toHaveBeenCalled();
    expect(addToastMock).toHaveBeenCalledWith('joinedSuccess', 'success');
  });

  it('Slice 156: calls setWalletBalance with 0 when truly deducted-to-zero', async () => {
    // Paid event, user had exactly ticketCost → balance-after is really 0.
    lockEventEntryMock.mockResolvedValue({ ok: true, balanceAfter: 0 });
    const qc = makeClient();
    const { result } = renderHook(() => useEventActions('club-1'), { wrapper: wrapperFor(qc) });

    await act(async () => {
      await result.current.joinEvent(makeEvent() as never);
    });

    await waitFor(() =>
      expect(setWalletBalanceMock).toHaveBeenCalledWith(qc, 'u1', 0),
    );
  });

  it('already_entered: cache-update runs, no toast, no setWalletBalance', async () => {
    lockEventEntryMock.mockResolvedValue({
      ok: true,
      alreadyEntered: true,
      currency: 'tickets',
    });
    const qc = makeClient();
    qc.setQueryData(qk.events.joinedIds('u1'), ['e0']);

    const { result } = renderHook(() => useEventActions('club-1'), { wrapper: wrapperFor(qc) });

    await act(async () => {
      await result.current.joinEvent(makeEvent() as never);
    });

    await waitFor(() =>
      // Optimistic update added e1, onSuccess doesn't overwrite.
      expect(qc.getQueryData(qk.events.joinedIds('u1'))).toEqual(['e0', 'e1']),
    );
    expect(setWalletBalanceMock).not.toHaveBeenCalled();
    // No success-toast for idempotent.
    const successCalls = addToastMock.mock.calls.filter((c) => c[1] === 'success');
    expect(successCalls).toHaveLength(0);
  });

  it('invalidates wallet in onSettled (success + error)', async () => {
    lockEventEntryMock.mockResolvedValue({ ok: true, balanceAfter: 1 });
    const qc = makeClient();
    const { result } = renderHook(() => useEventActions('club-1'), { wrapper: wrapperFor(qc) });

    await act(async () => {
      await result.current.joinEvent(makeEvent() as never);
    });
    await waitFor(() => expect(invalidateWalletMock).toHaveBeenCalledWith(qc));

    invalidateWalletMock.mockClear();
    lockEventEntryMock.mockResolvedValue({ ok: false, error: 'boom' });
    await act(async () => {
      await result.current.joinEvent(makeEvent() as never);
    });
    await waitFor(() => expect(invalidateWalletMock).toHaveBeenCalledWith(qc));
  });

  it('tags error with "fantasy.joinEvent" for Sentry', async () => {
    lockEventEntryMock.mockResolvedValue({ ok: false, error: 'boom' });
    const qc = makeClient();
    const { result } = renderHook(() => useEventActions('club-1'), { wrapper: wrapperFor(qc) });

    await act(async () => {
      await result.current.joinEvent(makeEvent() as never);
    });

    await waitFor(() =>
      expect(logSilentCatchMock).toHaveBeenCalledWith('fantasy.joinEvent', expect.any(Error)),
    );
  });

  it('short-circuits on rapid-click (isPending guard)', async () => {
    lockEventEntryMock.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, balanceAfter: 1 }), 50)),
    );
    const qc = makeClient();
    const { result } = renderHook(() => useEventActions('club-1'), { wrapper: wrapperFor(qc) });

    const event = makeEvent();
    act(() => {
      result.current.joinEvent(event as never);
    });
    await waitFor(() => expect(result.current.joiningEventId).toBe('e1'));
    act(() => {
      result.current.joinEvent(event as never);
    });

    await waitFor(() => expect(result.current.joiningEventId).toBe(null));
    expect(lockEventEntryMock).toHaveBeenCalledTimes(1);
  });

  it('pre-check: status=ended → Toast, no RPC call', async () => {
    const qc = makeClient();
    const { result } = renderHook(() => useEventActions('club-1'), { wrapper: wrapperFor(qc) });

    await act(async () => {
      await result.current.joinEvent(makeEvent({ status: 'ended' }) as never);
    });

    expect(lockEventEntryMock).not.toHaveBeenCalled();
    expect(addToastMock).toHaveBeenCalledWith('eventEndedError', 'error');
  });

  it('pre-check: event_full client-side → Toast, no RPC call', async () => {
    const qc = makeClient();
    const { result } = renderHook(() => useEventActions('club-1'), { wrapper: wrapperFor(qc) });

    await act(async () => {
      await result.current.joinEvent(
        makeEvent({ participants: 100, maxParticipants: 100 }) as never,
      );
    });

    expect(lockEventEntryMock).not.toHaveBeenCalled();
    expect(addToastMock).toHaveBeenCalledWith('eventFullError', 'error');
  });
});

// ───────────────────────────────────────────────────
// leaveEvent
// ───────────────────────────────────────────────────
describe('useEventActions.leaveEvent (Ferrari-Refactor)', () => {
  it('calls unlockEventEntry and updates wallet on success', async () => {
    unlockEventEntryMock.mockResolvedValue({ ok: true, balanceAfter: 999 });
    const qc = makeClient();
    const { result } = renderHook(() => useEventActions('club-1'), { wrapper: wrapperFor(qc) });

    await act(async () => {
      await result.current.leaveEvent(makeEvent() as never);
    });

    expect(unlockEventEntryMock).toHaveBeenCalledWith('e1');
    await waitFor(() =>
      expect(setWalletBalanceMock).toHaveBeenCalledWith(qc, 'u1', 999),
    );
    expect(closeEventMock).toHaveBeenCalled();
  });

  it('optimistically filters eventId from joinedIds and decrements events.all', async () => {
    unlockEventEntryMock.mockImplementation(() => new Promise(() => {}));
    const qc = makeClient();
    qc.setQueryData(qk.events.joinedIds('u1'), ['e0', 'e1', 'e2']);
    qc.setQueryData(qk.events.all, [{ id: 'e1', current_entries: 5 }]);

    const { result } = renderHook(() => useEventActions('club-1'), { wrapper: wrapperFor(qc) });

    act(() => {
      result.current.leaveEvent(makeEvent() as never);
    });

    await waitFor(() => {
      expect(qc.getQueryData(qk.events.joinedIds('u1'))).toEqual(['e0', 'e2']);
      expect(qc.getQueryData(qk.events.all)).toEqual([
        { id: 'e1', current_entries: 4 },
      ]);
    });
  });

  it('rolls back on event_locked error + shows eventLockedError toast', async () => {
    unlockEventEntryMock.mockResolvedValue({ ok: false, error: 'event_locked' });
    const qc = makeClient();
    qc.setQueryData(qk.events.joinedIds('u1'), ['e0', 'e1']);
    qc.setQueryData(qk.events.all, [{ id: 'e1', current_entries: 5 }]);

    const { result } = renderHook(() => useEventActions('club-1'), { wrapper: wrapperFor(qc) });

    await act(async () => {
      await result.current.leaveEvent(makeEvent() as never);
    });

    await waitFor(() => {
      expect(qc.getQueryData(qk.events.joinedIds('u1'))).toEqual(['e0', 'e1']);
      expect(qc.getQueryData(qk.events.all)).toEqual([
        { id: 'e1', current_entries: 5 },
      ]);
    });
    expect(addToastMock).toHaveBeenCalledWith('eventLockedError', 'error');
  });

  it('Slice 156: skips setWalletBalance when balanceAfter is null (amount_locked=0)', async () => {
    unlockEventEntryMock.mockResolvedValue({ ok: true, balanceAfter: null });
    const qc = makeClient();
    const { result } = renderHook(() => useEventActions('club-1'), { wrapper: wrapperFor(qc) });

    await act(async () => {
      await result.current.leaveEvent(makeEvent({ buyIn: 0 }) as never);
    });

    expect(unlockEventEntryMock).toHaveBeenCalledWith('e1');
    expect(setWalletBalanceMock).not.toHaveBeenCalled();
    expect(closeEventMock).toHaveBeenCalled();
  });

  it('invalidates wallet in onSettled (pgBouncer-safe)', async () => {
    unlockEventEntryMock.mockResolvedValue({ ok: true, balanceAfter: 1 });
    const qc = makeClient();
    const { result } = renderHook(() => useEventActions('club-1'), { wrapper: wrapperFor(qc) });

    await act(async () => {
      await result.current.leaveEvent(makeEvent() as never);
    });
    await waitFor(() => expect(invalidateWalletMock).toHaveBeenCalledWith(qc));
  });

  it('tags error with "fantasy.leaveEvent"', async () => {
    unlockEventEntryMock.mockResolvedValue({ ok: false, error: 'boom' });
    const qc = makeClient();
    const { result } = renderHook(() => useEventActions('club-1'), { wrapper: wrapperFor(qc) });

    await act(async () => {
      await result.current.leaveEvent(makeEvent() as never);
    });

    await waitFor(() =>
      expect(logSilentCatchMock).toHaveBeenCalledWith('fantasy.leaveEvent', expect.any(Error)),
    );
  });

  it('Finding #7: not_entered treats as success-path (stale cache, User-Intent already met)', async () => {
    unlockEventEntryMock.mockResolvedValue({ ok: false, error: 'not_entered' });
    const qc = makeClient();
    qc.setQueryData(qk.events.joinedIds('u1'), ['e0', 'e1']);
    const { result } = renderHook(() => useEventActions('club-1'), { wrapper: wrapperFor(qc) });

    await act(async () => {
      await result.current.leaveEvent(makeEvent() as never);
    });

    // Optimistic filter-out bleibt (joinedIds enthaelt e1 nicht mehr), kein Rollback.
    await waitFor(() =>
      expect(qc.getQueryData(qk.events.joinedIds('u1'))).toEqual(['e0']),
    );
    // Kein Error-Toast — success-path lief.
    const errorCalls = addToastMock.mock.calls.filter((c) => c[1] === 'error');
    expect(errorCalls).toHaveLength(0);
    expect(setWalletBalanceMock).not.toHaveBeenCalled();
    expect(closeEventMock).toHaveBeenCalled();
  });

  it('leavingEventId tracks in-flight leave via mutation.variables', async () => {
    unlockEventEntryMock.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, balanceAfter: 1 }), 50)),
    );
    const qc = makeClient();
    const { result } = renderHook(() => useEventActions('club-1'), { wrapper: wrapperFor(qc) });

    act(() => {
      result.current.leaveEvent(makeEvent() as never);
    });

    await waitFor(() => expect(result.current.leavingEventId).toBe('e1'));
    await waitFor(() => expect(result.current.leavingEventId).toBe(null));
  });
});

// ───────────────────────────────────────────────────
// submitLineup
// ───────────────────────────────────────────────────
describe('useEventActions.submitLineup (Ferrari-Refactor)', () => {
  const lineup = [{ slot: 0, playerId: 'p0' }] as never;

  it('calls submitLineupService and closes modal on success', async () => {
    submitLineupServiceMock.mockResolvedValue({});
    const qc = makeClient();
    const { result } = renderHook(() => useEventActions('club-1'), { wrapper: wrapperFor(qc) });

    await act(async () => {
      await result.current.submitLineup(
        makeEvent() as never,
        lineup,
        '4-4-2',
        null,
        [],
      );
    });

    expect(submitLineupServiceMock).toHaveBeenCalled();
    expect(closeEventMock).toHaveBeenCalled();
    expect(addToastMock).toHaveBeenCalledWith('lineupSaved', 'success');
  });

  it('routes insufficient_sc error to specific Toast', async () => {
    submitLineupServiceMock.mockRejectedValue(new Error('insufficient_sc'));
    const qc = makeClient();
    const { result } = renderHook(() => useEventActions('club-1'), { wrapper: wrapperFor(qc) });

    await act(async () => {
      await result.current.submitLineup(
        makeEvent({ minScPerSlot: 2 }) as never,
        lineup,
        '4-4-2',
        null,
        [],
      );
    });

    await waitFor(() =>
      expect(addToastMock).toHaveBeenCalledWith('insufficientSc', 'error'),
    );
    expect(closeEventMock).not.toHaveBeenCalled();
  });

  it('routes lineup_save_failed error to specific Toast (no raw i18n-key leak)', async () => {
    submitLineupServiceMock.mockRejectedValue(new Error('lineup_save_failed'));
    const qc = makeClient();
    const { result } = renderHook(() => useEventActions('club-1'), { wrapper: wrapperFor(qc) });

    await act(async () => {
      await result.current.submitLineup(
        makeEvent() as never,
        lineup,
        '4-4-2',
        null,
        [],
      );
    });

    await waitFor(() =>
      expect(addToastMock).toHaveBeenCalledWith('lineupSaveFailed', 'error'),
    );
  });

  it('tags error with "fantasy.submitLineup"', async () => {
    submitLineupServiceMock.mockRejectedValue(new Error('holding_lock_failed'));
    const qc = makeClient();
    const { result } = renderHook(() => useEventActions('club-1'), { wrapper: wrapperFor(qc) });

    await act(async () => {
      await result.current.submitLineup(
        makeEvent() as never,
        lineup,
        '4-4-2',
        null,
        [],
      );
    });

    await waitFor(() =>
      expect(logSilentCatchMock).toHaveBeenCalledWith('fantasy.submitLineup', expect.any(Error)),
    );
  });

  it('short-circuits on rapid submit (isPending guard)', async () => {
    submitLineupServiceMock.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({}), 50)),
    );
    const qc = makeClient();
    const { result } = renderHook(() => useEventActions('club-1'), { wrapper: wrapperFor(qc) });

    act(() => {
      result.current.submitLineup(makeEvent() as never, lineup, '4-4-2', null, []);
    });
    // Wait for the MutationObserver to reflect isPending before the 2nd trigger —
    // analog trading.test.ts safeTrigger-Test. Proxy: service mock has been called.
    await waitFor(() => expect(submitLineupServiceMock).toHaveBeenCalledTimes(1));
    act(() => {
      result.current.submitLineup(makeEvent() as never, lineup, '4-4-2', null, []);
    });

    await waitFor(() => expect(closeEventMock).toHaveBeenCalled());
    expect(submitLineupServiceMock).toHaveBeenCalledTimes(1);
  });
});
