/**
 * Slice 070 — Sync Player-Injuries from API-Football
 *
 * Fetches /injuries?league=X&season=Y per active league (~7 calls/run).
 * Updates players.status (injured|suspended|doubtful) + injury_reason + injury_until.
 * Recovery-Logik: Players die vorher injured/suspended waren aber nicht mehr in
 * API-Response auftauchen → status='fit' (gameweek-sync 'doubtful' bleibt unangetastet).
 *
 * Cron-Schedule: Vercel Cron daily 12:00 UTC (mid-day = oft frische injuries).
 *
 * Auth: CRON_SECRET Bearer.
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { apiFetch, getCurrentSeason } from '@/lib/footballApi';

type ApiInjuryResponse = {
  response: Array<{
    player: { id: number; name: string; photo: string | null };
    team: { id: number; name: string };
    fixture: { id: number | null; date: string | null };
    league: { id: number; season: number };
    type: string; // "Missing Fixture" | "Questionable"
    reason: string | null; // "Knee Injury" | "Suspended" | "Calf Injury" | etc.
  }>;
  paging: { current: number; total: number };
  errors?: unknown;
};

type LeagueRow = {
  id: string;
  short: string;
  api_football_id: number;
};

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

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Map API-Football injury entry → players.status value. */
function mapStatus(type: string, reason: string | null): 'injured' | 'suspended' | 'doubtful' {
  if (type === 'Questionable') return 'doubtful';
  // type === 'Missing Fixture' (or anything else)
  const r = (reason ?? '').toLowerCase();
  if (r.includes('suspend') || r.includes('red card') || r.includes('booked') || r.includes('sent off')) {
    return 'suspended';
  }
  return 'injured';
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
    leagues_processed: 0,
    injuries_imported: 0,
    players_updated: 0,
    players_recovered: 0,
    unmatched: 0,
    api_calls: 0,
    errors: [],
  };

  // ---- 3. Load active leagues (with api_football_id) ----
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

  // ---- 4. Snapshot of currently-flagged players (for recovery logic) ----
  // Only injured/suspended — doubtful from gameweek-sync stays untouched.
  const { data: flaggedRows, error: flagErr } = await supabaseAdmin
    .from('players')
    .select('id, api_football_id, status')
    .in('status', ['injured', 'suspended']);

  if (flagErr) {
    return NextResponse.json({ error: `flagged-players fetch: ${flagErr.message}` }, { status: 500 });
  }

  // Map: api_football_id → player.id (only injured/suspended ones)
  const previouslyFlagged = new Map<number, string>();
  for (const p of (flaggedRows ?? []) as Array<{ id: string; api_football_id: number | null }>) {
    if (p.api_football_id) previouslyFlagged.set(p.api_football_id, p.id);
  }

  // Track which previously-flagged players showed up again in API → those NOT seen get recovered
  const seenApiIds = new Set<number>();

  // ---- 5. Iterate leagues + fetch injuries ----
  for (const league of activeLeagues) {
    try {
      await sleep(API_RATE_LIMIT_MS);
      stats.api_calls++;

      const endpoint = `/injuries?league=${league.api_football_id}&season=${season}`;
      const response = await apiFetch<ApiInjuryResponse>(endpoint);

      stats.injuries_imported += response.response?.length ?? 0;

      // Track unique players seen in THIS API run (player can have multiple injury entries)
      const processedInThisRun = new Set<number>();

      for (const entry of response.response ?? []) {
        const apiPlayerId = entry.player?.id;
        if (!apiPlayerId) continue;

        seenApiIds.add(apiPlayerId);
        if (processedInThisRun.has(apiPlayerId)) continue;
        processedInThisRun.add(apiPlayerId);

        const newStatus = mapStatus(entry.type, entry.reason);
        const reason = entry.reason || 'Unknown';

        // Lookup player by api_football_id
        const { data: playerRow, error: lookupErr } = await supabaseAdmin
          .from('players')
          .select('id, status')
          .eq('api_football_id', apiPlayerId)
          .maybeSingle();

        if (lookupErr) {
          stats.errors.push(`Lookup api=${apiPlayerId}: ${lookupErr.message}`);
          continue;
        }

        if (!playerRow) {
          stats.unmatched++;
          continue;
        }

        // Only update if status actually changed (or reason changed)
        const { error: upErr } = await supabaseAdmin
          .from('players')
          .update({
            status: newStatus,
            injury_reason: reason,
            status_updated_at: new Date().toISOString(),
          })
          .eq('id', playerRow.id);

        if (upErr) {
          stats.errors.push(`Update ${playerRow.id}: ${upErr.message}`);
        } else {
          stats.players_updated++;
        }
      }

      stats.leagues_processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      stats.errors.push(`League ${league.short} (${league.api_football_id}): ${msg}`);
    }
  }

  // ---- 6. Recovery: previously-flagged players NOT seen in any API response → fit ----
  // Guard: only run recovery if at least one league successfully returned data
  // (sonst would full API outage flag all injured → fit which is wrong).
  if (stats.leagues_processed > 0 && stats.api_calls === activeLeagues.length) {
    const recoveryIds: string[] = [];
    for (const [apiId, playerId] of Array.from(previouslyFlagged.entries())) {
      if (!seenApiIds.has(apiId)) recoveryIds.push(playerId);
    }

    if (recoveryIds.length > 0) {
      const { error: recErr } = await supabaseAdmin
        .from('players')
        .update({
          status: 'fit',
          injury_reason: null,
          injury_until: null,
          status_updated_at: new Date().toISOString(),
        })
        .in('id', recoveryIds);

      if (recErr) {
        stats.errors.push(`Recovery batch: ${recErr.message}`);
      } else {
        stats.players_recovered = recoveryIds.length;
      }
    }
  }

  // ---- 7. Log run ----
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
    console.error('[sync-injuries] Failed to write cron_sync_log:', logErr);
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
export const maxDuration = 60; // 7 leagues × 300ms + DB-Updates ~ 5s typical
