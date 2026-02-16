import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

// Server-side in-memory cache
let eventsCache: { data: unknown[]; expiresAt: number } | null = null;

const ONE_MIN = 60 * 1000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bust = searchParams.get('bust');

  if (!bust && eventsCache && Date.now() < eventsCache.expiresAt) {
    return NextResponse.json(eventsCache.data, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' },
    });
  }

  // Best-effort status sync
  try { await supabaseServer.rpc('sync_event_statuses'); } catch (err) { console.error('[API/Events] Sync event statuses failed:', err); }

  const { data, error } = await supabaseServer
    .from('events')
    .select('*')
    .order('starts_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  eventsCache = { data: data ?? [], expiresAt: Date.now() + ONE_MIN };
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' },
  });
}
