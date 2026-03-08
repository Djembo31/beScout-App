import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { apiFetch, mapPosition, type ApiFixturePlayerResponse } from '@/lib/footballApi';

/**
 * Admin API: Backfill match_position from API-Football for completed gameweeks.
 *
 * Usage: POST /api/admin/backfill-positions
 * Body: { "gameweek": 1 }  or { "gameweek": "1-5" } for range
 * Header: Authorization: Bearer <CRON_SECRET>
 *
 * Per gameweek: ~10 API calls (1 per fixture).
 * API-Football Plus: 100 calls/day → max ~10 GWs/day.
 */

export async function POST(req: Request) {
  // Auth guard
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.API_FOOTBALL_KEY ?? process.env.NEXT_PUBLIC_API_FOOTBALL_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API_FOOTBALL_KEY not configured' }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const gwInput = body.gameweek;
  if (!gwInput) {
    return NextResponse.json({ error: 'gameweek required (number or "1-5" range)' }, { status: 400 });
  }

  // Parse gameweek(s)
  const gameweeks: number[] = [];
  if (typeof gwInput === 'string' && gwInput.includes('-')) {
    const [start, end] = gwInput.split('-').map(Number);
    for (let i = start; i <= end; i++) gameweeks.push(i);
  } else {
    gameweeks.push(Number(gwInput));
  }


  // Load player map once (via player_external_ids)
  const { data: extIds } = await supabaseAdmin
    .from('player_external_ids')
    .select('player_id, external_id')
    .in('source', ['api_football_squad', 'api_football_fixture']);

  const playerMap = new Map<number, string>();
  for (const ext of (extIds ?? [])) {
    const numId = parseInt(ext.external_id as string, 10);
    if (!isNaN(numId)) playerMap.set(numId, ext.player_id as string);
  }

  const { data: clubExtIds } = await supabaseAdmin
    .from('club_external_ids')
    .select('club_id, external_id')
    .eq('source', 'api_football');

  const clubMap = new Map<number, string>();
  for (const ext of (clubExtIds ?? [])) {
    const numId = parseInt(ext.external_id as string, 10);
    if (!isNaN(numId)) clubMap.set(numId, ext.club_id as string);
  }

  const gwResults: Array<{
    gameweek: number;
    fixtures: number;
    updated: number;
    apiCalls: number;
    errors: string[];
  }> = [];

  let totalApiCalls = 0;

  for (const gw of gameweeks) {
    const r = { gameweek: gw, fixtures: 0, updated: 0, apiCalls: 0, errors: [] as string[] };

    const { data: fixtures } = await supabaseAdmin
      .from('fixtures')
      .select('id, api_fixture_id, home_club_id, away_club_id')
      .eq('gameweek', gw)
      .in('status', ['simulated', 'finished'])
      .not('api_fixture_id', 'is', null);

    if (!fixtures || fixtures.length === 0) {
      r.errors.push('No finished fixtures');
      gwResults.push(r);
      continue;
    }
    r.fixtures = fixtures.length;

    for (const fix of fixtures) {
      try {
        const apiStats = await apiFetch<ApiFixturePlayerResponse>(
          `/fixtures/players?fixture=${fix.api_fixture_id}`,
          apiKey,
        );
        r.apiCalls++;
        totalApiCalls++;

        for (const teamData of apiStats.response) {
          const clubId = clubMap.get(teamData.team.id);
          if (!clubId) continue;

          for (const pd of teamData.players) {
            const ourPlayerId = playerMap.get(pd.player.id);
            if (!ourPlayerId) continue;

            const stat = pd.statistics[0];
            if (!stat) continue;

            const minutes = stat.games.minutes ?? 0;
            if (minutes === 0) continue;

            const matchPosition = stat.games.position ? mapPosition(stat.games.position) : null;
            if (!matchPosition) continue;

            const { error: updateErr } = await supabaseAdmin
              .from('fixture_player_stats')
              .update({ match_position: matchPosition })
              .eq('fixture_id', fix.id)
              .eq('player_id', ourPlayerId);

            if (updateErr) {
              r.errors.push(`Update player ${ourPlayerId}: ${updateErr.message}`);
            } else {
              r.updated++;
            }
          }
        }
      } catch (e) {
        r.errors.push(`Fixture API#${fix.api_fixture_id}: ${e instanceof Error ? e.message : 'Error'}`);
      }
    }

    gwResults.push(r);
  }

  return NextResponse.json({
    success: true,
    totalApiCalls,
    gameweeks: gwResults,
  });
}
