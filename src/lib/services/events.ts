import { supabase } from '@/lib/supabaseClient';
import { getFixturesByGameweek } from '@/lib/services/fixtures';
import { notifText } from '@/lib/notifText';
import type { DbEvent, DbEventEntry, EventCurrency } from '@/types';

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
    .select('id, name, type, status, format, gameweek, entry_fee, ticket_cost, currency, prize_pool, max_entries, current_entries, starts_at, locks_at, ends_at, scored_at, created_by, club_id, sponsor_name, sponsor_logo, event_tier, tier_bonuses, min_tier, min_subscription_tier, salary_cap, reward_structure, scope, lineup_size, created_at')
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
    .select('id, name, type, status, format, gameweek, entry_fee, ticket_cost, currency, prize_pool, max_entries, current_entries, starts_at, locks_at, ends_at, scored_at, created_by, club_id, sponsor_name, sponsor_logo, event_tier, tier_bonuses, min_tier, min_subscription_tier, salary_cap, reward_structure, scope, lineup_size, created_at')
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
  ticketCost?: number;
  prizePoolCents: number;
  maxEntries: number;
  startsAt: string;
  locksAt: string;
  endsAt: string;
  clubId: string;
  createdBy: string;
  sponsorName?: string;
  sponsorLogo?: string;
  eventTier?: 'arena' | 'club' | 'user';
  minSubscriptionTier?: string | null;
  salaryCap?: number | null;
  rewardStructure?: Array<{ rank: number; pct: number }> | null;
  currency?: EventCurrency;
}): Promise<{ success: boolean; eventId?: string; error?: string }> {
  const ticketCost = params.ticketCost ?? params.entryFeeCents;
  const { data, error } = await supabase
    .from('events')
    .insert({
      name: params.name,
      type: params.type,
      format: params.format,
      gameweek: params.gameweek,
      entry_fee: params.entryFeeCents,
      ticket_cost: ticketCost,
      currency: params.currency ?? 'tickets',
      prize_pool: params.prizePoolCents,
      max_entries: params.maxEntries || null,
      starts_at: params.startsAt,
      locks_at: params.locksAt,
      ends_at: params.endsAt,
      club_id: params.clubId,
      created_by: params.createdBy,
      sponsor_name: params.sponsorName || null,
      sponsor_logo: params.sponsorLogo || null,
      event_tier: params.eventTier || 'club',
      min_subscription_tier: params.minSubscriptionTier || null,
      salary_cap: params.salaryCap || null,
      reward_structure: params.rewardStructure ?? null,
      status: 'registering',
      current_entries: 0,
    })
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };

  // Notify club followers about new event
  if (params.clubId) {
    (async () => {
      try {
        const { data: followers } = await supabase.from('club_followers').select('user_id').eq('club_id', params.clubId);
        if (followers && followers.length > 0) {
          const { createNotification } = await import('@/lib/services/notifications');
          await Promise.all(followers.map(f =>
            createNotification(f.user_id, 'event_closing_soon', notifText('eventNewTitle'), notifText('eventNewBody', { name: params.name }), data.id, 'event')
          ));
        }
      } catch (err) { console.error('[Events] new event notification failed:', err); }
    })();
  }

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
  if (nextGw > 38) return { created: 0, skipped: true, error: 'Max GW 38 reached' };

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
    .select('name, type, format, entry_fee, ticket_cost, currency, prize_pool, max_entries, club_id, created_by, sponsor_name, sponsor_logo, event_tier, tier_bonuses, min_tier, min_subscription_tier, salary_cap')
    .eq('club_id', clubId)
    .eq('gameweek', currentGw);

  if (tplErr || !templates || templates.length === 0) {
    return { created: 0, skipped: false, error: tplErr?.message ?? 'No events found to clone' };
  }

  // Derive timing from fixture data for the next GW
  const fixtures = await getFixturesByGameweek(nextGw);
  let startsAt: string;
  let locksAt: string;
  let endsAt: string;

  if (fixtures.length > 0 && fixtures.some(f => f.played_at)) {
    const fixturesWithTime = fixtures.filter(f => f.played_at);
    const times = fixturesWithTime.map(f => new Date(f.played_at!).getTime());
    const earliest = Math.min(...times);
    const latest = Math.max(...times);
    startsAt = new Date(earliest).toISOString();
    locksAt = new Date(earliest).toISOString();
    endsAt = new Date(latest + 3 * 60 * 60 * 1000).toISOString(); // +3h after last kickoff
  } else {
    // No fixture times yet — use fallback
    const farFuture = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    startsAt = farFuture;
    locksAt = farFuture;
    endsAt = farFuture;
  }

  // Create clones for next GW
  const clones = templates.map(t => ({
    name: t.name.replace(/Spieltag \d+/i, `Spieltag ${nextGw}`).replace(/GW\s*\d+/i, `GW ${nextGw}`),
    type: t.type,
    format: t.format,
    gameweek: nextGw,
    entry_fee: t.entry_fee,
    ticket_cost: t.ticket_cost,
    currency: t.currency,
    prize_pool: t.prize_pool,
    max_entries: t.max_entries,
    club_id: t.club_id,
    created_by: t.created_by,
    sponsor_name: t.sponsor_name,
    sponsor_logo: t.sponsor_logo,
    event_tier: t.event_tier,
    tier_bonuses: t.tier_bonuses,
    min_tier: t.min_tier,
    min_subscription_tier: t.min_subscription_tier,
    salary_cap: t.salary_cap,
    starts_at: startsAt,
    locks_at: locksAt,
    ends_at: endsAt,
    status: 'registering',
    current_entries: 0,
  }));

  const { error: insertErr } = await supabase.from('events').insert(clones);
  if (insertErr) return { created: 0, skipped: false, error: insertErr.message };

  return { created: clones.length, skipped: false };
}

