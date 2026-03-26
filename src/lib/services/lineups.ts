import { supabase } from '@/lib/supabaseClient';
import { getFixtureDeadlinesByGameweek } from '@/lib/services/fixtures';
import { notifText } from '@/lib/notifText';
import type { DbLineup, DbPlayer, Pos, UserFantasyResult } from '@/types';

// ============================================
// Types
// ============================================

/** All possible DB slot column names */
const ALL_SLOT_COLUMNS = [
  'slot_gk', 'slot_def1', 'slot_def2', 'slot_def3', 'slot_def4',
  'slot_mid1', 'slot_mid2', 'slot_mid3', 'slot_mid4',
  'slot_att', 'slot_att2', 'slot_att3',
] as const;

/** All possible slot keys (used in slot_scores JSONB) */
const ALL_SLOT_KEYS = [
  'gk', 'def1', 'def2', 'def3', 'def4',
  'mid1', 'mid2', 'mid3', 'mid4',
  'att', 'att2', 'att3',
] as const;

export type LineupSlotPlayer = {
  slotKey: string;           // 'gk' | 'def1' | 'def2' | ... | 'att3'
  playerId: string;
  score: number | null;
  player: {
    firstName: string;
    lastName: string;
    position: Pos;
    club: string;
    perfL5: number;
    imageUrl?: string | null;
  };
};

export type LineupWithPlayers = {
  lineup: DbLineup;
  players: LineupSlotPlayer[];
};

// ============================================
// Lineup Queries
// ============================================

/** Get player IDs that the user holds DPCs for (quantity > 0) */
export async function getOwnedPlayerIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('holdings')
    .select('player_id')
    .eq('user_id', userId)
    .gt('quantity', 0);
  return new Set((data ?? []).map(h => h.player_id));
}

/** Lineup eines Users fuer ein Event laden */
export async function getLineup(eventId: string, userId: string): Promise<DbLineup | null> {
  const { data, error } = await supabase
    .from('lineups')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return null;
  return data as DbLineup;
}

/** Lineup erstellen oder aktualisieren — uses SECURITY DEFINER RPC to bypass RLS */
export async function submitLineup(params: {
  eventId: string;
  userId: string;
  formation: string;
  slots: Record<string, string | null>;
  captainSlot?: string | null;
  wildcardSlots?: string[];
}): Promise<DbLineup> {
  // ALL validation + write happens in the RPC (SECURITY DEFINER, bypasses RLS)
  // No client-side guards — they use direct Supabase queries that fail with RLS
  const { data: rpcResult, error: rpcError } = await supabase.rpc('save_lineup', {
    p_event_id: params.eventId,
    p_formation: params.formation,
    p_captain_slot: params.captainSlot ?? null,
    p_wildcard_slots: params.wildcardSlots ?? [],
    p_slot_gk: params.slots['gk'] ?? null,
    p_slot_def1: params.slots['def1'] ?? null,
    p_slot_def2: params.slots['def2'] ?? null,
    p_slot_def3: params.slots['def3'] ?? null,
    p_slot_def4: params.slots['def4'] ?? null,
    p_slot_mid1: params.slots['mid1'] ?? null,
    p_slot_mid2: params.slots['mid2'] ?? null,
    p_slot_mid3: params.slots['mid3'] ?? null,
    p_slot_mid4: params.slots['mid4'] ?? null,
    p_slot_att: params.slots['att'] ?? null,
    p_slot_att2: params.slots['att2'] ?? null,
    p_slot_att3: params.slots['att3'] ?? null,
  });

  if (rpcError) {
    console.error('[Lineup] save_lineup RPC failed:', rpcError);
    throw new Error(rpcError.message);
  }

  const result = rpcResult as { ok: boolean; error?: string; lineup_id?: string };
  if (!result.ok) {
    throw new Error(result.error ?? 'lineup_save_failed');
  }

  // Activity log (fire-and-forget)
  import('@/lib/services/activityLog').then(({ logActivity }) => {
    logActivity(params.userId, 'lineup_submit', 'fantasy', { eventId: params.eventId, formation: params.formation });
  }).catch(err => console.error('[Lineup] Activity log failed:', err));

  return result as unknown as DbLineup;
}

// Dead code removed — all validation now in save_lineup RPC

/** Lineup löschen (Abmelden vom Event) */

/** Lineup löschen (Abmelden vom Event) */
export async function removeLineup(eventId: string, userId: string): Promise<void> {
  // Refund wild cards before lineup deletion
  const { data: lineup } = await supabase
    .from('lineups')
    .select('wildcard_slots')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  const wcSlots = (lineup?.wildcard_slots as string[]) ?? [];
  if (wcSlots.length > 0) {
    const { earnWildcards } = await import('@/lib/services/wildcards');
    await earnWildcards(userId, wcSlots.length, 'event_refund', eventId, 'Refund on event leave');
  }

  // Release holding locks before lineup deletion
  await supabase
    .from('holding_locks')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId);

  const { error, count } = await supabase
    .from('lineups')
    .delete({ count: 'exact' })
    .eq('event_id', eventId)
    .eq('user_id', userId);

  if (error) throw new Error(`removeLineup failed: ${error.message}`);

  if (count === 0) {
    throw new Error('lineupDeleteFailed');
  }
}

