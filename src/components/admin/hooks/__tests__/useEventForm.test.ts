import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { DbEvent, RewardTier } from '@/types';

// ============================================
// Mocks -- centsToBsd / bsdToCents
// ============================================

const mockCentsToBsd = vi.fn((cents: number) => cents / 100000);
const mockBsdToCents = vi.fn((bsd: number) => bsd * 100000);

vi.mock('@/lib/services/players', () => ({
  centsToBsd: (...args: unknown[]) => mockCentsToBsd(...(args as [number])),
  bsdToCents: (...args: unknown[]) => mockBsdToCents(...(args as [number])),
}));

// ============================================
// Mocks -- EDITABLE_FIELDS
// ============================================

// Mock both the barrel and the actual source module to cover re-export resolution
vi.mock('@/lib/services/events', () => ({
  EDITABLE_FIELDS: {
    upcoming: ['name','type','format','gameweek','entry_fee','ticket_cost','currency','prize_pool','max_entries','starts_at','locks_at','ends_at','sponsor_name','sponsor_logo','event_tier','min_subscription_tier','salary_cap','min_sc_per_slot','wildcards_allowed','max_wildcards_per_lineup','reward_structure'],
    registering: ['name','type','format','gameweek','entry_fee','ticket_cost','prize_pool','max_entries','starts_at','locks_at','ends_at','sponsor_name','sponsor_logo','event_tier','min_subscription_tier','salary_cap','min_sc_per_slot','wildcards_allowed','max_wildcards_per_lineup','reward_structure'],
    'late-reg': ['name','prize_pool','ends_at','max_entries','sponsor_name','sponsor_logo'],
    running: ['name','prize_pool','ends_at','max_entries','sponsor_name','sponsor_logo'],
    scoring: [], ended: [], cancelled: [],
  },
}));

vi.mock('@/features/fantasy/services/events.mutations', () => ({
  EDITABLE_FIELDS: {
    upcoming: ['name','type','format','gameweek','entry_fee','ticket_cost','currency','prize_pool','max_entries','starts_at','locks_at','ends_at','sponsor_name','sponsor_logo','event_tier','min_subscription_tier','salary_cap','min_sc_per_slot','wildcards_allowed','max_wildcards_per_lineup','reward_structure'],
    registering: ['name','type','format','gameweek','entry_fee','ticket_cost','prize_pool','max_entries','starts_at','locks_at','ends_at','sponsor_name','sponsor_logo','event_tier','min_subscription_tier','salary_cap','min_sc_per_slot','wildcards_allowed','max_wildcards_per_lineup','reward_structure'],
    'late-reg': ['name','prize_pool','ends_at','max_entries','sponsor_name','sponsor_logo'],
    running: ['name','prize_pool','ends_at','max_entries','sponsor_name','sponsor_logo'],
    scoring: [], ended: [], cancelled: [],
  },
}));

// ============================================
// Import AFTER mocks
// ============================================

import { useEventForm } from '../useEventForm';
import { INITIAL_FORM_STATE } from '../types';
import type { EventFormState } from '../types';

// ============================================
// Fixtures
// ============================================

function makeEvent(overrides: Partial<DbEvent> = {}): DbEvent {
  return {
    id: 'ev-1',
    name: 'Test Event',
    type: 'club',
    status: 'upcoming',
    format: '7er',
    gameweek: 5,
    entry_fee: 500000,        // 5 BSD in cents
    prize_pool: 1000000,      // 10 BSD in cents
    max_entries: 30,
    current_entries: 12,
    starts_at: '2026-04-01T10:00:00Z',
    locks_at: '2026-04-01T12:00:00Z',
    ends_at: '2026-04-02T18:00:00Z',
    scored_at: null,
    created_by: 'admin-1',
    club_id: 'club-1',
    sponsor_name: 'Sponsor Co',
    sponsor_logo: 'https://example.com/logo.png',
    event_tier: 'club',
    tier_bonuses: null,
    min_tier: null,
    min_subscription_tier: 'silber',
    salary_cap: 2000000,      // 20 BSD in cents
    reward_structure: [{ rank: 1, pct: 50 }, { rank: 2, pct: 30 }, { rank: 3, pct: 20 }],
    scope: 'club',
    lineup_size: 7,
    currency: 'tickets',
    ticket_cost: 100,
    min_sc_per_slot: 2,
    wildcards_allowed: true,
    max_wildcards_per_lineup: 3,
    created_at: '2026-03-15T08:00:00Z',
    ...overrides,
  } as DbEvent;
}

