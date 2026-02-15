import { supabase } from '@/lib/supabaseClient';
import { cached, invalidate } from '@/lib/cache';
import type { DbEvent } from '@/types';

const ONE_MIN = 60 * 1000;

// ============================================
// Event Queries
// ============================================

/** Alle Events laden — via server-cached API Route */
export async function getEvents(): Promise<DbEvent[]> {
  return cached('events:all', async () => {
    const res = await fetch('/api/events');
    if (!res.ok) throw new Error('Failed to fetch events');
    return (await res.json()) as DbEvent[];
  }, ONE_MIN);
}

/** Events eines Clubs laden (direkt aus DB) */
export async function getEventsByClubId(clubId: string): Promise<DbEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as DbEvent[];
}

/** Event-IDs wo der User ein Lineup hat */
export async function getUserJoinedEventIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('lineups')
    .select('event_id')
    .eq('user_id', userId);

  if (error) return [];
  return (data ?? []).map(row => row.event_id);
}

// ============================================
// Event Mutations
// ============================================

export async function createEvent(params: {
  name: string;
  type: string;
  format: string;
  gameweek: number;
  entryFeeCents: number;
  prizePoolCents: number;
  maxEntries: number;
  startsAt: string;
  locksAt: string;
  endsAt: string;
  clubId: string;
  createdBy: string;
}): Promise<{ success: boolean; eventId?: string; error?: string }> {
  const { data, error } = await supabase
    .from('events')
    .insert({
      name: params.name,
      type: params.type,
      format: params.format,
      gameweek: params.gameweek,
      entry_fee: params.entryFeeCents,
      prize_pool: params.prizePoolCents,
      max_entries: params.maxEntries || null,
      starts_at: params.startsAt,
      locks_at: params.locksAt,
      ends_at: params.endsAt,
      club_id: params.clubId,
      created_by: params.createdBy,
      status: 'registering',
      current_entries: 0,
    })
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };
  invalidate('events:');
  return { success: true, eventId: data.id };
}

/**
 * Clone events from currentGw to nextGw for a club.
 * Idempotent: skips if events for nextGw already exist. Guard: max GW 38.
 */
export async function createNextGameweekEvents(
  clubId: string,
  currentGw: number
): Promise<{ created: number; skipped: boolean; error?: string }> {
  const nextGw = currentGw + 1;
  if (nextGw > 38) return { created: 0, skipped: true, error: 'Max GW 38 erreicht' };

  // Check if events already exist for next GW
  const { data: existing } = await supabase
    .from('events')
    .select('id')
    .eq('club_id', clubId)
    .eq('gameweek', nextGw)
    .limit(1);

  if (existing && existing.length > 0) {
    return { created: 0, skipped: true };
  }

  // Load current GW events as templates
  const { data: templates, error: tplErr } = await supabase
    .from('events')
    .select('name, type, format, entry_fee, prize_pool, max_entries, club_id, created_by')
    .eq('club_id', clubId)
    .eq('gameweek', currentGw);

  if (tplErr || !templates || templates.length === 0) {
    return { created: 0, skipped: false, error: tplErr?.message ?? 'Keine Events zum Klonen gefunden' };
  }

  // Create clones for next GW
  const now = new Date().toISOString();
  const farFuture = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const clones = templates.map(t => ({
    name: t.name.replace(/Spieltag \d+/i, `Spieltag ${nextGw}`).replace(/GW\s*\d+/i, `GW ${nextGw}`),
    type: t.type,
    format: t.format,
    gameweek: nextGw,
    entry_fee: t.entry_fee,
    prize_pool: t.prize_pool,
    max_entries: t.max_entries,
    club_id: t.club_id,
    created_by: t.created_by,
    starts_at: farFuture,
    locks_at: farFuture,
    ends_at: farFuture,
    status: 'registering',
    current_entries: 0,
  }));

  const { error: insertErr } = await supabase.from('events').insert(clones);
  if (insertErr) return { created: 0, skipped: false, error: insertErr.message };

  invalidate('events:');
  return { created: clones.length, skipped: false };
}

export async function updateEventStatus(
  eventId: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('events')
    .update({ status })
    .eq('id', eventId);

  if (error) return { success: false, error: error.message };
  invalidate('events:');
  return { success: true };
}
