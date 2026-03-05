import { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import PlayerContent from './PlayerContent';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const { data } = await supabaseAdmin.from('players').select('first_name, last_name, position, club').eq('id', params.id).single();
    if (data) {
      const name = `${data.first_name} ${data.last_name}`;
      return {
        title: `${name} - ${data.position}`,
        openGraph: { title: `${name} | BeScout`, description: `${data.position} · ${data.club}` },
      };
    }
  } catch (err) { console.error('[Player] generateMetadata failed:', err); }
  return { title: 'Spieler' };
}

export default function PlayerDetailPage({ params }: { params: { id: string } }) {
  return <PlayerContent playerId={params.id} />;
}
