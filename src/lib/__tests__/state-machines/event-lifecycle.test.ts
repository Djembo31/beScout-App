// @vitest-environment node

/**
 * Event Lifecycle — State Machine Tests (Layer 2)
 *
 * Verifies the event state machine transitions are enforced:
 *   upcoming → registering → late-reg → running → scoring → ended
 *                          ↘ cancelled (from any pre-ended state)
 *
 * Tests are READ-ONLY queries against live Supabase data.
 * They verify no data violates state machine rules.
 *
 * Run: npx vitest run src/lib/__tests__/state-machines/event-lifecycle.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

let sb: SupabaseClient;

beforeAll(() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }
  sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
});

/**
 * Expected transition map — mirrors ALLOWED_TRANSITIONS in events.ts.
 * Tests verify both the map logic AND that DB data conforms to it.
 */
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  upcoming: ['registering', 'cancelled'],
  registering: ['late-reg', 'running', 'cancelled'],
  'late-reg': ['running', 'cancelled'],
  running: ['scoring', 'ended'],
  scoring: ['ended'],
  ended: [],
  cancelled: [],
};

const VALID_STATUSES = Object.keys(ALLOWED_TRANSITIONS);
const TERMINAL_STATUSES = ['ended', 'cancelled'];

describe('Event Lifecycle — State Machine', () => {
  // ── 1. registering → running: ONLY when locks_at has passed ──
  it('SM-EVT-01: no event should be "running" while locks_at is in the future', async () => {
    const now = new Date().toISOString();
    const { data, error } = await sb
      .from('events')
      .select('id, name, status, locks_at, gameweek')
      .eq('status', 'running')
      .gt('locks_at', now);

    expect(error).toBeNull();
    expect(
      data ?? [],
      `Found ${(data ?? []).length} events "running" before locks_at. Cron guard missing.`
    ).toHaveLength(0);
  });

  // ── 2. registering → cancelled: valid transition (admin can cancel pre-running) ──
  it('SM-EVT-02: pre-running statuses allow cancellation, running+ do not', () => {
    // Pre-running states CAN be cancelled
    expect(ALLOWED_TRANSITIONS['upcoming']).toContain('cancelled');
    expect(ALLOWED_TRANSITIONS['registering']).toContain('cancelled');
    expect(ALLOWED_TRANSITIONS['late-reg']).toContain('cancelled');

    // Once running, cancellation is no longer allowed (must go to scoring/ended)
    expect(ALLOWED_TRANSITIONS['running']).not.toContain('cancelled');
    expect(ALLOWED_TRANSITIONS['scoring']).not.toContain('cancelled');
  });

  // ── 3. running → scoring: only when fixtures are done ──
  it('SM-EVT-03: no "scoring" event should have all fixtures still scheduled', async () => {
    const { data: scoringEvents, error } = await sb
      .from('events')
      .select('id, name, gameweek, status')
      .eq('status', 'scoring');

    expect(error).toBeNull();
    if (!scoringEvents || scoringEvents.length === 0) return; // no scoring events

    for (const evt of scoringEvents) {
      // At least some fixtures in this GW should be finished/played
      const { data: fixtures } = await sb
        .from('fixtures')
        .select('id, status')
        .eq('gameweek', evt.gameweek);

      if (!fixtures || fixtures.length === 0) continue;

      const finishedCount = fixtures.filter(
        f => f.status === 'finished' || f.status === 'FT'
      ).length;

      expect(
        finishedCount,
        `Event "${evt.name}" (GW${evt.gameweek}) is "scoring" but 0 fixtures finished`
      ).toBeGreaterThan(0);
    }
  });

  // ── 4. running → registering: VERBOTEN ──
  it('SM-EVT-04: transition running → registering is forbidden', () => {
    expect(ALLOWED_TRANSITIONS['running']).not.toContain('registering');
    expect(ALLOWED_TRANSITIONS['running']).not.toContain('upcoming');
  });

  // ── 5. ended → running: VERBOTEN ──
  it('SM-EVT-05: transition ended → running is forbidden (ended is terminal)', () => {
    expect(ALLOWED_TRANSITIONS['ended']).toHaveLength(0);
    expect(ALLOWED_TRANSITIONS['ended']).not.toContain('running');
    expect(ALLOWED_TRANSITIONS['ended']).not.toContain('scoring');
    expect(ALLOWED_TRANSITIONS['ended']).not.toContain('registering');
  });

  // ── 6. ended → registering: VERBOTEN ──
  it('SM-EVT-06: transition cancelled → any is forbidden (cancelled is terminal)', () => {
    expect(ALLOWED_TRANSITIONS['cancelled']).toHaveLength(0);
  });

  // ── 7. Cron guard: events with future locks_at stay registering ──
  it('SM-EVT-07: all events with future locks_at must be registering/upcoming/late-reg/cancelled', async () => {
    const now = new Date().toISOString();
    const { data, error } = await sb
      .from('events')
      .select('id, name, status, locks_at')
      .gt('locks_at', now)
      .not('status', 'in', '(registering,upcoming,late-reg,cancelled)');

    expect(error).toBeNull();
    expect(
      data ?? [],
      `Found ${(data ?? []).length} events past locks_at guard: status should be registering/upcoming/late-reg/cancelled when locks_at is future`
    ).toHaveLength(0);
  });

  // ── 8. ended events have scored_at timestamp ──
  it('SM-EVT-08: all "ended" events with entries should have scored_at', async () => {
    const { data, error } = await sb
      .from('events')
      .select('id, name, status, scored_at, current_entries')
      .eq('status', 'ended')
      .gt('current_entries', 0)
      .is('scored_at', null);

    expect(error).toBeNull();
    expect(
      data ?? [],
      `Found ${(data ?? []).length} ended events with entries but no scored_at timestamp`
    ).toHaveLength(0);
  });
});
