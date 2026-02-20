import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import ClubContent from './ClubContent';

type Props = { params: Promise<{ slug: string }> };

async function getClubMeta(slug: string) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data } = await sb
    .from('clubs')
    .select('name, logo_url, league, city')
    .eq('slug', slug)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const club = await getClubMeta(slug);
  if (!club) return { title: 'Club | BeScout' };

  const title = `${club.name} — BeScout`;
  const description = `${club.name} auf BeScout: Spieler, Fantasy, Trading. Werde Fan!`;

  return {
    title,
    description,
    openGraph: {
      title: `${club.name} auf BeScout`,
      description,
      ...(club.logo_url ? { images: [club.logo_url] } : {}),
    },
    twitter: {
      card: 'summary',
      title: `${club.name} auf BeScout`,
      description,
    },
  };
}

export default async function ClubSlugPage({ params }: Props) {
  const { slug } = await params;
  return <ClubContent slug={slug} />;
}