export async function updateEventStatus(
  eventId: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  const { error, count } = await supabase
    .from('events')
    .update({ status })
    .eq('id', eventId);

  if (error) return { success: false, error: error.message };
  if (count === 0) {
    console.warn(`[Events] updateEventStatus: 0 rows affected (event=${eventId}, status=${status}) — possible RLS silent block`);
  }

  // Notify participants when event starts running
  if (status === 'running') {
    (async () => {
      try {
        const { data: event } = await supabase.from('events').select('name').eq('id', eventId).single();
        const { data: lineups } = await supabase.from('lineups').select('user_id').eq('event_id', eventId);
        if (lineups && lineups.length > 0) {
          const { createNotification } = await import('@/lib/services/notifications');
          await Promise.all(lineups.map(l =>
            createNotification(l.user_id, 'event_starting', notifText('eventStartedTitle'), notifText('eventStartedBody', { name: event?.name ?? notifText('eventFallbackName') }), eventId, 'event')
          ));
        }
      } catch (err) { console.error('[Events] event_starting notification failed:', err); }
    })();
  }

  return { success: true };
}

// ============================================
// Admin Event Management
// ============================================

/** Which fields can be edited per event status */
export const EDITABLE_FIELDS: Record<string, string[]> = {
  upcoming: [
    'name', 'type', 'format', 'gameweek', 'entry_fee', 'ticket_cost', 'currency', 'prize_pool',
    'max_entries', 'starts_at', 'locks_at', 'ends_at', 'sponsor_name',
    'sponsor_logo', 'event_tier', 'min_subscription_tier', 'salary_cap',
    'reward_structure',
  ],
  registering: [
    'name', 'type', 'format', 'gameweek', 'entry_fee', 'ticket_cost', 'prize_pool',
    'max_entries', 'starts_at', 'locks_at', 'ends_at', 'sponsor_name',
    'sponsor_logo', 'event_tier', 'min_subscription_tier', 'salary_cap',
    'reward_structure',
  ],
  'late-reg': ['name', 'prize_pool', 'ends_at', 'max_entries', 'sponsor_name', 'sponsor_logo'],
  running: ['name', 'prize_pool', 'ends_at', 'max_entries', 'sponsor_name', 'sponsor_logo'],
  scoring: [],
  ended: [],
  cancelled: [],
};

