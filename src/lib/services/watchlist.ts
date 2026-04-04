import { supabase } from '@/lib/supabaseClient';
import type { Pos } from '@/types';

// ============================================
// Types
// ============================================

export type MostWatchedPlayer = {
  playerId: string;
  watcherCount: number;
  firstName: string;
  lastName: string;
  position: Pos;
  club: string;
  imageUrl: string | null;
  floorPrice: number;
};

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
}

/** Remove player from watchlist */
export async function removeFromWatchlist(userId: string, playerId: string): Promise<void> {
  const { error } = await supabase
    .from('watchlist')
    .delete()
    .eq('user_id', userId)
    .eq('player_id', playerId);

  if (error) throw new Error(error.message);
}

/** Update alert threshold for a watchlist entry */
export async function updateAlertThreshold(
  userId: string,
  playerId: string,
  thresholdPct: number
): Promise<void> {
  const { error } = await supabase
    .from('watchlist')
    .update({ alert_threshold_pct: thresholdPct })
    .eq('user_id', userId)
    .eq('player_id', playerId);

  if (error) throw new Error(error.message);
}

/** Get total watcher count for a player (platform-wide) */
export async function getWatcherCount(playerId: string): Promise<number> {
  const { count, error } = await supabase
    .from('watchlist')
    .select('*', { count: 'exact', head: true })
    .eq('player_id', playerId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Get most-watched players platform-wide (auth-gated) */
export async function getMostWatchedPlayers(limit = 5): Promise<MostWatchedPlayer[]> {
  const { data, error } = await supabase.rpc('get_most_watched_players', { p_limit: limit });

  if (error) throw new Error(error.message);
  return (data ?? []).map((r: {
    player_id: string;
    watcher_count: number;
    first_name: string;
    last_name: string;
    player_pos: string;
    club: string;
    image_url: string | null;
    floor_price: number;
  }) => ({
    playerId: r.player_id,
    watcherCount: r.watcher_count,
    firstName: r.first_name,
    lastName: r.last_name,
    position: r.player_pos as Pos,
    club: r.club,
    imageUrl: r.image_url,
    floorPrice: r.floor_price,
  }));
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
    return migrated;
  } catch {
    return 0;
  }
}
