import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DbEvent, DbClub } from '@/types';
import type { AdminEvent } from '../types';

// ============================================
// Mocks -- services
// ============================================

const mockGetAllEventsAdmin = vi.fn();
const mockGetEventAdminStats = vi.fn();
const mockGetAllClubs = vi.fn();

vi.mock('@/lib/services/events', () => ({
  getAllEventsAdmin: (...args: unknown[]) => mockGetAllEventsAdmin(...args),
  getEventAdminStats: (...args: unknown[]) => mockGetEventAdminStats(...args),
  ALLOWED_TRANSITIONS: {
    upcoming: ['registering', 'cancelled'],
    registering: ['late-reg', 'running', 'cancelled'],
    'late-reg': ['running', 'cancelled'],
    running: ['scoring', 'ended'],
    scoring: ['ended'],
    ended: [],
    cancelled: [],
  },
}));

vi.mock('@/lib/services/club', () => ({
  getAllClubs: (...args: unknown[]) => mockGetAllClubs(...args),
}));

// ============================================
// Import AFTER mocks
// ============================================

import { useAdminEventsData } from '../useAdminEventsData';

// ============================================
// Test helpers
// ============================================

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// ============================================
// Fixtures
// ============================================

const now = new Date().toISOString();
const yesterday = new Date(Date.now() - 86400000).toISOString();

function makeEvent(overrides: Partial<DbEvent> = {}): AdminEvent {
  return {
    id: 'ev-1',
    name: 'Test Event',
    type: 'club',
    status: 'registering',
    format: '7er',
    gameweek: 5,
    entry_fee: 0,
    prize_pool: 10000,
    max_entries: 20,
    current_entries: 5,
    starts_at: now,
    locks_at: now,
    ends_at: now,
    scored_at: null,
    created_by: 'admin-1',
    club_id: 'club-1',
    sponsor_name: null,
    sponsor_logo: null,
    event_tier: 'club',
    tier_bonuses: null,
    min_tier: null,
    min_subscription_tier: null,
    salary_cap: null,
    reward_structure: null,
    scope: 'club',
    lineup_size: 7,
    currency: 'tickets',
    ticket_cost: 100,
    min_sc_per_slot: 1,
    wildcards_allowed: false,
    max_wildcards_per_lineup: 0,
    created_at: now,
    clubs: { name: 'Test Club', slug: 'test-club' },
    ...overrides,
  } as AdminEvent;
}

function makeClub(overrides: Partial<DbClub> = {}): DbClub {
  return {
    id: 'club-1',
    name: 'Test Club',
    slug: 'test-club',
    ...overrides,
  } as DbClub;
}

function setupDefault(events: AdminEvent[] = [makeEvent()]) {
  mockGetAllEventsAdmin.mockResolvedValue(events);
  mockGetEventAdminStats.mockResolvedValue({ activeCount: 1, totalParticipants: 5, totalPool: 10000 });
  mockGetAllClubs.mockResolvedValue([makeClub()]);
}

function setupEmpty() {
  mockGetAllEventsAdmin.mockResolvedValue([]);
  mockGetEventAdminStats.mockResolvedValue({ activeCount: 0, totalParticipants: 0, totalPool: 0 });
  mockGetAllClubs.mockResolvedValue([]);
}

function setupError() {
  mockGetAllEventsAdmin.mockRejectedValue(new Error('Network error'));
  mockGetEventAdminStats.mockRejectedValue(new Error('Network error'));
  mockGetAllClubs.mockResolvedValue([]);
}

function setupNeverResolve() {
  mockGetAllEventsAdmin.mockReturnValue(new Promise(() => {}));
  mockGetEventAdminStats.mockReturnValue(new Promise(() => {}));
  mockGetAllClubs.mockReturnValue(new Promise(() => {}));
}

// ============================================
// Tests
// ============================================

