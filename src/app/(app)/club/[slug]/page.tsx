import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { dehydrate } from '@tanstack/react-query';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getServerQueryClient } from '@/lib/getServerQueryClient';
import { qk } from '@/lib/queries/keys';
import { getPlayersByClubId } from '@/lib/services/players';
import { getServerAuthState } from '@/lib/supabaseServerAuth';
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

  // Slice 493/494 (W6/D-03): getServerAuthState ZUERST (cache-dedupt mit layout, kein
  // Extra-Roundtrip) → liefert zwei Signale für den SSR-Hero:
  // - ssrConfirmedAnon (493): entkoppelt den authLoading-Gate-Term NUR für server-bestätigt-anon.
  //   `resolved` schützt vor Fehl-anon bei transientem getUser-Fehler (kein #418-Content-Swap).
  // - ssrUserId (494): scoped den Club-Prefetch auf den CLIENT-Key. Der authed Client nutzt
  //   `useClubBySlug(slug, userId)` → Key `bySlug(slug, userId)`; mit dem alten anon-Key
  //   (`undefined`) bliebe clubLoading true → authed /club-Hero bliebe Skeleton (493-Finding #3).
  //   `get_club_by_slug` ist SECDEF + nutzt `p_user_id` (nicht auth.uid()) → supabaseAdmin+userId
  //   liefert byte-identisch zum authed-Client (Parität, wie players via RLS {public}).
  const { user: serverUser, resolved: authResolved } = await getServerAuthState();
  const ssrUserId = serverUser?.id ?? null;
  const ssrConfirmedAnon = authResolved && serverUser === null;

  // W6 Phase 1 (Slice 471; Slice 494 user-scoped): Root-Query server-seitig prefetchen → der
  // ClubContent hydratet `useClubBySlug(slug, ssrUserId)` sofort aus dem dehydrierten State
  // → clubId instant da, gated Queries feuern ohne Roundtrip. `prefetchQuery` wirft NICHT →
  // RPC-Fehler degradiert still auf den bisherigen client-fetch (kein Page-Break).
  const queryClient = getServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: qk.clubs.bySlug(slug, ssrUserId ?? undefined),
    queryFn: async (): Promise<ClubWithAdmin | null> => {
      const { data, error } = await supabaseAdmin.rpc('get_club_by_slug', {
        p_slug: slug,
        p_user_id: ssrUserId,
      });
      if (error) throw new Error(error.message);
      return (data ?? null) as ClubWithAdmin | null;
    },
  });

  // Slice 487 (W6 load-delay): das LCP-Stadion-Hero früh preloaden. Die Club-Daten aus dem
  // Prefetch sind schon im Cache → stadium_image_url ohne Extra-Read lesen; bei Cache-Miss
  // (Club nicht gefunden) Fallback auf das slug-Asset (harmloser Preload). srcset spiegelt
  // ClubHeros <Image sizes="100vw" quality={60}> → Cache-Hit beim Render statt Doppel-Fetch.
  const club = queryClient.getQueryData<ClubWithAdmin | null>(qk.clubs.bySlug(slug, ssrUserId ?? undefined));
  const stadiumUrl = club?.stadium_image_url || `/stadiums/${slug}.jpg`;
  const stadiumSrcSet = DEVICE_SIZES.map((w) => `${stadiumOptimized(stadiumUrl, w)} ${w}w`).join(', ');

  // Slice 493 (W6/D-03): players mitprefetchen. Der ClubContent-loading-Gate
  // (useClubData:166 `clubLoading || (clubId && playersLoading)`) blockte sonst den Hero
  // im SSR (ClubContent:178 → ClubSkeleton statt Hero → LCP-Stadion-Bild NICHT im SSR-HTML
  // → render-delay 1486ms/67% trotz 486/487). players ist public (RLS players_select
  // qual=true) → supabaseAdmin liest dieselben Rows wie der ausgeloggte anon-Client →
  // Hydration-Parität. Key + Shape exakt via geteilter getPlayersByClubId (DI, SSOT, S461).
  // prefetchQuery wirft nicht → still degrade auf Client-Fetch bei Fehler (wie club oben).
  if (club?.id) {
    const clubId = club.id;
    await queryClient.prefetchQuery({
      queryKey: qk.players.byClub(clubId, true),
      queryFn: () => getPlayersByClubId(clubId, { activeOnly: true }, supabaseAdmin),
    });
  }

  // Slice 476: HydrationBoundary via Client-Wrapper (modern-Build) — direkter
  // Server-Import resolvte zum legacy-Build → Context-Mismatch zum modern
  // QueryClientProvider → »No QueryClient set« (Page-Crash seit 471). dehydrate()
  // bleibt server-seitig (build-agnostisches JSON-Result).
  return (
    <>
      <PreloadStadium href={stadiumOptimized(stadiumUrl, 1920)} srcSet={stadiumSrcSet} />
      <ClubHydration state={dehydrate(queryClient)}>
        <ClubContent slug={slug} ssrConfirmedAnon={ssrConfirmedAnon} />
      </ClubHydration>
    </>
  );
}