/** Allowed status transitions */
export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  upcoming: ['registering', 'cancelled'],
  registering: ['late-reg', 'running', 'cancelled'],
  'late-reg': ['running', 'cancelled'],
  running: ['scoring', 'ended'],
  scoring: ['ended'],
  ended: [],
  cancelled: [],
};

/** Update specific fields on an event with editability guard */
export async function updateEvent(
  eventId: string,
  fields: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  // Fetch current status
  const { data: event, error: fetchErr } = await supabase
    .from('events')
    .select('status')
    .eq('id', eventId)
    .single();

  if (fetchErr || !event) {
    return { success: false, error: fetchErr?.message ?? 'Event nicht gefunden' };
  }

  const allowed = EDITABLE_FIELDS[event.status] ?? [];
  const blocked = Object.keys(fields).filter(k => !allowed.includes(k));

  if (blocked.length > 0) {
    return {
      success: false,
      error: `Felder nicht editierbar im Status "${event.status}": ${blocked.join(', ')}`,
    };
  }

  const { error } = await supabase
    .from('events')
    .update(fields)
    .eq('id', eventId);

  if (error) return { success: false, error: error.message };
  return { success: true };
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
    .select('id, name, type, status, format, gameweek, entry_fee, ticket_cost, currency, prize_pool, max_entries, current_entries, starts_at, locks_at, ends_at, scored_at, created_by, club_id, sponsor_name, sponsor_logo, event_tier, tier_bonuses, min_tier, min_subscription_tier, salary_cap, reward_structure, scope, lineup_size, created_at, clubs(name, slug)')
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

  if (error) {
    console.error('[Events] getAllEventsAdmin error:', error.message);
    return [];
  }
  return (data ?? []) as unknown as DbEvent[];
}

/** Bulk update event statuses with per-event validation */
export async function bulkUpdateStatus(
  eventIds: string[],
  newStatus: string
): Promise<{ success: boolean; results: Array<{ eventId: string; ok: boolean; error?: string }> }> {
  if (eventIds.length === 0) {
    return { success: true, results: [] };
  }

  // Fetch current statuses for all events
  const { data: events, error: fetchErr } = await supabase
    .from('events')
    .select('id, status')
    .in('id', eventIds);

  if (fetchErr || !events) {
    return {
      success: false,
      results: eventIds.map(eventId => ({
        eventId,
        ok: false,
        error: fetchErr?.message ?? 'Events nicht gefunden',
      })),
    };
  }

  const statusMap = new Map(events.map(e => [e.id, e.status as string]));
  const results: Array<{ eventId: string; ok: boolean; error?: string }> = [];

  for (const eventId of eventIds) {
    const currentStatus = statusMap.get(eventId);
    if (!currentStatus) {
      results.push({ eventId, ok: false, error: 'Event nicht gefunden' });
      continue;
    }

    const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(newStatus)) {
      results.push({
        eventId,
        ok: false,
        error: `Übergang "${currentStatus}" → "${newStatus}" nicht erlaubt`,
      });
      continue;
    }

    const { error } = await supabase
      .from('events')
      .update({ status: newStatus })
      .eq('id', eventId);

    if (error) {
      results.push({ eventId, ok: false, error: error.message });
    } else {
      results.push({ eventId, ok: true });
    }
  }

  const allOk = results.every(r => r.ok);
  return { success: allOk, results };
}

// ============================================
// Unified Payment Gateway — Atomic Entry Lock/Unlock
// ============================================

export type LockEventEntryResult = {
  ok: boolean;
  currency?: 'tickets' | 'scout';
  balanceAfter?: number;
  alreadyEntered?: boolean;
  error?: 'insufficient_tickets' | 'insufficient_balance' | 'event_full' | 'event_not_open' | 'scout_events_disabled' | string;
  have?: number;
  need?: number;
};

