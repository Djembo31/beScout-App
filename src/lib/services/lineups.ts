import { supabase } from '@/lib/supabaseClient';
import { cached, invalidate } from '@/lib/cache';
import type { DbLineup, DbPlayer, Pos, UserFantasyResult } from '@/types';

const TWO_MIN = 2 * 60 * 1000;

// ============================================
// Types
// ============================================

export type LineupSlotPlayer = {
  slotKey: string;           // 'gk' | 'def1' | 'def2' | 'mid1' | 'mid2' | 'att'
  playerId: string;
  score: number | null;
  player: {
    firstName: string;
    lastName: string;
    position: Pos;
    club: string;
    perfL5: number;
  };
};

export type LineupWithPlayers = {
  lineup: DbLineup;
  players: LineupSlotPlayer[];
};

// ============================================
// Lineup Queries
// ============================================

/** Lineup eines Users fuer ein Event laden */
export async function getLineup(eventId: string, userId: string): Promise<DbLineup | null> {
  const { data, error } = await supabase
    .from('lineups')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .single();

  if (error) return null;
  return data as DbLineup;
}

/** Lineup erstellen oder aktualisieren (Upsert) */
export async function submitLineup(params: {
  eventId: string;
  userId: string;
  formation: string;
  slotGk: string | null;
  slotDef1: string | null;
  slotDef2: string | null;
  slotMid1: string | null;
  slotMid2: string | null;
  slotAtt: string | null;
}): Promise<DbLineup> {
  // Check event status before submitting
  const { data: ev } = await supabase
    .from('events')
    .select('status')
    .eq('id', params.eventId)
    .single();

  if (ev && (ev.status === 'ended' || ev.status === 'running' || ev.status === 'scoring')) {
    throw new Error('Event ist bereits gestartet oder beendet — Anmeldung nicht möglich.');
  }

  const { data, error } = await supabase
    .from('lineups')
    .upsert(
      {
        event_id: params.eventId,
        user_id: params.userId,
        formation: params.formation,
        slot_gk: params.slotGk,
        slot_def1: params.slotDef1,
        slot_def2: params.slotDef2,
        slot_mid1: params.slotMid1,
        slot_mid2: params.slotMid2,
        slot_att: params.slotAtt,
        submitted_at: new Date().toISOString(),
        locked: false,
      },
      { onConflict: 'event_id,user_id' }
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  invalidate('events:');
  invalidate(`fantasyHistory:${params.userId}`);
  // Mission tracking
  import('@/lib/services/missions').then(({ triggerMissionProgress }) => {
    triggerMissionProgress(params.userId, ['weekly_fantasy']);
  }).catch(() => {});
  // Activity log
  import('@/lib/services/activityLog').then(({ logActivity }) => {
    logActivity(params.userId, 'lineup_submit', 'fantasy', { eventId: params.eventId, formation: params.formation });
  }).catch(() => {});
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
    throw new Error('Lineup konnte nicht gelöscht werden. Bitte Admin kontaktieren.');
  }
  invalidate('events:');
  invalidate(`fantasyHistory:${userId}`);
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
    .single();

  if (error || !lineup) return null;

  const dbLineup = lineup as DbLineup;
  const slotDefs: { key: string; column: keyof DbLineup }[] = [
    { key: 'gk', column: 'slot_gk' },
    { key: 'def1', column: 'slot_def1' },
    { key: 'def2', column: 'slot_def2' },
    { key: 'mid1', column: 'slot_mid1' },
    { key: 'mid2', column: 'slot_mid2' },
    { key: 'att', column: 'slot_att' },
  ];

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
    .select('id, first_name, last_name, position, club, perf_l5')
    .in('id', playerIds);

  type SlotPlayerData = Pick<DbPlayer, 'id' | 'first_name' | 'last_name' | 'position' | 'club' | 'perf_l5'>;
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
      slot_gk, slot_def1, slot_def2, slot_mid1, slot_mid2, slot_att,
      event:events ( id, name, status )
    `)
    .eq('user_id', userId);

  if (error || !data) return new Map();

  const usageMap = new Map<string, string[]>();

  for (const lineup of data) {
    const ev = lineup.event as unknown as { id: string; name: string; status: string } | null;
    if (!ev || ev.status === 'ended' || ev.status === 'scoring') continue;

    const slots = [lineup.slot_gk, lineup.slot_def1, lineup.slot_def2, lineup.slot_mid1, lineup.slot_mid2, lineup.slot_att];
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
  return cached(`fantasyHistory:${userId}:${limit}`, async () => {
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
        eventName: event?.name ?? 'Unbekannt',
        gameweek: event?.gameweek ?? null,
        eventDate: event?.starts_at ?? '',
        totalScore: row.total_score as number,
        rank: row.rank as number,
        rewardAmount: row.reward_amount as number,
      };
    });
  }, TWO_MIN);
}
