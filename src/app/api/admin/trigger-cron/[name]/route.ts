/**
 * Slice 069 — Admin Manual-Trigger fuer Data-Sync-Crons
 *
 * Proxy-Endpoint: Admin (via Session) kann 3 Cron-Jobs ad-hoc triggern.
 * Server-internal fetch gegen /api/cron/[name] mit CRON_SECRET — Client
 * sieht CRON_SECRET nie.
 *
 * Whitelist: nur sync-players-daily | sync-transfermarkt-batch |
 * transfermarkt-search-batch triggerbar. Alles andere 400.
 *
 * Auth: Session-Cookie + platform_admins.role IN ('superadmin', 'admin').
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

const TRIGGERABLE_CRONS = new Set([
  'sync-players-daily',
  'sync-transfermarkt-batch',
  'transfermarkt-search-batch',
]);

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ name: string }> },
): Promise<NextResponse> {
  const { name } = await context.params;

  // ---- 1. Whitelist check ----
  if (!TRIGGERABLE_CRONS.has(name)) {
    return NextResponse.json(
      { success: false, errorKey: 'cronNotTriggerable', params: { name } },
      { status: 400 },
    );
  }

  // ---- 2. Env check ----
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { success: false, errorKey: 'cronSecretMissing' },
      { status: 500 },
    );
  }

  // ---- 3. Auth: verify Admin via Session ----
  const supabaseAuth = createServerClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll() {
          /* read-only */
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { success: false, errorKey: 'notAuthenticated' },
      { status: 401 },
    );
  }

  const { data: adminRow } = await supabaseAuth
    .from('platform_admins')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!adminRow || !['superadmin', 'admin'].includes(adminRow.role)) {
    return NextResponse.json(
      { success: false, errorKey: 'noPermission' },
      { status: 403 },
    );
  }

  // ---- 4. Optional query passthrough (z.B. ?limit=30) ----
  const incomingParams = req.nextUrl.searchParams;
  const cronUrl = new URL(`/api/cron/${name}`, req.nextUrl.origin);
  incomingParams.forEach((v, k) => cronUrl.searchParams.set(k, v));

  // ---- 5. Server-internal fetch to Cron endpoint ----
  const startedAt = Date.now();
  let cronResponse: Response;
  try {
    cronResponse = await fetch(cronUrl.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
      cache: 'no-store',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        success: false,
        errorKey: 'cronFetchFailed',
        params: { name, error: msg },
      },
      { status: 502 },
    );
  }

  const durationMs = Date.now() - startedAt;

  // Pass-through JSON, preserve status
  let payload: unknown = null;
  try {
    payload = await cronResponse.json();
  } catch {
    payload = { raw: await cronResponse.text() };
  }

  return NextResponse.json(
    {
      success: cronResponse.ok,
      name,
      status: cronResponse.status,
      duration_ms: durationMs,
      triggeredBy: user.id,
      response: payload,
    },
    { status: cronResponse.ok ? 200 : cronResponse.status },
  );
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
