/**
 * Slice 076 — Import Players CSV (Market-Value + Contract-End bulk update)
 *
 * POST /api/admin/players-csv/import
 * Body: { rows: Array<{ player_id: string, market_value_eur: number|null, contract_end: string|null }> }
 *
 * Batch UPDATE via .update().eq('id', ...) in chunks of 50 concurrent.
 * Validates: player_id UUID exists, values format-valid.
 *
 * Auth: session + platform_admins.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const UPDATE_BATCH_SIZE = 50;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

type InputRow = {
  player_id: string;
  market_value_eur: number | null;
  contract_end: string | null;
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Auth
  const supabaseAuth = createServerClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll() { /* read-only */ },
      },
    },
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'notAuthenticated' }, { status: 401 });
  }

  const { data: adminRow } = await supabaseAuth
    .from('platform_admins')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!adminRow || !['superadmin', 'admin'].includes(adminRow.role)) {
    return NextResponse.json({ error: 'noPermission' }, { status: 403 });
  }

  // Parse body
  let body: { rows: InputRow[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalidJSON' }, { status: 400 });
  }

  if (!Array.isArray(body?.rows)) {
    return NextResponse.json({ error: 'rowsRequired' }, { status: 400 });
  }

  // Validate + collect valid rows
  const valid: InputRow[] = [];
  const errors: Array<{ index: number; reason: string }> = [];

  for (let i = 0; i < body.rows.length; i++) {
    const r = body.rows[i];
    if (!r || typeof r.player_id !== 'string' || !UUID_REGEX.test(r.player_id)) {
      errors.push({ index: i, reason: 'invalid_player_id' });
      continue;
    }
    let mv: number | null = null;
    if (r.market_value_eur !== null && r.market_value_eur !== undefined) {
      const n = Number(r.market_value_eur);
      if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
        errors.push({ index: i, reason: 'invalid_market_value' });
        continue;
      }
      mv = n;
    }
    let ce: string | null = null;
    if (r.contract_end !== null && r.contract_end !== undefined && r.contract_end !== '') {
      if (typeof r.contract_end !== 'string' || !DATE_REGEX.test(r.contract_end)) {
        errors.push({ index: i, reason: 'invalid_contract_end' });
        continue;
      }
      ce = r.contract_end;
    }
    valid.push({ player_id: r.player_id, market_value_eur: mv, contract_end: ce });
  }

  // Pre-query: filter to existing player_ids
  const allIds = valid.map((r) => r.player_id);
  const existingIds = new Set<string>();
  for (const idChunk of chunks(allIds, 1000)) {
    const { data: rows, error: fetchErr } = await supabaseAdmin
      .from('players')
      .select('id')
      .in('id', idChunk);
    if (fetchErr) {
      return NextResponse.json({ error: `pre-query: ${fetchErr.message}` }, { status: 500 });
    }
    for (const r of (rows ?? []) as Array<{ id: string }>) existingIds.add(r.id);
  }

  const applicable: InputRow[] = [];
  for (let i = 0; i < valid.length; i++) {
    if (existingIds.has(valid[i].player_id)) {
      applicable.push(valid[i]);
    } else {
      errors.push({ index: i, reason: 'player_not_found' });
    }
  }

  // Chunked batch-UPDATE
  let updated = 0;
  let updateErrors = 0;
  const updateErrorSample: string[] = [];

  for (const batch of chunks(applicable, UPDATE_BATCH_SIZE)) {
    const results = await Promise.all(
      batch.map((r) =>
        supabaseAdmin
          .from('players')
          .update({
            market_value_eur: r.market_value_eur,
            contract_end: r.contract_end,
          })
          .eq('id', r.player_id)
          .then((res) => ({ ok: !res.error, error: res.error?.message })),
      ),
    );
    for (const res of results) {
      if (res.ok) {
        updated++;
      } else {
        updateErrors++;
        if (updateErrorSample.length < 10) updateErrorSample.push(res.error ?? 'unknown');
      }
    }
  }

  return NextResponse.json({
    success: updateErrors === 0,
    total_rows: body.rows.length,
    valid_rows: valid.length,
    applicable_rows: applicable.length,
    updated,
    errored: updateErrors,
    validation_errors: errors.slice(0, 20),
    update_error_sample: updateErrorSample,
  });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;