export type UnlockEventEntryResult = {
  ok: boolean;
  currency?: 'tickets' | 'scout';
  balanceAfter?: number;
  error?: 'event_locked' | string;
};

/**
 * Atomic event entry: deducts cost (tickets or $SCOUT) and registers user in one RPC call.
 * No lineup required — entry and lineup are decoupled.
 */
export async function lockEventEntry(eventId: string): Promise<LockEventEntryResult> {
  const { data, error } = await supabase.rpc('lock_event_entry', { p_event_id: eventId });

  if (error) {
    // Parse known error codes from RPC
    const msg = error.message?.toLowerCase() ?? '';
    if (msg.includes('insufficient_tickets') || msg.includes('not enough tickets')) {
      return { ok: false, error: 'insufficient_tickets' };
    }
    if (msg.includes('insufficient_balance') || msg.includes('not enough')) {
      return { ok: false, error: 'insufficient_balance' };
    }
    if (msg.includes('event_full') || msg.includes('full')) {
      return { ok: false, error: 'event_full' };
    }
    if (msg.includes('event_not_open') || msg.includes('not open') || msg.includes('not registering')) {
      return { ok: false, error: 'event_not_open' };
    }
    if (msg.includes('scout_events_disabled')) {
      return { ok: false, error: 'scout_events_disabled' };
    }
    return { ok: false, error: error.message };
  }

  // RPC returns JSON object
  const result = data as Record<string, unknown> | null;
  if (!result) return { ok: false, error: 'No response from server' };

  return {
    ok: (result.ok as boolean) ?? false,
    currency: result.currency as LockEventEntryResult['currency'],
    balanceAfter: result.balance_after as number | undefined,
    alreadyEntered: result.already_entered as boolean | undefined,
    error: result.error as string | undefined,
    have: result.have as number | undefined,
    need: result.need as number | undefined,
  };
}

/**
 * Atomic event exit: refunds cost and removes entry in one RPC call.
 * Only works before locks_at deadline.
 */
export async function unlockEventEntry(eventId: string): Promise<UnlockEventEntryResult> {
  const { data, error } = await supabase.rpc('unlock_event_entry', { p_event_id: eventId });

  if (error) {
    const msg = error.message?.toLowerCase() ?? '';
    if (msg.includes('event_locked') || msg.includes('locked') || msg.includes('already started')) {
      return { ok: false, error: 'event_locked' };
    }
    return { ok: false, error: error.message };
  }

  const result = data as Record<string, unknown> | null;
  if (!result) return { ok: false, error: 'No response from server' };

  return {
    ok: (result.ok as boolean) ?? false,
    currency: result.currency as UnlockEventEntryResult['currency'],
    balanceAfter: result.balance_after as number | undefined,
    error: result.error as string | undefined,
  };
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

  if (error) {
    console.error('[Events] getEventAdminStats error:', error.message);
    return { activeCount: 0, totalParticipants: 0, totalPool: 0 };
  }

  const activeStatuses = new Set(['registering', 'late-reg', 'running']);
  const active = (data ?? []).filter(e => activeStatuses.has(e.status));

  return {
    activeCount: active.length,
    totalParticipants: active.reduce((sum, e) => sum + (e.current_entries ?? 0), 0),
    totalPool: active.reduce((sum, e) => sum + (e.prize_pool ?? 0), 0),
  };
}

/** Admin: cancel all entries and refund everyone */
export async function cancelEventEntries(
  eventId: string,
): Promise<{ ok: boolean; refundedCount?: number; error?: string }> {
  const { data, error } = await supabase.rpc('cancel_event_entries', {
    p_event_id: eventId,
  });

  if (error) {
    console.error('[Events] cancelEventEntries RPC error:', error);
    return { ok: false, error: error.message };
  }

  const result = data as Record<string, unknown> | null;
  if (!result) return { ok: false, error: 'No response from server' };

  return {
    ok: (result.ok as boolean) ?? false,
    refundedCount: result.refunded_count as number | undefined,
    error: result.error as string | undefined,
  };
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

  if (error) return [];
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
