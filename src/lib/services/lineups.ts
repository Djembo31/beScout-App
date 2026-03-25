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

/** Lineup erstellen oder aktualisieren (Upsert) */
export async function submitLineup(params: {
  eventId: string;
  userId: string;
  formation: string;
  slots: Record<string, string | null>;
  captainSlot?: string | null;
}): Promise<DbLineup> {
  // Check event status + capacity + scope before submitting
  const { data: ev, error: evError } = await supabase
    .from('events')
    .select('status, max_entries, current_entries, locks_at, lineup_size, scope, type, club_id, min_sc_per_slot')
    .eq('id', params.eventId)
    .single();

  if (evError || !ev) {
    throw new Error('eventNotFound');
  }

  if (ev.status === 'ended' || ev.status === 'scoring') {
    throw new Error('eventEnded');
  }

  // Guard: user must have entered (paid) before submitting lineup
  const { data: entryData } = await supabase
    .from('event_entries')
    .select('event_id')
    .eq('event_id', params.eventId)
    .eq('user_id', params.userId)
    .maybeSingle();

  if (!entryData) {
    throw new Error('must_enter_first');
  }

  // locks_at enforcement: block submissions if locks_at has passed (regardless of status)
  if (ev.locks_at && new Date(ev.locks_at) <= new Date()) {
    throw new Error('eventLocked');
  }

  // Per-fixture locking: when event is running, only block slots with active fixtures
  if (ev.status === 'running') {
    // Load event gameweek
    const { data: evFull } = await supabase
      .from('events')
      .select('gameweek')
      .eq('id', params.eventId)
      .single();

    if (!evFull?.gameweek) {
      throw new Error('eventGameweekNotFound');
    }

    // Load fixture deadlines for this gameweek
    const deadlines = await getFixtureDeadlinesByGameweek(evFull.gameweek);

    // Load existing lineup to check which slots are changing
    const { data: existingLineup } = await supabase
      .from('lineups')
      .select('*')
      .eq('event_id', params.eventId)
      .eq('user_id', params.userId)
      .maybeSingle();

    // Collect all player IDs (old + new) to look up their club_ids
    const allPlayerIds = new Set<string>();
    if (existingLineup) {
      for (const col of ALL_SLOT_COLUMNS) {
        const pid = (existingLineup as Record<string, unknown>)[col] as string | null;
        if (pid) allPlayerIds.add(pid);
      }
    }
    Object.values(params.slots).forEach(pid => { if (pid) allPlayerIds.add(pid); });

    // Fetch club_ids for all involved players
    const playerClubMap = new Map<string, string | null>();
    if (allPlayerIds.size > 0) {
      const { data: players } = await supabase
        .from('players')
        .select('id, club_id')
        .in('id', Array.from(allPlayerIds));
      if (players) {
        for (const p of players) {
          playerClubMap.set(p.id as string, (p.club_id as string) ?? null);
        }
      }
    }

    // Check each slot: if old or new player is locked → error (unless slot unchanged)
    for (let i = 0; i < ALL_SLOT_KEYS.length; i++) {
      const slotKey = ALL_SLOT_KEYS[i];
      const slotCol = ALL_SLOT_COLUMNS[i];
      const newPlayerId = params.slots[slotKey] ?? null;
      const oldPlayerId = existingLineup ? ((existingLineup as Record<string, unknown>)[slotCol] as string | null) : null;

      // Slot unchanged → skip
      if (newPlayerId === oldPlayerId) continue;

      // Check if old player in this slot is locked (can't remove locked player)
      if (oldPlayerId) {
        const oldClubId = playerClubMap.get(oldPlayerId);
        if (oldClubId && deadlines.get(oldClubId)?.isLocked) {
          throw new Error('playerLockedRemove');
        }
      }

      // Check if new player being added is locked (can't add locked player)
      if (newPlayerId) {
        const newClubId = playerClubMap.get(newPlayerId);
        if (newClubId && deadlines.get(newClubId)?.isLocked) {
          throw new Error('playerLockedAdd');
        }
      }
    }
  }

  // Check if this is a new entry or an update (needed for capacity logic)
  const { data: existingEntry } = await supabase
    .from('lineups')
    .select('id')
    .eq('event_id', params.eventId)
    .eq('user_id', params.userId)
    .maybeSingle();

  const isNewEntry = !existingEntry;

  // Capacity pre-check (fast UX feedback — DB CHECK constraint is the real guard)
  if (isNewEntry && ev.max_entries && ev.current_entries >= ev.max_entries) {
    throw new Error('eventFull');
  }

  // Guard: prevent duplicate players across slots
  const slotPlayerIds = Object.values(params.slots).filter((id): id is string => id != null);
  const uniqueIds = new Set(slotPlayerIds);
  if (uniqueIds.size < slotPlayerIds.length) {
    throw new Error('duplicatePlayer');
  }

  // Guard: SC ownership — user must own min_sc_per_slot SCs per player
  const minScPerSlot = ev.min_sc_per_slot ?? 1;
  if (minScPerSlot > 0 && slotPlayerIds.length > 0) {
    // Load existing locks for this user+event (idempotent re-submits)
    const { data: existingLocks } = await supabase
      .from('holding_locks')
      .select('player_id, quantity_locked')
      .eq('user_id', params.userId)
      .eq('event_id', params.eventId);

    const existingLockMap = new Map<string, number>();
    for (const lock of existingLocks ?? []) {
      existingLockMap.set(lock.player_id, lock.quantity_locked);
    }

    // Load ALL locks for this user (to calc available across events)
    const { data: allLocks } = await supabase
      .from('holding_locks')
      .select('player_id, quantity_locked')
      .eq('user_id', params.userId);

    const totalLockedMap = new Map<string, number>();
    for (const lock of allLocks ?? []) {
      totalLockedMap.set(lock.player_id, (totalLockedMap.get(lock.player_id) ?? 0) + lock.quantity_locked);
    }

    // Load holdings for players in lineup
    const { data: holdings } = await supabase
      .from('holdings')
      .select('player_id, quantity')
      .eq('user_id', params.userId)
      .in('player_id', slotPlayerIds);

    const holdingMap = new Map<string, number>();
    for (const h of holdings ?? []) {
      holdingMap.set(h.player_id, h.quantity);
    }

    // Check each player has enough available SCs
    for (const playerId of slotPlayerIds) {
      const alreadyLockedThisEvent = existingLockMap.get(playerId) ?? 0;
      if (alreadyLockedThisEvent >= minScPerSlot) continue; // already locked

      const held = holdingMap.get(playerId) ?? 0;
      const totalLocked = totalLockedMap.get(playerId) ?? 0;
      const lockedElsewhere = totalLocked - alreadyLockedThisEvent;
      const available = held - lockedElsewhere;

      if (available < minScPerSlot) {
        throw new Error('insufficient_sc');
      }
    }
  }

  // Guard: lineup size must match event.lineup_size (7 or 11)
  if (ev.lineup_size && slotPlayerIds.length !== ev.lineup_size) {
    throw new Error('lineupSizeMismatch');
  }

  // Guard: club-scoped events only accept players from that club
  if ((ev.scope === 'club' || ev.type === 'club') && ev.club_id) {
    const { data: slotPlayers } = await supabase
      .from('players')
      .select('id, club_id')
      .in('id', slotPlayerIds);

    if (slotPlayers) {
      const invalidPlayer = slotPlayers.find(p => p.club_id !== ev.club_id);
      if (invalidPlayer) {
        throw new Error('playerNotInClub');
      }
    }
  }

  // Build DB row with all slot columns
  const row: Record<string, unknown> = {
    event_id: params.eventId,
    user_id: params.userId,
    formation: params.formation,
    captain_slot: params.captainSlot ?? null,
    submitted_at: new Date().toISOString(),
    locked: false,
  };

  // Map all slot keys to DB columns (unused slots = null)
  for (let i = 0; i < ALL_SLOT_KEYS.length; i++) {
    row[ALL_SLOT_COLUMNS[i]] = params.slots[ALL_SLOT_KEYS[i]] ?? null;
  }

  const { data, error } = await supabase
    .from('lineups')
    .upsert(row, { onConflict: 'event_id,user_id' })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Post-upsert capacity safety net (catches race conditions the pre-check missed)
  // The DB trigger already incremented current_entries. If we exceeded max, rollback.
  if (isNewEntry && ev.max_entries) {
    const { data: evAfter } = await supabase
      .from('events')
      .select('current_entries')
      .eq('id', params.eventId)
      .single();

    if (evAfter && evAfter.current_entries > ev.max_entries) {
      // Over capacity — delete lineup (trigger will decrement current_entries)
      await supabase.from('lineups').delete()
        .eq('event_id', params.eventId)
        .eq('user_id', params.userId);
      throw new Error('eventFull');
    }
  }

  // Manage holding locks: delete old locks for this event, create new ones
  const lockMinSc = ev.min_sc_per_slot ?? 1;
  if (lockMinSc > 0 && slotPlayerIds.length > 0) {
    // Delete existing locks for this user+event (handles lineup updates)
    await supabase
      .from('holding_locks')
      .delete()
      .eq('user_id', params.userId)
      .eq('event_id', params.eventId);

    // Create locks for each player in the new lineup
    const lockRows = slotPlayerIds.map(playerId => ({
      user_id: params.userId,
      player_id: playerId,
      event_id: params.eventId,
      quantity_locked: lockMinSc,
    }));

    const { error: lockError } = await supabase
      .from('holding_locks')
      .insert(lockRows);

    if (lockError) {
      console.error('[Lineup] Failed to create holding locks:', lockError);
    }
  }

  // Activity log (fire-and-forget — lineup confirmed at this point)
  import('@/lib/services/activityLog').then(({ logActivity }) => {
    logActivity(params.userId, 'lineup_submit', 'fantasy', { eventId: params.eventId, formation: params.formation });
  }).catch(err => console.error('[Lineup] Activity log failed:', err));
  // Mastery XP handled by DB trigger trg_fn_lineup_mastery
  // NOTE: Mission tracking moved to caller (after entry fee deduction succeeds)
  return data as DbLineup;
}

/** Lineup löschen (Abmelden vom Event) */
export async function removeLineup(eventId: string, userId: string): Promise<void> {
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
