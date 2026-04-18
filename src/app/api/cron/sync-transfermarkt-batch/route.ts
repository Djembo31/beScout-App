/**
 * Slice 064 — Transfermarkt-Scraper für Market-Values + Contract-End
 *
 * Iteriert players mit transfermarkt-external_id (505 total) und fetcht
 * pro Spieler die Profil-Page. Extract Market-Value + Contract-End.
 *
 * Batch-Mode: max 50 Players pro Call (Vercel 5min-Limit).
 * Cron-Schedule: Vercel Cron 3x täglich verschoben = alle 505 in ~4h abgedeckt.
 *
 * Rate-Limit: 3 Sekunden zwischen Requests (anti-IP-block).
 * User-Agent: Standard Chrome (kein Bot-Header).
 *
 * Legal: Scraping öffentlicher Player-Profile für eigenen internal-use.
 * Partner-Deal für Public-Launch empfohlen.
 *
 * Auth: CRON_SECRET Bearer.
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { parseMarketValue, parseContractEnd } from '@/lib/scrapers/transfermarkt-profile';

const TM_RATE_LIMIT_MS = 3000;
const BATCH_SIZE = 50;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type PlayerMapping = {
  player_id: string;
  transfermarkt_id: string;
  first_name: string;
  last_name: string;
  current_mv: number | null;
  current_contract: string | null;
};

// Parser-Helpers: src/lib/scrapers/transfermarkt-profile.ts
// (Slice 069: extracted for Next-Route-Handler-Type-Compat)

export async function GET(request: Request): Promise<NextResponse> {
  const runStart = Date.now();

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 });
  }

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? String(BATCH_SIZE), 10), BATCH_SIZE);
  const missingOnly = url.searchParams.get('missing_only') !== 'false';

  // Load players with transfermarkt-mapping + filter
  let q = supabaseAdmin
    .from('player_external_ids')
    .select('player_id, external_id, players!inner(id, first_name, last_name, market_value_eur, contract_end, updated_at)')
    .eq('source', 'transfermarkt')
    .order('external_id', { ascending: true })
    .limit(limit);

  // Batch-Strategy: oldest-updated first (oder NULL-mv-first wenn missing_only)
  const { data: rows, error: fetchErr } = await q;

  if (fetchErr) {
    return NextResponse.json({ error: `external_ids fetch: ${fetchErr.message}` }, { status: 500 });
  }

  // Extract + filter
  // PostgREST FK-join liefert 'players' als Array im TS-Type, obwohl es 1:1 ist.
  // Cast via unknown — runtime ist single-object.
  const mappings: PlayerMapping[] = [];
  for (const row of (rows ?? []) as unknown as Array<{
    player_id: string;
    external_id: string;
    players: { id: string; first_name: string; last_name: string; market_value_eur: number | null; contract_end: string | null };
  }>) {
    const p = row.players;
    if (!p) continue;
    if (missingOnly && p.market_value_eur && p.market_value_eur > 0 && p.contract_end) continue;

    mappings.push({
      player_id: row.player_id,
      transfermarkt_id: row.external_id,
      first_name: p.first_name,
      last_name: p.last_name,
      current_mv: p.market_value_eur,
      current_contract: p.contract_end,
    });
  }

  let processed = 0;
  let mvUpdated = 0;
  let contractUpdated = 0;
  let errored = 0;
  const errors: string[] = [];

  for (const mapping of mappings) {
    try {
      await sleep(TM_RATE_LIMIT_MS);

      const tmUrl = `https://www.transfermarkt.de/spieler/profil/spieler/${mapping.transfermarkt_id}`;
      const res = await fetch(tmUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
        },
      });

      if (!res.ok) {
        errored++;
        errors.push(`${mapping.last_name} (tm=${mapping.transfermarkt_id}): HTTP ${res.status}`);
        continue;
      }

      const html = await res.text();
      const marketValue = parseMarketValue(html);
      const contractEnd = parseContractEnd(html);

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (marketValue != null && marketValue > 0) {
        updates.market_value_eur = marketValue;
        if (mapping.current_mv !== marketValue) mvUpdated++;
      }
      if (contractEnd) {
        updates.contract_end = contractEnd;
        if (mapping.current_contract !== contractEnd) contractUpdated++;
      }

      if (Object.keys(updates).length > 1) {
        const { error: upErr } = await supabaseAdmin
          .from('players')
          .update(updates)
          .eq('id', mapping.player_id);

        if (upErr) {
          errored++;
          errors.push(`${mapping.last_name}: UPDATE ${upErr.message}`);
        }
      }

      processed++;
    } catch (err) {
      errored++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${mapping.last_name}: ${msg}`);
    }
  }

  const durationMs = Date.now() - runStart;

  // Log
  try {
    await supabaseAdmin.from('cron_sync_log').insert({
      gameweek: 0,
      step: 'sync-transfermarkt-batch',
      status: errored === 0 ? 'success' : 'partial',
      details: {
        batch_size: mappings.length,
        processed,
        mv_updated: mvUpdated,
        contract_updated: contractUpdated,
        errored,
        error_sample: errors.slice(0, 5),
      },
      duration_ms: durationMs,
    });
  } catch (e) {
    console.error('[sync-transfermarkt-batch] cron_sync_log insert failed:', e);
  }

  return NextResponse.json({
    success: errored === 0,
    duration_ms: durationMs,
    stats: {
      batch_size: mappings.length,
      processed,
      mv_updated: mvUpdated,
      contract_updated: contractUpdated,
      errored,
      error_sample: errors.slice(0, 5),
    },
  });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;
