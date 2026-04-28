import { supabase } from '@/lib/supabaseClient';
import type { DbUserWildcard, DbWildcardTransaction } from '@/types';

// ============================================
// Wild Card Service
// ============================================

/**
 * Get user's wildcard balance for a specific league.
 * Slice 251 Wave 2 Track F: per-league Composite-PK.
 * Discriminated-union check per errors-db.md §Silent-Cast (Slice 165).
 */
export async function getWildcardBalance(userId: string, leagueId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_wildcard_balance', {
    p_user_id: userId,
    p_league_id: leagueId,
  });
  if (error) throw new Error(error.message);
  // RPC returns INT directly (not discriminated union — simple read)
  const balance = data as number | null;
  return balance ?? 0;
}

/**
 * Get wildcard record for a specific (user, league) pair.
 * Slice 251 Wave 2 Track F: Composite-PK (user_id, league_id).
 */
export async function getWildcardRecord(userId: string, leagueId: string): Promise<DbUserWildcard | null> {
  const { data, error } = await supabase
    .from('user_wildcards')
    .select('*')
    .eq('user_id', userId)
    .eq('league_id', leagueId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as DbUserWildcard | null;
}

/** Earn wild cards (credits balance) */
export async function earnWildcards(
  userId: string,
  amount: number,
  source: DbWildcardTransaction['source'],
  referenceId?: string,
  description?: string,
): Promise<number> {
  const { data, error } = await supabase.rpc('earn_wildcards', {
    p_user_id: userId,
    p_amount: amount,
    p_source: source,
    p_reference_id: referenceId ?? null,
    p_description: description ?? null,
  });
  if (error) throw new Error(error.message);
  return data ?? 0;
}

/** Spend wild cards (debits balance) — throws 'insufficient_wildcards' if not enough */
export async function spendWildcards(
  userId: string,
  amount: number,
  source: DbWildcardTransaction['source'],
  referenceId?: string,
  description?: string,
): Promise<number> {
  const { data, error } = await supabase.rpc('spend_wildcards', {
    p_user_id: userId,
    p_amount: amount,
    p_source: source,
    p_reference_id: referenceId ?? null,
    p_description: description ?? null,
  });
  if (error) {
    if (error.message.includes('insufficient_wildcards')) {
      throw new Error('insufficient_wildcards');
    }
    throw new Error(error.message);
  }
  return data ?? 0;
}

/** Get wild card transaction history */
export async function getWildcardHistory(
  userId: string,
  limit = 20,
): Promise<DbWildcardTransaction[]> {
  const { data, error } = await supabase
    .from('wildcard_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[Wildcards] getHistory error:', error);
    return [];
  }
  return (data ?? []) as DbWildcardTransaction[];
}

/** Admin: grant wild cards to a user */
export async function adminGrantWildcards(
  adminId: string,
  targetUserId: string,
  amount: number,
  description = 'Admin grant',
): Promise<number> {
  const { data, error } = await supabase.rpc('admin_grant_wildcards', {
    p_admin_id: adminId,
    p_target_user_id: targetUserId,
    p_amount: amount,
    p_description: description,
  });
  if (error) throw new Error(error.message);
  return data ?? 0;
}
