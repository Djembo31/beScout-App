import { supabase } from '@/lib/supabaseClient';
import { logSupabaseError } from '@/lib/supabaseErrors';
import type { DbUserTickets, DbTicketTransaction, TicketSource } from '@/types';

// ============================================
// Tickets Service
// ============================================

/**
 * Fetch the user's ticket balance via RPC.
 *
 * IMPORTANT — error propagation: this function THROWS on RPC error
 * instead of silently returning null. The RPC `get_user_tickets`
 * raises `'Nicht authentifiziert'` when `auth.uid()` is null, which
 * happens on first paint before the Supabase session is fully
 * hydrated. If the service swallowed that error and returned null,
 * React Query would cache null as a successful result and NOT retry,
 * leaving the TopBar ticket pill stuck on its skeleton for 30s
 * (staleTime) or until the next navigation refocused the query.
 * By throwing, we let React Query's default retry (3×, exponential
 * backoff) fire — by retry time the session is ready and the pill
 * populates correctly without the user seeing a disappearing number.
 */
export async function getUserTickets(_userId: string): Promise<DbUserTickets | null> {
  const { data, error } = await supabase.rpc('get_user_tickets');

  if (error) {
    logSupabaseError('[Tickets] getUserTickets', error);
    throw new Error(error.message);
  }

  if (!data) return null;

  const row = Array.isArray(data) ? data[0] : data;
  return row as DbUserTickets | null;
}

/** Fetch ticket transaction history (newest first) */
export async function getTicketTransactions(userId: string, limit = 20): Promise<DbTicketTransaction[]> {
  const { data, error } = await supabase
    .from('ticket_transactions')
    .select('id, user_id, amount, balance_after, source, reference_id, description, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Tickets] getTicketTransactions error:', error);
    return [];
  }
  return (data ?? []) as DbTicketTransaction[];
}

/** Credit tickets to a user via RPC */
export async function creditTickets(
  userId: string,
  amount: number,
  source: TicketSource,
  referenceId?: string,
  description?: string,
): Promise<{ ok: boolean; newBalance?: number; error?: string }> {
  const { data, error } = await supabase.rpc('credit_tickets', {
    p_user_id: userId,
    p_amount: amount,
    p_source: source,
    p_reference_id: referenceId ?? null,
    p_description: description ?? null,
  });

  if (error) {
    console.error('[Tickets] creditTickets error:', error);
    return { ok: false, error: error.message };
  }

  const result = data as { ok: boolean; new_balance?: number; error?: string };

  if (!result.ok) {
    return { ok: false, error: result.error ?? 'Unknown error' };
  }

  return { ok: true, newBalance: result.new_balance };
}

/** Spend tickets from a user's balance via RPC */
export async function spendTickets(
  userId: string,
  amount: number,
  source: TicketSource,
  referenceId?: string,
  description?: string,
): Promise<{ ok: boolean; newBalance?: number; error?: string }> {
  const { data, error } = await supabase.rpc('spend_tickets', {
    p_user_id: userId,
    p_amount: amount,
    p_source: source,
    p_reference_id: referenceId ?? null,
    p_description: description ?? null,
  });

  if (error) {
    console.error('[Tickets] spendTickets error:', error);
    return { ok: false, error: error.message };
  }

  const result = data as { ok: boolean; new_balance?: number; error?: string };

  if (!result.ok) {
    return { ok: false, error: result.error ?? 'Unknown error' };
  }

  return { ok: true, newBalance: result.new_balance };
}
