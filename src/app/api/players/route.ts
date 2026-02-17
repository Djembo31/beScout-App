import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

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
      .select('id,first_name,last_name,position,club,club_id,age,shirt_number,nationality,image_url,matches,goals,assists,perf_l5,perf_l15,dpc_total,dpc_available,floor_price,last_price,ipo_price,price_change_24h,status,success_fee_cap_cents,is_liquidated')
      .order('price_change_24h', { ascending: false })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    moversCache.set(limit, { data: data ?? [], expiresAt: Date.now() + FIVE_MIN });
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    });
  }

  // All players — select only columns used by dbToPlayer() to reduce payload (~30% smaller)
  if (playersCache && Date.now() < playersCache.expiresAt) {
    return NextResponse.json(playersCache.data, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    });
  }

  const PLAYER_COLS = [
    'id', 'first_name', 'last_name', 'position', 'club', 'club_id',
    'age', 'shirt_number', 'nationality', 'image_url',
    'matches', 'goals', 'assists',
    'perf_l5', 'perf_l15',
    'dpc_total', 'dpc_available',
    'floor_price', 'last_price', 'ipo_price', 'price_change_24h',
    'status', 'success_fee_cap_cents', 'is_liquidated',
  ].join(',');

  const { data, error } = await supabaseServer
    .from('players')
    .select(PLAYER_COLS)
    .order('last_name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  playersCache = { data: data ?? [], expiresAt: Date.now() + FIVE_MIN };
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
  });
}
