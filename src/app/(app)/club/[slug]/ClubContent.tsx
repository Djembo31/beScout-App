'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import {
  Users, Trophy, BadgeCheck, ChevronRight, TrendingUp,
  Shield, BarChart3, Calendar,
  Building2, MessageCircle,
  Bell, CheckCircle2, Briefcase,
  Users2, LayoutGrid, List,
  Loader2, Settings, ChevronDown,
  Swords, Home, Plane, ShoppingBag,
  Star, Award,
} from 'lucide-react';
import { Card, Button, ErrorState, Skeleton, SkeletonCard, TabBar, SearchInput, PosFilter, SortPills } from '@/components/ui';
import dynamic from 'next/dynamic';
const SponsorBanner = dynamic(() => import('@/components/player/detail/SponsorBanner'), { ssr: false });
import { PlayerIdentity } from '@/components/player';
import { PlayerDisplay } from '@/components/player/PlayerRow';
import { useUser } from '@/components/providers/AuthProvider';
import { dbToPlayers, centsToBsd } from '@/lib/services/players';
import { toggleFollowClub } from '@/lib/services/club';
import { fmtScout, cn } from '@/lib/utils';
import { resolveExpiredResearch } from '@/lib/services/research';
import { useClubBySlug } from '@/lib/queries/misc';
import { usePlayersByClub } from '@/lib/queries/players';
import { useClubFollowerCount, useIsFollowingClub } from '@/lib/queries/social';
import { useHoldings } from '@/lib/queries/holdings';
import { useClubFixtures } from '@/lib/queries/fixtures';
import { queryClient } from '@/lib/queryClient';
import { qk } from '@/lib/queries/keys';
import { getClub } from '@/lib/clubs';
import { useToast } from '@/components/providers/ToastProvider';
import { getPosts } from '@/lib/services/posts';
import { formatTimeAgo } from '@/components/community/PostCard';
import { useClubPrestige } from '@/lib/queries/scouting';
import type { Player, Pos, DbPlayer, ClubWithAdmin, Fixture, PostWithAuthor } from '@/types';
import type { PrestigeTier } from '@/lib/services/club';
import { useActiveIpos } from '@/lib/queries/ipos';
import { useEvents } from '@/lib/queries/events';
import { ActiveOffersSection } from '@/components/club/sections/ActiveOffersSection';
import { SquadPreviewSection } from '@/components/club/sections/SquadPreviewSection';
import { MitmachenSection } from '@/components/club/sections/MitmachenSection';
import { ClubEventsSection } from '@/components/club/sections/ClubEventsSection';
import { MembershipSection } from '@/components/club/sections/MembershipSection';
import { CollectionProgress } from '@/components/club/sections/CollectionProgress';
import { RecentActivitySection } from '@/components/club/sections/RecentActivitySection';
import { useClubRecentTrades } from '@/lib/queries/trades';

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
// HERO SECTION
// ============================================

