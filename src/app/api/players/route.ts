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
      .select('*')
      .order('price_change_24h', { ascending: false })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    moversCache.set(limit, { data: data ?? [], expiresAt: Date.now() + FIVE_MIN });
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    });
  }

  // All players
  if (playersCache && Date.now() < playersCache.expiresAt) {
    return NextResponse.json(playersCache.data, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    });
  }

  const { data, error } = await supabaseServer
    .from('players')
    .select('*')
    .order('last_name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  playersCache = { data: data ?? [], expiresAt: Date.now() + FIVE_MIN };
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
  });
}
