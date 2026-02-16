import { supabase } from '@/lib/supabaseClient';
import { cached, invalidate } from '@/lib/cache';

const TWO_MIN = 2 * 60 * 1000;

// ============================================
// Types
// ============================================

export type WatchlistEntry = {
  id: string;
  playerId: string;
  alertThresholdPct: number;
  alertDirection: 'up' | 'down' | 'both';
  lastAlertPrice: number;
  createdAt: string;
};

// ============================================
// Queries
// ============================================

/** Get user's watchlist */
export async function getWatchlist(userId: string): Promise<WatchlistEntry[]> {
  return cached(`watchlist:${userId}`, async () => {
    const { data, error } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map(w => ({
      id: w.id,
      playerId: w.player_id,
      alertThresholdPct: w.alert_threshold_pct,
      alertDirection: w.alert_direction,
      lastAlertPrice: w.last_alert_price,
      createdAt: w.created_at,
    }));
  }, TWO_MIN);
}

/** Check if a player is on the user's watchlist */
export async function isOnWatchlist(userId: string, playerId: string): Promise<boolean> {
  return cached(`watchlist:${userId}:${playerId}`, async () => {
    const { data } = await supabase
      .from('watchlist')
      .select('id')
      .eq('user_id', userId)
      .eq('player_id', playerId)
      .maybeSingle();
    return !!data;
  }, TWO_MIN);
}

// ============================================
// Mutations
// ============================================

/** Add player to watchlist */
export async function addToWatchlist(userId: string, playerId: string): Promise<void> {
  const { error } = await supabase
    .from('watchlist')
    .insert({ user_id: userId, player_id: playerId });

  if (error) {
    if (error.code === '23505') return; // Already exists
    throw new Error(error.message);
  }
  invalidate(`watchlist:${userId}`);
}

/** Remove player from watchlist */
export async function removeFromWatchlist(userId: string, playerId: string): Promise<void> {
  const { error } = await supabase
    .from('watchlist')
    .delete()
    .eq('user_id', userId)
    .eq('player_id', playerId);

  if (error) throw new Error(error.message);
  invalidate(`watchlist:${userId}`);
}

/** Migrate localStorage watchlist to DB (one-time). Returns number of items migrated. */
export async function migrateLocalWatchlist(userId: string): Promise<number> {
  const LEGACY_KEY = 'bescout-watchlist';
  try {
    const stored = localStorage.getItem(LEGACY_KEY);
    if (!stored) return 0;

    const ids: string[] = JSON.parse(stored);
    if (!Array.isArray(ids) || ids.length === 0) return 0;

    let migrated = 0;
    for (const playerId of ids) {
      try {
        await addToWatchlist(userId, playerId);
        migrated++;
      } catch {
        // Skip duplicates or invalid IDs
      }
    }

    // Remove localStorage after successful migration
    localStorage.removeItem(LEGACY_KEY);
    invalidate(`watchlist:${userId}`);
    return migrated;
  } catch {
    return 0;
  }
}
