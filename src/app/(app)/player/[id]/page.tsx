import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import PlayerContent from './PlayerContent';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const sb = createClient(supabaseUrl, supabaseAnonKey);
    const { data } = await sb.from('players').select('first_name, last_name, position, club').eq('id', params.id).single();
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
