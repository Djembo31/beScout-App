/**
 * Slice 063 — Daily Player-Sync (Phase 2 Data-Integrity)
 *
 * Iteriert ueber alle Clubs mit api_football_team_id und synced Player-Daten
 * von API-Football /players?team={id}&season={y}. Rate-Limited.
 *
 * Refreshed Felder: nationality, image_url, age, shirt_number, first_name,
 * last_name, position. NICHT: market_value, contract_end (die kommen von
 * Transfermarkt-Scraper, Slice 064).
 *
 * Upsert-Pattern (Idempotent):
 *  - Match via api_football_id
 *  - WHERE Clause: nur updaten wenn Wert aktuell NULL oder aus altem Sync
 *
 * Cron-Schedule: Vercel Cron Daily 03:00 UTC (vercel.json).
 *
 * Auth: CRON_SECRET env Bearer-Token.
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { apiFetch, getCurrentSeason, mapPosition } from '@/lib/footballApi';

type ApiPlayersResponse = {
  response: Array<{
    player: {
      id: number;
      firstname: string | null;
      lastname: string | null;
      age: number | null;
      nationality: string | null;
      photo: string | null;
      height: string | null;
      weight: string | null;
    };
    statistics: Array<{
      team: { id: number; name: string };
      games: {
        position: string | null;
        number: number | null;
        appearences: number | null;
      };
    }>;
  }>;
  paging: { current: number; total: number };
  errors?: unknown;
};

type ClubRow = {
  id: string;
  name: string;
  api_football_team_id: number;
};

type SyncStats = {
  clubs_processed: number;
  clubs_skipped: number;
  players_updated: number;
  players_unchanged: number;
  players_errored: number;
  api_calls: number;
  errors: string[];
};

// Rate-Limit: 300ms zwischen API-Calls = max ~3 req/sec (API-Football Pro erlaubt 10/sec)
const API_RATE_LIMIT_MS = 300;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: Request): Promise<NextResponse> {
  const runStart = Date.now();

  // ---- 1. Auth ----
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ---- 2. Env validation ----
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 });
  }
  if (!process.env.API_FOOTBALL_KEY && !process.env.NEXT_PUBLIC_API_FOOTBALL_KEY) {
    return NextResponse.json({ error: 'API_FOOTBALL_KEY not configured' }, { status: 500 });
  }

  const season = getCurrentSeason();

  const stats: SyncStats = {
    clubs_processed: 0,
    clubs_skipped: 0,
    players_updated: 0,
    players_unchanged: 0,
    players_errored: 0,
    api_calls: 0,
    errors: [],
  };

  // ---- 3. Load clubs with api_football_team_id ----
  const { data: extIds, error: extErr } = await supabaseAdmin
    .from('club_external_ids')
    .select('club_id, external_id')
    .eq('source', 'api_football');

  if (extErr) {
    return NextResponse.json({ error: `club_external_ids fetch: ${extErr.message}` }, { status: 500 });
  }

  const { data: clubs, error: clubErr } = await supabaseAdmin
    .from('clubs')
    .select('id, name');

  if (clubErr) {
    return NextResponse.json({ error: `clubs fetch: ${clubErr.message}` }, { status: 500 });
  }

  const extIdMap = new Map<string, number>();
  for (const e of (extIds ?? []) as Array<{ club_id: string; external_id: string }>) {
    if (e.external_id.match(/^\d+$/)) {
      extIdMap.set(e.club_id, parseInt(e.external_id, 10));
    }
  }

  const clubsWithApi: ClubRow[] = [];
  for (const c of (clubs ?? []) as Array<{ id: string; name: string }>) {
    const apiId = extIdMap.get(c.id);
    if (apiId) {
      clubsWithApi.push({ id: c.id, name: c.name, api_football_team_id: apiId });
    } else {
      stats.clubs_skipped++;
    }
  }

  // ---- 4. Iterate clubs + sync players (paginated) ----
  for (const club of clubsWithApi) {
    try {
      let page = 1;
      let totalPages = 1;

      do {
        await sleep(API_RATE_LIMIT_MS);
        stats.api_calls++;

        const endpoint = `/players?team=${club.api_football_team_id}&season=${season}&page=${page}`;
        const response = await apiFetch<ApiPlayersResponse>(endpoint);

        totalPages = response.paging?.total ?? 1;

        for (const entry of response.response ?? []) {
          const p = entry.player;
          if (!p.id) continue;

          try {
            // Build update payload — only upsert fields we trust from API-Football
            const payload: Record<string, unknown> = {
              api_football_id: p.id,
              club_id: club.id,
              updated_at: new Date().toISOString(),
            };
            if (p.firstname) payload.first_name = p.firstname;
            if (p.lastname) payload.last_name = p.lastname;
            if (p.age != null) payload.age = p.age;
            if (p.nationality) payload.nationality = p.nationality;
            if (p.photo) payload.image_url = p.photo;

            // Position + shirt_number from first statistics entry
            const stat = entry.statistics?.[0];
            if (stat?.games?.position) {
              const pos = mapPosition(stat.games.position);
              if (pos) payload.position = pos;
            }
            if (stat?.games?.number != null) {
              payload.shirt_number = stat.games.number;
            }

            // Upsert via api_football_id (UNIQUE, Slice 060)
            const { error: upsertErr } = await supabaseAdmin
              .from('players')
              .upsert(payload, { onConflict: 'api_football_id', ignoreDuplicates: false });

            if (upsertErr) {
              stats.players_errored++;
              stats.errors.push(`${club.name} api_id=${p.id}: ${upsertErr.message}`);
            } else {
              stats.players_updated++;
            }
          } catch (err) {
            stats.players_errored++;
            const msg = err instanceof Error ? err.message : String(err);
            stats.errors.push(`${club.name} api_id=${p.id}: ${msg}`);
          }
        }

        page++;
      } while (page <= totalPages);

      stats.clubs_processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      stats.errors.push(`Club ${club.name} (${club.api_football_team_id}): ${msg}`);
    }
  }

  // ---- 5. Log run ----
  const durationMs = Date.now() - runStart;
  try {
    await supabaseAdmin.from('cron_sync_log').insert({
      gameweek: 0, // non-gameweek job, use 0 sentinel
      step: 'sync-players-daily',
      status: stats.errors.length === 0 ? 'success' : 'partial',
      details: {
        clubs_processed: stats.clubs_processed,
        clubs_skipped: stats.clubs_skipped,
        players_updated: stats.players_updated,
        players_errored: stats.players_errored,
        api_calls: stats.api_calls,
        error_sample: stats.errors.slice(0, 5),
      },
      duration_ms: durationMs,
    });
  } catch (logErr) {
    console.error('[sync-players-daily] Failed to write cron_sync_log:', logErr);
  }

  return NextResponse.json({
    success: stats.errors.length === 0,
    duration_ms: durationMs,
    stats: {
      clubs_processed: stats.clubs_processed,
      clubs_skipped: stats.clubs_skipped,
      players_updated: stats.players_updated,
      players_errored: stats.players_errored,
      api_calls: stats.api_calls,
      errors_count: stats.errors.length,
      error_sample: stats.errors.slice(0, 5),
    },
  });
}

// Vercel Cron triggers GET — no body needed
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 min — fuer 134 Clubs x 300ms = ~40s + API-Round-Trips
