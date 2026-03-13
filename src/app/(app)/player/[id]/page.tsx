import { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import PlayerContent from './PlayerContent';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const { data } = await supabaseAdmin
      .from('players')
      .select('first_name, last_name, position, club, photo_url, floor_price, price_change_24h')
      .eq('id', params.id)
      .single();
    if (data) {
      const name = `${data.first_name} ${data.last_name}`;
      const floor = data.floor_price ? `Floor: ${(data.floor_price / 100).toFixed(0)} bC` : '';
      const change = data.price_change_24h ? ` | ${data.price_change_24h >= 0 ? '+' : ''}${data.price_change_24h.toFixed(1)}%` : '';
      const desc = `${data.position} · ${data.club}${floor ? ` | ${floor}` : ''}${change}`;
      return {
        title: `${name} — ${data.position} | BeScout`,
        description: desc,
        openGraph: {
          title: `${name} | BeScout`,
          description: desc,
          ...(data.photo_url ? { images: [data.photo_url] } : {}),
        },
        twitter: {
          card: data.photo_url ? 'summary_large_image' : 'summary',
          title: `${name} | BeScout`,
          description: desc,
        },
      };
    }
  } catch (err) { console.error('[Player] generateMetadata failed:', err); }
  return { title: 'Spieler | BeScout' };
}

export default function PlayerDetailPage({ params }: { params: { id: string } }) {
  return <PlayerContent playerId={params.id} />;
}
