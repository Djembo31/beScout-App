import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withLogger } from '@/lib/observability/apiLogger';

/**
 * Slice 178b — Cleanup expired idempotency-key rows.
 *
 * Table `request_dedup_keys` speichert response-JSONB pro (user_id, dedup_key)
 * mit TTL 300s (via Slice 178 `check_or_reserve_dedup_key`). Ohne Cleanup
 * waechst die Tabelle unbegrenzt — expired rows werden nie gelesen (Client
 * sendet keinen alten Key erneut), aber belasten den Index.
 *
 * Job loescht alle Rows mit expires_at < NOW(). Schedule: 1×/h (stuendlich),
 * sodass abgelaufene Keys hoechstens 60min leben nach dem eigentlichen TTL.
 */
export const GET = withLogger('cron.dedup-cleanup', async (request) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 });
  }

  const { error, count } = await supabaseAdmin
    .from('request_dedup_keys')
    .delete({ count: 'exact' })
    .lt('expires_at', new Date().toISOString());

  if (error) {
    console.error('[Cron] dedup-cleanup failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: count ?? 0 });
});
