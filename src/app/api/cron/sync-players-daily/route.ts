/**
 * Slice 063 — Daily Player-Sync (Phase 2 Data-Integrity)
 * Slice 075 — Batch-Refactor: parallel fetches + chunked batch-upsert
 *
 * Iteriert ueber alle Clubs mit api_football_team_id und synced Player-Daten
 * von API-Football /players?team={id}&season={y}.
 *
 * Refreshed Felder: nationality, image_url, age, shirt_number, first_name,
 * last_name, position. NICHT: market_value, contract_end (Transfermarkt-Scraper).
 *
 * Performance (Slice 075):
 * - Phase 1: Parallel fetches (10 clubs/wave, 100ms stagger)
 * - Phase 2: Collect all player payloads in memory
 * - Phase 3: Chunked batch-upsert (500/chunk, onConflict: api_football_id)
 *
 * Auth: CRON_SECRET Bearer.
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
    };
    statistics: Array<{
      team: { id: number; name: string };
      games: { position: string | null; number: number | null; appearences: number | null };
    }>;
  }>;
  paging: { current: number; total: number };
  errors?: unknown;
};

type ClubRow = { id: string; name: string; api_football_team_id: number };

type PlayerPayload = {
  api_football_id: number;
  club_id: string;
  updated_at: string;
  first_name?: string;
  last_name?: string;
  age?: number;
  nationality?: string;
  image_url?: string;
  position?: string;
  shirt_number?: number;
};

type SyncStats = {
  clubs_processed: number;
  clubs_skipped: number;
  clubs_errored: number;
  players_upserted: number;
  players_errored: number;
  api_calls: number;
  errors: string[];
};

const PARALLEL_WAVE_SIZE = 10;
const WAVE_STAGGER_MS = 100;
const UPSERT_CHUNK_SIZE = 500;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Fetch alle pages für einen Club, returns array of player entries. */
async function fetchClubPlayers(
  club: ClubRow,
  season: number,
  onApiCall: () => void,
): Promise<ApiPlayersResponse['response']> {
  const collected: ApiPlayersResponse['response'] = [];
  let page = 1;
  let totalPages = 1;

  do {
    onApiCall();
    const endpoint = `/players?team=${club.api_football_team_id}&season=${season}&page=${page}`;
    const response = await apiFetch<ApiPlayersResponse>(endpoint);
    totalPages = response.paging?.total ?? 1;
    collected.push(...(response.response ?? []));
    page++;
  } while (page <= totalPages);

  return collected;
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
    clubs_processed: 0,
    clubs_skipped: 0,
    clubs_errored: 0,
    players_upserted: 0,
    players_errored: 0,
    api_calls: 0,
    errors: [],
  };

  // ---- Load clubs ----
  const { data: extIds, error: extErr } = await supabaseAdmin
    .from('club_external_ids')
    .select('club_id, external_id')
    .eq('source', 'api_football');

  if (extErr) {
    return NextResponse.json({ error: `club_external_ids fetch: ${extErr.message}` }, { status: 500 });
  }

  const { data: clubs, error: clubErr } = await supabaseAdmin.from('clubs').select('id, name');
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

  // ---- Phase 1: Parallel API-fetches (10 clubs/wave, staggered) ----
  const allPayloads: PlayerPayload[] = [];
  const nowIso = new Date().toISOString();

  for (const wave of chunks(clubsWithApi, PARALLEL_WAVE_SIZE)) {
    const results = await Promise.all(
      wave.map(async (club, idx) => {
        try {
          await sleep(idx * WAVE_STAGGER_MS);
          const entries = await fetchClubPlayers(club, season, () => {
            stats.api_calls++;
          });

          const payloads: PlayerPayload[] = [];
          for (const entry of entries) {
            const p = entry.player;
            if (!p.id) continue;

            const payload: PlayerPayload = {
              api_football_id: p.id,
              club_id: club.id,
              updated_at: nowIso,
            };
            if (p.firstname) payload.first_name = p.firstname;
            if (p.lastname) payload.last_name = p.lastname;
            if (p.age != null) payload.age = p.age;
            if (p.nationality) payload.nationality = p.nationality;
            if (p.photo) payload.image_url = p.photo;

            const stat = entry.statistics?.[0];
            if (stat?.games?.position) {
              const pos = mapPosition(stat.games.position);
              if (pos) payload.position = pos;
            }
            if (stat?.games?.number != null) {
              payload.shirt_number = stat.games.number;
            }
            payloads.push(payload);
          }

          return { ok: true as const, club: club.name, payloads };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return { ok: false as const, club: club.name, error: msg };
        }
      }),
    );

    for (const r of results) {
      if (r.ok) {
        allPayloads.push(...r.payloads);
        stats.clubs_processed++;
      } else {
        stats.clubs_errored++;
        stats.errors.push(`Club ${r.club}: ${r.error}`);
      }
    }
  }

  // ---- Phase 2: Dedupe by api_football_id (last wins, Club-Transfer-Fall) ----
  const byApiId = new Map<number, PlayerPayload>();
  for (const p of allPayloads) {
    byApiId.set(p.api_football_id, p);
  }
  const deduped = Array.from(byApiId.values());

  // ---- Phase 3: Chunked batch-upsert ----
  for (const chunk of chunks(deduped, UPSERT_CHUNK_SIZE)) {
    const { error: upErr } = await supabaseAdmin
      .from('players')
      .upsert(chunk, { onConflict: 'api_football_id', ignoreDuplicates: false });

    if (upErr) {
      stats.errors.push(`upsert-chunk: ${upErr.message}`);
      stats.players_errored += chunk.length;
    } else {
      stats.players_upserted += chunk.length;
    }
  }

  // ---- Log ----
  const durationMs = Date.now() - runStart;
  try {
    await supabaseAdmin.from('cron_sync_log').insert({
      gameweek: 0,
      step: 'sync-players-daily',
      status: stats.errors.length === 0 ? 'success' : 'partial',
      details: {
        clubs_processed: stats.clubs_processed,
        clubs_skipped: stats.clubs_skipped,
        clubs_errored: stats.clubs_errored,
        players_upserted: stats.players_upserted,
        players_errored: stats.players_errored,
        api_calls: stats.api_calls,
        error_sample: stats.errors.slice(0, 5),
      },
      duration_ms: durationMs,
    });
  } catch (logErr) {
    console.error('[sync-players-daily] cron_sync_log failed:', logErr);
  }

  return NextResponse.json({
    success: stats.errors.length === 0,
    duration_ms: durationMs,
    stats: {
      clubs_processed: stats.clubs_processed,
      clubs_skipped: stats.clubs_skipped,
      clubs_errored: stats.clubs_errored,
      players_upserted: stats.players_upserted,
      players_errored: stats.players_errored,
      api_calls: stats.api_calls,
      errors_count: stats.errors.length,
      error_sample: stats.errors.slice(0, 5),
    },
  });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;