/** Teilnehmer eines Events laden (für Overview) */
export async function getEventParticipants(eventId: string, limit = 10): Promise<{ id: string; handle: string; display_name?: string; avatar_url?: string }[]> {
  // 1. Get user_ids from lineups
  const { data: lineups, error: lError } = await supabase
    .from('lineups')
    .select('user_id')
    .eq('event_id', eventId)
    .limit(limit);

  if (lError || !lineups || lineups.length === 0) return [];

  const userIds = lineups.map(l => l.user_id);

  // 2. Get profiles
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('id, handle, display_name, avatar_url')
    .in('id', userIds);

  if (pError) throw new Error(pError.message);
  return (profiles ?? []) as { id: string; handle: string; display_name?: string; avatar_url?: string }[];
}

/** Anzahl der Teilnehmer abrufen (schneller Count) */
export async function getEventParticipantCount(eventId: string): Promise<number> {
  const { count, error } = await supabase
    .from('lineups')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId);

  if (error) return 0;
  return count ?? 0;
}

/** Load a user's lineup for an event with player details and slot scores */
export async function getLineupWithPlayers(eventId: string, userId: string): Promise<LineupWithPlayers | null> {
  const { data: lineup, error } = await supabase
    .from('lineups')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !lineup) return null;

  const dbLineup = lineup as DbLineup;

  // Build slot definitions from all possible columns
  const slotDefs: { key: string; column: keyof DbLineup }[] = ALL_SLOT_KEYS.map((key, i) => ({
    key,
    column: ALL_SLOT_COLUMNS[i] as keyof DbLineup,
  }));

  // Collect non-null player IDs
  const playerIds: string[] = [];
  for (const sd of slotDefs) {
    const pid = dbLineup[sd.column] as string | null;
    if (pid) playerIds.push(pid);
  }

  if (playerIds.length === 0) return { lineup: dbLineup, players: [] };

  // Fetch player data
  const { data: playersData } = await supabase
    .from('players')
    .select('id, first_name, last_name, position, club, perf_l5, image_url')
    .in('id', playerIds);

  type SlotPlayerData = Pick<DbPlayer, 'id' | 'first_name' | 'last_name' | 'position' | 'club' | 'perf_l5' | 'image_url'>;
  const playerMap = new Map<string, SlotPlayerData>(
    (playersData ?? []).map((p) => [p.id, p as SlotPlayerData])
  );

  const scores = dbLineup.slot_scores as Record<string, number> | null;

  const players: LineupSlotPlayer[] = [];
  for (const sd of slotDefs) {
    const pid = dbLineup[sd.column] as string | null;
    if (!pid) continue;
    const p = playerMap.get(pid);
    players.push({
      slotKey: sd.key,
      playerId: pid,
      score: scores ? (scores[sd.key] ?? null) : null,
      player: {
        firstName: p?.first_name ?? '',
        lastName: p?.last_name ?? '',
        position: p?.position ?? 'MID',
        club: p?.club ?? '',
        perfL5: p?.perf_l5 ?? 0,
        imageUrl: p?.image_url ?? null,
      },
    });
  }

  return { lineup: dbLineup, players };
}

/** Get per-player event usage for a user.
 *  Returns a map of playerId -> array of active event IDs where this player is committed.
 *  Each event uses 1 DPC per player. Player is only fully locked when eventsUsing >= dpcOwned. */
export async function getPlayerEventUsage(userId: string): Promise<Map<string, string[]>> {
  const { data, error } = await supabase
    .from('lineups')
    .select(`
      slot_gk, slot_def1, slot_def2, slot_def3, slot_def4,
      slot_mid1, slot_mid2, slot_mid3, slot_mid4,
      slot_att, slot_att2, slot_att3,
      event:events ( id, name, status )
    `)
    .eq('user_id', userId);

  if (error || !data) return new Map();

  const usageMap = new Map<string, string[]>();

  for (const lineup of data) {
    const ev = lineup.event as unknown as { id: string; name: string; status: string } | null;
    if (!ev || ev.status === 'ended' || ev.status === 'scoring') continue;

    const slots = [
      lineup.slot_gk, lineup.slot_def1, lineup.slot_def2, lineup.slot_def3, lineup.slot_def4,
      lineup.slot_mid1, lineup.slot_mid2, lineup.slot_mid3, lineup.slot_mid4,
      lineup.slot_att, lineup.slot_att2, lineup.slot_att3,
    ];
    for (const playerId of slots) {
      if (playerId) {
        const existing = usageMap.get(playerId) || [];
        existing.push(ev.id);
        usageMap.set(playerId, existing);
      }
    }
  }

  return usageMap;
}

/** Fantasy-Ergebnisse eines Users (fuer Profil) — nur scored Events */
export async function getUserFantasyHistory(userId: string, limit = 10): Promise<UserFantasyResult[]> {
  const { data, error } = await supabase
    .from('lineups')
    .select('event_id, total_score, rank, reward_amount, event:events(name, gameweek, starts_at)')
    .eq('user_id', userId)
    .not('total_score', 'is', null)
    .order('submitted_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((row: Record<string, unknown>) => {
    const event = row.event as { name?: string; gameweek?: number; starts_at?: string } | null;
    return {
      eventId: row.event_id as string,
      eventName: event?.name ?? notifText('unknownFallback'),
      gameweek: event?.gameweek ?? null,
      eventDate: event?.starts_at ?? '',
      totalScore: row.total_score as number,
      rank: (row.rank as number | null) ?? 0,
      rewardAmount: row.reward_amount as number,
    };
  });
}
