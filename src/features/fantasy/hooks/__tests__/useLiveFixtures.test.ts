/**
 * Slice 267 — Tests fuer useLiveFixtures Hook (Wave 3, Test-Writer-Agent).
 *
 * Geschrieben aus Spec only — Hook-Implementation NICHT gelesen.
 *
 * Spec-Verweise:
 *   - worklog/specs/267-realtime-live-score.md §2 Layer 3 + §9 Q4 Autonom-Zone (Polling-Trigger)
 *   - worklog/impact/267-realtime-live-score.md §5 Realtime-Subscription-Impact
 *
 * Erwartete Hook-Signatur (aus Spec abgeleitet):
 *   useLiveFixtures(leagueId: string | null, options?: {
 *     onUpdate?: (fixture: DbFixture) => void;
 *     onStatus?: (status: string) => void;
 *   }): {
 *     isPolling: boolean;
 *     // weitere Felder optional — Tests fokussieren auf Polling-Flag
 *   }
 *
 * Service-Signatur (aus Spec §3 + IMPACT §3):
 *   subscribeFixtureUpdates(
 *     leagueId: string,
 *     onUpdate: (row: DbFixture) => void,
 *     onStatus?: (status: string) => void,
 *   ): RealtimeChannel
 *
 * Tests die ERST FEHLSCHLAGEN ohne Implementation, dann gruen sind:
 *   - AC-10 (Polling-Fallback): CHANNEL_ERROR -> isPolling=true; SUBSCRIBED -> isPolling=false
 *   - AC-14 (Memory-Leak): mount/unmount cycles -> removeChannel called per unmount
 *   - Spec §9 Q4 Autonom-Zone: TIMED_OUT triggert ebenfalls Polling
 *   - Liga-Switch-Cleanup (Edge-Case 4): leagueId-change unsubscribed alte channel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ============================================
// Service-Mock — vi.hoisted shared mock-ref
// (subscribeFixtureUpdates returnt einen Mock-Channel mit captured callbacks)
// ============================================

const { subscribeFixtureUpdatesMock, removeChannelMock, makeChannel } = vi.hoisted(() => {
  // Captured callbacks pro Channel — Tests koennen sie manuell triggern
  type CapturedHandlers = {
    onUpdate?: (row: unknown) => void;
    onStatus?: (status: string) => void;
    unsubscribed: boolean;
  };

  const _channels: Array<{ leagueId: string; handlers: CapturedHandlers; channelObj: unknown }> = [];

  const makeChannel = (leagueId: string, handlers: CapturedHandlers): unknown => {
    const channelObj = {
      __testLeagueId: leagueId,
      __testHandlers: handlers,
      // RealtimeChannel public-shape — tests interact via captured handlers
      unsubscribe: vi.fn(() => {
        handlers.unsubscribed = true;
        return Promise.resolve('ok');
      }),
    };
    _channels.push({ leagueId, handlers, channelObj });
    return channelObj;
  };

  const subscribeFixtureUpdatesMock = vi.fn(
    (leagueId: string, onUpdate: (row: unknown) => void, onStatus?: (status: string) => void) => {
      const handlers: CapturedHandlers = { onUpdate, onStatus, unsubscribed: false };
      return makeChannel(leagueId, handlers);
    },
  );

  const removeChannelMock = vi.fn((channel: unknown) => {
    const ch = channel as { __testHandlers?: CapturedHandlers };
    if (ch?.__testHandlers) ch.__testHandlers.unsubscribed = true;
    return Promise.resolve('ok');
  });

  return { subscribeFixtureUpdatesMock, removeChannelMock, makeChannel: makeChannel };
});

// Service path — Spec IMPACT §3 sagt canonical = features-Pfad,
// lib/services/fixtures.ts ist 2-line bridge re-export.
vi.mock('@/features/fantasy/services/fixtures', () => ({
  subscribeFixtureUpdates: subscribeFixtureUpdatesMock,
}));

// Mock supabase client fuer removeChannel — Hook-Implementation darf
// auch direkt supabase.removeChannel() aufrufen (Pattern aus social.ts:82).
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    removeChannel: removeChannelMock,
    channel: vi.fn(),
  },
}));

// ============================================
// Hook unter Test
// ============================================

import { useLiveFixtures } from '../useLiveFixtures';

// ============================================
// Helpers
// ============================================

/**
 * Holt den aktuellen captured-callbacks-record aus dem Service-Mock.
 * Index = Reihenfolge der subscribe-Calls.
 */
function getChannelHandlers(callIndex: number): {
  onUpdate?: (row: unknown) => void;
  onStatus?: (status: string) => void;
  unsubscribed: boolean;
} {
  const call = subscribeFixtureUpdatesMock.mock.calls[callIndex];
  if (!call) throw new Error(`No subscribe call at index ${callIndex}`);
  // Re-build handlers from call args (mock factory captured them)
  const result = subscribeFixtureUpdatesMock.mock.results[callIndex];
  if (result?.type !== 'return') throw new Error('Subscribe did not return');
  const channel = result.value as { __testHandlers: ReturnType<typeof getChannelHandlers> };
  return channel.__testHandlers;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Make TS happy — referenced symbol
  void makeChannel;
});