function HeroSection({
  club,
  followerCount,
  isFollowing,
  followLoading,
  onFollow,
  userClubDpc,
  totalVolume24h,
  playerCount,
  buyablePlayers = 0,
  isPublic = false,
  loginUrl = '/login',
}: {
  club: ClubWithAdmin;
  followerCount: number;
  isFollowing: boolean;
  followLoading: boolean;
  onFollow: () => void;
  userClubDpc: number;
  totalVolume24h: number;
  playerCount: number;
  buyablePlayers?: number;
  isPublic?: boolean;
  loginUrl?: string;
}) {
  const t = useTranslations('club');
  const clubColor = club.primary_color || '#006633';
  const [stadiumSrc, setStadiumSrc] = useState(`/stadiums/${club.slug}.jpg`);

  return (
    <div className="relative h-[120px] md:h-[160px] lg:h-[350px] -mx-4 md:-mx-6 -mt-4 md:-mt-6 mb-6 overflow-hidden">
      {/* Stadium Background */}
      <div className="absolute inset-0">
        <Image
          src={stadiumSrc}
          alt={club.stadium || club.name}
          fill
          className="object-cover blur-sm scale-105"
          priority
          onError={() => setStadiumSrc('/stadiums/default.jpg')}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-bg-main" />
        <div className="absolute inset-0" style={{ background: `linear-gradient(to right, ${clubColor}33, transparent)` }} />
      </div>

      {/* Content — compact on mobile */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center space-y-2 md:space-y-4">
          {/* Club Logo + Name row on mobile, stacked on desktop */}
          <div className="flex items-center justify-center gap-3 md:flex-col md:gap-3">
            <div className="relative size-12 md:size-24 bg-white/10 rounded-full p-1 md:p-2 border-2 md:border-4 border-white/20 shadow-2xl flex-shrink-0">
              <div className="relative w-full h-full">
                {club.logo_url ? (
                  <Image src={club.logo_url} alt={club.name} fill className="object-contain p-1 md:p-2" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg md:text-3xl font-black text-white/50">{club.short}</div>
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base md:text-lg lg:text-4xl font-black text-balance text-white drop-shadow-lg truncate">
                  {club.name.toUpperCase()}
                </h1>
                {club.is_verified && <BadgeCheck className="size-5 md:size-8 text-gold" />}
              </div>
              <div className="flex items-center gap-2 text-[10px] md:text-sm text-white/70 md:justify-center">
                <Trophy className="size-3 md:size-4" />
                <span>{club.league}</span>
                {club.city && (
                  <>
                    <span className="text-white/30">•</span>
                    <span>{club.city}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats + Follow */}
          <div className="flex items-center justify-center gap-3 md:gap-6">
            <div className="text-center">
              <div className="text-sm md:text-2xl font-black tabular-nums text-white">{followerCount.toLocaleString()}</div>
              <div className="text-[10px] md:text-xs text-white/50">{t('scouts')}</div>
            </div>
            <div className="w-px h-5 md:h-10 bg-white/20" />
            <div className="text-center">
              <div className="text-sm md:text-2xl font-black tabular-nums text-gold">{fmtScout(totalVolume24h)}</div>
              <div className="text-[10px] md:text-xs text-white/50">{t('volume24h')}</div>
            </div>
            <div className="w-px h-5 md:h-10 bg-white/20" />
            <div className="text-center">
              <div className="text-sm md:text-2xl font-black tabular-nums text-green-500">{playerCount}</div>
              <div className="text-[10px] md:text-xs text-white/50">{t('players')}</div>
            </div>
            {buyablePlayers > 0 && (
              <>
                <div className="w-px h-5 md:h-10 bg-white/20" />
                <div className="text-center">
                  <div className="text-sm md:text-2xl font-black tabular-nums text-gold">{buyablePlayers}</div>
                  <div className="text-[10px] md:text-xs text-white/50">{t('buyable')}</div>
                </div>
              </>
            )}
            <div className="w-px h-5 md:h-10 bg-white/20 hidden md:block" />
            {isPublic ? (
              <Link href={loginUrl} className="hidden md:block">
                <Button variant="gold" size="sm">{t('publicRegister')}</Button>
              </Link>
            ) : (
              <Button
                variant={isFollowing ? 'outline' : 'gold'}
                size="sm"
                onClick={onFollow}
                disabled={followLoading}
                className="hidden md:flex"
              >
                {followLoading ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : isFollowing ? <><CheckCircle2 className="size-4" /> {t('subscribed')}</> : <><Bell className="size-4" /> {t('follow')}</>}
              </Button>
            )}
          </div>

          {/* Mobile-only follow/register button */}
          <div className="md:hidden flex items-center justify-center gap-2">
            {isPublic ? (
              <Link href={loginUrl}>
                <Button variant="gold" size="sm">{t('publicRegister')}</Button>
              </Link>
            ) : (
              <Button
                variant={isFollowing ? 'outline' : 'gold'}
                size="sm"
                onClick={onFollow}
                disabled={followLoading}
              >
                {followLoading ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : isFollowing ? t('subscribed') : t('follow')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// STATS BAR (2 big + 3 small + Form)
// ============================================

function StatsBar({
  totalVolume24h,
  totalDpcFloat,
  avgPerf,
  followerCount,
  playerCount,
  clubColor,
  formResults,
  prestigeTier,
}: {
  totalVolume24h: number;
  totalDpcFloat: number;
  avgPerf: number;
  followerCount: number;
  playerCount: number;
  clubColor: string;
  formResults: ('W' | 'D' | 'L')[];
  prestigeTier?: PrestigeTier;
}) {
  const t = useTranslations('club');
  const secondary = [
    { label: t('dpcFloat'), value: totalDpcFloat.toLocaleString(), icon: Briefcase },
    { label: t('avgPerfL5'), value: avgPerf.toFixed(1), icon: TrendingUp },
    { label: t('players'), value: playerCount.toString(), icon: Users },
  ];

  return (
    <div className="space-y-3">
      {/* Primary stats — big */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 hover:border-white/20 transition-colors" style={{ borderColor: `${clubColor}25` }}>
          <div className="flex items-center gap-2 mb-1">
            <Users2 className="size-5" style={{ color: clubColor }} />
            <span className="text-xs text-white/50">{t('scouts')}</span>
          </div>
          <div className="text-2xl md:text-3xl font-mono font-black tabular-nums" style={{ color: clubColor }}>
            {followerCount.toLocaleString()}
          </div>
        </Card>
        <Card className="p-4 hover:border-white/20 transition-colors border-gold/15">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="size-5 text-gold" />
            <span className="text-xs text-white/50">{t('volume24h')}</span>
          </div>
          <div className="text-2xl md:text-3xl font-mono font-black tabular-nums text-gold">
            {fmtScout(totalVolume24h)}
            <span className="text-sm text-white/40 ml-1">$SCOUT</span>
          </div>
        </Card>
      </div>

      {/* Secondary stats + Form — compact row */}
      <div className="flex items-center gap-3">
        {secondary.map((stat, i) => (
          <div key={i} className="flex-1 flex items-center gap-2 p-2.5 bg-surface-base border border-white/[0.06] rounded-xl">
            <stat.icon className="size-4 text-white/30 flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-mono font-bold tabular-nums text-sm text-white/80">{stat.value}</div>
              <div className="text-[10px] text-white/30">{stat.label}</div>
            </div>
          </div>
        ))}
        {/* Form streak */}
        {formResults.length > 0 && (
          <div className="flex-shrink-0 flex items-center gap-2 p-2.5 bg-surface-base border border-white/[0.06] rounded-xl">
            <div className="flex items-center gap-1">
              {formResults.map((r, i) => (
                <div
                  key={i}
                  className={cn(
                    'size-5 rounded-full flex items-center justify-center text-[9px] font-black',
                    r === 'W' && 'bg-green-500 text-black',
                    r === 'D' && 'bg-yellow-500 text-black',
                    r === 'L' && 'bg-red-500 text-white',
                  )}
                >
                  {r === 'W' ? 'S' : r === 'D' ? 'U' : 'N'}
                </div>
              ))}
            </div>
            <div className="text-[10px] text-white/30 hidden md:block">Form</div>
          </div>
        )}
        {/* Prestige Badge */}
        {prestigeTier && (() => {
          const cfg = PRESTIGE_CONFIG[prestigeTier];
          const Icon = cfg.icon;
          return (
            <div className="flex-shrink-0 flex items-center gap-2 p-2.5 bg-surface-base border border-white/[0.06] rounded-xl">
              <Icon className={cn('size-4', cfg.color)} />
              <div className="min-w-0">
                <div className={cn('text-sm font-bold', cfg.color)}>{t(cfg.labelKey)}</div>
                <div className="text-[10px] text-white/30">{t('prestige')}</div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ============================================
// SQUAD OVERVIEW WIDGET
// ============================================

function SquadOverviewWidget({ players }: { players: Player[] }) {
  const t = useTranslations('club');
  const breakdown = useMemo(() => {
    const counts: Record<Pos, number> = { GK: 0, DEF: 0, MID: 0, ATT: 0 };
    players.forEach((p) => { counts[p.pos]++; });
    return counts;
  }, [players]);

  const total = players.length;
  const posColors: Record<Pos, string> = { GK: 'bg-emerald-500', DEF: 'bg-amber-500', MID: 'bg-sky-500', ATT: 'bg-rose-500' };
  const posLabels: Record<Pos, string> = { GK: t('posGK'), DEF: t('posDEF'), MID: t('posMID'), ATT: t('posATT') };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="size-5 text-white/50" />
        <h2 className="font-black text-balance text-lg">{t('squadOverview')}</h2>
      </div>
      <div className="h-4 bg-white/5 rounded-full overflow-hidden flex mb-4">
        {(['GK', 'DEF', 'MID', 'ATT'] as Pos[]).map((pos) => (
          breakdown[pos] > 0 ? (
            <div key={pos} className={cn('h-full', posColors[pos])} style={{ width: `${(breakdown[pos] / total) * 100}%` }} />
          ) : null
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {(['GK', 'DEF', 'MID', 'ATT'] as Pos[]).map((pos) => (
          <div key={pos} className="flex items-center justify-between p-2 bg-surface-base rounded-lg">
            <div className="flex items-center gap-2">
              <div className={cn('size-3 rounded-full', posColors[pos])} />
              <span className="text-sm text-white/70">{posLabels[pos]}</span>
            </div>
            <span className="font-mono tabular-nums text-sm font-bold">{breakdown[pos]}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ============================================
// TOP SCOUTS WIDGET
// ============================================

const PRESTIGE_CONFIG: Record<PrestigeTier, { icon: typeof Star; color: string; labelKey: string }> = {
  starter: { icon: Shield, color: 'text-white/30', labelKey: 'prestigeStarter' },
  aktiv: { icon: Shield, color: 'text-white/60', labelKey: 'prestigeAktiv' },
  engagiert: { icon: Award, color: 'text-green-500', labelKey: 'prestigeEngagiert' },
  vorbildlich: { icon: Star, color: 'text-gold', labelKey: 'prestigeVorbildlich' },
};

// ============================================
// FIXTURE HELPERS
// ============================================

type FixtureFilter = 'all' | 'home' | 'away' | 'results' | 'upcoming';

function getFixtureResult(fixture: Fixture, clubId: string): 'W' | 'D' | 'L' | null {
  if (fixture.home_score === null || fixture.away_score === null) return null;
  const isHome = fixture.home_club_id === clubId;
  const ownGoals = isHome ? fixture.home_score : fixture.away_score;
  const oppGoals = isHome ? fixture.away_score : fixture.home_score;
  if (ownGoals > oppGoals) return 'W';
  if (ownGoals < oppGoals) return 'L';
  return 'D';
}

const resultBadge: Record<'W' | 'D' | 'L', { label: string; color: string }> = {
  W: { label: 'S', color: 'bg-green-500/20 text-green-500' },
  D: { label: 'U', color: 'bg-yellow-500/20 text-yellow-400' },
  L: { label: 'N', color: 'bg-red-500/20 text-red-400' },
};

function FixtureRow({ fixture, clubId, accent }: { fixture: Fixture; clubId: string; accent: string }) {
  const t = useTranslations('club');
  const isHome = fixture.home_club_id === clubId;
  const isPlayed = fixture.status === 'simulated' || fixture.status === 'finished';
  const result = getFixtureResult(fixture, clubId);
  const oppClub = getClub(isHome ? fixture.away_club_short : fixture.home_club_short) ||
                  getClub(isHome ? fixture.away_club_name : fixture.home_club_name);
  const oppColor = isHome ? fixture.away_club_primary_color : fixture.home_club_primary_color;
  const oppName = isHome ? fixture.away_club_name : fixture.home_club_name;
  const oppShort = isHome ? fixture.away_club_short : fixture.home_club_short;

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-xl border transition-colors',
      isPlayed ? 'bg-surface-base border-white/10' : 'bg-white/[0.01] border-white/[0.06]',
    )}>
      {/* H/A Badge */}
      <div className={cn(
        'size-7 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0',
        isHome ? 'bg-green-500/15 text-green-500' : 'bg-sky-500/15 text-sky-400',
      )}>
        {isHome ? 'H' : 'A'}
      </div>

      {/* Opponent */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div
          className="size-7 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0"
          style={{ backgroundColor: (oppColor ?? '#666') + '20', color: oppColor ?? '#aaa' }}
        >
          {oppClub?.logo ? (
            <img src={oppClub.logo} alt="" className="size-5 object-contain" />
          ) : (
            oppShort.slice(0, 2)
          )}
        </div>
        <span className="text-sm font-semibold truncate">{oppName}</span>
      </div>

      {/* Score or Status */}
      {isPlayed ? (
        <div className="flex items-center gap-2">
          <span className="font-mono font-black tabular-nums text-sm">
            {fixture.home_score} - {fixture.away_score}
          </span>
          {result && (
            <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-black', resultBadge[result].color)}>
              {resultBadge[result].label}
            </span>
          )}
        </div>
      ) : (
        <span className="text-xs text-white/30">{t('scheduled')}</span>
      )}
    </div>
  );
}

function SeasonSummary({ fixtures, clubId }: { fixtures: Fixture[]; clubId: string }) {
  const t = useTranslations('club');
  let w = 0, d = 0, l = 0;
  for (const f of fixtures) {
    const r = getFixtureResult(f, clubId);
    if (r === 'W') w++;
    else if (r === 'D') d++;
    else if (r === 'L') l++;
  }
  const played = w + d + l;
  const points = w * 3 + d;

  if (played === 0) return null;

  return (
    <div className="flex items-center gap-4 p-3 bg-surface-base rounded-xl border border-white/10">
      <div className="text-center flex-1">
        <div className="text-lg font-mono font-black tabular-nums text-white">{played}</div>
        <div className="text-[10px] text-white/40">{t('played')}</div>
      </div>
      <div className="text-center flex-1">
        <div className="text-lg font-mono font-black tabular-nums text-green-500">{w}</div>
        <div className="text-[10px] text-white/40">{t('wins')}</div>
      </div>
      <div className="text-center flex-1">
        <div className="text-lg font-mono font-black tabular-nums text-yellow-400">{d}</div>
        <div className="text-[10px] text-white/40">{t('draws')}</div>
      </div>
      <div className="text-center flex-1">
        <div className="text-lg font-mono font-black tabular-nums text-red-400">{l}</div>
        <div className="text-[10px] text-white/40">{t('losses')}</div>
      </div>
      <div className="w-px h-8 bg-white/10" />
      <div className="text-center flex-1">
        <div className="text-lg font-mono font-black tabular-nums text-gold">{points}</div>
        <div className="text-[10px] text-white/40">{t('seasonPoints')}</div>
      </div>
    </div>
  );
}

// ============================================
// NEXT MATCH WIDGET (Übersicht)
// ============================================

function NextMatchCard({ fixtures, clubId }: { fixtures: Fixture[]; clubId: string }) {
  const t = useTranslations('club');
  const next = fixtures.find(f => f.status === 'scheduled');
  if (!next) return null;

  const isHome = next.home_club_id === clubId;
  const oppName = isHome ? next.away_club_name : next.home_club_name;
  const oppShort = isHome ? next.away_club_short : next.home_club_short;
  const oppColor = isHome ? next.away_club_primary_color : next.home_club_primary_color;
  const oppClub = getClub(oppShort) || getClub(oppName);

  return (
    <Card className="p-4 border-green-500/20 bg-green-500/[0.04]">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
          <Swords className="size-5 text-green-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-white/40 mb-0.5">{t('nextMatch', { gw: next.gameweek })}</div>
          <div className="flex items-center gap-2">
            <span className={cn(
              'px-1.5 py-0.5 rounded text-[10px] font-black',
              isHome ? 'bg-green-500/15 text-green-500' : 'bg-sky-500/15 text-sky-400',
            )}>
              {isHome ? t('home') : t('away')}
            </span>
            <div className="flex items-center gap-2">
              <div
                className="size-6 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0"
                style={{ backgroundColor: (oppColor ?? '#666') + '20', color: oppColor ?? '#aaa' }}
              >
                {oppClub?.logo ? (
                  <img src={oppClub.logo} alt="" className="size-4 object-contain" />
                ) : (
                  oppShort.slice(0, 2)
                )}
              </div>
              <span className="font-bold text-sm truncate">{oppName}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ============================================
// LAST RESULTS WIDGET (Übersicht)
// ============================================

function LastResultsCard({ fixtures, clubId }: { fixtures: Fixture[]; clubId: string }) {
  const t = useTranslations('club');
  const played = fixtures
    .filter(f => f.status === 'simulated' || f.status === 'finished')
    .slice(-5)
    .reverse();

  if (played.length === 0) return null;

  return (
    <Card className="p-4 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="size-5 text-white/50" />
        <h2 className="font-black text-balance">{t('lastResults')}</h2>
      </div>
      <div className="space-y-2">
        {played.map(f => {
          const isHome = f.home_club_id === clubId;
          const oppName = isHome ? f.away_club_short : f.home_club_short;
          const oppColor = isHome ? f.away_club_primary_color : f.home_club_primary_color;
          const oppClub = getClub(oppName);
          const result = getFixtureResult(f, clubId);

          return (
            <div key={f.id} className="flex items-center gap-3 text-sm">
              <span className="text-xs text-white/30 font-mono tabular-nums w-8 text-right flex-shrink-0">GW {f.gameweek}</span>
              <div
                className="size-5 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0"
                style={{ backgroundColor: (oppColor ?? '#666') + '20', color: oppColor ?? '#aaa' }}
              >
                {oppClub?.logo ? (
                  <img src={oppClub.logo} alt="" className="size-3.5 object-contain" />
                ) : (
                  oppName.slice(0, 2)
                )}
              </div>
              <span className="flex-1 truncate text-white/70">{isHome ? f.away_club_name : f.home_club_name}</span>
              <span className="font-mono font-bold tabular-nums text-xs">{f.home_score} - {f.away_score}</span>
              {result && (
                <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-black w-5 text-center', resultBadge[result].color)}>
                  {resultBadge[result].label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ============================================
// SKELETON
// ============================================

function ClubSkeleton() {
  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="relative h-[300px] md:h-[550px] -mx-4 md:-mx-6 -mt-4 md:-mt-6 mb-6 overflow-hidden">
        <div className="absolute inset-0 bg-white/[0.02]" />
        <div className="absolute inset-0 flex items-center justify-center pt-8">
          <div className="text-center space-y-5">
            <Skeleton className="size-20 md:size-32 rounded-full mx-auto" />
            <Skeleton className="h-10 w-64 mx-auto" />
            <Skeleton className="h-4 w-48 mx-auto" />
            <div className="flex justify-center gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="text-center">
                  <Skeleton className="h-7 w-16 mx-auto mb-1" />
                  <Skeleton className="h-3 w-12 mx-auto" />
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-3">
              <Skeleton className="h-12 w-40 rounded-xl" />
              <Skeleton className="h-12 w-28 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
      <div className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <SkeletonCard key={i} className="h-24 p-3" />
        ))}
      </div>
      <div className="flex items-center border-b border-white/10 mb-6 gap-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SkeletonCard className="h-64 p-6" />
          <SkeletonCard className="h-48 p-6" />
        </div>
        <div className="space-y-6">
          <SkeletonCard className="h-48 p-6" />
          <SkeletonCard className="h-40 p-6" />
        </div>
      </div>
    </div>
  );
}

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
  const [squadView, setSquadView] = useState<'cards' | 'compact'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('bescout-squad-view') as 'cards' | 'compact') || 'cards';
    }
    return 'cards';
  });

  useEffect(() => {
    localStorage.setItem('bescout-squad-view', squadView);
  }, [squadView]);

  // Spielplan Tab state
  const [fixtureFilter, setFixtureFilter] = useState<FixtureFilter>('all');
  const [expandedGw, setExpandedGw] = useState<Set<number>>(new Set());
  const [autoExpandedGw, setAutoExpandedGw] = useState(true);

  // Club News
  const [clubNews, setClubNews] = useState<PostWithAuthor[]>([]);

  // Fetch club news posts
  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    getPosts({ clubId, postType: 'club_news', limit: 3 }).then(news => {
      if (!cancelled) setClubNews(news);
    }).catch(err => console.error('[Club] News fetch:', err));
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
      <div className="max-w-[1200px] mx-auto">
        <HeroSection
          club={club}
          followerCount={followerCount}
          isFollowing={false}
          followLoading={false}
          onFollow={() => {}}
          userClubDpc={0}
          totalVolume24h={totalVolume24h}
          playerCount={players.length}
          buyablePlayers={clubIpos.length}
          isPublic
          loginUrl={loginUrl}
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

        {/* Stats */}
        <div className="mb-6">
          <StatsBar
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
            <NextMatchCard fixtures={clubFixtures} clubId={clubId} />
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
    <div className="max-w-[1200px] mx-auto">

      {/* HERO SECTION */}
      <HeroSection
        club={club}
        followerCount={followerCount}
        isFollowing={isFollowing}
        followLoading={followLoading}
        onFollow={handleFollow}
        userClubDpc={userClubDpc}
        totalVolume24h={totalVolume24h}
        playerCount={players.length}
        buyablePlayers={clubIpos.length}
      />

      {/* STATS BAR */}
      <div className="mb-6">
        <StatsBar
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
          {clubId && <NextMatchCard fixtures={clubFixtures} clubId={clubId} />}

          {/* Dein Spieler-Bestand */}
          {userClubDpc > 0 && (
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
          )}

          {/* Aktive Angebote (IPOs) */}
          <ActiveOffersSection ipos={clubIpos} players={players} clubColor={clubColor} />

          {/* Trending Spieler + Collection Progress */}
          <SquadPreviewSection players={players} ownedPlayerIds={ownedPlayerIds} clubColor={clubColor} onViewAll={() => setTab('spieler')} />

          {/* Mitmachen (Scout + Bounties + Votes + Leaderboard) */}
          {clubId && <MitmachenSection clubId={clubId} userId={userId} clubColor={clubColor} />}

          {/* Club Events */}
          {clubId && <ClubEventsSection events={clubEvents} clubColor={clubColor} />}

          {/* Letzte Trades */}
          <RecentActivitySection trades={recentTrades} clubColor={clubColor} />

          {/* Club-Mitgliedschaft */}
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

          {/* Club-Neuigkeiten */}
          {clubNews.length > 0 && (
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
          )}

          {/* Letzte Ergebnisse */}
          {clubId && <LastResultsCard fixtures={clubFixtures} clubId={clubId} />}

          {/* Club Info */}
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
