import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockTable, mockRpc, resetMocks } from '@/test/mocks/supabase';

import {
  lockEventEntry,
  unlockEventEntry,
  cancelEventEntries,
  getEventEntry,
  getUserEnteredEventIds,
  getScoutEventsEnabled,
} from '../events';

beforeEach(() => {
  resetMocks();
  vi.clearAllMocks();
});

// ============================================
// lockEventEntry — calls lock_event_entry (wrapper, no userId)
// ============================================
describe('lockEventEntry', () => {
  it('returns ok with currency and balanceAfter on successful lock', async () => {
    mockRpc('lock_event_entry', {
      ok: true,
      currency: 'tickets',
      balance_after: 35,
    });

    const result = await lockEventEntry('evt-1');
    expect(result.ok).toBe(true);
    expect(result.currency).toBe('tickets');
    expect(result.balanceAfter).toBe(35);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('lock_event_entry', {
      p_event_id: 'evt-1',
    });
  });

  it('returns error insufficient_tickets from RPC error message', async () => {
    mockRpc('lock_event_entry', null, { message: 'insufficient_tickets' });

    const result = await lockEventEntry('evt-1');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('insufficient_tickets');
  });

  it('returns error insufficient_balance for $SCOUT', async () => {
    mockRpc('lock_event_entry', null, { message: 'insufficient_balance' });

    const result = await lockEventEntry('evt-1');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('insufficient_balance');
  });

  it('returns error event_full when event is at capacity', async () => {
    mockRpc('lock_event_entry', null, { message: 'event_full' });

    const result = await lockEventEntry('evt-1');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('event_full');
  });

  it('returns error event_not_open when event status is wrong', async () => {
    mockRpc('lock_event_entry', null, { message: 'event_not_open' });

    const result = await lockEventEntry('evt-1');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('event_not_open');
  });

  it('returns error scout_events_disabled', async () => {
    mockRpc('lock_event_entry', null, { message: 'scout_events_disabled' });

    const result = await lockEventEntry('evt-1');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('scout_events_disabled');
  });

  it('returns alreadyEntered for duplicate entry (idempotent)', async () => {
    mockRpc('lock_event_entry', {
      ok: true,
      currency: 'tickets',
      already_entered: true,
    });

    const result = await lockEventEntry('evt-1');
    expect(result.ok).toBe(true);
    expect(result.alreadyEntered).toBe(true);
  });

  it('returns have/need on insufficient balance', async () => {
    mockRpc('lock_event_entry', {
      ok: false,
      error: 'insufficient_tickets',
      have: 3,
      need: 5,
    });

    const result = await lockEventEntry('evt-1');
    expect(result.ok).toBe(false);
    expect(result.have).toBe(3);
    expect(result.need).toBe(5);
  });

  it('returns error on null RPC response', async () => {
    mockRpc('lock_event_entry', null);

    const result = await lockEventEntry('evt-1');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('No response from server');
  });
});

// ============================================
// unlockEventEntry — calls unlock_event_entry (wrapper)
// ============================================
describe('unlockEventEntry', () => {
  it('returns ok with currency and balanceAfter on successful unlock', async () => {
    mockRpc('unlock_event_entry', {
      ok: true,
      currency: 'tickets',
      balance_after: 40,
    });

    const result = await unlockEventEntry('evt-1');
    expect(result.ok).toBe(true);
    expect(result.currency).toBe('tickets');
    expect(result.balanceAfter).toBe(40);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('unlock_event_entry', {
      p_event_id: 'evt-1',
    });
  });

  it('returns error event_locked when locks_at has passed', async () => {
    mockRpc('unlock_event_entry', null, { message: 'event_locked' });

    const result = await unlockEventEntry('evt-1');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('event_locked');
  });

  it('returns error on null RPC response', async () => {
    mockRpc('unlock_event_entry', null);

    const result = await unlockEventEntry('evt-1');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('No response from server');
  });
});

// ============================================
// cancelEventEntries — calls cancel_event_entries (admin wrapper)
// ============================================
describe('cancelEventEntries', () => {
  it('returns ok with refundedCount', async () => {
    mockRpc('cancel_event_entries', {
      ok: true,
      refunded_count: 5,
    });

    const result = await cancelEventEntries('evt-1');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.refundedCount).toBe(5);
  });

  it('returns error on RPC failure', async () => {
    mockRpc('cancel_event_entries', null, { message: 'unauthorized' });

    const result = await cancelEventEntries('evt-1');
    expect(result.ok).toBe(false);
  });
});

// ============================================
// getEventEntry
// ============================================
describe('getEventEntry', () => {
  it('returns DbEventEntry when entry exists', async () => {
    mockTable('event_entries', {
      event_id: 'evt-1',
      user_id: 'u1',
      currency: 'tickets',
      amount_locked: 5,
      fee_split: null,
      locked_at: '2026-03-22T00:00:00Z',
    });

    const result = await getEventEntry('evt-1', 'u1');
    expect(result).not.toBeNull();
    expect(result?.currency).toBe('tickets');
    expect(result?.amount_locked).toBe(5);
  });

  it('returns null when no entry found', async () => {
    mockTable('event_entries', null);

    const result = await getEventEntry('evt-1', 'u1');
    expect(result).toBeNull();
  });
});

// ============================================
// getUserEnteredEventIds
// ============================================
describe('getUserEnteredEventIds', () => {
  it('returns array of event IDs', async () => {
    mockTable('event_entries', [
      { event_id: 'evt-1' },
      { event_id: 'evt-2' },
    ]);

    const result = await getUserEnteredEventIds('u1');
    expect(result).toEqual(['evt-1', 'evt-2']);
  });

  it('returns empty array on error', async () => {
    mockTable('event_entries', null, { message: 'RLS error' });

    const result = await getUserEnteredEventIds('u1');
    expect(result).toEqual([]);
  });
});

// ============================================
// getScoutEventsEnabled
// ============================================
describe('getScoutEventsEnabled', () => {
  it('returns true when setting is true', async () => {
    mockTable('platform_settings', { value: true });

    const result = await getScoutEventsEnabled();
    expect(result).toBe(true);
  });

  it('returns false when setting is false', async () => {
    mockTable('platform_settings', { value: false });

    const result = await getScoutEventsEnabled();
    expect(result).toBe(false);
  });

  it('returns false when setting does not exist', async () => {
    mockTable('platform_settings', null);

    const result = await getScoutEventsEnabled();
    expect(result).toBe(false);
  });
});
