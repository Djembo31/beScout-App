import { describe, it, expect, beforeEach } from 'vitest';
import { mockTable, resetMocks } from '@/test/mocks/supabase';

import { getFullGameweekStatus } from '../scoring.queries';

// ============================================
// getFullGameweekStatus — Slice 427 (GW-Lifecycle Per-Liga, Fork Teil 1/3)
// ============================================
//
// Mock-Call-Reihenfolge im leagueId-Pfad (FIFO pro Tabelle):
//   1. getLeagueMaxGameweeks → from('leagues').maybeSingle()
//   2. from('clubs').select('id').eq('league_id')  (leagueClubIds)
//   3. Promise.allSettled([ from('fixtures'), from('events') ])

describe('getFullGameweekStatus', () => {
  beforeEach(() => resetMocks());

  it('AC-01: liga-gefiltert loopt nur 1..max_gameweeks (keine Phantom-GW)', async () => {
    mockTable('leagues', { max_gameweeks: 34 }); // BL/2BL/SL
    mockTable('clubs', [{ id: 'club-1' }]);
    mockTable('fixtures', [
      { gameweek: 1, status: 'finished' },
      { gameweek: 34, status: 'scheduled' },
    ]);
    mockTable('events', []);

    const result = await getFullGameweekStatus('league-bl');

    expect(result).toHaveLength(34);
    expect(result[0].gameweek).toBe(1);
    expect(result[result.length - 1].gameweek).toBe(34);
    expect(result.some((r) => r.gameweek > 34)).toBe(false); // kein 35-38
  });

  it('AC-02: leagueId=null bleibt Legacy global 1..38 (Backward-Compat)', async () => {
    mockTable('fixtures', [{ gameweek: 10, status: 'finished' }]);
    mockTable('events', []);

    const result = await getFullGameweekStatus(); // no-arg = null

    expect(result).toHaveLength(38);
    expect(result[37].gameweek).toBe(38);
  });

  it('AC-04: Liga ohne Fixtures → max leere Karten, kein Crash', async () => {
    mockTable('leagues', { max_gameweeks: 34 });
    mockTable('clubs', [{ id: 'club-1' }]);
    mockTable('fixtures', []);
    mockTable('events', []);

    const result = await getFullGameweekStatus('league-bl');

    expect(result).toHaveLength(34);
    expect(result.every((r) => r.totalFixtures === 0 && r.eventCount === 0)).toBe(true);
    expect(result.every((r) => !r.isSimulated && !r.isFullyScored)).toBe(true);
  });

  it('counts fixtures + events per gameweek liga-rein', async () => {
    mockTable('leagues', { max_gameweeks: 38 });
    mockTable('clubs', [{ id: 'club-1' }]);
    mockTable('fixtures', [
      { gameweek: 5, status: 'finished' },
      { gameweek: 5, status: 'simulated' },
      { gameweek: 5, status: 'scheduled' },
    ]);
    mockTable('events', [
      { gameweek: 5, status: 'ended', scored_at: '2026-05-01T00:00:00Z' },
      { gameweek: 5, status: 'registering', scored_at: null },
    ]);

    const result = await getFullGameweekStatus('league-pl');
    const gw5 = result.find((r) => r.gameweek === 5)!;

    expect(gw5.totalFixtures).toBe(3);
    expect(gw5.simulatedFixtures).toBe(2); // finished + simulated
    expect(gw5.eventCount).toBe(2);
    expect(gw5.scoredEvents).toBe(1); // scored_at !== null
    expect(gw5.isSimulated).toBe(false); // 2/3
    expect(gw5.isFullyScored).toBe(false); // 1/2
  });

  it('AC-04b: Liga ohne Clubs → leagueClubIds=[] → 0 Events, kein Crash', async () => {
    mockTable('leagues', { max_gameweeks: 34 });
    mockTable('clubs', []); // 0 Clubs → .in('club_id', []) = leeres Set
    mockTable('fixtures', [{ gameweek: 1, status: 'finished' }]);
    mockTable('events', []);

    const result = await getFullGameweekStatus('league-bl');

    expect(result).toHaveLength(34);
    expect(result.every((r) => r.eventCount === 0)).toBe(true);
  });

  it('throws when clubs lookup errors (events-Liga-Auflösung)', async () => {
    mockTable('leagues', { max_gameweeks: 34 });
    mockTable('clubs', null, { message: 'clubs query error' });

    await expect(getFullGameweekStatus('league-bl')).rejects.toThrow('clubs query error');
  });
});
