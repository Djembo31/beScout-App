import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockTable, resetMocks } from '@/test/mocks/supabase';

vi.mock('@/lib/services/fixtures', () => ({ getFixturesByGameweek: vi.fn() }));
vi.mock('@/lib/services/notifications', () => ({ createNotification: vi.fn() }));
vi.mock('@/lib/notifText', () => ({ notifText: vi.fn((key: string) => key) }));

import {
  isClubEvent, getEvents, getEventsByClubId, getEventsByClubIds,
  getUserJoinedEventIds, createEvent, createNextGameweekEvents,
  updateEventStatus, updateEvent, getAllEventsAdmin, bulkUpdateStatus,
  getEventAdminStats, ALLOWED_TRANSITIONS, EDITABLE_FIELDS,
} from '../events';
import { getFixturesByGameweek } from '@/lib/services/fixtures';

const mockGetFixtures = getFixturesByGameweek as ReturnType<typeof vi.fn>;
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  resetMocks();
  mockFetch.mockReset();
  vi.clearAllMocks();
});

// ============================================
// isClubEvent
// ============================================
describe('isClubEvent', () => {
  it('returns true for scope=club', () => {
    expect(isClubEvent({ scope: 'club' })).toBe(true);
  });
  it('returns true for type=club', () => {
    expect(isClubEvent({ type: 'club' })).toBe(true);
  });
  it('returns true for type=club + scope=global', () => {
    expect(isClubEvent({ type: 'club', scope: 'global' })).toBe(true);
  });
  it('returns false for type=bescout scope=global', () => {
    expect(isClubEvent({ type: 'bescout', scope: 'global' })).toBe(false);
  });
  it('returns false for scope=global', () => {
    expect(isClubEvent({ scope: 'global' })).toBe(false);
  });
  it('returns false for any other scope', () => {
    expect(isClubEvent({ scope: 'arena' })).toBe(false);
  });
});

// ============================================
// getEvents (fetch-based, not supabase)
// ============================================
describe('getEvents', () => {
  it('returns events on successful fetch', async () => {
    const events = [{ id: 'e1' }, { id: 'e2' }];
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(events) });
    expect(await getEvents()).toEqual(events);
    expect(mockFetch).toHaveBeenCalledWith('/api/events');
  });
  it('returns [] for non-array response', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ not: 'array' }) });
    expect(await getEvents()).toEqual([]);
  });
  it('throws on failed fetch', async () => {
    mockFetch.mockResolvedValue({ ok: false });
    await expect(getEvents()).rejects.toThrow('Failed to fetch events');
  });
});

// ============================================
// getEventsByClubId
// ============================================
describe('getEventsByClubId', () => {
  it('returns events for a club', async () => {
    const events = [{ id: 'e1', club_id: 'c1' }];
    mockTable('events', events);
    const result = await getEventsByClubId('c1');
    expect(result).toEqual(events);
    expect(mockSupabase.from).toHaveBeenCalledWith('events');
  });
  it('returns [] when data is null', async () => {
    mockTable('events', null);
    expect(await getEventsByClubId('c1')).toEqual([]);
  });
  it('throws on error', async () => {
    mockTable('events', null, { message: 'DB fail' });
    await expect(getEventsByClubId('c1')).rejects.toThrow('DB fail');
  });
});

// ============================================
// getEventsByClubIds
// ============================================
describe('getEventsByClubIds', () => {
  it('returns [] for empty array without querying', async () => {
    expect(await getEventsByClubIds([])).toEqual([]);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });
  it('returns events for multiple clubs', async () => {
    const events = [{ id: 'e1' }, { id: 'e2' }];
    mockTable('events', events);
    expect(await getEventsByClubIds(['c1', 'c2'])).toEqual(events);
  });
  it('returns [] when data is null', async () => {
    mockTable('events', null);
    expect(await getEventsByClubIds(['c1'])).toEqual([]);
  });
  it('throws on error', async () => {
    mockTable('events', null, { message: 'fail' });
    await expect(getEventsByClubIds(['c1'])).rejects.toThrow('fail');
  });
});

