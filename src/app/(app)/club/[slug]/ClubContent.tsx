'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  Users, ChevronRight,
  Building2, MessageCircle, FileText, Star,
  LayoutGrid, List,
  Settings, ChevronDown,
  Home, Plane, ShoppingBag,
} from 'lucide-react';
import { Card, Button, ErrorState, TabBar, SearchInput, PosFilter, SortPills } from '@/components/ui';
import dynamic from 'next/dynamic';
const SponsorBanner = dynamic(() => import('@/components/player/detail/SponsorBanner'), { ssr: false });
import { PlayerIdentity } from '@/components/player';
import { PlayerDisplay } from '@/components/player/PlayerRow';
import { useUser } from '@/components/providers/AuthProvider';
import { dbToPlayers, centsToBsd } from '@/lib/services/players';
import { toggleFollowClub } from '@/lib/services/club';
import { cn } from '@/lib/utils';
import { resolveExpiredResearch, getResearchPosts } from '@/lib/services/research';
import { useClubBySlug } from '@/lib/queries/misc';
import { usePlayersByClub } from '@/lib/queries/players';
import { useClubFollowerCount, useIsFollowingClub } from '@/lib/queries/social';
import { useHoldings } from '@/lib/queries/holdings';
import { useClubFixtures } from '@/lib/queries/fixtures';
import { queryClient } from '@/lib/queryClient';
import { qk } from '@/lib/queries/keys';
import { useToast } from '@/components/providers/ToastProvider';
import { getPosts } from '@/lib/services/posts';
import { formatTimeAgo } from '@/components/community/PostCard';
import { useClubPrestige } from '@/lib/queries/scouting';
import type { Player, Pos, Fixture, PostWithAuthor, ResearchPostWithAuthor } from '@/types';
import { useActiveIpos } from '@/lib/queries/ipos';
import { useEvents } from '@/lib/queries/events';
import { ClubHero } from '@/components/club/ClubHero';
import { ClubStatsBar } from '@/components/club/ClubStatsBar';
import { ActiveOffersSection } from '@/components/club/sections/ActiveOffersSection';
import { SquadPreviewSection } from '@/components/club/sections/SquadPreviewSection';
import { MitmachenSection } from '@/components/club/sections/MitmachenSection';
import { ClubEventsSection } from '@/components/club/sections/ClubEventsSection';
import { MembershipSection } from '@/components/club/sections/MembershipSection';
import { CollectionProgress } from '@/components/club/sections/CollectionProgress';
import { RecentActivitySection } from '@/components/club/sections/RecentActivitySection';
import { FeatureShowcase } from '@/components/club/sections/FeatureShowcase';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useClubRecentTrades } from '@/lib/queries/trades';
import { useFanRanking } from '@/lib/queries/fanRanking';
import FanRankBadge from '@/components/ui/FanRankBadge';
import FanRankOverview from '@/components/gamification/FanRankOverview';
import { ClubSkeleton } from '@/components/club/ClubSkeleton';
import { SquadOverviewWidget } from '@/components/club/SquadOverviewWidget';
import { FixtureRow, SeasonSummary, NextMatchCard, LastResultsCard, getFixtureResult, resultBadge } from '@/components/club/FixtureCards';
import type { FixtureFilter } from '@/components/club/FixtureCards';

// ============================================
// REVEAL WRAPPER
// ============================================

