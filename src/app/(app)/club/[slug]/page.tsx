import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { dehydrate } from '@tanstack/react-query';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getServerQueryClient } from '@/lib/getServerQueryClient';
import { qk } from '@/lib/queries/keys';
import type { ClubWithAdmin } from '@/types';
import ClubContent from './ClubContent';
import { ClubHydration } from './ClubHydration';
import { PreloadStadium } from './PreloadStadium';

type Props = { params: Promise<{ slug: string }> };

// Slice 487 (W6): next/image-deviceSizes (next.config-Default) für den Stadion-Preload-srcset.
const DEVICE_SIZES = [640, 750, 828, 1080, 1200, 1920, 2048, 3840];
const stadiumOptimized = (url: string, w: number) =>
  `/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=60`;

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

  // W6 Phase 1 (Slice 471): Root-Query server-seitig prefetchen → der logged-out
  // ClubContent hydratet `useClubBySlug(slug, undefined)` sofort aus dem dehydrierten
  // State (Key `['clubs', slug, undefined]` matcht), clubId ist instant da, gated
  // Queries feuern ohne Roundtrip-Wartezeit. `prefetchQuery` wirft NICHT → ein
  // RPC-Fehler degradiert still auf den bisherigen client-fetch (kein Page-Break).
  const queryClient = getServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: qk.clubs.bySlug(slug, undefined),
    queryFn: async (): Promise<ClubWithAdmin | null> => {
      const { data, error } = await supabaseAdmin.rpc('get_club_by_slug', {
        p_slug: slug,
        p_user_id: null,
      });
      if (error) throw new Error(error.message);
      return (data ?? null) as ClubWithAdmin | null;
    },
  });

  // Slice 487 (W6 load-delay): das LCP-Stadion-Hero früh preloaden. Die Club-Daten aus dem
  // 471-Prefetch sind schon im Cache → stadium_image_url ohne Extra-Read lesen; bei Cache-Miss
  // (Club nicht gefunden) Fallback auf das slug-Asset (harmloser Preload). srcset spiegelt
  // ClubHeros <Image sizes="100vw" quality={60}> → Cache-Hit beim Render statt Doppel-Fetch.
  const club = queryClient.getQueryData<ClubWithAdmin | null>(qk.clubs.bySlug(slug, undefined));
  const stadiumUrl = club?.stadium_image_url || `/stadiums/${slug}.jpg`;
  const stadiumSrcSet = DEVICE_SIZES.map((w) => `${stadiumOptimized(stadiumUrl, w)} ${w}w`).join(', ');

  // Slice 476: HydrationBoundary via Client-Wrapper (modern-Build) — direkter
  // Server-Import resolvte zum legacy-Build → Context-Mismatch zum modern
  // QueryClientProvider → »No QueryClient set« (Page-Crash seit 471). dehydrate()
  // bleibt server-seitig (build-agnostisches JSON-Result).
  return (
    <>
      <PreloadStadium href={stadiumOptimized(stadiumUrl, 1920)} srcSet={stadiumSrcSet} />
      <ClubHydration state={dehydrate(queryClient)}>
        <ClubContent slug={slug} />
      </ClubHydration>
    </>
  );
}
