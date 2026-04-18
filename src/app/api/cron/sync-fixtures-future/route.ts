/**
 * Slice 073 — Sync Saison-Fixtures from API-Football /fixtures?league=X&season=Y
 *
 * Iteriert 7 active leagues (~7 calls total). Upserts via api_fixture_id UNIQUE.
 * Inserts neue Fixtures + updates played_at/status/scores (Spielverlegung etc.).
 *
 * MANUAL-ONLY wegen Hobby-Plan-2-Cron-Limit. Admin triggert bei:
 * - Neue Saison (alle 380 Fixtures × 7 Ligen = 2660 Rows)
 * - Mid-season Liga-Backfill
 * - Verdacht auf Spielverlegung
 *
 * Auth: CRON_SECRET Bearer.
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { apiFetch, getCurrentSeason } from '@/lib/footballApi';

type ApiFixturesSeasonResponse = {
  response: Array<{
    fixture: {
      id: number;
      date: string;
      status: { short: string; long: string };
    };
    league: { id: number; season: number; round: string };
    teams: {
      home: { id: number; name: string };
      away: { id: number; name: string };
    };
    goals: { home: number | null; away: number | null };
  }>;
  paging?: { current: number; total: number };
  errors?: unknown;
};

type LeagueRow = {
  id: string;
  short: string;
  api_football_id: number;
};

type SyncStats = {
  leagues_processed: number;
  fixtures_imported: number;
  fixtures_updated: number;
  fixtures_unchanged: number;
  fixtures_skipped_unmapped: number;
  api_calls: number;
  errors: string[];
};

const API_RATE_LIMIT_MS = 300;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Parse gameweek from API-Football round-string "Regular Season - 30" → 30. */
function parseGameweek(round: string | undefined): number | null {
  if (!round) return null;
  const m = round.match(/(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

/** Map API status.short → DB status string. */
function mapStatus(apiStatus: string): string {
  const s = apiStatus.toUpperCase();
  if (['FT', 'AET', 'PEN'].includes(s)) return 'finished';
  if (['1H', '2H', 'ET', 'BT', 'P', 'LIVE'].includes(s)) return 'live';
  if (s === 'HT') return 'halftime';
  if (s === 'PST') return 'postponed';
  if (s === 'CANC' || s === 'ABD') return 'cancelled';
  return 'scheduled'; // NS, TBD, SUSP
}

export async function GET(request: Request): Promise<NextResponse> {
  const runStart = Date.now();

  // ---- 1. Auth ----
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ---- 2. Env ----
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 });
  }
  if (!process.env.API_FOOTBALL_KEY && !process.env.NEXT_PUBLIC_API_FOOTBALL_KEY) {
    return NextResponse.json({ error: 'API_FOOTBALL_KEY not configured' }, { status: 500 });
  }

  const season = getCurrentSeason();

  const stats: SyncStats = {
    leagues_processed: 0,
    fixtures_imported: 0,
    fixtures_updated: 0,
    fixtures_unchanged: 0,
    fixtures_skipped_unmapped: 0,
    api_calls: 0,
    errors: [],
  };

  // ---- 3. Load active leagues ----
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

  // ---- 4. Load club api_football_id → club.id map (reverse lookup) ----
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

  // ---- 5. Iterate leagues + fetch full season fixtures ----
  for (const league of activeLeagues) {
    try {
      await sleep(API_RATE_LIMIT_MS);
      stats.api_calls++;

      const endpoint = `/fixtures?league=${league.api_football_id}&season=${season}`;
      const response = await apiFetch<ApiFixturesSeasonResponse>(endpoint);

      for (const entry of response.response ?? []) {
        const apiFixtureId = entry.fixture?.id;
        if (!apiFixtureId) continue;

        const homeApiId = entry.teams?.home?.id;
        const awayApiId = entry.teams?.away?.id;
        if (!homeApiId || !awayApiId) continue;

        const homeDbId = apiToClubId.get(homeApiId);
        const awayDbId = apiToClubId.get(awayApiId);

        if (!homeDbId || !awayDbId) {
          stats.fixtures_skipped_unmapped++;
          continue;
        }

        const gameweek = parseGameweek(entry.league?.round);
        if (gameweek === null) continue;

        const payload = {
          api_fixture_id: apiFixtureId,
          league_id: league.id,
          gameweek,
          home_club_id: homeDbId,
          away_club_id: awayDbId,
          played_at: entry.fixture.date,
          status: mapStatus(entry.fixture.status?.short ?? 'NS'),
          home_score: entry.goals?.home ?? null,
          away_score: entry.goals?.away ?? null,
        };

        // Detect insert-vs-update: pre-query for api_fixture_id
        const { data: existing } = await supabaseAdmin
          .from('fixtures')
          .select('id, played_at, status, home_score, away_score')
          .eq('api_fixture_id', apiFixtureId)
          .maybeSingle();

        if (!existing) {
          // New fixture → INSERT
          const { error: insErr } = await supabaseAdmin
            .from('fixtures')
            .insert(payload);
          if (insErr) {
            stats.errors.push(`INSERT api=${apiFixtureId}: ${insErr.message}`);
          } else {
            stats.fixtures_imported++;
          }
        } else {
          // Check if anything changed
          const changed =
            existing.played_at !== entry.fixture.date ||
            existing.status !== payload.status ||
            existing.home_score !== payload.home_score ||
            existing.away_score !== payload.away_score;

          if (changed) {
            const { error: upErr } = await supabaseAdmin
              .from('fixtures')
              .update({
                played_at: payload.played_at,
                status: payload.status,
                home_score: payload.home_score,
                away_score: payload.away_score,
              })
              .eq('id', existing.id as string);
            if (upErr) {
              stats.errors.push(`UPDATE api=${apiFixtureId}: ${upErr.message}`);
            } else {
              stats.fixtures_updated++;
            }
          } else {
            stats.fixtures_unchanged++;
          }
        }
      }

      stats.leagues_processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      stats.errors.push(`League ${league.short} (${league.api_football_id}): ${msg}`);
    }
  }

  // ---- 6. Log run ----
  const durationMs = Date.now() - runStart;
  try {
    await supabaseAdmin.from('cron_sync_log').insert({
      gameweek: 0,
      step: 'sync-fixtures-future',
      status: stats.errors.length === 0 ? 'success' : 'partial',
      details: {
        leagues_processed: stats.leagues_processed,
        fixtures_imported: stats.fixtures_imported,
        fixtures_updated: stats.fixtures_updated,
        fixtures_unchanged: stats.fixtures_unchanged,
        fixtures_skipped_unmapped: stats.fixtures_skipped_unmapped,
        api_calls: stats.api_calls,
        error_sample: stats.errors.slice(0, 5),
      },
      duration_ms: durationMs,
    });
  } catch (logErr) {
    console.error('[sync-fixtures-future] Failed to write cron_sync_log:', logErr);
  }

  return NextResponse.json({
    success: stats.errors.length === 0,
    duration_ms: durationMs,
    stats: {
      leagues_processed: stats.leagues_processed,
      fixtures_imported: stats.fixtures_imported,
      fixtures_updated: stats.fixtures_updated,
      fixtures_unchanged: stats.fixtures_unchanged,
      fixtures_skipped_unmapped: stats.fixtures_skipped_unmapped,
      api_calls: stats.api_calls,
      errors_count: stats.errors.length,
      error_sample: stats.errors.slice(0, 5),
    },
  });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 7 leagues × 300ms + ~380 fixtures/league DB-work = ~60-120s