function RevealSection({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, revealed } = useScrollReveal({ delay });
  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-500 ease-out',
        revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5',
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================
// TYPES
// ============================================

type ClubTab = 'uebersicht' | 'spieler' | 'spielplan';

// ============================================
// TABS CONFIG
// ============================================

const TABS: { id: ClubTab; label: string }[] = [
  { id: 'uebersicht', label: 'overview' },
  { id: 'spieler', label: 'players' },
  { id: 'spielplan', label: 'fixtures' },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function ClubContent({ slug }: { slug: string }) {
  const { user, refreshProfile, loading: authLoading } = useUser();
  const { addToast } = useToast();
  const userId = user?.id;

  // ── React Query Hooks (ALL before early returns) ──
  const { data: club, isLoading: clubLoading, isError: clubError } = useClubBySlug(slug, userId);
  const clubId = club?.id;
  const { data: dbPlayersRaw = [], isLoading: playersLoading, isError: playersError } = usePlayersByClub(clubId);
  const { data: followerCountData = 0 } = useClubFollowerCount(clubId);
  const { data: isFollowingData = false } = useIsFollowingClub(userId, clubId);
  const { data: dbHoldings = [] } = useHoldings(userId);
  const { data: clubFixtures = [] } = useClubFixtures(clubId);
  const { data: clubPrestige } = useClubPrestige(clubId);
  const { data: activeIpos = [] } = useActiveIpos();
  const { data: allEvents = [] } = useEvents();
  const { data: clubTradesRaw = [] } = useClubRecentTrades(clubId, 5);
  const { data: fanRanking, isLoading: fanRankingLoading } = useFanRanking(userId, clubId);

  // Resolve expired research (fire-and-forget)
  useEffect(() => {
    resolveExpiredResearch().catch(err => console.error('[Club] Resolve expired research failed:', err));
  }, []);

  const t = useTranslations('club');
  const tc = useTranslations('common');
  const tcom = useTranslations('community');

  // ---- Derived data from hooks ----
  const players = useMemo(() => dbToPlayers(dbPlayersRaw), [dbPlayersRaw]);

  const userHoldingsQty = useMemo(() => {
    if (!clubId || dbHoldings.length === 0) return {};
    const clubPlayerIds = new Set(dbPlayersRaw.map((p) => p.id));
    const holdingsMap: Record<string, number> = {};
    dbHoldings.forEach((h) => {
      if (clubPlayerIds.has(h.player_id)) {
        holdingsMap[h.player_id] = h.quantity;
      }
    });
    return holdingsMap;
  }, [dbHoldings, dbPlayersRaw, clubId]);

  // Loading / error / notFound
  const loading = authLoading || clubLoading || (!!clubId && playersLoading);
  const dataError = clubError || playersError;
  const notFound = !clubLoading && !club;

  // ---- Local UI state ----
  const [tab, setTab] = useState<ClubTab>('uebersicht');
  const [followLoading, setFollowLoading] = useState(false);
  const [localFollowing, setLocalFollowing] = useState<boolean | null>(null);
  const [localFollowerDelta, setLocalFollowerDelta] = useState(0);

  const isFollowing = localFollowing ?? isFollowingData;
  const followerCount = followerCountData + localFollowerDelta;

  // Spieler Tab filters
  const [posFilter, setPosFilter] = useState<Pos | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'perf' | 'price' | 'change'>('perf');
  const [spielerQuery, setSpielerQuery] = useState('');
  const [squadView, setSquadView] = useState<'cards' | 'compact'>('cards');

  // Hydrate from localStorage in useEffect to avoid SSR hydration mismatch
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bescout-squad-view') as 'cards' | 'compact' | null;
      if (saved) setSquadView(saved);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    localStorage.setItem('bescout-squad-view', squadView);
  }, [squadView]);

  // Spielplan Tab state
  const [fixtureFilter, setFixtureFilter] = useState<FixtureFilter>('all');
  const [expandedGw, setExpandedGw] = useState<Set<number>>(new Set());
  const [autoExpandedGw, setAutoExpandedGw] = useState(true);

  // Club News
  const [clubNews, setClubNews] = useState<PostWithAuthor[]>([]);
  // Club Research
  const [clubResearch, setClubResearch] = useState<ResearchPostWithAuthor[]>([]);

  // Fetch club news posts
  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    getPosts({ clubId, postType: 'club_news', limit: 3 }).then(news => {
      if (!cancelled) setClubNews(news);
    }).catch(err => console.error('[Club] News fetch:', err));
    return () => { cancelled = true; };
  }, [clubId]);

  // Fetch club research posts
  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    getResearchPosts({ clubId, limit: 5 }).then(posts => {
      if (!cancelled) setClubResearch(posts);
    }).catch(err => console.error('[Club] Research fetch:', err));
    return () => { cancelled = true; };
  }, [clubId]);

  // Dashboard stats removed (admin has /club/[slug]/admin)

  // ---- Computed Stats ----
  const totalVolume24h = useMemo(
    () => centsToBsd(dbPlayersRaw.reduce((sum, p) => sum + p.volume_24h, 0)),
    [dbPlayersRaw]
  );

  const totalDpcFloat = useMemo(
    () => dbPlayersRaw.reduce((sum, p) => sum + p.dpc_total, 0),
    [dbPlayersRaw]
  );

  const avgPerf = useMemo(() => {
    if (dbPlayersRaw.length === 0) return 0;
    return dbPlayersRaw.reduce((sum, p) => sum + Number(p.perf_l5), 0) / dbPlayersRaw.length;
  }, [dbPlayersRaw]);

  const userClubDpc = useMemo(
    () => Object.values(userHoldingsQty).reduce((sum, q) => sum + q, 0),
    [userHoldingsQty]
  );

  const recentTrades = useMemo(() =>
    clubTradesRaw.map(tr => ({
      id: tr.id,
      player_name: `${(tr.player as unknown as { first_name: string; last_name: string }).first_name} ${(tr.player as unknown as { first_name: string; last_name: string }).last_name}`,
      price_cents: tr.price,
      executed_at: tr.executed_at,
    })),
    [clubTradesRaw]
  );

  const filteredPlayers = useMemo(() => {
    let filtered = posFilter === 'ALL' ? players : players.filter((p) => p.pos === posFilter);
    if (spielerQuery) {
      const q = spielerQuery.toLowerCase();
      filtered = filtered.filter(p => `${p.first} ${p.last}`.toLowerCase().includes(q));
    }
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'perf') return b.perf.l5 - a.perf.l5;
      if (sortBy === 'price') return b.prices.lastTrade - a.prices.lastTrade;
      return b.prices.change24h - a.prices.change24h;
    });
    return filtered;
  }, [players, posFilter, sortBy, spielerQuery]);

  const posCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: players.length, GK: 0, DEF: 0, MID: 0, ATT: 0 };
    players.forEach((p) => { counts[p.pos]++; });
    return counts;
  }, [players]);

  // Form streak (last 5 played fixtures)
  const formResults = useMemo(() => {
    if (!clubId) return [];
    return clubFixtures
      .filter(f => f.status === 'simulated' || f.status === 'finished')
      .slice(-5)
      .map(f => getFixtureResult(f, clubId))
      .filter((r): r is 'W' | 'D' | 'L' => r !== null);
  }, [clubFixtures, clubId]);

  // Club-specific IPOs (for ActiveOffersSection)
  const clubIpos = useMemo(() => {
    const playerIds = new Set(dbPlayersRaw.map(p => p.id));
    return activeIpos.filter(ipo => playerIds.has(ipo.player_id));
  }, [activeIpos, dbPlayersRaw]);

  // Owned player IDs set (for SquadPreviewSection)
  const ownedPlayerIds = useMemo(() => new Set(Object.keys(userHoldingsQty)), [userHoldingsQty]);

  // Club events (for ClubEventsSection)
  const clubEvents = useMemo(() => {
    if (!clubId) return [];
    return allEvents.filter(e => e.club_id === clubId);
  }, [allEvents, clubId]);

  // Smart-hide: show feature showcase when >2 sections would be empty
  const emptySections = useMemo(() => {
    return [
      clubIpos.length === 0,
      clubEvents.length === 0,
      recentTrades.length === 0,
    ].filter(Boolean).length;
  }, [clubIpos, clubEvents, recentTrades]);

  const showFeatureShowcase = emptySections >= 2;

  // ---- Follow Toggle ----
  const handleFollow = useCallback(async () => {
    if (!user || !club || followLoading) return;
    setFollowLoading(true);
    const newFollowing = !isFollowing;

    setLocalFollowing(newFollowing);
    setLocalFollowerDelta(prev => prev + (newFollowing ? 1 : -1));

    try {
      await toggleFollowClub(user.id, club.id, club.name, newFollowing);
      await refreshProfile();
      // Reset optimistic delta BEFORE query refetch delivers new server count
      setLocalFollowerDelta(0);
      setLocalFollowing(null);
      queryClient.invalidateQueries({ queryKey: qk.clubs.isFollowing(user.id, club.id) });
      queryClient.invalidateQueries({ queryKey: qk.clubs.followers(club.id) });
    } catch {
      setLocalFollowing(!newFollowing);
      setLocalFollowerDelta(prev => prev + (newFollowing ? -1 : 1));
      addToast(t('followError'), 'error');
    } finally {
      setFollowLoading(false);
    }
  }, [user, club, isFollowing, followLoading, refreshProfile, addToast, t]);

  // ---- Loading / Error ----
  if (loading) return <ClubSkeleton />;

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
    const clubColor = club.primary_color || '#006633';
    const loginUrl = club.referral_code ? `/login?club=${club.referral_code}` : '/login';
    return (
      <div
        className="max-w-[1200px] mx-auto"
        style={{
          '--club-primary': clubColor,
          '--club-secondary': club.secondary_color || '#333',
          '--club-glow': `${clubColor}4D`,
        } as React.CSSProperties}
      >
        <ClubHero
          club={club}
          followerCount={followerCount}
          isFollowing={false}
          followLoading={false}
          onFollow={() => {}}
          totalVolume24h={totalVolume24h}
          playerCount={players.length}
          buyablePlayers={clubIpos.length}
          isPublic
          loginUrl={loginUrl}
          totalDpcFloat={totalDpcFloat}
          avgPerf={avgPerf}
          formResults={formResults}
          prestigeTier={clubPrestige?.tier}
        />

        {/* CTA Banner */}
        <div className="mb-6">
          <Card className="p-6 border-gold/20 bg-gold/[0.06]">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center md:text-left">
                <h2 className="text-lg font-black text-balance mb-1">{t('publicCta')}</h2>
                <p className="text-sm text-white/50 text-pretty">{t('publicCtaDesc')}</p>
              </div>
              <Link href={loginUrl}>
                <Button variant="gold">{t('publicCtaButton')}</Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* Stats (mobile only — desktop stats in hero) */}
        <div className="mb-6">
          <ClubStatsBar
            totalVolume24h={totalVolume24h}
            totalDpcFloat={totalDpcFloat}
            avgPerf={avgPerf}
            followerCount={followerCount}
            playerCount={players.length}
            clubColor={clubColor}
            formResults={formResults}
            prestigeTier={clubPrestige?.tier}
          />
        </div>

        {/* Next Match */}
        {clubId && (
          <div className="mb-6">
            <NextMatchCard fixtures={clubFixtures} clubId={clubId} club={club} />
          </div>
        )}

        {/* Player Preview (Top 8 by L5) */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="size-5" style={{ color: clubColor }} />
              <h2 className="font-black text-balance text-lg">{t('squadPreview')}</h2>
            </div>
            <Link href={loginUrl} className="text-xs text-gold hover:underline flex items-center gap-1">
              {t('publicAllPlayers', { count: players.length })} <ChevronRight className="size-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...players]
              .sort((a, b) => b.perf.l5 - a.perf.l5)
              .slice(0, 8)
              .map(player => (
                <div key={player.id} className="p-3 bg-surface-base rounded-xl border border-white/10">
                  <PlayerIdentity player={player} size="sm" showMeta={false} showStatus={false} />
                </div>
              ))
            }
          </div>
        </Card>

        {/* Squad Overview */}
        <div className="mb-6">
          <SquadOverviewWidget players={players} />
        </div>

        {/* Last Results */}
        {clubId && (
          <div className="mb-6">
            <LastResultsCard fixtures={clubFixtures} clubId={clubId} />
          </div>
        )}

        {/* Club Info */}
        <Card className="p-4 md:p-6 mb-6">
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

        {/* Bottom CTA */}
        <div className="text-center py-8">
          <p className="text-white/40 text-sm text-pretty mb-3">{t('publicCtaDesc')}</p>
          <Link href={loginUrl}>
            <Button variant="gold" className="px-8">{t('publicCtaButton')}</Button>
          </Link>
        </div>
      </div>
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
        formResults={formResults}
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
          formResults={formResults}
          prestigeTier={clubPrestige?.tier}
        />
      </div>

      {/* Fan Rank Badge — authenticated users only */}
      {userId && fanRanking && (
        <div className="mb-4 flex items-center gap-2">
          <FanRankBadge
            tier={fanRanking.rank_tier}
            csfMultiplier={fanRanking.csf_multiplier}
            clubName={club.name}
            size="md"
            showMultiplier
          />
        </div>
      )}

      {/* ━━━ SPONSOR: CLUB HERO ━━━ */}
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

      {/* ========== TAB: ÜBERSICHT ========== */}
      {tab === 'uebersicht' && (
        <div className="space-y-6">
          {/* Nächste Begegnung */}
          <RevealSection>
            {clubId && <NextMatchCard fixtures={clubFixtures} clubId={clubId} club={club} />}
          </RevealSection>

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
          <RevealSection delay={100}>
            <ActiveOffersSection ipos={clubIpos} players={players} clubColor={clubColor} />
          </RevealSection>

          {/* Trending Spieler + Collection Progress */}
          <RevealSection delay={150}>
            <SquadPreviewSection players={players} ownedPlayerIds={ownedPlayerIds} clubColor={clubColor} onViewAll={() => setTab('spieler')} />
          </RevealSection>

          {showFeatureShowcase ? (
            <RevealSection delay={200}>
              <FeatureShowcase clubColor={clubColor} />
            </RevealSection>
          ) : (
            <>
              {/* Mitmachen (Scout + Bounties + Votes + Leaderboard) */}
              {clubId && (
                <RevealSection delay={200}>
                  <MitmachenSection clubId={clubId} userId={userId} clubColor={clubColor} />
                </RevealSection>
              )}

              {/* Club Events */}
              {clubId && (
                <RevealSection delay={250}>
                  <ClubEventsSection events={clubEvents} clubColor={clubColor} />
                </RevealSection>
              )}

              {/* Letzte Trades */}
              <RevealSection delay={300}>
                <RecentActivitySection trades={recentTrades} clubColor={clubColor} />
              </RevealSection>
            </>
          )}

          {/* Club-Mitgliedschaft */}
          <RevealSection delay={350}>
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

          {/* Fan-Rang Overview — Gamification v5 */}
          {userId && (
            <RevealSection delay={375}>
              <FanRankOverview
                ranking={fanRanking ?? null}
                clubName={club.name}
                isLoading={fanRankingLoading}
              />
            </RevealSection>
          )}

          {/* Club-Neuigkeiten */}
          {clubNews.length > 0 && (
            <RevealSection delay={400}>
              <Card className="p-4 md:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MessageCircle className="size-5" style={{ color: clubColor }} />
                  <h2 className="font-black text-balance">{t('news')}</h2>
                </div>
                <div className="space-y-3">
                  {clubNews.map(news => (
                    <div key={news.id} className="p-3 bg-gold/[0.03] rounded-xl border border-gold/15">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gold/10 text-gold border border-gold/20">
                          {tcom('clubNewsLabel')}
                        </span>
                        <span className="text-[10px] text-white/30">{formatTimeAgo(news.created_at)}</span>
                      </div>
                      <p className="text-sm text-white/80 leading-relaxed">{news.content}</p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-white/30">
                        <span>{news.author_display_name || news.author_handle}</span>
                        <span>{tcom('votesCount', { count: news.upvotes - news.downvotes })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </RevealSection>
          )}

          {/* Club Research */}
          {clubResearch.length > 0 && (
            <RevealSection delay={425}>
              <Card className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="size-5" style={{ color: clubColor }} />
                    <h2 className="font-black text-balance">{t('clubResearch')}</h2>
                  </div>
                  <Link href="/community?tab=research" className="text-[11px] text-white/40 hover:text-white/60 transition-colors">
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
                            {post.player_name && <span className="text-[11px] font-bold text-white/70">{post.player_name}</span>}
                            <span className="text-[10px] text-white/30">{post.author_display_name || post.author_handle}</span>
                          </div>
                          <div className="text-sm text-white/60 truncate">{post.title}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {post.ratings_count > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[11px]">
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

          {/* Letzte Ergebnisse */}
          <RevealSection delay={450}>
            {clubId && <LastResultsCard fixtures={clubFixtures} clubId={clubId} />}
          </RevealSection>

          {/* Club Info */}
          <RevealSection delay={500}>
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
                  onChange={(id) => setSortBy(id as 'perf' | 'price' | 'change')}
                />
                <div className="flex-shrink-0 flex items-center gap-0.5 bg-white/[0.04] rounded-lg p-0.5 border border-white/[0.06]">
                  <button
                    onClick={() => setSquadView('cards')}
                    className={cn('p-1.5 rounded-md transition-colors', squadView === 'cards' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50')}
                    title={t('viewCards')}
                  >
                    <LayoutGrid className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setSquadView('compact')}
                    className={cn('p-1.5 rounded-md transition-colors', squadView === 'compact' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50')}
                    title={t('viewRows')}
                  >
                    <List className="size-3.5" />
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
              {filteredPlayers.map((player) => (
                <PlayerDisplay key={player.id} variant="card" player={player} showActions={false} />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredPlayers.map((player) => (
                <PlayerDisplay key={player.id} variant="compact" player={player} showActions={false} />
              ))}
            </div>
          )}

          {filteredPlayers.length === 0 && (
            <div className="text-center text-white/40 py-12">
              {t('noPlayersInCategory')}
            </div>
          )}
        </div>
      )}

      {/* ========== TAB: SPIELPLAN ========== */}
      {tab === 'spielplan' && clubId && (() => {
        const filtered = clubFixtures.filter(f => {
          const isHome = f.home_club_id === clubId;
          const isPlayed = f.status === 'simulated' || f.status === 'finished';
          if (fixtureFilter === 'home') return isHome;
          if (fixtureFilter === 'away') return !isHome;
          if (fixtureFilter === 'results') return isPlayed;
          if (fixtureFilter === 'upcoming') return !isPlayed;
          return true;
        });

        // Group by gameweek
        const gwMap = new Map<number, Fixture[]>();
        for (const f of filtered) {
          const arr = gwMap.get(f.gameweek) ?? [];
          arr.push(f);
          gwMap.set(f.gameweek, arr);
        }
        const gameweeks = Array.from(gwMap.keys()).sort((a, b) => a - b);

        // Auto-expand the first upcoming GW
        const firstUpcomingGw = clubFixtures.find(f => f.status === 'scheduled')?.gameweek;

        return (
          <div className="space-y-4">
            {/* Season Summary */}
            <SeasonSummary fixtures={clubFixtures} clubId={clubId} />

            {/* Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {([
                { id: 'all', label: t('fixturesAll') },
                { id: 'home', label: t('fixturesHome'), icon: Home },
                { id: 'away', label: t('fixturesAway'), icon: Plane },
                { id: 'results', label: t('fixturesResults') },
                { id: 'upcoming', label: t('fixturesUpcoming') },
              ] as { id: FixtureFilter; label: string; icon?: typeof Home }[]).map(chip => (
                <button
                  key={chip.id}
                  onClick={() => setFixtureFilter(chip.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-colors flex items-center gap-1.5',
                    fixtureFilter === chip.id
                      ? 'bg-gold/15 text-gold border-gold/30'
                      : 'bg-surface-base text-white/50 border-white/10 hover:border-white/20'
                  )}
                >
                  {chip.icon && <chip.icon className="size-3" />}
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Gameweek Groups */}
            {gameweeks.length === 0 ? (
              <div className="text-center text-white/30 py-12">{t('noFixtures')}</div>
            ) : (
              <div className="space-y-2">
                {gameweeks.map(gw => {
                  const gwFixtures = gwMap.get(gw)!;
                  const isExpanded = expandedGw.has(gw) || (autoExpandedGw && gw === firstUpcomingGw);
                  const gwPlayed = gwFixtures.some(f => f.status === 'simulated' || f.status === 'finished');

                  return (
                    <div key={gw} className="rounded-xl border border-white/10 overflow-hidden">
                      <button
                        onClick={() => {
                          if (autoExpandedGw && gw === firstUpcomingGw) setAutoExpandedGw(false);
                          setExpandedGw(prev => {
                            const next = new Set(prev);
                            if (next.has(gw)) next.delete(gw); else next.add(gw);
                            return next;
                          });
                        }}
                        className="w-full flex items-center justify-between px-4 py-3 bg-surface-base hover:bg-white/[0.04] transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black">{t('fixtureGameweek', { gw })}</span>
                          {gwPlayed && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-500/15 text-green-500">{t('fixturePlayed')}</span>
                          )}
                        </div>
                        <ChevronDown className={cn('size-4 text-white/30 transition-transform', isExpanded && 'rotate-180')} />
                      </button>
                      {isExpanded && (
                        <div className="p-3 space-y-2 border-t border-white/[0.06]">
                          {gwFixtures.map(f => (
                            <FixtureRow key={f.id} fixture={f} clubId={clubId} accent={club.primary_color || '#FFD700'} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

    </div>
  );
}
