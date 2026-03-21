import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockTable, mockRpc, resetMocks } from '@/test/mocks/supabase';

import {
  lockEventEntry,
  unlockEventEntry,
  cancelEventEntries,
  getEventEntry,
  getUserEnteredEventIds,
  getScoutEventsEnabled,
} from '../event-entries';

beforeEach(() => {
  resetMocks();
  vi.clearAllMocks();
});

// ============================================
// lockEventEntry
// ============================================
describe('lockEventEntry', () => {
  it('returns success with currency and balance on successful lock', async () => {
    mockRpc('rpc_lock_event_entry', {
      success: true,
      currency: 'scout',
      balance: 450000,
      already_entered: false,
    });

    const result = await lockEventEntry('evt-1', 'u1');
    expect(result).toEqual({
      success: true,
      currency: 'scout',
      balance: 450000,
      already_entered: false,
    });
    expect(mockSupabase.rpc).toHaveBeenCalledWith('rpc_lock_event_entry', {
      p_event_id: 'evt-1',
      p_user_id: 'u1',
    });
  });

  it('returns error insufficient_tickets when RPC returns that error', async () => {
    mockRpc('rpc_lock_event_entry', null, { message: 'insufficient_tickets' });

    const result = await lockEventEntry('evt-1', 'u1');
    expect(result).toEqual({ success: false, error: 'insufficient_tickets' });
  });

  it('returns error insufficient_balance for $SCOUT', async () => {
    mockRpc('rpc_lock_event_entry', null, { message: 'insufficient_balance' });

    const result = await lockEventEntry('evt-1', 'u1');
    expect(result).toEqual({ success: false, error: 'insufficient_balance' });
  });

  it('returns error event_full when event is at capacity', async () => {
    mockRpc('rpc_lock_event_entry', null, { message: 'event_full' });

    const result = await lockEventEntry('evt-1', 'u1');
    expect(result).toEqual({ success: false, error: 'event_full' });
  });

  it('returns error event_not_open when event status is wrong', async () => {
    mockRpc('rpc_lock_event_entry', null, { message: 'event_not_open' });

    const result = await lockEventEntry('evt-1', 'u1');
    expect(result).toEqual({ success: false, error: 'event_not_open' });
  });

  it('returns already_entered=true for duplicate entry (idempotent)', async () => {
    mockRpc('rpc_lock_event_entry', {
      success: true,
      currency: 'tickets',
      balance: 95,
      already_entered: true,
    });

    const result = await lockEventEntry('evt-1', 'u1');
    expect(result).toEqual({
      success: true,
      currency: 'tickets',
      balance: 95,
      already_entered: true,
    });
  });

  it('returns error on RPC failure (network error)', async () => {
    mockRpc('rpc_lock_event_entry', null, { message: 'network timeout' });

    const result = await lockEventEntry('evt-1', 'u1');
    expect(result).toEqual({ success: false, error: 'network timeout' });
  });

  it('returns error when RPC returns null data', async () => {
    mockRpc('rpc_lock_event_entry', null);

    const result = await lockEventEntry('evt-1', 'u1');
    expect(result).toEqual({ success: false, error: 'RPC returned null' });
  });

  it('returns error when RPC returns success=false', async () => {
    mockRpc('rpc_lock_event_entry', { success: false, error: 'custom_error' });

    const result = await lockEventEntry('evt-1', 'u1');
    expect(result).toEqual({ success: false, error: 'custom_error' });
  });

  it('defaults currency to scout and balance to 0 when not provided', async () => {
    mockRpc('rpc_lock_event_entry', {
      success: true,
    });

    const result = await lockEventEntry('evt-1', 'u1');
    expect(result).toEqual({
      success: true,
      currency: 'scout',
      balance: 0,
      already_entered: false,
    });
  });
});

// ============================================
// unlockEventEntry
// ============================================
describe('unlockEventEntry', () => {
  it('returns success with currency and balance on successful unlock', async () => {
    mockRpc('rpc_unlock_event_entry', {
      success: true,
      currency: 'scout',
      balance: 550000,
    });

    const result = await unlockEventEntry('evt-1', 'u1');
    expect(result).toEqual({
      success: true,
      currency: 'scout',
      balance: 550000,
    });
    expect(mockSupabase.rpc).toHaveBeenCalledWith('rpc_unlock_event_entry', {
      p_event_id: 'evt-1',
      p_user_id: 'u1',
    });
  });

  it('returns error event_locked when locks_at has passed', async () => {
    mockRpc('rpc_unlock_event_entry', null, { message: 'event_locked' });

    const result = await unlockEventEntry('evt-1', 'u1');
    expect(result).toEqual({ success: false, error: 'event_locked' });
  });

  it('returns error on RPC failure', async () => {
    mockRpc('rpc_unlock_event_entry', null, { message: 'connection refused' });

    const result = await unlockEventEntry('evt-1', 'u1');
    expect(result).toEqual({ success: false, error: 'connection refused' });
  });

  it('returns error when RPC returns null data', async () => {
    mockRpc('rpc_unlock_event_entry', null);

    const result = await unlockEventEntry('evt-1', 'u1');
    expect(result).toEqual({ success: false, error: 'RPC returned null' });
  });

  it('returns error when RPC returns success=false', async () => {
    mockRpc('rpc_unlock_event_entry', { success: false, error: 'no_entry_found' });

    const result = await unlockEventEntry('evt-1', 'u1');
    expect(result).toEqual({ success: false, error: 'no_entry_found' });
  });

  it('defaults currency to scout and balance to 0 when not provided', async () => {
    mockRpc('rpc_unlock_event_entry', {
      success: true,
    });

    const result = await unlockEventEntry('evt-1', 'u1');
    expect(result).toEqual({
      success: true,
      currency: 'scout',
      balance: 0,
    });
  });
});

