import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withLogger } from '@/lib/observability/apiLogger';

/**
 * Cron: expire-orders
 *
 * Cancels all `open`/`partial` orders whose `expires_at` has passed.
 * For buy-orders: releases the escrowed `wallets.locked_balance`, logs a
 * `transactions` row (`type='order_cancel'`) and recalcs affected `floor_price`.
 * For sell-orders: simple status→cancelled (no escrow to release).
 *
 * Slice 187 Follow-Up:
 *   Cron-Gap gefunden bei DB-Invariant-Cleanup (158 stale open orders).
 *   Vorher nicht in vercel.json → Escrow verblieb locked bis manueller RPC-Call.
 *
 * Schedule: daily 05:30 UTC (Hobby-Tier Limit). Bei Pro-Upgrade auf hourly
 * umstellen fuer engeren Order-Expiry-Loop.
 */
export const GET = withLogger('cron.expire-orders', async (request) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 });
  }
  const { data, error } = await supabaseAdmin.rpc('expire_pending_orders');
  if (error) {
    console.error('[Cron] expire-orders failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, expired: data ?? 0 });
});
