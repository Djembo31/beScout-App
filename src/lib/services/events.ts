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
