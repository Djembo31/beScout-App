import { supabase } from '@/lib/supabaseClient';
import type { DbUserTickets, DbTicketTransaction, TicketSource } from '@/types';

// ============================================
// Tickets Service
// ============================================

/** Fetch the user's ticket balance via RPC */
export async function getUserTickets(userId: string): Promise<DbUserTickets | null> {
  const { data, error } = await supabase.rpc('get_user_tickets');

  if (error) {
    console.error('[Tickets] getUserTickets error:', error);
    return null;
  }

  // RPC returns a single row or null
  if (!data) return null;

  // Handle both single-row and array responses from Supabase
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
