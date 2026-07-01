'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import {
  Users, ChevronRight, ChevronLeft,
  Building2, MessageCircle, FileText, Star,
  LayoutGrid, List,
  Settings,
  ShoppingBag,
  Lock,
} from 'lucide-react';
import { Card, Button, ErrorState, TabBar, SearchInput, PosFilter, SortPills } from '@/components/ui';
import dynamic from 'next/dynamic';
// Slice 116 CLS-Fix: fixed-height Skeleton um Layout-Shift beim Mount zu vermeiden.
const SponsorBanner = dynamic(() => import('@/components/player/detail/SponsorBanner'), {
  ssr: false,
});
import { PlayerIdentity } from '@/components/player';
import { PlayerDisplay } from '@/components/player/PlayerRow';
import { useUser } from '@/components/providers/AuthProvider';
import { useFollowedClubs } from '@/lib/hooks/useFollowedClubs';
import { useClubStanding } from '@/lib/queries/misc';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queries/keys';
import { formatTimeAgo } from '@/components/community/PostCard';
import { ClubHero } from '@/components/club/ClubHero';
import { ClubStatsBar } from '@/components/club/ClubStatsBar';
import { ClubStandingCard } from '@/components/club/ClubStandingCard';
import { ActiveOffersSection } from '@/components/club/sections/ActiveOffersSection';
import { SquadPreviewSection } from '@/components/club/sections/SquadPreviewSection';
import { MostOwnedSection } from '@/components/club/sections/MostOwnedSection';
import { ClubFixturesStrip } from '@/components/club/sections/ClubFixturesStrip';
import { MitmachenSection } from '@/components/club/sections/MitmachenSection';
import { ClubEventsSection } from '@/components/club/sections/ClubEventsSection';
import { MembershipSection } from '@/components/club/sections/MembershipSection';
import { CollectionProgress } from '@/components/club/sections/CollectionProgress';
import { RecentActivitySection } from '@/components/club/sections/RecentActivitySection';
import { FeatureShowcase } from '@/components/club/sections/FeatureShowcase';
import { PublicClubView } from '@/components/club/sections/PublicClubView';
import { SpielplanTab } from '@/components/club/sections/SpielplanTab';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import FanRankBadge from '@/components/ui/FanRankBadge';
import FanRankOverview from '@/components/gamification/FanRankOverview';
import ClubFanLeaderboard from '@/components/gamification/ClubFanLeaderboard';
import { ClubSkeleton } from '@/components/club/ClubSkeleton';
import { SquadOverviewWidget } from '@/components/club/SquadOverviewWidget';
import { PickRateBadge } from '@/components/club/PickRateBadge';
import { useEvents, useLeagueActiveGameweek } from '@/features/fantasy/queries/events';
import { useEventPlayerPickRates } from '@/features/fantasy/queries/fantasyPicker';
import { FixtureRow, SeasonSummary, NextMatchCard, LastResultsCard } from '@/components/club/FixtureCards';
import type { FixtureFilter } from '@/components/club/FixtureCards';
import type { Pos, Fixture } from '@/types';
import { useClubData, useClubActions } from '@/components/club/hooks';
import type { ClubTab, SpielerSort, SquadView } from '@/components/club/hooks';

// ============================================
// REVEAL WRAPPER
// ============================================

