import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

const API_BASE = 'https://v3.football.api-sports.io';

type ApiFixturePlayerResponse = {
  response: Array<{
    team: { id: number; name: string };
    players: Array<{
      player: { id: number; name: string };
      statistics: Array<{
        games: { minutes: number | null; rating: string | null; position: string | null };
        goals: { total: number | null; assists: number | null; conceded: number | null; saves: number | null };
        cards: { yellow: number | null; red: number | null };
      }>;
    }>;
  }>;
};

function mapPosition(apiPos: string): 'GK' | 'DEF' | 'MID' | 'ATT' {
  const p = apiPos.toUpperCase().trim();
  if (p === 'G' || p.includes('GOAL')) return 'GK';
  if (p === 'D' || p.includes('DEF')) return 'DEF';
  if (p === 'M' || p.includes('MID')) return 'MID';
  if (p === 'F' || p.includes('ATT') || p.includes('FOR')) return 'ATT';
  return 'MID';
}

async function apiFetch<T>(endpoint: string, apiKey: string): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'x-apisports-key': apiKey },
  });
  if (!res.ok) throw new Error(`API-Football ${res.status}: ${res.statusText}`);
  return (await res.json()) as T;
}

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

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Load player map once
  const { data: playerRows } = await supabaseAdmin
    .from('players')
    .select('id, api_football_id')
    .not('api_football_id', 'is', null);

  const playerMap = new Map(
    (playerRows ?? []).map(p => [p.api_football_id!, p.id as string]),
  );

  const { data: clubRows } = await supabaseAdmin
    .from('clubs')
    .select('id, api_football_id')
    .not('api_football_id', 'is', null);

  const clubMap = new Map((clubRows ?? []).map(c => [c.api_football_id!, c.id as string]));

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
      .eq('status', 'finished')
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
