/**
 * Slice 076 — Export Players as CSV for manual edit
 *
 * GET /api/admin/players-csv/export
 * Returns CSV: player_id,full_name,club,position,market_value_eur,contract_end
 * Filtered to Stammkader (shirt_number IS NOT NULL).
 *
 * Auth: session + platform_admins.role IN ('superadmin', 'admin').
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

function csvEscape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  // Quote if contains comma, newline, or quote
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
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

  // Fetch all Stammkader with club join
  const { data: players, error } = await supabaseAdmin
    .from('players')
    .select('id, first_name, last_name, position, market_value_eur, contract_end, clubs!inner(name)')
    .not('shirt_number', 'is', null)
    .order('clubs(name)', { ascending: true })
    .order('last_name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Build CSV
  const header = 'player_id,full_name,club,position,market_value_eur,contract_end';
  const rows = ((players ?? []) as unknown as Array<{
    id: string;
    first_name: string;
    last_name: string;
    position: string;
    market_value_eur: number | null;
    contract_end: string | null;
    clubs: { name: string };
  }>).map((p) => {
    const fullName = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
    return [
      csvEscape(p.id),
      csvEscape(fullName),
      csvEscape(p.clubs?.name ?? ''),
      csvEscape(p.position),
      csvEscape(p.market_value_eur),
      csvEscape(p.contract_end),
    ].join(',');
  });

  const csv = [header, ...rows].join('\n');
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="players-${date}.csv"`,
    },
  });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
