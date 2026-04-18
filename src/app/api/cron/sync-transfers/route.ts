/**
 * Slice 072 — Sync Player-Transfers from API-Football
 *
 * Fetches /transfers?team=X per mapped Club (~134 calls/run).
 * Upserts transfer-history in player_transfers table + updates players.club_id
 * when destination team is one of our DB-mapped clubs.
 *
 * MANUAL-ONLY (kein vercel.json-Entry) — Hobby-Plan 2-Cron-Limit.
 * Admin triggert via AdminDataSyncTab nach Transferfenster-Ende.
 *
 * Auth: CRON_SECRET Bearer.
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { apiFetch, getCurrentSeason } from '@/lib/footballApi';

type ApiTransferResponse = {
  response: Array<{
    player: { id: number; name: string };
    update: string;
    transfers: Array<{
      date: string; // "YYYY-MM-DD"
      type: string | null; // "Free", "Loan", "€ XX Mio", "N/A", null
      teams: {
        in: { id: number | null; name: string; logo: string | null };
        out: { id: number | null; name: string; logo: string | null };
      };
    }>;
  }>;
  paging?: { current: number; total: number };
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
  transfers_imported: number;
  transfers_duplicates: number;
  players_club_updated: number;
  unmatched_players: number;
  api_calls: number;
  errors: string[];
};

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
    transfers_imported: 0,
    transfers_duplicates: 0,
    players_club_updated: 0,
    unmatched_players: 0,
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

  // api_football_team_id → DB club_id (reverse lookup for destination-team mapping)
  const apiToClubId = new Map<number, string>();
  for (const [clubId, apiId] of Array.from(extIdMap.entries())) {
    apiToClubId.set(apiId, clubId);
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

  // ---- 4. Iterate clubs + fetch transfers ----
  for (const club of clubsWithApi) {
    try {
      await sleep(API_RATE_LIMIT_MS);
      stats.api_calls++;

      const endpoint = `/transfers?team=${club.api_football_team_id}`;
      const response = await apiFetch<ApiTransferResponse>(endpoint);

      for (const entry of response.response ?? []) {
        const apiPlayerId = entry.player?.id;
        if (!apiPlayerId) continue;

        // Lookup player in our DB by api_football_id
        const { data: playerRow, error: lookupErr } = await supabaseAdmin
          .from('players')
          .select('id, club_id')
          .eq('api_football_id', apiPlayerId)
          .maybeSingle();

        if (lookupErr) {
          stats.errors.push(`Lookup api=${apiPlayerId}: ${lookupErr.message}`);
          continue;
        }

        if (!playerRow) {
          stats.unmatched_players++;
          continue;
        }

        // Process each transfer entry for this player
        for (const t of entry.transfers ?? []) {
          if (!t.date) continue;

          const teamInApiId = t.teams?.in?.id ?? null;
          const teamOutApiId = t.teams?.out?.id ?? null;

          if (teamInApiId === null && teamOutApiId === null) continue;
          if (teamInApiId !== null && teamOutApiId !== null && teamInApiId === teamOutApiId) {
            // API-bug: same team in+out, skip
            continue;
          }

          const teamInDbId = teamInApiId != null ? apiToClubId.get(teamInApiId) ?? null : null;
          const teamOutDbId = teamOutApiId != null ? apiToClubId.get(teamOutApiId) ?? null : null;

          // Upsert transfer record (ON CONFLICT on UNIQUE(player_id, transfer_date, team_in_api_football_id))
          const { error: upErr } = await supabaseAdmin
            .from('player_transfers')
            .upsert(
              {
                player_id: playerRow.id,
                transfer_date: t.date,
                transfer_type: t.type || 'N/A',
                team_in_id: teamInDbId,
                team_out_id: teamOutDbId,
                team_in_api_football_id: teamInApiId,
                team_out_api_football_id: teamOutApiId,
                season,
              },
              {
                onConflict: 'player_id,transfer_date,team_in_api_football_id',
                ignoreDuplicates: true, // don't overwrite existing, just skip
              },
            )
            .select('id');

          if (upErr) {
            stats.errors.push(`Transfer upsert ${playerRow.id} @${t.date}: ${upErr.message}`);
          } else {
            stats.transfers_imported++;
          }

          // If destination is a mapped club AND different from current → update player.club_id
          if (teamInDbId && teamInDbId !== playerRow.club_id) {
            const { error: clubUpErr } = await supabaseAdmin
              .from('players')
              .update({
                club_id: teamInDbId,
                status_updated_at: new Date().toISOString(),
              })
              .eq('id', playerRow.id);

            if (clubUpErr) {
              stats.errors.push(`Club-update ${playerRow.id}: ${clubUpErr.message}`);
            } else {
              stats.players_club_updated++;
            }
          }
        }
      }

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
      gameweek: 0,
      step: 'sync-transfers',
      status: stats.errors.length === 0 ? 'success' : 'partial',
      details: {
        clubs_processed: stats.clubs_processed,
        clubs_skipped: stats.clubs_skipped,
        transfers_imported: stats.transfers_imported,
        players_club_updated: stats.players_club_updated,
        unmatched_players: stats.unmatched_players,
        api_calls: stats.api_calls,
        error_sample: stats.errors.slice(0, 5),
      },
      duration_ms: durationMs,
    });
  } catch (logErr) {
    console.error('[sync-transfers] Failed to write cron_sync_log:', logErr);
  }

  return NextResponse.json({
    success: stats.errors.length === 0,
    duration_ms: durationMs,
    stats: {
      clubs_processed: stats.clubs_processed,
      clubs_skipped: stats.clubs_skipped,
      transfers_imported: stats.transfers_imported,
      players_club_updated: stats.players_club_updated,
      unmatched_players: stats.unmatched_players,
      api_calls: stats.api_calls,
      errors_count: stats.errors.length,
      error_sample: stats.errors.slice(0, 5),
    },
  });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 134 clubs × 300ms = ~40s + DB-updates
