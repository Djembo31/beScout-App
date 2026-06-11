import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { PLAYER_SELECT_COLS } from '@/lib/services/players';
import { withLogger } from '@/lib/observability/apiLogger';

// Server-side in-memory cache
let playersCache: { data: unknown[]; expiresAt: number } | null = null;
const moversCache = new Map<number, { data: unknown[]; expiresAt: number }>();

const FIVE_MIN = 5 * 60 * 1000;

export const GET = withLogger('public.players', async (req) => {
  const movers = req.nextUrl.searchParams.get('movers');
  // Review F-06 (Slice 282): clamp — NaN→500er via .limit(NaN), riesige Werte
  // → 2×1000-Row-Payload + unbounded moversCache-Map-Growth pro Lambda.
  const rawLimit = parseInt(req.nextUrl.searchParams.get('limit') || '5', 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 5;

  if (movers === 'true') {
    // Market Movers
    const cached = moversCache.get(limit);
    if (cached && Date.now() < cached.expiresAt) {
      return NextResponse.json(cached.data, {
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
      });
    }

    // Slice 282: Top-N nach ABSOLUTER 24h-Änderung (Gainer + Loser), Zeros +
    // Liquidated raus — matcht TopMoversStrip-Semantik (vorher client-seitig
    // über die volle 4,2-MB-Liste sortiert). Endpoint hatte 0 Konsumenten,
    // Semantik-Änderung ist konsumentenfrei.
    const base = () =>
      supabaseServer
        .from('players')
        .select(PLAYER_SELECT_COLS)
        .neq('price_change_24h', 0)
        .eq('is_liquidated', false)
        .limit(limit);
    const [gainers, losers] = await Promise.all([
      base().order('price_change_24h', { ascending: false }),
      base().order('price_change_24h', { ascending: true }),
    ]);

    if (gainers.error) return NextResponse.json({ error: gainers.error.message }, { status: 500 });
    if (losers.error) return NextResponse.json({ error: losers.error.message }, { status: 500 });

    const merged = new Map<string, Record<string, unknown>>();
    for (const row of [...(gainers.data ?? []), ...(losers.data ?? [])] as unknown as Array<Record<string, unknown>>) {
      merged.set(row.id as string, row);
    }
    const data = Array.from(merged.values())
      .sort((a, b) => Math.abs(Number(b.price_change_24h)) - Math.abs(Number(a.price_change_24h)))
      .slice(0, limit);

    moversCache.set(limit, { data, expiresAt: Date.now() + FIVE_MIN });
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    });
  }

  // All players — select only columns used by dbToPlayer() to reduce payload (~30% smaller).
  // IMPORTANT: PostgREST caps single queries at 1000 rows; we have ~4500 players,
  // so we must paginate via .range() — otherwise Holdings on players with
  // last_name > alphabet-position-1000 are silently missing from client-side
  // dpc.owned enrichment → invisible in Marktplatz Bestand + Manager Kader.
  if (playersCache && Date.now() < playersCache.expiresAt) {
    return NextResponse.json(playersCache.data, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    });
  }

  const PAGE = 1000;
  const all: unknown[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabaseServer
      .from('players')
      .select(PLAYER_SELECT_COLS)
      .order('last_name')
      .range(offset, offset + PAGE - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }

  playersCache = { data: all, expiresAt: Date.now() + FIVE_MIN };
  return NextResponse.json(all, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
  });
});
