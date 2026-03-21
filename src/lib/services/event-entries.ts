import { supabase } from '@/lib/supabaseClient';

// ============================================
// Types
// ============================================

export type EventEntryCurrency = 'scout' | 'tickets';

export type LockEventEntryResult = {
  success: true;
  currency: EventEntryCurrency;
  balance: number;
  already_entered: boolean;
} | {
  success: false;
  error: string;
};

export type UnlockEventEntryResult = {
  success: true;
  currency: EventEntryCurrency;
  balance: number;
} | {
  success: false;
  error: string;
};

export type CancelEventEntriesResult = {
  success: true;
  refundedCount: number;
} | {
  success: false;
  error: string;
};

export type DbEventEntry = {
  id: string;
  event_id: string;
  user_id: string;
  currency: EventEntryCurrency;
  amount: number;
  locked_at: string;
  unlocked_at: string | null;
};

// ============================================
// Atomic Event Entry RPCs
// ============================================

/**
 * Lock an event entry atomically.
 * Deducts the entry fee (either $SCOUT or tickets) and creates the entry record
 * in a single transaction. Idempotent: if the user already has an entry, returns
 * already_entered=true without charging again.
 */
export async function lockEventEntry(
  eventId: string,
  userId: string,
): Promise<LockEventEntryResult> {
  const { data, error } = await supabase.rpc('rpc_lock_event_entry', {
    p_event_id: eventId,
    p_user_id: userId,
  });

  if (error) {
    const msg = error.message ?? 'Unknown error';
    // Map known RPC error codes to structured errors
    if (msg.includes('insufficient_tickets')) return { success: false, error: 'insufficient_tickets' };
    if (msg.includes('insufficient_balance')) return { success: false, error: 'insufficient_balance' };
    if (msg.includes('event_full')) return { success: false, error: 'event_full' };
    if (msg.includes('event_not_open')) return { success: false, error: 'event_not_open' };
    return { success: false, error: msg };
  }

  if (!data) return { success: false, error: 'RPC returned null' };

  const result = data as {
    success: boolean;
    currency?: EventEntryCurrency;
    balance?: number;
    already_entered?: boolean;
    error?: string;
  };

  if (!result.success) {
    return { success: false, error: result.error ?? 'Unknown error' };
  }

  return {
    success: true,
    currency: result.currency ?? 'scout',
    balance: result.balance ?? 0,
    already_entered: result.already_entered ?? false,
  };
}

/**
 * Unlock an event entry atomically.
 * Refunds the entry fee and removes the entry record in a single transaction.
 * Fails if the event locks_at deadline has passed.
 */
export async function unlockEventEntry(
  eventId: string,
  userId: string,
): Promise<UnlockEventEntryResult> {
  const { data, error } = await supabase.rpc('rpc_unlock_event_entry', {
    p_event_id: eventId,
    p_user_id: userId,
  });

  if (error) {
    const msg = error.message ?? 'Unknown error';
    if (msg.includes('event_locked')) return { success: false, error: 'event_locked' };
    return { success: false, error: msg };
  }

  if (!data) return { success: false, error: 'RPC returned null' };

  const result = data as {
    success: boolean;
    currency?: EventEntryCurrency;
    balance?: number;
    error?: string;
  };

  if (!result.success) {
    return { success: false, error: result.error ?? 'Unknown error' };
  }

  return {
    success: true,
    currency: result.currency ?? 'scout',
    balance: result.balance ?? 0,
  };
}

/**
 * Cancel all entries for an event and refund participants.
 * Used when an admin cancels an event. Returns the count of refunded entries.
 */
export async function cancelEventEntries(
  eventId: string,
): Promise<CancelEventEntriesResult> {
  const { data, error } = await supabase.rpc('rpc_cancel_event_entries', {
    p_event_id: eventId,
  });

  if (error) {
    return { success: false, error: error.message ?? 'Unknown error' };
  }

  if (!data) return { success: false, error: 'RPC returned null' };

  const result = data as {
    success: boolean;
    refunded_count?: number;
    error?: string;
  };

  if (!result.success) {
    return { success: false, error: result.error ?? 'Unknown error' };
  }

  return {
    success: true,
    refundedCount: result.refunded_count ?? 0,
  };
}

// ============================================
// Event Entry Queries
// ============================================

/**
 * Get a user's entry for a specific event.
 * Returns null if the user has not entered the event.
 */
export async function getEventEntry(
  eventId: string,
  userId: string,
): Promise<DbEventEntry | null> {
  const { data, error } = await supabase
    .from('event_entries')
    .select('id, event_id, user_id, currency, amount, locked_at, unlocked_at')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[EventEntries] getEventEntry error:', error);
    return null;
  }

  return data as DbEventEntry | null;
}

/**
 * Get all event IDs that a user has entered (active entries only).
 * Returns an empty array on error.
 */
export async function getUserEnteredEventIds(
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('event_entries')
    .select('event_id')
    .eq('user_id', userId)
    .is('unlocked_at', null);

  if (error) {
    console.error('[EventEntries] getUserEnteredEventIds error:', error);
    return [];
  }

  return (data ?? []).map(row => row.event_id);
}

/**
 * Check if $SCOUT-based events are enabled (platform setting).
 * Returns false if the setting doesn't exist or on error.
 */
export async function getScoutEventsEnabled(): Promise<boolean> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'scout_events_enabled')
    .maybeSingle();

  if (error) {
    console.error('[EventEntries] getScoutEventsEnabled error:', error);
    return false;
  }

  if (!data) return false;

  return data.value === true || data.value === 'true';
}