// ============================================
// cancelEventEntries
// ============================================
describe('cancelEventEntries', () => {
  it('returns success with refundedCount', async () => {
    mockRpc('rpc_cancel_event_entries', {
      success: true,
      refunded_count: 15,
    });

    const result = await cancelEventEntries('evt-1');
    expect(result).toEqual({
      success: true,
      refundedCount: 15,
    });
    expect(mockSupabase.rpc).toHaveBeenCalledWith('rpc_cancel_event_entries', {
      p_event_id: 'evt-1',
    });
  });

  it('returns error on RPC failure', async () => {
    mockRpc('rpc_cancel_event_entries', null, { message: 'permission denied' });

    const result = await cancelEventEntries('evt-1');
    expect(result).toEqual({ success: false, error: 'permission denied' });
  });

  it('returns error when RPC returns null data', async () => {
    mockRpc('rpc_cancel_event_entries', null);

    const result = await cancelEventEntries('evt-1');
    expect(result).toEqual({ success: false, error: 'RPC returned null' });
  });

  it('returns error when RPC returns success=false', async () => {
    mockRpc('rpc_cancel_event_entries', { success: false, error: 'event_not_cancellable' });

    const result = await cancelEventEntries('evt-1');
    expect(result).toEqual({ success: false, error: 'event_not_cancellable' });
  });

  it('defaults refundedCount to 0 when not provided', async () => {
    mockRpc('rpc_cancel_event_entries', { success: true });

    const result = await cancelEventEntries('evt-1');
    expect(result).toEqual({ success: true, refundedCount: 0 });
  });
});

// ============================================
// getEventEntry
// ============================================
describe('getEventEntry', () => {
  it('returns DbEventEntry when entry exists', async () => {
    const entry = {
      id: 'entry-1',
      event_id: 'evt-1',
      user_id: 'u1',
      currency: 'scout',
      amount: 50000,
      locked_at: '2026-03-01T18:00:00Z',
      unlocked_at: null,
    };
    mockTable('event_entries', entry);

    const result = await getEventEntry('evt-1', 'u1');
    expect(result).toEqual(entry);
    expect(mockSupabase.from).toHaveBeenCalledWith('event_entries');
  });

  it('returns null when no entry found', async () => {
    mockTable('event_entries', null);

    const result = await getEventEntry('evt-1', 'u1');
    expect(result).toBeNull();
  });

  it('returns null on error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockTable('event_entries', null, { message: 'DB error' });

    const result = await getEventEntry('evt-1', 'u1');
    expect(result).toBeNull();
    consoleSpy.mockRestore();
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
      { event_id: 'evt-3' },
    ]);

    const result = await getUserEnteredEventIds('u1');
    expect(result).toEqual(['evt-1', 'evt-2', 'evt-3']);
    expect(mockSupabase.from).toHaveBeenCalledWith('event_entries');
  });

  it('returns empty array on error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockTable('event_entries', null, { message: 'Query failed' });

    const result = await getUserEnteredEventIds('u1');
    expect(result).toEqual([]);
    consoleSpy.mockRestore();
  });

  it('returns empty array when data is null', async () => {
    mockTable('event_entries', null);

    const result = await getUserEnteredEventIds('u1');
    expect(result).toEqual([]);
  });
});

// ============================================
// getScoutEventsEnabled
// ============================================
describe('getScoutEventsEnabled', () => {
  it('returns true when setting is true (boolean)', async () => {
    mockTable('app_settings', { value: true });

    const result = await getScoutEventsEnabled();
    expect(result).toBe(true);
  });

  it('returns true when setting is "true" (string)', async () => {
    mockTable('app_settings', { value: 'true' });

    const result = await getScoutEventsEnabled();
    expect(result).toBe(true);
  });

  it('returns false when setting is false', async () => {
    mockTable('app_settings', { value: false });

    const result = await getScoutEventsEnabled();
    expect(result).toBe(false);
  });

  it('returns false when setting does not exist', async () => {
    mockTable('app_settings', null);

    const result = await getScoutEventsEnabled();
    expect(result).toBe(false);
  });

  it('returns false on error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockTable('app_settings', null, { message: 'Table not found' });

    const result = await getScoutEventsEnabled();
    expect(result).toBe(false);
    consoleSpy.mockRestore();
  });
});
