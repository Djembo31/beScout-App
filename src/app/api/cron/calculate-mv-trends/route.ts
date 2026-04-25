/**
 * Slice 197d — Daily Cron: MV-Trend 7d Calculator
 *
 * Triggers public.cron_snapshot_and_calc_mv_trends() RPC which:
 *   1. Snapshots today's market_value_eur into players_mv_history
 *   2. Calculates 7d-trend (rising/stable/falling) by comparing today vs 7d-old MV
 *   3. Cleans up history rows >30d
 *
 * Schedule: 0 3 * * * UTC (daily, 5 AM MEZ / 6 AM MESZ — off-peak).
 * Auth: CRON_SECRET Bearer.
 * RPC is SECURITY DEFINER, REVOKE'd from authenticated/anon — service_role only.
 *
 * Closes FM-Audit Findings 1.2 (Kader-Tab) + 4.1 (MarketFilters):
 * MV-Trend rising/falling/stable fehlt systemisch — Comunio-Standard seit 2003.
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withLogger } from '@/lib/observability/apiLogger';

type RpcResult = {
  success: boolean;
  error?: string;
  snapshot_count?: number;
  trend_updated_count?: number;
  history_pruned?: number;
  date?: string;
};

export const GET = withLogger('cron.calculate-mv-trends', async (request): Promise<NextResponse> => {
  const runStart = Date.now();

  // Auth-Guard: CRON_SECRET Bearer
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY not configured' },
      { status: 500 },
    );
  }

  // RPC call — single round-trip, all logic in DB
  const { data, error } = await supabaseAdmin.rpc('cron_snapshot_and_calc_mv_trends');

  if (error) {
    console.error('[cron calculate-mv-trends] rpc error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        duration_ms: Date.now() - runStart,
      },
      { status: 500 },
    );
  }

  // Discriminated-Union check (Slice 165 pattern)
  const result = data as RpcResult;
  if (!result || result.success !== true) {
    console.error('[cron calculate-mv-trends] rpc returned non-success:', result);
    return NextResponse.json(
      {
        success: false,
        error: result?.error ?? 'rpc_returned_non_success',
        duration_ms: Date.now() - runStart,
      },
      { status: 500 },
    );
  }

  const durationMs = Date.now() - runStart;

  // Log to cron_sync_log for observability (best-effort)
  try {
    await supabaseAdmin.from('cron_sync_log').insert({
      gameweek: 0,
      step: 'calculate-mv-trends',
      status: 'success',
      details: {
        snapshot_count: result.snapshot_count ?? 0,
        trend_updated_count: result.trend_updated_count ?? 0,
        history_pruned: result.history_pruned ?? 0,
        date: result.date,
      },
      duration_ms: durationMs,
    });
  } catch (logErr) {
    console.error('[cron calculate-mv-trends] cron_sync_log insert failed:', logErr);
  }

  return NextResponse.json({
    success: true,
    duration_ms: durationMs,
    snapshot_count: result.snapshot_count ?? 0,
    trend_updated_count: result.trend_updated_count ?? 0,
    history_pruned: result.history_pruned ?? 0,
    date: result.date,
  });
});

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;
