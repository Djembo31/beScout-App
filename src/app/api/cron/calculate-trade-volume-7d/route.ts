/**
 * Slice 200 — Daily Cron: Trade-Volume-7d Calculator
 *
 * Triggers public.cron_calculate_trade_volume_7d() RPC which:
 *   1. COUNT(*) FROM trades GROUP BY player_id WHERE executed_at > NOW() - 7d
 *   2. UPDATE players SET trades_volume_7d (only when value changed)
 *
 * Schedule: 0 4 * * * UTC (daily, 6 AM MEZ / 7 AM MESZ — off-peak).
 * Auth: CRON_SECRET Bearer.
 * RPC is SECURITY DEFINER, REVOKE'd from authenticated/anon — service_role only.
 *
 * Closes FM-Audit Finding 4.4: Sortier nach Trade-Volume-7d auf /market.
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withLogger } from '@/lib/observability/apiLogger';

type RpcResult = {
  success: boolean;
  error?: string;
  updated_count?: number;
  zero_count?: number;
  window_days?: number;
  date?: string;
};

export const GET = withLogger('cron.calculate-trade-volume-7d', async (request): Promise<NextResponse> => {
  const runStart = Date.now();

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

  const { data, error } = await supabaseAdmin.rpc('cron_calculate_trade_volume_7d');

  if (error) {
    console.error('[cron calculate-trade-volume-7d] rpc error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        duration_ms: Date.now() - runStart,
      },
      { status: 500 },
    );
  }

  const result = data as RpcResult;
  if (!result || result.success !== true) {
    console.error('[cron calculate-trade-volume-7d] rpc returned non-success:', result);
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

  try {
    await supabaseAdmin.from('cron_sync_log').insert({
      gameweek: 0,
      step: 'calculate-trade-volume-7d',
      status: 'success',
      details: {
        updated_count: result.updated_count ?? 0,
        zero_count: result.zero_count ?? 0,
        window_days: result.window_days ?? 7,
        date: result.date,
      },
      duration_ms: durationMs,
    });
  } catch (logErr) {
    console.error('[cron calculate-trade-volume-7d] cron_sync_log insert failed:', logErr);
  }

  return NextResponse.json({
    success: true,
    duration_ms: durationMs,
    updated_count: result.updated_count ?? 0,
    zero_count: result.zero_count ?? 0,
    window_days: result.window_days ?? 7,
    date: result.date,
  });
});

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;