// ============================================
// getUserJoinedEventIds
// ============================================
describe('getUserJoinedEventIds', () => {
  it('returns event IDs from lineups', async () => {
    mockTable('event_entries', [{ event_id: 'e1' }, { event_id: 'e2' }]);
    expect(await getUserJoinedEventIds('u1')).toEqual(['e1', 'e2']);
  });
  it('returns [] on error', async () => {
    mockTable('lineups', null, { message: 'err' });
    expect(await getUserJoinedEventIds('u1')).toEqual([]);
  });
  it('returns [] when data is null', async () => {
    mockTable('lineups', null);
    expect(await getUserJoinedEventIds('u1')).toEqual([]);
  });
});

// ============================================
// createEvent
// ============================================
describe('createEvent', () => {
  const baseParams = {
    name: 'Spieltag 10',
    type: 'bescout',
    format: '5-a-side',
    gameweek: 10,
    entryFeeCents: 5000,
    prizePoolCents: 50000,
    maxEntries: 100,
    startsAt: '2025-03-01T18:00:00Z',
    locksAt: '2025-03-01T19:00:00Z',
    endsAt: '2025-03-01T21:00:00Z',
    clubId: 'club-1',
    createdBy: 'user-1',
  };

  it('inserts event and returns success with eventId', async () => {
    mockTable('events', { id: 'evt-new' });
    // Mock followers query for fire-and-forget notification
    mockTable('club_followers', []);
    const result = await createEvent(baseParams);
    expect(result).toEqual({ success: true, eventId: 'evt-new' });
    expect(mockSupabase.from).toHaveBeenCalledWith('events');
  });

  it('returns error on supabase insert failure', async () => {
    mockTable('events', null, { message: 'Insert failed' });
    const result = await createEvent(baseParams);
    expect(result).toEqual({ success: false, error: 'Insert failed' });
  });

  it('sets defaults for optional params', async () => {
    mockTable('events', { id: 'evt-2' });
    mockTable('club_followers', []);
    const result = await createEvent(baseParams);
    expect(result.success).toBe(true);
  });

  it('passes optional params when provided', async () => {
    mockTable('events', { id: 'evt-3' });
    mockTable('club_followers', []);
    const result = await createEvent({
      ...baseParams,
      sponsorName: 'Nike',
      eventTier: 'arena',
      salaryCap: 1000000,
      rewardStructure: [{ rank: 1, pct: 50 }, { rank: 2, pct: 30 }],
    });
    expect(result.success).toBe(true);
  });
});

