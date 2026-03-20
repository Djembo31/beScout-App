// @vitest-environment node

/**
 * Bug Regression Tests — Gameweek Sync Cron
 *
 * These tests document KNOWN BUGS. They are intentionally RED (failing).
 * Each test queries production data for violations that should not exist.
 * When the underlying bugs are fixed, these tests will turn GREEN
 * and remain as permanent regression guards.
 *
 * All tests are READ-ONLY — they only SELECT, never mutate.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { describe, it, expect } from 'vitest';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

describe('Bug Regression: Gameweek Sync Cron', () => {
  /**
   * BUG-001: 7er events have lineup_size=11
   *
   * Reported: 2026-03-20 by Anil
   * Root Cause: The clone_events step in gameweek-sync copies events as templates
   *   but does NOT include `lineup_size` in the SELECT (line 1103-1106). The DB
   *   default for lineup_size is 11, so all cloned 7er events get lineup_size=11.
   * Effect: Users can submit 11-player lineups for 7-a-side events, breaking scoring
   *   fairness and UI layout.
   * File: src/app/api/cron/gameweek-sync/route.ts:1144-1168
   */
  it('BUG-001: 7er events should have lineup_size=7, not 11', async () => {
    const { data: violations, error } = await supabase
      .from('events')
      .select('id, name, format, lineup_size, gameweek')
      .eq('format', '7er')
      .neq('lineup_size', 7);

    expect(error).toBeNull();

    expect(
      violations ?? [],
      `BUG-001: Found ${violations?.length ?? 0} events with format='7er' but lineup_size != 7. ` +
        'Clone step omits lineup_size from template SELECT, so DB default (11) is used.',
    ).toHaveLength(0);
  });

  /**
   * BUG-002: Event locks_at doesn't match fixture kickoff
   *
   * Reported: 2026-03-20 by Anil
   * Root Cause: When clone_events creates events for the next gameweek, it looks up
   *   fixtures to derive locks_at (line 1121-1142). If fixtures don't have played_at
   *   yet (not yet scheduled by the federation), the fallback is NOW()+7 days. This
   *   creates events whose locks_at is days or weeks away from the actual kickoff
   *   once fixtures ARE scheduled.
   * Effect: Users can edit lineups long after matches have started, or events lock
   *   before fixtures are even announced.
   * File: src/app/api/cron/gameweek-sync/route.ts:1121-1142
   */
  it('BUG-002: Event locks_at should match earliest fixture kickoff', async () => {
    // Get the latest gameweek that has events
    const { data: latestEvents } = await supabase
      .from('events')
      .select('gameweek')
      .order('gameweek', { ascending: false })
      .limit(1);

    const latestGw = latestEvents?.[0]?.gameweek;
    if (!latestGw) {
      // No events at all — skip meaningfully
      expect(true).toBe(true);
      return;
    }

    // Get events for this gameweek
    const { data: events, error: evtErr } = await supabase
      .from('events')
      .select('id, name, locks_at, gameweek')
      .eq('gameweek', latestGw)
      .not('locks_at', 'is', null);

    expect(evtErr).toBeNull();

    // Get earliest fixture kickoff for this gameweek
    const { data: fixtures, error: fixErr } = await supabase
      .from('fixtures')
      .select('played_at')
      .eq('gameweek', latestGw)
      .not('played_at', 'is', null)
      .order('played_at', { ascending: true })
      .limit(1);

    expect(fixErr).toBeNull();

    if (!fixtures?.length || !events?.length) {
      // No fixtures with played_at or no events — cannot validate
      expect(true).toBe(true);
      return;
    }

    const earliestKickoff = new Date(fixtures[0].played_at).getTime();

    // Each event's locks_at should be within 1 hour of the earliest fixture kickoff
    const MAX_DRIFT_MS = 60 * 60 * 1000; // 1 hour tolerance
    const drifted = (events ?? []).filter((evt) => {
      const locksAt = new Date(evt.locks_at).getTime();
      return Math.abs(locksAt - earliestKickoff) > MAX_DRIFT_MS;
    });

    expect(
      drifted,
      `BUG-002: Found ${drifted.length} events in GW${latestGw} where locks_at drifts >1h from ` +
        `earliest fixture kickoff (${new Date(earliestKickoff).toISOString()}). ` +
        'Cron uses NOW()+7d fallback when fixtures lack played_at.',
    ).toHaveLength(0);
  });

  /**
   * BUG-003: Events "running" while locks_at is in the future
   *
   * Reported: 2026-03-20 by Anil
   * Root Cause: The score_events step (line 973-980) transitions events from
   *   'registering' or 'late-reg' to 'running' WITHOUT checking whether locks_at
   *   has actually passed. It blindly sets status='running' for any event in the
   *   active gameweek, even if the event hasn't locked yet.
   * Effect: Events show as "running" in the UI while users should still be able
   *   to register and edit lineups. Scoring may trigger prematurely.
   * File: src/app/api/cron/gameweek-sync/route.ts:973-980
   */
  it('BUG-003: No event should be "running" if locks_at is still in the future', async () => {
    const now = new Date().toISOString();

    const { data: violations, error } = await supabase
      .from('events')
      .select('id, name, status, locks_at, gameweek')
      .eq('status', 'running')
      .gt('locks_at', now);

    expect(error).toBeNull();

    expect(
      violations ?? [],
      `BUG-003: Found ${violations?.length ?? 0} events with status='running' but locks_at is ` +
        'still in the future. Cron transitions to running without checking locks_at.',
    ).toHaveLength(0);
  });

  /**
   * BUG-004: Events "running" while fixtures still scheduled (not kicked off)
   *
   * Reported: 2026-03-20 by Anil
   * Root Cause: Same as BUG-003 — the cron transitions events to 'running' without
   *   verifying that any fixtures in the gameweek have actually started. Combined
   *   with BUG-002 (wrong locks_at), this means events can be "running" for a
   *   gameweek where all fixtures are still status='scheduled'.
   * Effect: GW32 events show as "Laufend" (running) in the UI, but none of the
   *   GW32 matches have kicked off. Users see contradictory state.
   * File: src/app/api/cron/gameweek-sync/route.ts:973-980
   */
  it('BUG-004: No event should be "running" if all GW fixtures are still scheduled', async () => {
    // Find gameweeks where ALL fixtures are still 'scheduled'
    const { data: allFixtures, error: fixErr } = await supabase
      .from('fixtures')
      .select('gameweek, status');

    expect(fixErr).toBeNull();

    if (!allFixtures?.length) {
      expect(true).toBe(true);
      return;
    }

    // Group fixtures by gameweek and find GWs where ALL are 'scheduled'
    const gwMap = new Map<number, string[]>();
    for (const f of allFixtures) {
      const statuses = gwMap.get(f.gameweek) ?? [];
      statuses.push(f.status);
      gwMap.set(f.gameweek, statuses);
    }

    const fullyScheduledGWs: number[] = [];
    for (const [gw, statuses] of Array.from(gwMap.entries())) {
      if (statuses.every((s) => s === 'scheduled')) {
        fullyScheduledGWs.push(gw);
      }
    }

    if (fullyScheduledGWs.length === 0) {
      // All gameweeks have at least one non-scheduled fixture — no violation possible
      expect(true).toBe(true);
      return;
    }

    // Check if any events for these fully-scheduled GWs are 'running'
    const { data: violations, error: evtErr } = await supabase
      .from('events')
      .select('id, name, status, gameweek')
      .eq('status', 'running')
      .in('gameweek', fullyScheduledGWs);

    expect(evtErr).toBeNull();

    expect(
      violations ?? [],
      `BUG-004: Found ${violations?.length ?? 0} events with status='running' in gameweeks ` +
        `(${fullyScheduledGWs.join(', ')}) where ALL fixtures are still 'scheduled'. ` +
        'Cron transitions events to running without checking fixture status.',
    ).toHaveLength(0);
  });
});