// ============================================
// AC-10 / F-08: Polling-Fallback-Trigger
// ============================================

describe('useLiveFixtures — Polling-Fallback (AC-10 / F-08)', () => {
  it('isPolling=false initial (vor onStatus)', () => {
    const { result } = renderHook(() => useLiveFixtures('league-de'));

    expect(result.current.isPolling).toBe(false);
  });

  it('triggert Polling wenn onStatus("CHANNEL_ERROR") gerufen wird', () => {
    const { result } = renderHook(() => useLiveFixtures('league-de'));

    expect(subscribeFixtureUpdatesMock).toHaveBeenCalledWith(
      'league-de',
      expect.any(Function),
      expect.any(Function),
    );

    const handlers = getChannelHandlers(0);
    expect(handlers.onStatus).toBeDefined();

    act(() => {
      handlers.onStatus?.('CHANNEL_ERROR');
    });

    expect(result.current.isPolling).toBe(true);
  });

  it('triggert Polling auch bei onStatus("TIMED_OUT") (Spec §9 Q4 Autonom-Zone)', () => {
    const { result } = renderHook(() => useLiveFixtures('league-de'));

    const handlers = getChannelHandlers(0);

    act(() => {
      handlers.onStatus?.('TIMED_OUT');
    });

    expect(result.current.isPolling).toBe(true);
  });

  it('schaltet Polling AUS sobald onStatus("SUBSCRIBED") nach Fehler kommt', () => {
    const { result } = renderHook(() => useLiveFixtures('league-de'));

    const handlers = getChannelHandlers(0);

    // Erst CHANNEL_ERROR -> Polling an
    act(() => {
      handlers.onStatus?.('CHANNEL_ERROR');
    });
    expect(result.current.isPolling).toBe(true);

    // Dann SUBSCRIBED -> Polling aus
    act(() => {
      handlers.onStatus?.('SUBSCRIBED');
    });
    expect(result.current.isPolling).toBe(false);
  });
});

// ============================================
// AC-14: Memory-Leak-frei (Channel-Cleanup)
// ============================================

describe('useLiveFixtures — Channel-Cleanup (AC-14)', () => {
  it('unsubscribed pro Unmount-Cycle (3x mount/unmount)', () => {
    const subscribeCallsBefore = subscribeFixtureUpdatesMock.mock.calls.length;

    // 3 cycles mount -> unmount
    for (let i = 0; i < 3; i++) {
      const { unmount } = renderHook(() => useLiveFixtures('league-de'));
      unmount();
    }

    // Nach 3 unmounts: 3 zusaetzliche subscribe-Calls + 3 cleanup-calls
    expect(subscribeFixtureUpdatesMock.mock.calls.length - subscribeCallsBefore).toBe(3);

    // Per cycle: entweder removeChannel ODER channel.unsubscribe wurde gerufen
    // (Hook-Author kann Pattern aus social.ts:82 oder direkten unsubscribe nutzen)
    const totalSubscribes = subscribeFixtureUpdatesMock.mock.results.length;
    const lastThree = subscribeFixtureUpdatesMock.mock.results.slice(totalSubscribes - 3);

    for (const result of lastThree) {
      if (result.type !== 'return') throw new Error('subscribe did not return');
      const ch = result.value as { __testHandlers: { unsubscribed: boolean }; unsubscribe: ReturnType<typeof vi.fn> };

      // Either path-A: hook called removeChannel (handlers.unsubscribed flipped to true)
      // OR path-B: hook called channel.unsubscribe() directly
      const cleanedUp = ch.__testHandlers.unsubscribed || ch.unsubscribe.mock.calls.length > 0;
      expect(cleanedUp).toBe(true);
    }
  });

  it('Liga-Switch unsubscribed alte channel + subscribed neue (Edge-Case 4)', () => {
    const { rerender } = renderHook(
      ({ leagueId }: { leagueId: string }) => useLiveFixtures(leagueId),
      { initialProps: { leagueId: 'league-de' } },
    );

    expect(subscribeFixtureUpdatesMock).toHaveBeenCalledTimes(1);
    expect(subscribeFixtureUpdatesMock).toHaveBeenCalledWith(
      'league-de',
      expect.any(Function),
      expect.any(Function),
    );

    const firstChannel = subscribeFixtureUpdatesMock.mock.results[0].value as {
      __testHandlers: { unsubscribed: boolean };
      unsubscribe: ReturnType<typeof vi.fn>;
    };

    // Switch zu anderer Liga
    rerender({ leagueId: 'league-tr' });

    // Erste channel muss aufgeraeumt sein
    const firstCleaned =
      firstChannel.__testHandlers.unsubscribed || firstChannel.unsubscribe.mock.calls.length > 0;
    expect(firstCleaned).toBe(true);

    // Neue subscribe fuer 'league-tr'
    expect(subscribeFixtureUpdatesMock).toHaveBeenCalledTimes(2);
    expect(subscribeFixtureUpdatesMock.mock.calls[1][0]).toBe('league-tr');
  });
});