function makeAdminEvent(overrides: Partial<DbEvent> = {}) {
  return { ...makeEvent(overrides), clubs: { name: 'Test Club', slug: 'test-club' } };
}

// ============================================
// Tests
// ============================================

describe('useEventForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Initial State ────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('1. default form has correct initial values', () => {
      const { result } = renderHook(() => useEventForm());

      expect(result.current.form.name).toBe('');
      expect(result.current.form.type).toBe('bescout');
      expect(result.current.form.eventTier).toBe('arena');
      expect(result.current.form.format).toBe('7er');
      expect(result.current.form.maxEntries).toBe('20');
      expect(result.current.form.entryFee).toBe('0');
      expect(result.current.form.prizePool).toBe('0');
      expect(result.current.form.currency).toBe('tickets');
    });

    it('2. with initialDefaults overrides those fields', () => {
      const { result } = renderHook(() =>
        useEventForm({ type: 'club', eventTier: 'club' }),
      );

      expect(result.current.form.type).toBe('club');
      expect(result.current.form.eventTier).toBe('club');
      // Non-overridden defaults remain
      expect(result.current.form.name).toBe('');
      expect(result.current.form.format).toBe('7er');
    });
  });

  // ── setField ─────────────────────────────────────────────────────────────

  describe('setField', () => {
    it('3. setField name updates form.name', () => {
      const { result } = renderHook(() => useEventForm());

      act(() => {
        result.current.setField('name', 'Test Event');
      });

      expect(result.current.form.name).toBe('Test Event');
    });

    it('4. setField wildcardsAllowed updates boolean', () => {
      const { result } = renderHook(() => useEventForm());

      act(() => {
        result.current.setField('wildcardsAllowed', true);
      });

      expect(result.current.form.wildcardsAllowed).toBe(true);
    });

    it('5. setField rewardStructure updates array', () => {
      const { result } = renderHook(() => useEventForm());
      const rewards: RewardTier[] = [{ rank: 1, pct: 100 }];

      act(() => {
        result.current.setField('rewardStructure', rewards);
      });

      expect(result.current.form.rewardStructure).toEqual([{ rank: 1, pct: 100 }]);
    });
  });

  // ── reset ────────────────────────────────────────────────────────────────

  describe('reset', () => {
    it('6. reset after setField restores defaults', () => {
      const { result } = renderHook(() => useEventForm());

      act(() => {
        result.current.setField('name', 'foo');
      });
      expect(result.current.form.name).toBe('foo');

      act(() => {
        result.current.reset();
      });
      expect(result.current.form.name).toBe('');
    });

    it('7. reset with partial defaults merges with initial state', () => {
      const { result } = renderHook(() => useEventForm());

      act(() => {
        result.current.setField('name', 'foo');
        result.current.setField('format', '11er');
      });

      act(() => {
        result.current.reset({ type: 'club' });
      });

      expect(result.current.form.type).toBe('club');
      expect(result.current.form.name).toBe('');
      expect(result.current.form.format).toBe('7er'); // back to initial default
    });
  });

  // ── populate (edit mode) ─────────────────────────────────────────────────

  describe('populate', () => {
    it('8. populate sets form.name from event', () => {
      const { result } = renderHook(() => useEventForm());
      const event = makeEvent({ name: 'Alpha Cup' });

      act(() => {
        result.current.populate(event);
      });

      expect(result.current.form.name).toBe('Alpha Cup');
    });

    it('9. populate converts entry_fee cents to BSD string', () => {
      const { result } = renderHook(() => useEventForm());
      const event = makeEvent({ entry_fee: 500000 });

      act(() => {
        result.current.populate(event);
      });

      expect(mockCentsToBsd).toHaveBeenCalledWith(500000);
      expect(result.current.form.entryFee).toBe('5');
    });

    it('10. populate converts prize_pool cents to BSD string', () => {
      const { result } = renderHook(() => useEventForm());
      const event = makeEvent({ prize_pool: 1000000 });

      act(() => {
        result.current.populate(event);
      });

      expect(mockCentsToBsd).toHaveBeenCalledWith(1000000);
      expect(result.current.form.prizePool).toBe('10');
    });

    it('11. populate converts ISO dates to datetime-local format', () => {
      const { result } = renderHook(() => useEventForm());
      const event = makeEvent({ starts_at: '2026-04-01T10:00:00Z' });

      act(() => {
        result.current.populate(event);
      });

      // Should match YYYY-MM-DDTHH:mm pattern
      expect(result.current.form.startsAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });

    it('12. populate handles null salary_cap as empty string', () => {
      const { result } = renderHook(() => useEventForm());
      const event = makeEvent({ salary_cap: null });

      act(() => {
        result.current.populate(event);
      });

      expect(result.current.form.salaryCap).toBe('');
    });

    it('populate handles null gameweek as empty string', () => {
      const { result } = renderHook(() => useEventForm());
      const event = makeEvent({ gameweek: null });

      act(() => {
        result.current.populate(event);
      });

      expect(result.current.form.gameweek).toBe('');
    });

    it('populate handles null max_entries as "0"', () => {
      const { result } = renderHook(() => useEventForm());
      const event = makeEvent({ max_entries: null });

      act(() => {
        result.current.populate(event);
      });

      expect(result.current.form.maxEntries).toBe('0');
    });
  });

  // ── clone ────────────────────────────────────────────────────────────────

  describe('clone', () => {
    it('13. clone appends suffix to name', () => {
      const { result } = renderHook(() => useEventForm());
      const event = makeEvent({ name: 'EventName' });

      act(() => {
        result.current.clone(event, 'Kopie');
      });

      expect(result.current.form.name).toBe('EventName (Kopie)');
    });

    it('14. clone clears dates', () => {
      const { result } = renderHook(() => useEventForm());
      const event = makeEvent();

      act(() => {
        result.current.clone(event, 'Kopie');
      });

      expect(result.current.form.startsAt).toBe('');
      expect(result.current.form.locksAt).toBe('');
      expect(result.current.form.endsAt).toBe('');
    });

    it('15. clone clears sponsor fields', () => {
      const { result } = renderHook(() => useEventForm());
      const event = makeEvent({ sponsor_name: 'BigCorp', sponsor_logo: 'https://x.com/logo.png' });

      act(() => {
        result.current.clone(event, 'Copy');
      });

      expect(result.current.form.sponsorName).toBe('');
      expect(result.current.form.sponsorLogo).toBe('');
    });

    it('16. clone preserves other fields', () => {
      const { result } = renderHook(() => useEventForm());
      const event = makeEvent({ type: 'sponsor', gameweek: 10 });

      act(() => {
        result.current.clone(event, 'Kopie');
      });

      expect(result.current.form.type).toBe('sponsor');
      expect(result.current.form.gameweek).toBe('10');
    });
  });

  // ── isFieldDisabled ──────────────────────────────────────────────────────

  describe('isFieldDisabled', () => {
    it('17. returns false when no editing event (create mode)', () => {
      const { result } = renderHook(() => useEventForm());

      expect(result.current.isFieldDisabled('name', null)).toBe(false);
    });

    it('18. returns false for editable field in upcoming status', () => {
      const { result } = renderHook(() => useEventForm());
      const event = makeAdminEvent({ status: 'upcoming' });

      expect(result.current.isFieldDisabled('name', event)).toBe(false);
    });

    it('19. returns true for currency in registering status', () => {
      const { result } = renderHook(() => useEventForm());
      const event = makeAdminEvent({ status: 'registering' });

      expect(result.current.isFieldDisabled('currency', event)).toBe(true);
    });

    it('20. returns true for all fields in ended status', () => {
      const { result } = renderHook(() => useEventForm());
      const event = makeAdminEvent({ status: 'ended' });

      expect(result.current.isFieldDisabled('name', event)).toBe(true);
      expect(result.current.isFieldDisabled('prize_pool', event)).toBe(true);
      expect(result.current.isFieldDisabled('entry_fee', event)).toBe(true);
    });

    it('returns true for entry_fee in running status', () => {
      const { result } = renderHook(() => useEventForm());
      const event = makeAdminEvent({ status: 'running' });

      expect(result.current.isFieldDisabled('entry_fee', event)).toBe(true);
    });

    it('returns false for name in running status', () => {
      const { result } = renderHook(() => useEventForm());
      const event = makeAdminEvent({ status: 'running' });

      expect(result.current.isFieldDisabled('name', event)).toBe(false);
    });
  });

  // ── isRewardEditorDisabled ───────────────────────────────────────────────

  describe('isRewardEditorDisabled', () => {
    it('21. returns false when no editing event', () => {
      const { result } = renderHook(() => useEventForm());

      expect(result.current.isRewardEditorDisabled(null)).toBe(false);
    });

    it('22. returns false for upcoming event', () => {
      const { result } = renderHook(() => useEventForm());

      expect(result.current.isRewardEditorDisabled(makeAdminEvent({ status: 'upcoming' }))).toBe(false);
    });

    it('returns false for registering event', () => {
      const { result } = renderHook(() => useEventForm());

      expect(result.current.isRewardEditorDisabled(makeAdminEvent({ status: 'registering' }))).toBe(false);
    });

    it('23. returns true for running event', () => {
      const { result } = renderHook(() => useEventForm());

      expect(result.current.isRewardEditorDisabled(makeAdminEvent({ status: 'running' }))).toBe(true);
    });

    it('returns true for ended event', () => {
      const { result } = renderHook(() => useEventForm());

      expect(result.current.isRewardEditorDisabled(makeAdminEvent({ status: 'ended' }))).toBe(true);
    });

    it('returns true for scoring event', () => {
      const { result } = renderHook(() => useEventForm());

      expect(result.current.isRewardEditorDisabled(makeAdminEvent({ status: 'scoring' }))).toBe(true);
    });
  });

  // ── buildCreatePayload ───────────────────────────────────────────────────

  describe('buildCreatePayload', () => {
    it('24. converts BSD form values to cents in payload', () => {
      const { result } = renderHook(() => useEventForm());

      // Set form values
      act(() => {
        result.current.setField('name', 'New Event');
        result.current.setField('entryFee', '5');
        result.current.setField('prizePool', '10');
        result.current.setField('gameweek', '3');
        result.current.setField('maxEntries', '50');
        result.current.setField('startsAt', '2026-04-01T10:00');
        result.current.setField('locksAt', '2026-04-01T12:00');
        result.current.setField('endsAt', '2026-04-02T18:00');
      });

      const payload = result.current.buildCreatePayload({ createdBy: 'user1' });

      expect(payload.name).toBe('New Event');
      expect(payload.createdBy).toBe('user1');
      // bsdToCents(5) = 500000
      expect(mockBsdToCents).toHaveBeenCalledWith(5);
      expect(payload.entryFeeCents).toBe(500000);
      // bsdToCents(10) = 1000000
      expect(payload.prizePoolCents).toBe(1000000);
      expect(payload.gameweek).toBe(3);
      expect(payload.maxEntries).toBe(50);
    });

    it('25. excludes sponsor fields when type is not sponsor', () => {
      const { result } = renderHook(() => useEventForm());

      act(() => {
        result.current.setField('name', 'Event');
        result.current.setField('type', 'club');
        result.current.setField('sponsorName', 'ShouldBeIgnored');
        result.current.setField('sponsorLogo', 'https://x.com/logo.png');
        result.current.setField('startsAt', '2026-04-01T10:00');
        result.current.setField('locksAt', '2026-04-01T12:00');
        result.current.setField('endsAt', '2026-04-02T18:00');
      });

      const payload = result.current.buildCreatePayload();

      expect(payload.sponsorName).toBeUndefined();
      expect(payload.sponsorLogo).toBeUndefined();
    });

    it('includes sponsor fields when type is sponsor', () => {
      const { result } = renderHook(() => useEventForm());

      act(() => {
        result.current.setField('name', 'Sponsor Event');
        result.current.setField('type', 'sponsor');
        result.current.setField('sponsorName', 'BigCorp');
        result.current.setField('sponsorLogo', 'https://x.com/logo.png');
        result.current.setField('startsAt', '2026-04-01T10:00');
        result.current.setField('locksAt', '2026-04-01T12:00');
        result.current.setField('endsAt', '2026-04-02T18:00');
      });

      const payload = result.current.buildCreatePayload();

      expect(payload.sponsorName).toBe('BigCorp');
      expect(payload.sponsorLogo).toBe('https://x.com/logo.png');
    });

    it('includes wildcards fields based on wildcardsAllowed', () => {
      const { result } = renderHook(() => useEventForm());

      act(() => {
        result.current.setField('name', 'WC Event');
        result.current.setField('wildcardsAllowed', true);
        result.current.setField('maxWildcards', '3');
        result.current.setField('startsAt', '2026-04-01T10:00');
        result.current.setField('locksAt', '2026-04-01T12:00');
        result.current.setField('endsAt', '2026-04-02T18:00');
      });

      const payload = result.current.buildCreatePayload();

      expect(payload.wildcardsAllowed).toBe(true);
      expect(payload.maxWildcardsPerLineup).toBe(3);
    });

    it('sets maxWildcardsPerLineup to 0 when wildcardsAllowed is false', () => {
      const { result } = renderHook(() => useEventForm());

      act(() => {
        result.current.setField('name', 'No WC Event');
        result.current.setField('wildcardsAllowed', false);
        result.current.setField('maxWildcards', '5');
        result.current.setField('startsAt', '2026-04-01T10:00');
        result.current.setField('locksAt', '2026-04-01T12:00');
        result.current.setField('endsAt', '2026-04-02T18:00');
      });

      const payload = result.current.buildCreatePayload();

      expect(payload.wildcardsAllowed).toBe(false);
      expect(payload.maxWildcardsPerLineup).toBe(0);
    });
  });

  // ── buildUpdatePayload ───────────────────────────────────────────────────

  describe('buildUpdatePayload', () => {
    it('26. includes all fields for upcoming event', () => {
      const { result } = renderHook(() => useEventForm());
      const event = makeAdminEvent({ status: 'upcoming' });

      act(() => {
        result.current.populate(event);
      });

      const payload = result.current.buildUpdatePayload(event);

      // Upcoming has all fields editable, so payload should have entries
      expect(Object.keys(payload).length).toBeGreaterThan(0);
      expect(payload).toHaveProperty('name');
      expect(payload).toHaveProperty('entry_fee');
      expect(payload).toHaveProperty('currency');
    });

    it('27. returns empty object for ended event', () => {
      const { result } = renderHook(() => useEventForm());
      const event = makeAdminEvent({ status: 'ended' });

      act(() => {
        result.current.populate(event);
      });

      const payload = result.current.buildUpdatePayload(event);

      expect(Object.keys(payload).length).toBe(0);
    });

    it('excludes entry_fee for running event', () => {
      const { result } = renderHook(() => useEventForm());
      const event = makeAdminEvent({ status: 'running' });

      act(() => {
        result.current.populate(event);
      });

      const payload = result.current.buildUpdatePayload(event);

      expect(payload).not.toHaveProperty('entry_fee');
      expect(payload).toHaveProperty('name');
    });

    it('excludes currency for registering event', () => {
      const { result } = renderHook(() => useEventForm());
      const event = makeAdminEvent({ status: 'registering' });

      act(() => {
        result.current.populate(event);
      });

      const payload = result.current.buildUpdatePayload(event);

      expect(payload).not.toHaveProperty('currency');
      expect(payload).toHaveProperty('name');
    });
  });
});
