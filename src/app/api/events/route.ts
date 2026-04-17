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
      headers: { 'Cache-Control': 'private, no-cache' },
    });
  }

  // Slice 036: status-sync wird von pg_cron 'sync-event-statuses' jede Minute uebernommen
  // (vorher: anon-key call hier → 42501 permission denied wiederholt in postgres-Logs).
  const { data, error } = await supabaseServer
    .from('events')
    .select('*, clubs:club_id(name, logo_url)')
    .order('starts_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  eventsCache = { data: data ?? [], expiresAt: Date.now() + ONE_MIN };
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'private, no-cache' },
  });
}
