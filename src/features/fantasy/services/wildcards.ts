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

/**
 * Get wild card transaction history.
 * Slice 306: throw on error (was silent `return []` — errors-db.md §Service Error-Swallowing).
 * Note: the wildcard economy is currently dormant — earn/spend/admin_grant RPCs DO write
 * to wildcard_transactions (verified live), but no app path calls them yet, so this returns
 * [] in practice (no error, just no rows). The throw matters once the economy is activated.
 */
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
  if (error) throw new Error(error.message);
  return (data ?? []) as DbWildcardTransaction[];
}

/**
 * Admin: grant wild cards to a user for a specific league.
 * Slice 251 Wave 2 Track F Heal: p_league_id pflicht nach Composite-PK-Migration.
 * Discriminated-union return per Slice 168 pattern.
 */
export async function adminGrantWildcards(
  adminId: string,
  targetUserId: string,
  amount: number,
  leagueId: string,
  description = 'admin_grant',
): Promise<{ success: boolean; balance?: number; error?: string }> {
  const { data, error } = await supabase.rpc('admin_grant_wildcards', {
    p_admin_id: adminId,
    p_target_user_id: targetUserId,
    p_amount: amount,
    p_league_id: leagueId,
    p_description: description,
  });
  if (error) throw new Error(error.message);
  const result = data as { success: boolean; balance?: number; error?: string } | null;
  if (!result) throw new Error('rpc_no_response');
  if (!result.success) throw new Error(result.error ?? 'admin_grant_failed');
  return result;
}
