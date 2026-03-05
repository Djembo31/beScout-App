import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Admin API: Backfill real API-Football ratings for completed gameweeks.
 *
 * Usage: POST /api/admin/backfill-ratings
 * Body: { "gameweek": 1 }  or { "gameweek": "1-5" } for range
 * Header: Authorization: Bearer <CRON_SECRET>
 *
 * Per gameweek: ~10 API calls (1 per fixture).
 * API-Football Plus: 100 calls/day → max ~10 GWs/day.
 *
 * Also reports unmapped API-Football players (for completeness check).
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

  // Load player + club maps once (dual-ID: squad + fixture)
  const { data: playerRows } = await supabaseAdmin
    .from('players')
    .select('id, api_football_id, fixture_api_football_id, club_id, first_name, last_name, position')
    .not('api_football_id', 'is', null);

  const { data: clubRows } = await supabaseAdmin
    .from('clubs')
    .select('id, api_football_id')
    .not('api_football_id', 'is', null);

  const playerMap = new Map<number, { id: string; clubId: string; position: string; name: string }>();
  for (const p of (playerRows ?? [])) {
    const entry = { id: p.id as string, clubId: p.club_id as string, position: p.position as string, name: `${p.first_name} ${p.last_name}` };
    if (p.api_football_id) playerMap.set(p.api_football_id, entry);
    if (p.fixture_api_football_id) playerMap.set(p.fixture_api_football_id as number, entry);
  }
  const clubMap = new Map((clubRows ?? []).map(c => [c.api_football_id!, c.id as string]));

  const gwResults: Array<{
    gameweek: number;
    fixtures: number;
    updated: number;
    apiCalls: number;
    unmappedPlayers: string[];
    errors: string[];
  }> = [];

  let totalApiCalls = 0;

  for (const gw of gameweeks) {
    const r = { gameweek: gw, fixtures: 0, updated: 0, apiCalls: 0, unmappedPlayers: [] as string[], errors: [] as string[] };

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
          if (!clubId) {
            r.errors.push(`Club not mapped: ${teamData.team.name} (API#${teamData.team.id})`);
            continue;
          }

          for (const pd of teamData.players) {
            const ourPlayer = playerMap.get(pd.player.id);
            if (!ourPlayer) {
              r.unmappedPlayers.push(`${pd.player.name} (API#${pd.player.id}, ${teamData.team.name})`);
              continue;
            }

            const stat = pd.statistics[0];
            if (!stat) continue;

            const minutes = stat.games.minutes ?? 0;
            if (minutes === 0) continue;

            const rating = stat.games.rating ? parseFloat(stat.games.rating) : null;
            if (rating === null) continue;

            const fantasyPoints = Math.round(rating * 10);

            // Update existing fixture_player_stats record
            const { error: updateErr } = await supabaseAdmin
              .from('fixture_player_stats')
              .update({ rating, fantasy_points: fantasyPoints })
              .eq('fixture_id', fix.id)
              .eq('player_id', ourPlayer.id);

            if (updateErr) {
              r.errors.push(`Update ${ourPlayer.name}: ${updateErr.message}`);
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

  // Re-sync GW scores using real ratings
  const syncResults: Array<{ gameweek: number; synced: number }> = [];
  for (const gw of gameweeks) {
    const { data } = await supabaseAdmin.rpc('admin_resync_gw_scores', { p_gameweek: gw });
    const synced = (data as { synced_count?: number } | null)?.synced_count ?? 0;
    syncResults.push({ gameweek: gw, synced });
  }

  // Recalc perf L5/L15
  const { data: perfData } = await supabaseAdmin.rpc('cron_recalc_perf');

  // Deduplicate unmapped players across GWs
  const allUnmapped = Array.from(
    new Set(gwResults.flatMap(r => r.unmappedPlayers)),
  ).sort();

  return NextResponse.json({
    success: true,
    totalApiCalls,
    gameweeks: gwResults.map(r => ({
      ...r,
      unmappedPlayers: undefined, // moved to top-level
    })),
    unmappedPlayers: allUnmapped,
    unmappedCount: allUnmapped.length,
    syncResults,
    perfRecalc: perfData,
  });
}
