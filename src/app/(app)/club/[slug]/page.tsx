import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import ClubContent from './ClubContent';

type Props = { params: Promise<{ slug: string }> };

async function getClubMeta(slug: string) {
  const { data } = await supabaseAdmin
    .from('clubs')
    .select('name, logo_url, city')
    .eq('slug', slug)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations('meta');
  const { slug } = await params;
  const club = await getClubMeta(slug);
  if (!club) return { title: t('club') };

  const title = club.name;
  // Slice 294: i18n-driven public copy (was hardcoded DE incl. "Trading" — F-1).
  // TR visitors now get TR OG/Twitter cards; "Trading" replaced with compliance-safe
  // positioning per current-product-truth.md §4.
  const description = t('clubDescription', { name: club.name });

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