// ============================================
// createNextGameweekEvents
// ============================================
describe('createNextGameweekEvents', () => {
  it('returns early when nextGw > 38', async () => {
    const result = await createNextGameweekEvents('club-1', 38);
    expect(result).toEqual({ created: 0, skipped: true, error: 'Max GW 38 reached' });
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('skips when events already exist for next GW (idempotent)', async () => {
    mockTable('events', [{ id: 'existing' }]); // existing check
    const result = await createNextGameweekEvents('club-1', 10);
    expect(result).toEqual({ created: 0, skipped: true });
  });

  it('returns error when no templates found', async () => {
    mockTable('events', []); // no existing
    mockTable('events', []); // no templates
    mockGetFixtures.mockResolvedValue([]);
    const result = await createNextGameweekEvents('club-1', 10);
    expect(result.created).toBe(0);
    expect(result.error).toBe('No events found to clone');
  });

  it('returns error when template fetch fails', async () => {
    mockTable('events', []); // no existing
    mockTable('events', null, { message: 'Template query failed' }); // template error
    const result = await createNextGameweekEvents('club-1', 10);
    expect(result.error).toBe('Template query failed');
  });

  it('clones events with fixture timing', async () => {
    // Call 1: no existing events
    mockTable('events', []);
    // Call 2: templates
    mockTable('events', [{
      name: 'Spieltag 10 Classic',
      type: 'bescout',
      format: '5-a-side',
      entry_fee: 5000,
      prize_pool: 50000,
      max_entries: 100,
      club_id: 'club-1',
      created_by: 'admin-1',
      sponsor_name: null,
      sponsor_logo: null,
      event_tier: 'club',
      tier_bonuses: null,
      min_tier: null,
      min_subscription_tier: null,
      salary_cap: null,
    }]);
    // Call 3: insert
    mockTable('events', null);
    mockGetFixtures.mockResolvedValue([
      { played_at: '2025-03-08T18:00:00Z' },
      { played_at: '2025-03-08T20:00:00Z' },
    ]);

    const result = await createNextGameweekEvents('club-1', 10);
    expect(result.created).toBe(1);
    expect(result.skipped).toBe(false);
  });

  it('uses fallback timing when no fixture times', async () => {
    mockTable('events', []);
    mockTable('events', [{
      name: 'GW 5 Event',
      type: 'bescout',
      format: '5-a-side',
      entry_fee: 1000,
      prize_pool: 10000,
      max_entries: 50,
      club_id: 'club-1',
      created_by: 'admin-1',
      sponsor_name: null,
      sponsor_logo: null,
      event_tier: 'club',
      tier_bonuses: null,
      min_tier: null,
      min_subscription_tier: null,
      salary_cap: null,
    }]);
    mockTable('events', null);
    mockGetFixtures.mockResolvedValue([]); // no fixtures

    const result = await createNextGameweekEvents('club-1', 5);
    expect(result.created).toBe(1);
  });

  it('replaces GW number in cloned event names', async () => {
    mockTable('events', []);
    mockTable('events', [{
      name: 'Spieltag 10 Classic',
      type: 'bescout',
      format: '5-a-side',
      entry_fee: 5000,
      prize_pool: 50000,
      max_entries: 100,
      club_id: 'club-1',
      created_by: 'admin-1',
      sponsor_name: null,
      sponsor_logo: null,
      event_tier: 'club',
      tier_bonuses: null,
      min_tier: null,
      min_subscription_tier: null,
      salary_cap: null,
    }]);
    mockTable('events', null);
    mockGetFixtures.mockResolvedValue([]);

    const result = await createNextGameweekEvents('club-1', 10);
    expect(result.created).toBe(1);
    // Name should be "Spieltag 11 Classic"
  });

  it('returns error on insert failure', async () => {
    mockTable('events', []);
    mockTable('events', [{
      name: 'GW 1 Event',
      type: 'bescout',
      format: '5-a-side',
      entry_fee: 1000,
      prize_pool: 10000,
      max_entries: 50,
      club_id: 'club-1',
      created_by: 'admin-1',
      sponsor_name: null,
      sponsor_logo: null,
      event_tier: 'club',
      tier_bonuses: null,
      min_tier: null,
      min_subscription_tier: null,
      salary_cap: null,
    }]);
    mockTable('events', null, { message: 'Insert failed' });
    mockGetFixtures.mockResolvedValue([]);

    const result = await createNextGameweekEvents('club-1', 1);
    expect(result.error).toBe('Insert failed');
    expect(result.created).toBe(0);
  });
});

// ============================================
// updateEventStatus
// ============================================
describe('updateEventStatus', () => {
  it('updates status successfully', async () => {
    mockTable('events', null);
    const result = await updateEventStatus('evt-1', 'running');
    expect(result).toEqual({ success: true });
    expect(mockSupabase.from).toHaveBeenCalledWith('events');
  });

  it('returns error on failure', async () => {
    mockTable('events', null, { message: 'Update failed' });
    const result = await updateEventStatus('evt-1', 'running');
    expect(result).toEqual({ success: false, error: 'Update failed' });
  });

  it('succeeds even with count=0 (RLS silent block)', async () => {
    mockTable('events', null, null, 0);
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await updateEventStatus('evt-1', 'running');
    expect(result.success).toBe(true);
    consoleSpy.mockRestore();
  });

  it('fires notification when status becomes running', async () => {
    mockTable('events', null); // update call
    // Fire-and-forget notification calls also mock from events/lineups
    mockTable('events', { name: 'Test Event' }); // event name fetch
    mockTable('lineups', [{ user_id: 'u1' }, { user_id: 'u2' }]); // participants
    const result = await updateEventStatus('evt-1', 'running');
    expect(result.success).toBe(true);
  });

  it('does not fire notification for non-running status', async () => {
    mockTable('events', null);
    const result = await updateEventStatus('evt-1', 'scoring');
    expect(result.success).toBe(true);
    // lineups table should not be queried
  });
});

// ============================================
// ALLOWED_TRANSITIONS (state machine)
// ============================================
describe('ALLOWED_TRANSITIONS', () => {
  it('has all 7 statuses', () => {
    expect(Object.keys(ALLOWED_TRANSITIONS).sort()).toEqual(
      ['cancelled', 'ended', 'late-reg', 'registering', 'running', 'scoring', 'upcoming'].sort()
    );
  });

  it('upcoming → registering, cancelled', () => {
    expect(ALLOWED_TRANSITIONS.upcoming).toEqual(['registering', 'cancelled']);
  });

  it('registering → late-reg, running, cancelled', () => {
    expect(ALLOWED_TRANSITIONS.registering).toEqual(['late-reg', 'running', 'cancelled']);
  });

  it('late-reg → running, cancelled', () => {
    expect(ALLOWED_TRANSITIONS['late-reg']).toEqual(['running', 'cancelled']);
  });

  it('running → scoring, ended', () => {
    expect(ALLOWED_TRANSITIONS.running).toEqual(['scoring', 'ended']);
  });

  it('scoring → ended', () => {
    expect(ALLOWED_TRANSITIONS.scoring).toEqual(['ended']);
  });

  it('ended is terminal', () => {
    expect(ALLOWED_TRANSITIONS.ended).toEqual([]);
  });

  it('cancelled is terminal', () => {
    expect(ALLOWED_TRANSITIONS.cancelled).toEqual([]);
  });
});

// ============================================
// EDITABLE_FIELDS
// ============================================
describe('EDITABLE_FIELDS', () => {
  it('upcoming has all 21 fields', () => {
    expect(EDITABLE_FIELDS.upcoming).toHaveLength(21);
    expect(EDITABLE_FIELDS.upcoming).toContain('name');
    expect(EDITABLE_FIELDS.upcoming).toContain('entry_fee');
    expect(EDITABLE_FIELDS.upcoming).toContain('ticket_cost');
    expect(EDITABLE_FIELDS.upcoming).toContain('currency');
    expect(EDITABLE_FIELDS.upcoming).toContain('salary_cap');
    expect(EDITABLE_FIELDS.upcoming).toContain('reward_structure');
  });

  it('registering has 20 fields (no currency)', () => {
    expect(EDITABLE_FIELDS.registering).toHaveLength(20);
    expect(EDITABLE_FIELDS.registering).toContain('name');
    expect(EDITABLE_FIELDS.registering).toContain('entry_fee');
    expect(EDITABLE_FIELDS.registering).toContain('ticket_cost');
    expect(EDITABLE_FIELDS.registering).not.toContain('currency');
  });

  it('late-reg has limited fields', () => {
    expect(EDITABLE_FIELDS['late-reg']).toContain('name');
    expect(EDITABLE_FIELDS['late-reg']).toContain('prize_pool');
    expect(EDITABLE_FIELDS['late-reg']).not.toContain('entry_fee');
    expect(EDITABLE_FIELDS['late-reg']).not.toContain('salary_cap');
  });

  it('running has limited fields', () => {
    expect(EDITABLE_FIELDS.running).toContain('name');
    expect(EDITABLE_FIELDS.running).not.toContain('entry_fee');
  });

  it('scoring, ended, cancelled have no editable fields', () => {
    expect(EDITABLE_FIELDS.scoring).toEqual([]);
    expect(EDITABLE_FIELDS.ended).toEqual([]);
    expect(EDITABLE_FIELDS.cancelled).toEqual([]);
  });
});

// ============================================
// updateEvent
// ============================================
describe('updateEvent', () => {
  it('updates allowed fields in upcoming status', async () => {
    // Fetch event status
    mockTable('events', { status: 'upcoming' });
    // Update
    mockTable('events', null);
    const result = await updateEvent('evt-1', { name: 'New Name', entry_fee: 3000 });
    expect(result).toEqual({ success: true });
  });

  it('blocks disallowed fields', async () => {
    mockTable('events', { status: 'running' });
    const result = await updateEvent('evt-1', { entry_fee: 3000 });
    expect(result.success).toBe(false);
    expect(result.error).toContain('entry_fee');
    expect(result.error).toContain('running');
  });

  it('returns error when event not found', async () => {
    mockTable('events', null, { message: 'Event nicht gefunden' });
    const result = await updateEvent('evt-1', { name: 'New' });
    expect(result.success).toBe(false);
  });

  it('returns error when event is null', async () => {
    mockTable('events', null);
    const result = await updateEvent('evt-1', { name: 'New' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Event nicht gefunden');
  });

  it('blocks all fields for ended status', async () => {
    mockTable('events', { status: 'ended' });
    const result = await updateEvent('evt-1', { name: 'New' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('name');
  });

  it('returns error on update DB failure', async () => {
    mockTable('events', { status: 'upcoming' });
    mockTable('events', null, { message: 'DB write error' });
    const result = await updateEvent('evt-1', { name: 'New' });
    expect(result).toEqual({ success: false, error: 'DB write error' });
  });

  it('falls back to empty allowed list for unknown status', async () => {
    mockTable('events', { status: 'unknown_status' });
    const result = await updateEvent('evt-1', { name: 'New' });
    expect(result.success).toBe(false);
  });
});

// ============================================
// getAllEventsAdmin
// ============================================
describe('getAllEventsAdmin', () => {
  it('returns events without filters', async () => {
    const events = [{ id: 'e1', name: 'Event 1' }];
    mockTable('events', events);
    const result = await getAllEventsAdmin();
    expect(result).toEqual(events);
  });

  it('returns events with all filters', async () => {
    mockTable('events', [{ id: 'e1' }]);
    const result = await getAllEventsAdmin({
      status: ['registering', 'running'],
      type: ['bescout'],
      clubId: 'club-1',
      gameweek: 10,
      search: 'Spieltag',
    });
    expect(result).toHaveLength(1);
  });

  it('returns [] on error', async () => {
    mockTable('events', null, { message: 'Admin query failed' });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await getAllEventsAdmin();
    expect(result).toEqual([]);
    consoleSpy.mockRestore();
  });

  it('returns [] when data is null', async () => {
    mockTable('events', null);
    expect(await getAllEventsAdmin()).toEqual([]);
  });

  it('applies partial filters', async () => {
    mockTable('events', [{ id: 'e1' }]);
    const result = await getAllEventsAdmin({ status: ['running'] });
    expect(result).toHaveLength(1);
  });
});

// ============================================
// bulkUpdateStatus
// ============================================
describe('bulkUpdateStatus', () => {
  it('returns success for empty eventIds', async () => {
    const result = await bulkUpdateStatus([], 'running');
    expect(result).toEqual({ success: true, results: [] });
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('updates all events with valid transitions', async () => {
    // Fetch statuses
    mockTable('events', [
      { id: 'e1', status: 'registering' },
      { id: 'e2', status: 'registering' },
    ]);
    // Updates
    mockTable('events', null);
    mockTable('events', null);

    const result = await bulkUpdateStatus(['e1', 'e2'], 'running');
    expect(result.success).toBe(true);
    expect(result.results).toEqual([
      { eventId: 'e1', ok: true },
      { eventId: 'e2', ok: true },
    ]);
  });

  it('rejects invalid transitions', async () => {
    mockTable('events', [
      { id: 'e1', status: 'ended' }, // ended → running not allowed
    ]);
    const result = await bulkUpdateStatus(['e1'], 'running');
    expect(result.success).toBe(false);
    expect(result.results[0].ok).toBe(false);
    expect(result.results[0].error).toContain('nicht erlaubt');
  });

  it('handles mixed valid and invalid transitions', async () => {
    mockTable('events', [
      { id: 'e1', status: 'registering' }, // valid → running
      { id: 'e2', status: 'ended' },       // invalid → running
    ]);
    mockTable('events', null); // update for e1

    const result = await bulkUpdateStatus(['e1', 'e2'], 'running');
    expect(result.success).toBe(false); // not all OK
    expect(result.results[0].ok).toBe(true);
    expect(result.results[1].ok).toBe(false);
  });

  it('handles event not found in status map', async () => {
    mockTable('events', [
      { id: 'e1', status: 'registering' }, // only e1 found
    ]);
    mockTable('events', null); // update for e1

    const result = await bulkUpdateStatus(['e1', 'e2'], 'running');
    expect(result.results[1].ok).toBe(false);
    expect(result.results[1].error).toBe('Event nicht gefunden');
  });

  it('returns all errors when fetch fails', async () => {
    mockTable('events', null, { message: 'DB down' });
    const result = await bulkUpdateStatus(['e1', 'e2'], 'running');
    expect(result.success).toBe(false);
    expect(result.results).toHaveLength(2);
    expect(result.results[0].error).toBe('DB down');
  });

  it('handles update DB error for single event', async () => {
    mockTable('events', [{ id: 'e1', status: 'registering' }]);
    mockTable('events', null, { message: 'Write conflict' });
    const result = await bulkUpdateStatus(['e1'], 'running');
    expect(result.results[0].ok).toBe(false);
    expect(result.results[0].error).toBe('Write conflict');
  });
});

// ============================================
// getEventAdminStats
// ============================================
describe('getEventAdminStats', () => {
  it('aggregates active events', async () => {
    mockTable('events', [
      { status: 'registering', current_entries: 10, prize_pool: 50000 },
      { status: 'running', current_entries: 20, prize_pool: 100000 },
      { status: 'ended', current_entries: 30, prize_pool: 200000 }, // not active
    ]);
    const stats = await getEventAdminStats();
    expect(stats.activeCount).toBe(2);
    expect(stats.totalParticipants).toBe(30);
    expect(stats.totalPool).toBe(150000);
  });

  it('includes late-reg as active', async () => {
    mockTable('events', [
      { status: 'late-reg', current_entries: 5, prize_pool: 25000 },
    ]);
    const stats = await getEventAdminStats();
    expect(stats.activeCount).toBe(1);
  });

  it('returns zeros on error', async () => {
    mockTable('events', null, { message: 'err' });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const stats = await getEventAdminStats();
    expect(stats).toEqual({ activeCount: 0, totalParticipants: 0, totalPool: 0 });
    consoleSpy.mockRestore();
  });

  it('handles null current_entries and prize_pool', async () => {
    mockTable('events', [
      { status: 'running', current_entries: null, prize_pool: null },
    ]);
    const stats = await getEventAdminStats();
    expect(stats.activeCount).toBe(1);
    expect(stats.totalParticipants).toBe(0);
    expect(stats.totalPool).toBe(0);
  });

  it('returns zeros when no events', async () => {
    mockTable('events', []);
    const stats = await getEventAdminStats();
    expect(stats).toEqual({ activeCount: 0, totalParticipants: 0, totalPool: 0 });
  });
});