function RevealSection({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, revealed } = useScrollReveal({ delay });
  return (
    <div
      ref={ref}
      className={cn(
        'transition-colors duration-500 ease-out',
        revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5',
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================
// TABS CONFIG
// ============================================

const TABS: { id: ClubTab; label: string }[] = [
  { id: 'uebersicht', label: 'overview' },
  { id: 'spieler', label: 'players' },
  { id: 'spielplan', label: 'fixtures' },
  { id: 'mehr', label: 'more' },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function ClubContent({ slug, ssrConfirmedAnon = false }: { slug: string; ssrConfirmedAnon?: boolean }) {
  const { user, loading: authLoading } = useUser();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const t = useTranslations('club');
  const tcom = useTranslations('community');
  const tg = useTranslations('gamification');
  const { data: followedClubs = [] } = useFollowedClubs();

  // ── Local UI State ──
  const [tab, setTab] = useState<ClubTab>('uebersicht');
  const [posFilter, setPosFilter] = useState<Pos | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<SpielerSort>('perf');
  const [spielerQuery, setSpielerQuery] = useState('');
  const [squadView, setSquadView] = useState<SquadView>('cards');
  const [fixtureFilter, setFixtureFilter] = useState<FixtureFilter>('all');
  const [expandedGw, setExpandedGw] = useState<Set<number>>(new Set());
  const [autoExpandedGw, setAutoExpandedGw] = useState(true);

  // Hydrate squadView from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bescout-squad-view') as SquadView | null;
      if (saved) setSquadView(saved);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { localStorage.setItem('bescout-squad-view', squadView); }, [squadView]);

  // ── Data + Actions Hooks ──
  const data = useClubData({ slug, userId, filters: { posFilter, sortBy, spielerQuery } });
  const { isFollowing, followerCount, followLoading, handleFollow } = useClubActions({
    club: data.club,
    isFollowingData: data.isFollowingData,
    followerCountData: data.followerCountData,
  });

  const {
    club, clubId, players, loading, dataError, notFound,
    totalVolume24h, totalDpcFloat, avgPerf, userClubDpc,
    filteredPlayers, posCounts,
    clubIpos, clubEvents, ownedPlayerIds, recentTrades, formResults,
    clubFixtures, emptySections, showFeatureShowcase,
    clubNews, clubResearch,
    fanRanking, fanRankingLoading, clubPrestige,
  } = data;

  // Slice 149: League-Standings (Tabellenplatz).
  // Pass undefined clubId when unauthenticated — RLS blocks anon so query would fail + 5min invalid-cache.
  const { data: clubStanding } = useClubStanding(user ? clubId : undefined);

  // Slice 204 (K-03) — Squad-Tab Fantasy-Pick-Rate Map.
  // D46-Reuse: useEventPlayerPickRates aus Slice 195e (anonymized aggregate, RLS-bypass).
  // Picks groesstes laufendes/oeffnendes League-Event fuer aktuelle GW; ohne Event = leere Map.
  // Slice 251 Wave 1: pass club.league_id so we read leagues.active_gameweek per league (not clubs MIN).
  const { data: leagueGw } = useLeagueActiveGameweek(club?.league_id ?? null);
  const { data: allEvents = [] } = useEvents();
  const currentEventId = useMemo<string | null>(() => {
    if (!leagueGw) return null;
    const eligible = allEvents.filter(
      (e) =>
        e.gameweek === leagueGw &&
        (e.status === 'registering' || e.status === 'late-reg' || e.status === 'running'),
    );
    if (eligible.length === 0) return null;
    eligible.sort((a, b) => (b.current_entries ?? 0) - (a.current_entries ?? 0));
    return eligible[0].id;
  }, [allEvents, leagueGw]);
  const { data: pickRates } = useEventPlayerPickRates(currentEventId);
  const pickRateMap = useMemo(() => {
    const m = new Map<string, number>();
    if (pickRates) {
      for (const r of pickRates) m.set(r.player_id, r.pct);
    }
    return m;
  }, [pickRates]);

  // Slice 149 Fix #4: standing.form (from API-Football standings) has canonical priority
  // over formResults (derived from fixtures). Prevents two-row-form-drift.
  const effectiveFormResults: ('W' | 'D' | 'L')[] = clubStanding?.form
    ? clubStanding.form.split('').slice(-5).filter((c): c is 'W' | 'D' | 'L' => c === 'W' || c === 'D' || c === 'L')
    : formResults;

  // ── Loading / Error Guards ──
  // Slice 493 (W6/D-03): `ssrConfirmedAnon` (page.tsx, getServerAuthState resolved+null)
  // entkoppelt den authLoading-Term NUR für server-bestätigt-ausgeloggte Besucher →
  // ClubContent rendert den (public) Hero ins SSR-HTML statt ClubSkeleton (das
  // Stadion-<Image> = LCP-Element landet damit im initialen HTML). `loading` (club+players,
  // beide via page.tsx geprefetcht) bleibt der Gate-Term. Eingeloggt/unresolved: unverändert.
  if ((authLoading && !ssrConfirmedAnon) || loading) return <ClubSkeleton />;

  if (notFound) {
    return (
      <div className="max-w-xl mx-auto mt-20 text-center">
        <Building2 className="size-16 mx-auto mb-4 text-white/20" />
        <h2 className="text-2xl font-black text-balance mb-2">{t('notFoundTitle')}</h2>
        <p className="text-white/50 text-pretty mb-6">{t('notFoundDesc', { slug })}</p>
        <Link href="/">
          <Button variant="outline">{t('backHome')}</Button>
        </Link>
      </div>
    );
  }

  if (dataError || !club) {
    return (
      <div className="max-w-xl mx-auto mt-20">
        <ErrorState onRetry={() => {
          queryClient.invalidateQueries({ queryKey: qk.clubs.bySlug(slug, userId) });
          if (clubId) queryClient.invalidateQueries({ queryKey: qk.players.byClub(clubId) });
        }} />
      </div>
    );
  }

  // ── Public view (unauthenticated) ──
  if (!user) {
    return (
      <PublicClubView
        club={club}
        players={players}
        followerCount={followerCount}
        totalVolume24h={totalVolume24h}
        totalDpcFloat={totalDpcFloat}
        avgPerf={avgPerf}
        formResults={effectiveFormResults}
        clubIpos={clubIpos}
        clubFixtures={clubFixtures}
        clubId={clubId}
        clubPrestige={clubPrestige}
      />
    );
  }

  const clubColor = club.primary_color || '#006633';

  return (
    <div
      className="max-w-[1200px] mx-auto"
      style={{
        '--club-primary': clubColor,
        '--club-secondary': club.secondary_color || '#333',
        '--club-glow': `${clubColor}4D`,
      } as React.CSSProperties}
    >

      {/* CLUB SWITCHER BAR — shows followed clubs as pills + discover link */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto scrollbar-hide -mx-1 px-1">
        <Link
          href="/clubs"
          className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-white/50 hover:text-white bg-surface-subtle hover:bg-surface-elevated border border-divider transition-colors"
        >
          <ChevronLeft aria-hidden="true" className="size-3" />
          {t('allClubs')}
        </Link>
        {followedClubs.filter(c => c.slug !== slug).map((c) => (
          <Link
            key={c.id}
            href={`/club/${c.slug}`}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white/60 hover:text-white bg-surface-subtle hover:bg-surface-elevated border border-divider transition-colors"
          >
            {c.logo_url ? (
              <Image src={c.logo_url} alt="" width={14} height={14} className="size-3.5 object-contain rounded-sm" />
            ) : (
              <span className="size-3.5 rounded-sm flex items-center justify-center text-[8px] font-black" style={{ backgroundColor: `${c.primary_color ?? '#FFD700'}20`, color: c.primary_color ?? '#FFD700' }}>
                {c.short?.slice(0, 2)}
              </span>
            )}
            {c.short ?? c.name.slice(0, 6)}
          </Link>
        ))}
      </div>

      {/* HERO SECTION */}
      <ClubHero
        club={club}
        followerCount={followerCount}
        isFollowing={isFollowing}
        followLoading={followLoading}
        onFollow={handleFollow}
        totalVolume24h={totalVolume24h}
        playerCount={players.length}
        buyablePlayers={clubIpos.length}
        totalDpcFloat={totalDpcFloat}
        avgPerf={avgPerf}
        formResults={effectiveFormResults}
        prestigeTier={clubPrestige?.tier}
      />

      {/* STATS BAR (mobile only — desktop stats in hero) */}
      <div className="mb-6">
        <ClubStatsBar
          totalVolume24h={totalVolume24h}
          totalDpcFloat={totalDpcFloat}
          avgPerf={avgPerf}
          followerCount={followerCount}
          playerCount={players.length}
          clubColor={clubColor}
          formResults={effectiveFormResults}
          prestigeTier={clubPrestige?.tier}
        />
      </div>

      {/* Fan Rank Badge — authenticated users only */}
      {userId && fanRanking && (
        <div className="mb-4 flex items-center gap-2">
          <FanRankBadge
            tier={fanRanking.rank_tier}
            clubName={club.name}
            size="md"
          />
        </div>
      )}

      {/* SPONSOR: CLUB HERO */}
      <SponsorBanner placement="club_hero" clubId={club.id} />

      {/* TABS + Admin Link */}
      <div className="flex items-center gap-2 mb-6">
        <div className="flex-1">
          <TabBar tabs={TABS.map(tab => ({ ...tab, label: t(tab.label) }))} activeTab={tab} onChange={(id) => setTab(id as ClubTab)} accentColor={clubColor} />
        </div>
        {club.is_admin && (
          <Link
            href={`/club/${slug}/admin`}
            className="flex-shrink-0 px-3 py-2 text-sm font-semibold text-white/60 hover:text-white transition-colors whitespace-nowrap flex items-center gap-1.5"
          >
            <Settings className="size-4" />
            <span className="hidden md:inline">{t('admin')}</span>
          </Link>
        )}
      </div>

      {/* ========== TAB: UEBERSICHT (Slice 297 — Lead-Story; sekundäre Module → Tab „Mehr"/Spielplan) ========== */}
      {tab === 'uebersicht' && (
        <div className="space-y-6">
          {/* Naechste Begegnung */}
          <RevealSection>
            {clubId && <NextMatchCard fixtures={clubFixtures} clubId={clubId} club={club} />}
          </RevealSection>

          {/* Tabellenplatz (Slice 149) — nur wenn Standings-Daten existieren */}
          {clubStanding && (
            <RevealSection delay={25}>
              <ClubStandingCard standing={clubStanding} clubColor={clubColor} />
            </RevealSection>
          )}

          {/* Dein Spieler-Bestand */}
          {userClubDpc > 0 && (
            <RevealSection delay={50}>
              <Card className="p-4 bg-gold/[0.06] border-gold/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="size-6 text-gold" />
                    <div>
                      <div className="font-black">{userClubDpc} {t('players')}</div>
                      <div className="text-xs text-white/50">{t('yourHoldingsDesc')}</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setTab('spieler')}>
                    {t('squad')}
                  </Button>
                </div>
              </Card>
            </RevealSection>
          )}

          {/* Aktive Angebote (IPOs) */}
          <RevealSection delay={75}>
            <ActiveOffersSection ipos={clubIpos} players={players} clubColor={clubColor} />
          </RevealSection>

          {/* Trending Spieler + Collection Progress */}
          <RevealSection delay={100}>
            <SquadPreviewSection players={players} ownedPlayerIds={ownedPlayerIds} clubColor={clubColor} onViewAll={() => setTab('spieler')} />
          </RevealSection>

          {/* Community-Lead: thin-Club (≥2 leere Sektionen) → FeatureShowcase als
              Onboarding-Fallback, sonst Mitmachen + Events. Slice 297: bleibt im
              Übersicht-Tab (FeatureShowcase ist prominenter Onboarding-Hook);
              „Letzte Trades" wandert in den Tab „Mehr". */}
          {showFeatureShowcase ? (
            <RevealSection delay={125}>
              <FeatureShowcase clubColor={clubColor} />
            </RevealSection>
          ) : (
            <>
              {/* Mitmachen (Scout + Bounties + Votes + Leaderboard) */}
              {clubId && (
                <RevealSection delay={125}>
                  <MitmachenSection clubId={clubId} userId={userId} clubColor={clubColor} />
                </RevealSection>
              )}

              {/* Club Events */}
              {clubId && (
                <RevealSection delay={150}>
                  <ClubEventsSection events={clubEvents} clubColor={clubColor} />
                </RevealSection>
              )}
            </>
          )}

          {/* Club-Mitgliedschaft */}
          <RevealSection delay={175}>
            {clubId && (
              <MembershipSection
                userId={userId}
                clubId={clubId}
                clubColor={clubColor}
                onSubscribed={() => {
                  queryClient.invalidateQueries({ queryKey: qk.clubs.subscription(userId!, clubId) });
                }}
              />
            )}
          </RevealSection>
        </div>
      )}

      {/* ========== TAB: SPIELER ========== */}
      {tab === 'spieler' && (
        <div className="space-y-4">
          {/* Collection Progress */}
          <CollectionProgress owned={ownedPlayerIds.size} total={players.length} clubColor={clubColor} />

          {/* Filters + View Toggle */}
          <div className="flex flex-col gap-3">
            <SearchInput value={spielerQuery} onChange={setSpielerQuery} placeholder={t('searchPlayers')} />
            <div className="flex items-center justify-between gap-3">
              <PosFilter selected={posFilter} onChange={setPosFilter} showAll allCount={posCounts['ALL']} counts={posCounts} />
              <div className="flex items-center gap-3">
                <SortPills
                  options={[
                    { id: 'perf', label: t('sortPerf') },
                    { id: 'price', label: t('sortPrice') },
                    { id: 'change', label: t('sortChange') },
                  ]}
                  active={sortBy}
                  onChange={(id) => setSortBy(id as SpielerSort)}
                />
                {/* Slice 198 Track A #18: a11y-hardened segmented icon-toggle (Button-Component wuerde min-h-[44px] erzwingen + Layout sprengen) */}
                <div role="group" aria-label={t('squadViewToggle')} className="flex-shrink-0 flex items-center gap-0.5 bg-surface-subtle rounded-lg p-0.5 border border-divider">
                  <button
                    type="button"
                    onClick={() => setSquadView('cards')}
                    aria-pressed={squadView === 'cards'}
                    aria-label={t('viewCards')}
                    className={cn('p-1.5 rounded-md transition-colors', squadView === 'cards' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50')}
                  >
                    <LayoutGrid className="size-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSquadView('compact')}
                    aria-pressed={squadView === 'compact'}
                    aria-label={t('viewRows')}
                    className={cn('p-1.5 rounded-md transition-colors', squadView === 'compact' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50')}
                  >
                    <List className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <SponsorBanner placement="club_players" clubId={club.id} className="mb-3" />
          <div className="text-xs text-white/40 px-1">{t('playerCount', { count: filteredPlayers.length })}</div>

          {/* Player display based on view mode */}
          {squadView === 'cards' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredPlayers.map((player) => {
                const pickRate = pickRateMap.get(player.id);
                return (
                  <div key={player.id} className="relative">
                    <PlayerDisplay variant="card" player={player} showActions={false} />
                    {pickRate !== undefined && <PickRateBadge pct={pickRate} />}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredPlayers.map((player) => {
                const pickRate = pickRateMap.get(player.id);
                return (
                  <div key={player.id} className="relative">
                    <PlayerDisplay variant="compact" player={player} showActions={false} />
                    {pickRate !== undefined && <PickRateBadge pct={pickRate} />}
                  </div>
                );
              })}
            </div>
          )}

          {filteredPlayers.length === 0 && (
            <div className="text-center text-white/40 py-12">
              {t('noPlayersInCategory')}
            </div>
          )}
        </div>
      )}

      {/* ========== TAB: SPIELPLAN (Slice 297 — + FDR-Strip + Letzte Ergebnisse, fixture-thematisch) ========== */}
      {tab === 'spielplan' && clubId && (
        <div className="space-y-6">
          {/* Slice 197e — 5-GW-Forward FDR-Strip (Wildcard-Timing-Helper) */}
          <RevealSection>
            <ClubFixturesStrip clubId={clubId} count={5} />
          </RevealSection>

          <RevealSection delay={25}>
            <SpielplanTab
              clubFixtures={clubFixtures}
              clubId={clubId}
              clubColor={club.primary_color || '#FFD700'}
              fixtureFilter={fixtureFilter}
              setFixtureFilter={setFixtureFilter}
              expandedGw={expandedGw}
              setExpandedGw={setExpandedGw}
              autoExpandedGw={autoExpandedGw}
              setAutoExpandedGw={setAutoExpandedGw}
            />
          </RevealSection>

          {/* Letzte Ergebnisse */}
          <RevealSection delay={50}>
            <LastResultsCard fixtures={clubFixtures} clubId={clubId} />
          </RevealSection>
        </div>
      )}

      {/* ========== TAB: MEHR (Slice 297 — sekundäre/retrospektive/Info-Module) ========== */}
      {tab === 'mehr' && (
        <div className="space-y-6">
          {/* Slice 199 K-02 — Beliebteste Spieler (Most-Owned, anonymized) */}
          {clubId && (
            <RevealSection>
              <MostOwnedSection clubId={clubId} clubColor={clubColor} />
            </RevealSection>
          )}

          {/* Letzte Trades */}
          <RevealSection delay={25}>
            <RecentActivitySection trades={recentTrades} clubColor={clubColor} />
          </RevealSection>

          {/* Fan-Rang Overview — Gamification v5 */}
          {userId && (
            <RevealSection delay={50}>
              <FanRankOverview
                ranking={fanRanking ?? null}
                clubName={club.name}
                clubId={club.id}
                isLoading={fanRankingLoading}
              />
            </RevealSection>
          )}

          {/* Club-Fan-Treue-Board (W2-B / Slice 349) — Top-Fans des Vereins */}
          {clubId && (
            <RevealSection delay={60}>
              <ClubFanLeaderboard clubId={clubId} currentUserId={userId} />
            </RevealSection>
          )}

          {/* Club-Neuigkeiten */}
          {clubNews.length > 0 && (
            <RevealSection delay={75}>
              <Card className="p-4 md:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MessageCircle className="size-5" style={{ color: clubColor }} />
                  <h2 className="font-black text-balance">{t('news')}</h2>
                </div>
                <div className="space-y-3">
                  {clubNews.map(news => {
                    const tierLabel = news.min_fan_rank_tier
                      ? tg(`fanRank${news.min_fan_rank_tier.charAt(0).toUpperCase()}${news.min_fan_rank_tier.slice(1)}`)
                      : '';
                    return (
                      <div key={news.id} className="p-3 bg-gold/[0.03] rounded-xl border border-gold/15">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-gold/10 text-gold border border-gold/20">
                            {tcom('clubNewsLabel')}
                          </span>
                          {news.min_fan_rank_tier && news.can_view && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/25">
                              <Lock className="size-2.5" aria-hidden="true" />
                              {t('exclusiveBadge', { tier: tierLabel })}
                            </span>
                          )}
                          <span className="text-[10px] text-white/30">{formatTimeAgo(news.created_at)}</span>
                        </div>
                        {news.can_view ? (
                          <>
                            <p className="text-sm text-white/80 leading-relaxed">{news.content}</p>
                            {news.author_handle && (
                              <div className="flex items-center gap-3 mt-2 text-[10px] text-white/30">
                                <span>{news.author_handle}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-start gap-2.5 py-1">
                            <Lock className="size-4 text-purple-300/70 shrink-0 mt-0.5" aria-hidden="true" />
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-white/70">{t('exclusiveLockedTitle')}</p>
                              <p className="text-xs text-white/40 mt-0.5 text-pretty">{t('exclusiveLockedHint', { tier: tierLabel })}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </RevealSection>
          )}

          {/* Club Research */}
          {clubResearch.length > 0 && (
            <RevealSection delay={100}>
              <Card className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="size-5" style={{ color: clubColor }} />
                    <h2 className="font-black text-balance">{t('clubResearch')}</h2>
                  </div>
                  <Link href="/community?tab=research" className="text-[10px] text-white/40 hover:text-white/60 transition-colors">
                    {t('allResearch')}
                  </Link>
                </div>
                <div className="space-y-1.5">
                  {clubResearch.map(post => (
                    <Link key={post.id} href={`/community?post=${post.id}`}>
                      <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-subtle transition-colors">
                        <div className="flex-shrink-0 w-5 text-center">
                          {post.call === 'Bullish' ? <span className="text-green-500 font-bold text-sm">&#9650;</span>
                            : post.call === 'Bearish' ? <span className="text-red-400 font-bold text-sm">&#9660;</span>
                            : <span className="text-white/40 text-sm">&#9679;</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            {post.player_name && <span className="text-[10px] font-bold text-white/70">{post.player_name}</span>}
                            <span className="text-[10px] text-white/30">{post.author_display_name || post.author_handle}</span>
                          </div>
                          <div className="text-sm text-white/60 truncate">{post.title}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {post.ratings_count > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[10px]">
                              <Star className="size-2.5 text-gold fill-gold" />
                              <span className="text-white/40 font-mono tabular-nums">{post.avg_rating.toFixed(1)}</span>
                            </span>
                          )}
                          <span className="text-[10px] text-white/30 font-mono tabular-nums">{post.unlock_count}x</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>
            </RevealSection>
          )}

          {/* Club Info */}
          <RevealSection delay={125}>
            <Card className="p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="size-5 text-white/50" />
                <h2 className="font-black text-balance">{t('clubInfo')}</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {club.stadium && (
                  <div className="bg-surface-base rounded-xl p-3">
                    <div className="text-xs text-white/50 mb-1">{t('stadium')}</div>
                    <div className="font-bold text-sm">{club.stadium}</div>
                  </div>
                )}
                {club.city && (
                  <div className="bg-surface-base rounded-xl p-3">
                    <div className="text-xs text-white/50 mb-1">{t('city')}</div>
                    <div className="font-bold text-sm">{club.city}</div>
                  </div>
                )}
                <div className="bg-surface-base rounded-xl p-3">
                  <div className="text-xs text-white/50 mb-1">{t('league')}</div>
                  <div className="font-bold text-sm">{club.league}</div>
                </div>
                <div className="bg-surface-base rounded-xl p-3">
                  <div className="text-xs text-white/50 mb-1">{t('players')}</div>
                  <div className="font-bold tabular-nums text-sm text-green-500">{players.length}</div>
                </div>
              </div>
            </Card>
          </RevealSection>
        </div>
      )}

    </div>
  );
}
