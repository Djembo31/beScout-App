/**
 * Slice 074 — Sync League-Standings from API-Football /standings?league=X&season=Y
 *
 * Iteriert 7 active leagues → 7 API-Calls/Run.
 * API-Response hat `league.standings` = Array von Arrays (wegen Group-Tournaments).
 * Für uns meist 1 Group pro League (normale Liga). Upsert via (league, club, season) UNIQUE.
 *
 * MANUAL-ONLY wegen Hobby-Plan. Admin triggert wöchentlich.
 *
 * Auth: CRON_SECRET Bearer.
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { apiFetch, getCurrentSeason } from '@/lib/footballApi';

type StandingEntry = {
  rank: number;
  team: { id: number; name: string };
  points: number;
  goalsDiff: number;
  form: string | null;
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: { for: number; against: number };
  };
};

type ApiStandingsResponse = {
  response: Array<{
    league: {
      id: number;
      season: number;
      standings: StandingEntry[][];
    };
  }>;
  errors?: unknown;
};

type LeagueRow = {
  id: string;
  short: string;
  api_football_id: number;
};

type SyncStats = {
  leagues_processed: number;
  standings_upserted: number;
  unmapped_clubs: number;
  api_calls: number;
  errors: string[];
};

const API_RATE_LIMIT_MS = 300;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: Request): Promise<NextResponse> {
  const runStart = Date.now();

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 });
  }
  if (!process.env.API_FOOTBALL_KEY && !process.env.NEXT_PUBLIC_API_FOOTBALL_KEY) {
    return NextResponse.json({ error: 'API_FOOTBALL_KEY not configured' }, { status: 500 });
  }

  const season = getCurrentSeason();

  const stats: SyncStats = {
    leagues_processed: 0,
    standings_upserted: 0,
    unmapped_clubs: 0,
    api_calls: 0,
    errors: [],
  };

  // Load active leagues
  const { data: leagueRows, error: leagueErr } = await supabaseAdmin
    .from('leagues')
    .select('id, short, api_football_id')
    .not('api_football_id', 'is', null);

  if (leagueErr) {
    return NextResponse.json({ error: `leagues fetch: ${leagueErr.message}` }, { status: 500 });
  }

  const activeLeagues: LeagueRow[] = (leagueRows ?? [])
    .filter((l) => l.id && l.short && typeof l.api_football_id === 'number')
    .map((l) => ({
      id: l.id as string,
      short: l.short as string,
      api_football_id: l.api_football_id as number,
    }));

  // Club-Mapping
  const { data: extIds, error: extErr } = await supabaseAdmin
    .from('club_external_ids')
    .select('club_id, external_id')
    .eq('source', 'api_football');

  if (extErr) {
    return NextResponse.json({ error: `club_external_ids fetch: ${extErr.message}` }, { status: 500 });
  }

  const apiToClubId = new Map<number, string>();
  for (const e of (extIds ?? []) as Array<{ club_id: string; external_id: string }>) {
    if (e.external_id.match(/^\d+$/)) {
      apiToClubId.set(parseInt(e.external_id, 10), e.club_id);
    }
  }

  // Iterate leagues + fetch standings
  for (const league of activeLeagues) {
    try {
      await sleep(API_RATE_LIMIT_MS);
      stats.api_calls++;

      const endpoint = `/standings?league=${league.api_football_id}&season=${season}`;
      const response = await apiFetch<ApiStandingsResponse>(endpoint);

      const standingsGroups = response.response?.[0]?.league?.standings ?? [];
      if (standingsGroups.length === 0) {
        stats.errors.push(`League ${league.short}: empty standings response`);
        continue;
      }

      // Flat-process all groups (most leagues have 1 group, but structure supports more)
      for (const group of standingsGroups) {
        for (const entry of group) {
          const apiTeamId = entry.team?.id;
          if (!apiTeamId) continue;

          const clubId = apiToClubId.get(apiTeamId);
          if (!clubId) {
            stats.unmapped_clubs++;
            continue;
          }

          const { error: upErr } = await supabaseAdmin
            .from('league_standings')
            .upsert(
              {
                league_id: league.id,
                club_id: clubId,
                season,
                rank: entry.rank,
                played: entry.all.played,
                won: entry.all.win,
                drawn: entry.all.draw,
                lost: entry.all.lose,
                goals_for: entry.all.goals.for,
                goals_against: entry.all.goals.against,
                goals_diff: entry.goalsDiff,
                points: entry.points,
                form: entry.form,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'league_id,club_id,season' },
            );

          if (upErr) {
            stats.errors.push(`Upsert ${league.short}/${clubId}: ${upErr.message}`);
          } else {
            stats.standings_upserted++;
          }
        }
      }

      stats.leagues_processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      stats.errors.push(`League ${league.short} (${league.api_football_id}): ${msg}`);
    }
  }

  const durationMs = Date.now() - runStart;
  try {
    await supabaseAdmin.from('cron_sync_log').insert({
      gameweek: 0,
      step: 'sync-standings',
      status: stats.errors.length === 0 ? 'success' : 'partial',
      details: {
        leagues_processed: stats.leagues_processed,
        standings_upserted: stats.standings_upserted,
        unmapped_clubs: stats.unmapped_clubs,
        api_calls: stats.api_calls,
        error_sample: stats.errors.slice(0, 5),
      },
      duration_ms: durationMs,
    });
  } catch (logErr) {
    console.error('[sync-standings] Failed to write cron_sync_log:', logErr);
  }

  return NextResponse.json({
    success: stats.errors.length === 0,
    duration_ms: durationMs,
    stats: {
      leagues_processed: stats.leagues_processed,
      standings_upserted: stats.standings_upserted,
      unmapped_clubs: stats.unmapped_clubs,
      api_calls: stats.api_calls,
      errors_count: stats.errors.length,
      error_sample: stats.errors.slice(0, 5),
    },
  });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;
