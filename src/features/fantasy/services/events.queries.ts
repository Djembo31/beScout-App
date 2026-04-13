import { supabase } from '@/lib/supabaseClient';
import type { DbEvent, DbEventEntry } from '@/types';

/** Check if an event is club-scoped (restricted to club members' players) */
export function isClubEvent(event: { type?: string; scope?: string; club_id?: string | null }): boolean {
  return event.type === 'club' || event.scope === 'club';
}

// ============================================
// Event Queries
// ============================================

/** Alle Events laden — via server-cached API Route */
export async function getEvents(): Promise<DbEvent[]> {
  const res = await fetch('/api/events');
  if (!res.ok) throw new Error('Failed to fetch events');
  const json = await res.json();
  return Array.isArray(json) ? json : [];
}

/** Events eines Clubs laden (direkt aus DB) */
export async function getEventsByClubId(clubId: string): Promise<DbEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('id, name, type, status, format, gameweek, entry_fee, ticket_cost, currency, prize_pool, max_entries, current_entries, starts_at, locks_at, ends_at, scored_at, created_by, club_id, sponsor_name, sponsor_logo, event_tier, tier_bonuses, min_tier, min_subscription_tier, salary_cap, reward_structure, scope, lineup_size, is_liga_event, created_at')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as DbEvent[];
}

/** Events mehrerer Clubs laden (für Multi-Club Fantasy) */
export async function getEventsByClubIds(clubIds: string[]): Promise<DbEvent[]> {
  if (clubIds.length === 0) return [];
  const { data, error } = await supabase
    .from('events')
    .select('id, name, type, status, format, gameweek, entry_fee, ticket_cost, currency, prize_pool, max_entries, current_entries, starts_at, locks_at, ends_at, scored_at, created_by, club_id, sponsor_name, sponsor_logo, event_tier, tier_bonuses, min_tier, min_subscription_tier, salary_cap, reward_structure, scope, lineup_size, is_liga_event, created_at')
    .in('club_id', clubIds)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as DbEvent[];
}

/** Event-IDs wo der User eingetragen ist (via event_entries, nicht lineups) */
export async function getUserJoinedEventIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('event_entries')
    .select('event_id')
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  return (data ?? []).map(row => row.event_id);
}

/** Check if user has entered an event */
export async function getEventEntry(
  eventId: string,
  userId: string,
): Promise<DbEventEntry | null> {
  const { data } = await supabase
    .from('event_entries')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  return data as DbEventEntry | null;
}

/** Get all entered event IDs for a user */
export async function getUserEnteredEventIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('event_entries')
    .select('event_id')
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  return (data ?? []).map(row => row.event_id);
}

/** Check if scout events feature flag is enabled */
export async function getScoutEventsEnabled(): Promise<boolean> {
  const { data } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'scout_events_enabled')
    .maybeSingle();

  return data?.value === true;
}

/** Aggregate stats for admin dashboard */
export async function getEventAdminStats(): Promise<{
  activeCount: number;
  totalParticipants: number;
  totalPool: number;
}> {
  const { data, error } = await supabase
    .from('events')
    .select('status, current_entries, prize_pool');

  if (error) throw new Error(error.message);

  const activeStatuses = new Set(['registering', 'late-reg', 'running']);
  const active = (data ?? []).filter(e => activeStatuses.has(e.status));

  return {
    activeCount: active.length,
    totalParticipants: active.reduce((sum, e) => sum + (e.current_entries ?? 0), 0),
    totalPool: active.reduce((sum, e) => sum + (e.prize_pool ?? 0), 0),
  };
}

/** Fetch all events with optional filters (admin view) */
export async function getAllEventsAdmin(filters?: {
  status?: string[];
  type?: string[];
  clubId?: string;
  gameweek?: number;
  search?: string;
}): Promise<DbEvent[]> {
  let query = supabase
    .from('events')
    .select('id, name, type, status, format, gameweek, entry_fee, ticket_cost, currency, prize_pool, max_entries, current_entries, starts_at, locks_at, ends_at, scored_at, created_by, club_id, sponsor_name, sponsor_logo, event_tier, tier_bonuses, min_tier, min_subscription_tier, salary_cap, reward_structure, scope, lineup_size, is_liga_event, created_at, clubs(name, slug)')
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status.length > 0) {
    query = query.in('status', filters.status);
  }
  if (filters?.type && filters.type.length > 0) {
    query = query.in('type', filters.type);
  }
  if (filters?.clubId) {
    query = query.eq('club_id', filters.clubId);
  }
  if (filters?.gameweek != null) {
    query = query.eq('gameweek', filters.gameweek);
  }
  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as DbEvent[];
}