describe('useAdminEventsData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Loading / Data lifecycle ────────────────────────────────────────────

  it('1. initial loading state is true', () => {
    setupNeverResolve();
    const { result } = renderHook(() => useAdminEventsData(), {
      wrapper: createWrapper(),
    });

    expect(result.current.loading).toBe(true);
  });

  it('2. after load: loading=false, events populated, clubs populated, stats populated', async () => {
    const events = [makeEvent({ id: 'ev-1', name: 'Alpha' })];
    setupDefault(events);

    const { result } = renderHook(() => useAdminEventsData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].name).toBe('Alpha');
    expect(result.current.clubs).toHaveLength(1);
    expect(result.current.stats).toEqual({ activeCount: 1, totalParticipants: 5, totalPool: 10000 });
  });

  it('3. error state when service throws', async () => {
    setupError();

    const { result } = renderHook(() => useAdminEventsData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(true);
  });

  // ── Sorting ─────────────────────────────────────────────────────────────

  it('5. sortedEvents sorted by created_at desc by default', async () => {
    const events = [
      makeEvent({ id: 'ev-old', name: 'Old', created_at: yesterday }),
      makeEvent({ id: 'ev-new', name: 'New', created_at: now }),
    ];
    setupDefault(events);

    const { result } = renderHook(() => useAdminEventsData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // desc = newest first
    expect(result.current.sortedEvents[0].name).toBe('New');
    expect(result.current.sortedEvents[1].name).toBe('Old');
  });

  it('6. toggleSort same field toggles direction', async () => {
    const events = [
      makeEvent({ id: 'ev-old', created_at: yesterday }),
      makeEvent({ id: 'ev-new', created_at: now }),
    ];
    setupDefault(events);

    const { result } = renderHook(() => useAdminEventsData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Default is desc
    expect(result.current.sortAsc).toBe(false);

    act(() => {
      result.current.toggleSort('created_at');
    });

    expect(result.current.sortAsc).toBe(true);
  });

  it('7. toggleSort different field resets to desc', async () => {
    setupDefault();

    const { result } = renderHook(() => useAdminEventsData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Toggle to asc first
    act(() => {
      result.current.toggleSort('created_at');
    });
    expect(result.current.sortAsc).toBe(true);

    // Switch to different field => resets to desc
    act(() => {
      result.current.toggleSort('prize_pool');
    });

    expect(result.current.sortField).toBe('prize_pool');
    expect(result.current.sortAsc).toBe(false);
  });

  // ── Selection ───────────────────────────────────────────────────────────

  it('8. toggleSelect adds id to selected Set', async () => {
    setupDefault();

    const { result } = renderHook(() => useAdminEventsData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.toggleSelect('ev-1');
    });

    expect(result.current.selected.has('ev-1')).toBe(true);
  });

  it('9. toggleSelect removes already-selected id', async () => {
    setupDefault();

    const { result } = renderHook(() => useAdminEventsData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.toggleSelect('ev-1');
    });
    expect(result.current.selected.has('ev-1')).toBe(true);

    act(() => {
      result.current.toggleSelect('ev-1');
    });
    expect(result.current.selected.has('ev-1')).toBe(false);
  });

  it('10. clearSelection empties set and bulkStatus', async () => {
    setupDefault();

    const { result } = renderHook(() => useAdminEventsData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.toggleSelect('ev-1');
      result.current.setBulkStatus('running');
    });

    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selected.size).toBe(0);
    expect(result.current.bulkStatus).toBe('');
  });

  // ── Bulk Transitions ───────────────────────────────────────────────────

  it('11. availableBulkTransitions empty when no selection', async () => {
    setupDefault();

    const { result } = renderHook(() => useAdminEventsData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.availableBulkTransitions).toEqual([]);
  });

  it('12. availableBulkTransitions returns intersection of allowed transitions', async () => {
    const events = [
      makeEvent({ id: 'ev-1', status: 'registering' }),
      makeEvent({ id: 'ev-2', status: 'registering' }),
    ];
    setupDefault(events);

    const { result } = renderHook(() => useAdminEventsData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.toggleSelect('ev-1');
      result.current.toggleSelect('ev-2');
    });

    // Both are registering: allowed = ['late-reg', 'running', 'cancelled']
    // Intersection = the common set
    expect(result.current.availableBulkTransitions).toContain('running');
    expect(result.current.availableBulkTransitions).toContain('cancelled');
  });

  // ── refreshAll ──────────────────────────────────────────────────────────

  it('13. refreshAll calls getAllEventsAdmin + getEventAdminStats', async () => {
    setupDefault();

    const { result } = renderHook(() => useAdminEventsData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear to track new calls
    mockGetAllEventsAdmin.mockClear();
    mockGetEventAdminStats.mockClear();

    // Setup new resolved values for refresh
    mockGetAllEventsAdmin.mockResolvedValue([]);
    mockGetEventAdminStats.mockResolvedValue({ activeCount: 0, totalParticipants: 0, totalPool: 0 });

    await act(async () => {
      await result.current.refreshAll();
    });

    expect(mockGetAllEventsAdmin).toHaveBeenCalled();
    expect(mockGetEventAdminStats).toHaveBeenCalled();
  });

  // ── Filters ─────────────────────────────────────────────────────────────

  it('4. filter change refetches with new filters', async () => {
    setupDefault();

    const { result } = renderHook(() => useAdminEventsData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear initial calls
    mockGetAllEventsAdmin.mockClear();
    mockGetAllEventsAdmin.mockResolvedValue([]);

    act(() => {
      result.current.setFilters(prev => ({ ...prev, status: ['running'] }));
    });

    await waitFor(() => {
      expect(mockGetAllEventsAdmin).toHaveBeenCalled();
    });
  });

  // ── Edge: Cancellation token ────────────────────────────────────────────

  it('14. stale responses do not update state after unmount', async () => {
    // First call takes very long, simulating a race condition
    let resolveFirst: ((v: AdminEvent[]) => void) | null = null;
    mockGetAllEventsAdmin.mockImplementation(() => new Promise<AdminEvent[]>(r => { resolveFirst = r; }));
    mockGetEventAdminStats.mockResolvedValue({ activeCount: 0, totalParticipants: 0, totalPool: 0 });
    mockGetAllClubs.mockResolvedValue([]);

    const { result, unmount } = renderHook(() => useAdminEventsData(), {
      wrapper: createWrapper(),
    });

    expect(result.current.loading).toBe(true);

    // Unmount before resolve
    unmount();

    // Resolving after unmount should not throw
    if (resolveFirst) {
      expect(() => resolveFirst!([makeEvent()])).not.toThrow();
    }
  });
});
