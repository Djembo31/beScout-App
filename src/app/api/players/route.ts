import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { PLAYER_SELECT_COLS } from '@/lib/services/players';

// Server-side in-memory cache
let playersCache: { data: unknown[]; expiresAt: number } | null = null;
const moversCache = new Map<number, { data: unknown[]; expiresAt: number }>();

const FIVE_MIN = 5 * 60 * 1000;

export async function GET(req: NextRequest) {
  const movers = req.nextUrl.searchParams.get('movers');
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '5', 10);

  if (movers === 'true') {
    // Market Movers
    const cached = moversCache.get(limit);
    if (cached && Date.now() < cached.expiresAt) {
      return NextResponse.json(cached.data, {
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
      });
    }

    const { data, error } = await supabaseServer
      .from('players')
      .select(PLAYER_SELECT_COLS)
      .order('price_change_24h', { ascending: false })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    moversCache.set(limit, { data: data ?? [], expiresAt: Date.now() + FIVE_MIN });
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
}
