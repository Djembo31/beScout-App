/**
 * Slice 070 — Sync Player-Injuries from API-Football
 * Slice 075 — Batch-Refactor: 1 pre-query + chunked concurrent updates
 *
 * Fetches /injuries?league=X&season=Y per active league (~7 calls/run).
 * Updates players.status (injured|suspended|doubtful) + injury_reason.
 * Recovery: Players die vorher injured/suspended waren aber nicht mehr in
 * API-Response → status='fit'.
 *
 * Performance:
 * - Phase 1: 7 parallel API-calls (rate-limited 300ms stagger)
 * - Phase 2: 1 pre-query lookup alle Players by api_football_id
 * - Phase 3: Chunked concurrent UPDATEs (50/chunk)
 *
 * Auth: CRON_SECRET Bearer.
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { apiFetch, getCurrentSeason } from '@/lib/footballApi';

type ApiInjuryResponse = {
  response: Array<{
    player: { id: number; name: string };
    team: { id: number; name: string };
    league: { id: number; season: number };
    type: string;
    reason: string | null;
  }>;
};

type LeagueRow = { id: string; short: string; api_football_id: number };

type SyncStats = {
  leagues_processed: number;
  injuries_imported: number;
  players_updated: number;
  players_recovered: number;
  unmatched: number;
  api_calls: number;
  errors: string[];
};

const API_RATE_LIMIT_MS = 300;
const UPDATE_CHUNK_SIZE = 50;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function mapStatus(type: string, reason: string | null): 'injured' | 'suspended' | 'doubtful' {
  if (type === 'Questionable') return 'doubtful';
  const r = (reason ?? '').toLowerCase();
  if (r.includes('suspend') || r.includes('red card') || r.includes('booked') || r.includes('sent off')) {
    return 'suspended';
  }
  return 'injured';
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
    injuries_imported: 0,
    players_updated: 0,
    players_recovered: 0,
    unmatched: 0,
    api_calls: 0,
    errors: [],
  };

  // ---- Load leagues ----
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

  // ---- Snapshot flagged players (für Recovery) ----
  const { data: flaggedRows, error: flagErr } = await supabaseAdmin
    .from('players')
    .select('id, api_football_id')
    .in('status', ['injured', 'suspended']);

  if (flagErr) {
    return NextResponse.json({ error: `flagged-players fetch: ${flagErr.message}` }, { status: 500 });
  }

  const previouslyFlagged = new Map<number, string>();
  for (const p of (flaggedRows ?? []) as Array<{ id: string; api_football_id: number | null }>) {
    if (p.api_football_id) previouslyFlagged.set(p.api_football_id, p.id);
  }

  // ---- Phase 1: Sequential API-fetches mit Rate-Limit ----
  const allInjuries: Array<{
    apiPlayerId: number;
    status: 'injured' | 'suspended' | 'doubtful';
    reason: string;
  }> = [];

  for (const league of activeLeagues) {
    try {
      await sleep(API_RATE_LIMIT_MS);
      stats.api_calls++;

      const endpoint = `/injuries?league=${league.api_football_id}&season=${season}`;
      const response = await apiFetch<ApiInjuryResponse>(endpoint);

      stats.injuries_imported += response.response?.length ?? 0;

      for (const entry of response.response ?? []) {
        const apiPlayerId = entry.player?.id;
        if (!apiPlayerId) continue;
        allInjuries.push({
          apiPlayerId,
          status: mapStatus(entry.type, entry.reason),
          reason: entry.reason || 'Unknown',
        });
      }

      stats.leagues_processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      stats.errors.push(`League ${league.short}: ${msg}`);
    }
  }

  // ---- Phase 2: Batch-Lookup alle Players auf einmal ----
  const uniqueApiIds = Array.from(new Set(allInjuries.map((i) => i.apiPlayerId)));
  let byApiId = new Map<number, { id: string; status: string | null }>();

  // Supabase .in() limited auf ~1000 — chunked pre-query
  for (const idChunk of chunks(uniqueApiIds, 1000)) {
    const { data: players, error: playerErr } = await supabaseAdmin
      .from('players')
      .select('id, api_football_id, status')
      .in('api_football_id', idChunk);

    if (playerErr) {
      stats.errors.push(`player-batch-lookup: ${playerErr.message}`);
      continue;
    }
    for (const p of (players ?? []) as Array<{ id: string; api_football_id: number; status: string | null }>) {
      byApiId.set(p.api_football_id, { id: p.id, status: p.status });
    }
  }

  // ---- Phase 3: Build update-payloads (dedupe by player.id) ----
  const updatesByPlayerId = new Map<
    string,
    { id: string; status: string; injury_reason: string; status_updated_at: string }
  >();
  const nowIso = new Date().toISOString();
  const seenApiIds = new Set<number>();

  for (const inj of allInjuries) {
    seenApiIds.add(inj.apiPlayerId);
    const p = byApiId.get(inj.apiPlayerId);
    if (!p) {
      stats.unmatched++;
      continue;
    }
    if (!updatesByPlayerId.has(p.id)) {
      updatesByPlayerId.set(p.id, {
        id: p.id,
        status: inj.status,
        injury_reason: inj.reason,
        status_updated_at: nowIso,
      });
    }
  }

  // ---- Phase 4: Chunked concurrent UPDATEs ----
  const updates = Array.from(updatesByPlayerId.values());
  for (const chunk of chunks(updates, UPDATE_CHUNK_SIZE)) {
    const results = await Promise.all(
      chunk.map((u) =>
        supabaseAdmin
          .from('players')
          .update({
            status: u.status,
            injury_reason: u.injury_reason,
            status_updated_at: u.status_updated_at,
          })
          .eq('id', u.id)
          .then((r) => ({ ok: !r.error, error: r.error?.message })),
      ),
    );
    for (const r of results) {
      if (r.ok) stats.players_updated++;
      else stats.errors.push(`update: ${r.error}`);
    }
  }

  // ---- Phase 5: Recovery (single batch UPDATE via .in()) ----
  if (stats.leagues_processed === activeLeagues.length && stats.leagues_processed > 0) {
    const recoveryIds: string[] = [];
    for (const [apiId, playerId] of Array.from(previouslyFlagged.entries())) {
      if (!seenApiIds.has(apiId)) recoveryIds.push(playerId);
    }

    if (recoveryIds.length > 0) {
      for (const idChunk of chunks(recoveryIds, 500)) {
        const { error: recErr } = await supabaseAdmin
          .from('players')
          .update({
            status: 'fit',
            injury_reason: null,
            injury_until: null,
            status_updated_at: nowIso,
          })
          .in('id', idChunk);

        if (recErr) {
          stats.errors.push(`recovery-chunk: ${recErr.message}`);
        } else {
          stats.players_recovered += idChunk.length;
        }
      }
    }
  }

  // ---- Log ----
  const durationMs = Date.now() - runStart;
  try {
    await supabaseAdmin.from('cron_sync_log').insert({
      gameweek: 0,
      step: 'sync-injuries',
      status: stats.errors.length === 0 ? 'success' : 'partial',
      details: {
        leagues_processed: stats.leagues_processed,
        injuries_imported: stats.injuries_imported,
        players_updated: stats.players_updated,
        players_recovered: stats.players_recovered,
        unmatched: stats.unmatched,
        api_calls: stats.api_calls,
        error_sample: stats.errors.slice(0, 5),
      },
      duration_ms: durationMs,
    });
  } catch (logErr) {
    console.error('[sync-injuries] Failed cron_sync_log:', logErr);
  }

  return NextResponse.json({
    success: stats.errors.length === 0,
    duration_ms: durationMs,
    stats: {
      leagues_processed: stats.leagues_processed,
      injuries_imported: stats.injuries_imported,
      players_updated: stats.players_updated,
      players_recovered: stats.players_recovered,
      unmatched: stats.unmatched,
      api_calls: stats.api_calls,
      errors_count: stats.errors.length,
      error_sample: stats.errors.slice(0, 5),
    },
  });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;
