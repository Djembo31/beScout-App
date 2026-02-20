'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import {
  Users, Trophy, BadgeCheck, ChevronRight, Clock, Vote, TrendingUp,
  Shield, BarChart3, Calendar, MapPin,
  Building2, Zap, Crown, MessageCircle, Share2,
  Bell, Flame, CheckCircle2, Briefcase,
  ArrowUpRight, ArrowDownRight, ExternalLink, Users2,
  Loader2, Settings, ChevronDown,
  Swords, Home, Plane, ShoppingBag,
} from 'lucide-react';
import { Card, Button, Chip, Modal, ErrorState, Skeleton, SkeletonCard, TabBar, SearchInput, PosFilter, SortPills } from '@/components/ui';
import SponsorBanner from '@/components/player/detail/SponsorBanner';
import { PlayerIdentity, PlayerKPIs } from '@/components/player';
import { PlayerDisplay } from '@/components/player/PlayerRow';
import { useUser } from '@/components/providers/AuthProvider';
import { dbToPlayers, centsToBsd } from '@/lib/services/players';
import { toggleFollowClub } from '@/lib/services/club';
import { fmtScout, cn } from '@/lib/utils';
import { formatScout } from '@/lib/services/wallet';
import { resolveExpiredResearch } from '@/lib/services/research';
import { subscribeTo, cancelSubscription, TIER_CONFIG } from '@/lib/services/clubSubscriptions';
import type { ClubSubscription, SubscriptionTier } from '@/lib/services/clubSubscriptions';
import { useClubBySlug, useClubSubscription } from '@/lib/queries/misc';
import { usePlayersByClub } from '@/lib/queries/players';
import { useClubFollowerCount, useIsFollowingClub } from '@/lib/queries/social';
import { useHoldings } from '@/lib/queries/holdings';
import { useClubVotes } from '@/lib/queries/votes';
import { useClubFixtures } from '@/lib/queries/fixtures';
import { queryClient } from '@/lib/queryClient';
import { qk } from '@/lib/queries/keys';
import { getClub } from '@/lib/clubs';
import { useToast } from '@/components/providers/ToastProvider';
import { getPosts } from '@/lib/services/posts';
import { formatTimeAgo } from '@/components/community/PostCard';
import type { Player, Pos, DbPlayer, DbTrade, DbClubVote, ClubWithAdmin, Fixture, PostWithAuthor } from '@/types';

// ============================================
// TYPES
// ============================================

type ClubTab = 'uebersicht' | 'spieler' | 'spielplan';

type TradeWithPlayer = DbTrade & {
  player: { first_name: string; last_name: string; position: string };
};

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
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-[#0a0a0a]" />
        <div className="absolute inset-0" style={{ background: `linear-gradient(to right, ${clubColor}33, transparent)` }} />
      </div>

      {/* Content — compact on mobile */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center space-y-2 md:space-y-4">
          {/* Club Logo + Name row on mobile, stacked on desktop */}
          <div className="flex items-center justify-center gap-3 md:flex-col md:gap-3">
            <div className="relative w-12 h-12 md:w-24 md:h-24 bg-white/10 backdrop-blur-md rounded-full p-1 md:p-2 border-2 md:border-4 border-white/20 shadow-2xl flex-shrink-0">
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
                <h1 className="text-base md:text-lg lg:text-4xl font-black tracking-tight text-white drop-shadow-lg truncate">
                  {club.name.toUpperCase()}
                </h1>
                {club.is_verified && <BadgeCheck className="w-5 h-5 md:w-8 md:h-8 text-[#FFD700]" />}
              </div>
              <div className="flex items-center gap-2 text-[10px] md:text-sm text-white/70 md:justify-center">
                <Trophy className="w-3 h-3 md:w-4 md:h-4" />
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
              <div className="text-sm md:text-2xl font-black text-white">{followerCount.toLocaleString()}</div>
              <div className="text-[10px] md:text-xs text-white/50">{t('scouts')}</div>
            </div>
            <div className="w-px h-5 md:h-10 bg-white/20" />
            <div className="text-center">
              <div className="text-sm md:text-2xl font-black text-[#FFD700]">{fmtScout(totalVolume24h)}</div>
              <div className="text-[10px] md:text-xs text-white/50">{t('volume24h')}</div>
            </div>
            <div className="w-px h-5 md:h-10 bg-white/20" />
            <div className="text-center">
              <div className="text-sm md:text-2xl font-black text-[#22C55E]">{playerCount}</div>
              <div className="text-[10px] md:text-xs text-white/50">{t('players')}</div>
            </div>
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
                {followLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isFollowing ? <><CheckCircle2 className="w-4 h-4" /> {t('subscribed')}</> : <><Bell className="w-4 h-4" /> {t('follow')}</>}
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
                {followLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isFollowing ? t('subscribed') : t('follow')}
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
}: {
  totalVolume24h: number;
  totalDpcFloat: number;
  avgPerf: number;
  followerCount: number;
  playerCount: number;
  clubColor: string;
  formResults: ('W' | 'D' | 'L')[];
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
        <Card className="p-4 hover:border-white/20 transition-all" style={{ borderColor: `${clubColor}25` }}>
          <div className="flex items-center gap-2 mb-1">
            <Users2 className="w-5 h-5" style={{ color: clubColor }} />
            <span className="text-xs text-white/50">{t('scouts')}</span>
          </div>
          <div className="text-2xl md:text-3xl font-mono font-black" style={{ color: clubColor }}>
            {followerCount.toLocaleString()}
          </div>
        </Card>
        <Card className="p-4 hover:border-white/20 transition-all border-[#FFD700]/15">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-5 h-5 text-[#FFD700]" />
            <span className="text-xs text-white/50">{t('volume24h')}</span>
          </div>
          <div className="text-2xl md:text-3xl font-mono font-black text-[#FFD700]">
            {fmtScout(totalVolume24h)}
            <span className="text-sm text-white/40 ml-1">$SCOUT</span>
          </div>
        </Card>
      </div>

      {/* Secondary stats + Form — compact row */}
      <div className="flex items-center gap-3">
        {secondary.map((stat, i) => (
          <div key={i} className="flex-1 flex items-center gap-2 p-2.5 bg-white/[0.02] border border-white/[0.06] rounded-xl">
            <stat.icon className="w-4 h-4 text-white/30 flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-mono font-bold text-sm text-white/80">{stat.value}</div>
              <div className="text-[10px] text-white/30">{stat.label}</div>
            </div>
          </div>
        ))}
        {/* Form streak */}
        {formResults.length > 0 && (
          <div className="flex-shrink-0 flex items-center gap-2 p-2.5 bg-white/[0.02] border border-white/[0.06] rounded-xl">
            <div className="flex items-center gap-1">
              {formResults.map((r, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black',
                    r === 'W' && 'bg-[#22C55E] text-black',
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
      </div>
    </div>
  );
}

// ============================================
// VOTE CARD
// ============================================

function ClubVoteCard({ vote, hasVoted, onVote, voting }: {
  vote: DbClubVote;
  hasVoted: boolean;
  onVote: (voteId: string, optionIndex: number) => void;
  voting: string | null;
}) {
  const t = useTranslations('club');
  const totalVotes = vote.total_votes;
  const isActive = vote.status === 'active' && new Date(vote.ends_at) > new Date();
  const endsAt = new Date(vote.ends_at);
  const diffMs = endsAt.getTime() - Date.now();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const timeLeft = diffMs > 0 ? `${days}d ${hours}h` : 'Beendet';

  return (
    <div className="p-4 bg-white/[0.02] rounded-xl border border-white/10 hover:border-purple-400/40 transition-all">
      <div className="font-bold mb-3 line-clamp-2">{vote.question}</div>
      <div className="space-y-2 mb-3">
        {(vote.options as { label: string; votes: number }[]).map((opt, idx) => {
          const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
          return (
            <button
              key={idx}
              onClick={() => !hasVoted && isActive && onVote(vote.id, idx)}
              disabled={hasVoted || !isActive || voting === vote.id}
              className={cn(
                'w-full text-left',
                !hasVoted && isActive && 'hover:bg-white/[0.03] cursor-pointer',
                (hasVoted || !isActive) && 'cursor-default'
              )}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-white/70">{opt.label}</span>
                <span className="font-mono font-bold">{pct}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500/50 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-xs text-white/50">
        <span><Users className="w-3 h-3 inline mr-1" />{totalVotes.toLocaleString()}</span>
        <span><Clock className="w-3 h-3 inline mr-1" />{timeLeft}</span>
      </div>
      {hasVoted && (
        <Chip className="mt-2 bg-purple-500/15 text-purple-300 border-purple-500/25">{t('voted')}</Chip>
      )}
      {!hasVoted && isActive && vote.cost_bsd > 0 && (
        <div className="text-[10px] text-white/30 mt-2">{t('voteCost')} {formatScout(vote.cost_bsd)} $SCOUT</div>
      )}
    </div>
  );
}

// ============================================
// TOP PLAYERS WIDGET
// ============================================

function TopPlayersWidget({
  players,
  onViewAll,
  clubColor,
}: {
  players: Player[];
  onViewAll: () => void;
  clubColor: string;
}) {
  const t = useTranslations('club');
  const tc = useTranslations('common');
  const topPlayers = useMemo(
    () => [...players].sort((a, b) => b.prices.change24h - a.prices.change24h).slice(0, 3),
    [players]
  );

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-400" />
          <span className="font-black text-lg">{t('trendingPlayers')}</span>
        </div>
        <button onClick={onViewAll} className="text-xs text-[#FFD700] hover:underline flex items-center gap-1">
          {tc('viewAll')} <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-3">
        {topPlayers.map((player, i) => (
          <Link key={player.id} href={`/player/${player.id}`}>
            <div
              className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/10 transition-all"
              style={{ ['--hover-border' as string]: `${clubColor}50` }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = `${clubColor}50`)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '')}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm"
                  style={i === 0 ? { backgroundColor: `${clubColor}30`, color: clubColor } : undefined}
                >
                  {i + 1}
                </div>
                <PlayerIdentity player={player} size="sm" showMeta={false} showStatus={false} />
                <div className="text-[10px] text-white/40 shrink-0">{fmtScout(player.prices.lastTrade)} $SCOUT</div>
              </div>
              <div className={`flex items-center gap-1 font-mono font-bold ${player.prices.change24h >= 0 ? 'text-[#22C55E]' : 'text-red-400'}`}>
                {player.prices.change24h >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {Math.abs(player.prices.change24h).toFixed(1)}%
              </div>
            </div>
          </Link>
        ))}
        {topPlayers.length === 0 && (
          <div className="text-center text-white/40 py-6">{t('noPlayersLoaded')}</div>
        )}
      </div>
    </Card>
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
        <Shield className="w-5 h-5 text-white/50" />
        <span className="font-black text-lg">{t('squadOverview')}</span>
      </div>
      <div className="h-4 bg-white/5 rounded-full overflow-hidden flex mb-4">
        {(['GK', 'DEF', 'MID', 'ATT'] as Pos[]).map((pos) => (
          breakdown[pos] > 0 ? (
            <div key={pos} className={`h-full ${posColors[pos]}`} style={{ width: `${(breakdown[pos] / total) * 100}%` }} />
          ) : null
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {(['GK', 'DEF', 'MID', 'ATT'] as Pos[]).map((pos) => (
          <div key={pos} className="flex items-center justify-between p-2 bg-white/[0.02] rounded-lg">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${posColors[pos]}`} />
              <span className="text-sm text-white/70">{posLabels[pos]}</span>
            </div>
            <span className="font-mono text-sm font-bold">{breakdown[pos]}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

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
  W: { label: 'S', color: 'bg-[#22C55E]/20 text-[#22C55E]' },
  D: { label: 'U', color: 'bg-yellow-500/20 text-yellow-400' },
  L: { label: 'N', color: 'bg-red-500/20 text-red-400' },
};

function FixtureRow({ fixture, clubId, accent }: { fixture: Fixture; clubId: string; accent: string }) {
  const t = useTranslations('club');
  const isHome = fixture.home_club_id === clubId;
  const isPlayed = fixture.status === 'simulated' || fixture.status === 'finished';
  const result = getFixtureResult(fixture, clubId);
  const oppClubId = isHome ? fixture.away_club_id : fixture.home_club_id;
  const oppClub = getClub(isHome ? fixture.away_club_short : fixture.home_club_short) ||
                  getClub(isHome ? fixture.away_club_name : fixture.home_club_name);
  const oppColor = isHome ? fixture.away_club_primary_color : fixture.home_club_primary_color;
  const oppName = isHome ? fixture.away_club_name : fixture.home_club_name;
  const oppShort = isHome ? fixture.away_club_short : fixture.home_club_short;

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-xl border transition-all',
      isPlayed ? 'bg-white/[0.02] border-white/10' : 'bg-white/[0.01] border-white/[0.06]',
    )}>
      {/* H/A Badge */}
      <div className={cn(
        'w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0',
        isHome ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-sky-500/15 text-sky-400',
      )}>
        {isHome ? 'H' : 'A'}
      </div>

      {/* Opponent */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0"
          style={{ backgroundColor: (oppColor ?? '#666') + '20', color: oppColor ?? '#aaa' }}
        >
          {oppClub?.logo ? (
            <img src={oppClub.logo} alt="" className="w-5 h-5 object-contain" />
          ) : (
            oppShort.slice(0, 2)
          )}
        </div>
        <span className="text-sm font-semibold truncate">{oppName}</span>
      </div>

      {/* Score or Status */}
      {isPlayed ? (
        <div className="flex items-center gap-2">
          <span className="font-mono font-black text-sm">
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
    <div className="flex items-center gap-4 p-3 bg-white/[0.02] rounded-xl border border-white/10">
      <div className="text-center flex-1">
        <div className="text-lg font-mono font-black text-white">{played}</div>
        <div className="text-[10px] text-white/40">{t('played')}</div>
      </div>
      <div className="text-center flex-1">
        <div className="text-lg font-mono font-black text-[#22C55E]">{w}</div>
        <div className="text-[10px] text-white/40">{t('wins')}</div>
      </div>
      <div className="text-center flex-1">
        <div className="text-lg font-mono font-black text-yellow-400">{d}</div>
        <div className="text-[10px] text-white/40">{t('draws')}</div>
      </div>
      <div className="text-center flex-1">
        <div className="text-lg font-mono font-black text-red-400">{l}</div>
        <div className="text-[10px] text-white/40">{t('losses')}</div>
      </div>
      <div className="w-px h-8 bg-white/10" />
      <div className="text-center flex-1">
        <div className="text-lg font-mono font-black text-[#FFD700]">{points}</div>
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
    <Card className="p-4 border-[#22C55E]/20 bg-gradient-to-r from-[#22C55E]/5 to-transparent">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#22C55E]/10 flex items-center justify-center flex-shrink-0">
          <Swords className="w-5 h-5 text-[#22C55E]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-white/40 mb-0.5">{t('nextMatch', { gw: next.gameweek })}</div>
          <div className="flex items-center gap-2">
            <span className={cn(
              'px-1.5 py-0.5 rounded text-[10px] font-black',
              isHome ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-sky-500/15 text-sky-400',
            )}>
              {isHome ? t('home') : t('away')}
            </span>
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0"
                style={{ backgroundColor: (oppColor ?? '#666') + '20', color: oppColor ?? '#aaa' }}
              >
                {oppClub?.logo ? (
                  <img src={oppClub.logo} alt="" className="w-4 h-4 object-contain" />
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
        <Calendar className="w-5 h-5 text-white/50" />
        <span className="font-black">{t('lastResults')}</span>
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
              <span className="text-xs text-white/30 font-mono w-8 text-right flex-shrink-0">GW {f.gameweek}</span>
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0"
                style={{ backgroundColor: (oppColor ?? '#666') + '20', color: oppColor ?? '#aaa' }}
              >
                {oppClub?.logo ? (
                  <img src={oppClub.logo} alt="" className="w-3.5 h-3.5 object-contain" />
                ) : (
                  oppName.slice(0, 2)
                )}
              </div>
              <span className="flex-1 truncate text-white/70">{isHome ? f.away_club_name : f.home_club_name}</span>
              <span className="font-mono font-bold text-xs">{f.home_score} - {f.away_score}</span>
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
// ACTIVITY FEED
// ============================================

function ActivityFeed({
  trades,
  title,
  emptyText,
}: {
  trades: TradeWithPlayer[];
  title: string;
  emptyText?: string;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-[#FFD700]" />
        <span className="font-black text-lg">{title}</span>
      </div>
      <div className="space-y-3">
        {trades.length === 0 ? (
          <div className="text-center text-white/40 py-6">{emptyText || 'Keine Aktivität'}</div>
        ) : (
          trades.map((trade) => {
            const priceBsd = centsToBsd(trade.price);
            return (
              <div key={trade.id} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FFD700]/10 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4 text-[#FFD700]" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">
                      {trade.player?.first_name} {trade.player?.last_name}
                    </div>
                    <div className="text-[10px] text-white/40">
                      {trade.quantity} DPC • {new Date(trade.executed_at).toLocaleDateString('de-DE')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-[#FFD700]">{fmtScout(priceBsd)} $SCOUT</div>
                  <div className="text-[10px] text-white/40">pro DPC</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}

// ============================================
// MEMBERSHIP TIER CARD
// ============================================

// ============================================
// SKELETON
// ============================================

function ClubSkeleton() {
  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="relative h-[300px] md:h-[550px] -mx-4 md:-mx-6 -mt-4 md:-mt-6 mb-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-[#0a0a0a]" />
        <div className="absolute inset-0 flex items-center justify-center pt-8">
          <div className="text-center space-y-5">
            <Skeleton className="w-20 h-20 md:w-32 md:h-32 rounded-full mx-auto" />
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
  const { user, profile, refreshProfile, loading: authLoading } = useUser();
  const { addToast } = useToast();
  const userId = user?.id;

  // ── React Query Hooks (ALL before early returns) ──
  const { data: club, isLoading: clubLoading, isError: clubError } = useClubBySlug(slug, userId);
  const clubId = club?.id;
  const { data: dbPlayersRaw = [], isLoading: playersLoading, isError: playersError } = usePlayersByClub(clubId);
  const { data: followerCountData = 0 } = useClubFollowerCount(clubId);
  const { data: isFollowingData = false } = useIsFollowingClub(userId, clubId);
  const { data: dbHoldings = [] } = useHoldings(userId);
  const { data: clubVotesData = [] } = useClubVotes(clubId ?? null);
  const { data: subscriptionData = null } = useClubSubscription(userId, clubId);
  const { data: clubFixtures = [] } = useClubFixtures(clubId);

  // Resolve expired research (fire-and-forget)
  useEffect(() => {
    resolveExpiredResearch().catch(err => console.error('[Club] Resolve expired research failed:', err));
  }, []);

  const t = useTranslations('club');
  const tc = useTranslations('common');

  // ---- Derived data from hooks ----
  const players = useMemo(() => dbToPlayers(dbPlayersRaw), [dbPlayersRaw]);
  const clubVotes = clubVotesData;

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

  // Spielplan Tab state
  const [fixtureFilter, setFixtureFilter] = useState<FixtureFilter>('all');
  const [expandedGw, setExpandedGw] = useState<Set<number>>(new Set());


  // Club-Abo state
  const [subscription, setSubscription] = useState<ClubSubscription | null>(null);
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);

  // Club News
  const [clubNews, setClubNews] = useState<PostWithAuthor[]>([]);

  // Sync subscription from query
  useEffect(() => {
    if (subscriptionData !== undefined) setSubscription(subscriptionData);
  }, [subscriptionData]);

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

  // Active votes for overview (max 2)
  const activeVotesPreview = useMemo(() => {
    return clubVotes
      .filter(v => v.status === 'active' && new Date(v.ends_at) > new Date())
      .slice(0, 2);
  }, [clubVotes]);

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
      addToast('Fehler beim Folgen/Entfolgen', 'error');
    } finally {
      setFollowLoading(false);
    }
  }, [user, club, isFollowing, followLoading, refreshProfile]);

  // ---- Subscription Handler ----
  const handleSubscribe = useCallback(async (tier: SubscriptionTier) => {
    if (!user || !club) return;
    setSubLoading(true);
    setSubError(null);
    try {
      const result = await subscribeTo(user.id, club.id, tier);
      if (!result.success) {
        setSubError(result.error || 'Fehler beim Abonnieren');
      } else {
        queryClient.invalidateQueries({ queryKey: qk.clubs.subscription(user.id, club.id) });
        setSubModalOpen(false);
      }
    } catch (err) {
      setSubError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setSubLoading(false);
    }
  }, [user, club]);

  const handleCancelSub = useCallback(async () => {
    if (!user || !club) return;
    setSubLoading(true);
    try {
      await cancelSubscription(user.id, club.id);
      setSubscription(prev => prev ? { ...prev, auto_renew: false } : null);
    } catch (err) {
      console.error('[Club] Cancel subscription failed:', err);
      addToast('Fehler beim Kündigen', 'error');
    }
    finally { setSubLoading(false); }
  }, [user, club]);

  // ---- Loading / Error ----
  if (loading) return <ClubSkeleton />;

  if (notFound) {
    return (
      <div className="max-w-xl mx-auto mt-20 text-center">
        <Building2 className="w-16 h-16 mx-auto mb-4 text-white/20" />
        <h2 className="text-2xl font-black mb-2">{t('notFoundTitle')}</h2>
        <p className="text-white/50 mb-6">{t('notFoundDesc', { slug })}</p>
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
          isPublic
          loginUrl={loginUrl}
        />

        {/* CTA Banner */}
        <div className="mb-6">
          <Card className="p-6 border-[#FFD700]/20 bg-gradient-to-r from-[#FFD700]/10 to-[#FFD700]/5">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center md:text-left">
                <h2 className="text-lg font-black mb-1">{t('publicCta')}</h2>
                <p className="text-sm text-white/50">{t('publicCtaDesc')}</p>
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
              <Users className="w-5 h-5" style={{ color: clubColor }} />
              <span className="font-black text-lg">{t('squadPreview')}</span>
            </div>
            <Link href={loginUrl} className="text-xs text-[#FFD700] hover:underline flex items-center gap-1">
              {t('publicAllPlayers', { count: players.length })} <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...players]
              .sort((a, b) => b.perf.l5 - a.perf.l5)
              .slice(0, 8)
              .map(player => (
                <div key={player.id} className="p-3 bg-white/[0.02] rounded-xl border border-white/10">
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
            <Building2 className="w-5 h-5 text-white/50" />
            <span className="font-black">{t('clubInfo')}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {club.stadium && (
              <div className="bg-white/[0.02] rounded-xl p-3">
                <div className="text-xs text-white/50 mb-1">{t('stadium')}</div>
                <div className="font-bold text-sm">{club.stadium}</div>
              </div>
            )}
            {club.city && (
              <div className="bg-white/[0.02] rounded-xl p-3">
                <div className="text-xs text-white/50 mb-1">{t('city')}</div>
                <div className="font-bold text-sm">{club.city}</div>
              </div>
            )}
            <div className="bg-white/[0.02] rounded-xl p-3">
              <div className="text-xs text-white/50 mb-1">{t('league')}</div>
              <div className="font-bold text-sm">{club.league}</div>
            </div>
            <div className="bg-white/[0.02] rounded-xl p-3">
              <div className="text-xs text-white/50 mb-1">{t('players')}</div>
              <div className="font-bold text-sm text-[#22C55E]">{players.length}</div>
            </div>
          </div>
        </Card>

        {/* Bottom CTA */}
        <div className="text-center py-8">
          <p className="text-white/40 text-sm mb-3">{t('publicCtaDesc')}</p>
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
        />
      </div>

      {/* CLUB-ABO BANNER */}
      {user && (
        <div className="mb-4">
          {subscription ? (
            <Card className={`p-3 border flex items-center justify-between ${
              subscription.tier === 'gold' ? 'border-[#FFD700]/30 bg-[#FFD700]/5' :
              subscription.tier === 'silber' ? 'border-[#C0C0C0]/30 bg-[#C0C0C0]/5' :
              'border-[#CD7F32]/30 bg-[#CD7F32]/5'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                  subscription.tier === 'gold' ? 'bg-[#FFD700]/20 text-[#FFD700]' :
                  subscription.tier === 'silber' ? 'bg-[#C0C0C0]/20 text-[#C0C0C0]' :
                  'bg-[#CD7F32]/20 text-[#CD7F32]'
                }`}>
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold">{t('member', { tier: TIER_CONFIG[subscription.tier as SubscriptionTier]?.label })}</div>
                  <div className="text-[10px] text-white/40">
                    {subscription.auto_renew ? t('renewsAt') : t('expiresAt')} {new Date(subscription.expires_at).toLocaleDateString('de-DE')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setSubModalOpen(true)}>
                  {subscription.auto_renew ? tc('manage') : t('renew')}
                </Button>
              </div>
            </Card>
          ) : (
            <Card
              className="p-3 border border-[#FFD700]/20 bg-gradient-to-r from-[#FFD700]/5 to-transparent cursor-pointer hover:border-[#FFD700]/30 transition-all"
              onClick={() => setSubModalOpen(true)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#FFD700]/10 flex items-center justify-center">
                    <Crown className="w-4 h-4 text-[#FFD700]" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">{t('joinClub')}</div>
                    <div className="text-[10px] text-white/40">{t('joinClubDesc')}</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/30" />
              </div>
            </Card>
          )}
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
            className="flex-shrink-0 px-3 py-2 text-sm font-semibold text-white/60 hover:text-white transition-all whitespace-nowrap flex items-center gap-1.5"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden md:inline">{t('admin')}</span>
          </Link>
        )}
      </div>

      {/* ========== TAB: ÜBERSICHT ========== */}
      {tab === 'uebersicht' && (
        <div className="space-y-6">
          {/* Nächste Begegnung */}
          {clubId && <NextMatchCard fixtures={clubFixtures} clubId={clubId} />}

          {/* Dein DPC-Bestand */}
          {userClubDpc > 0 && (
            <Card className="p-4 bg-gradient-to-br from-[#FFD700]/10 to-[#FFD700]/5 border-[#FFD700]/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-6 h-6 text-[#FFD700]" />
                  <div>
                    <div className="font-black">{userClubDpc} DPC</div>
                    <div className="text-xs text-white/50">{t('yourHoldingsDesc')}</div>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setTab('spieler')}>
                  {t('squad')}
                </Button>
              </div>
            </Card>
          )}

          <TopPlayersWidget players={players} onViewAll={() => setTab('spieler')} clubColor={clubColor} />

          {/* Club-Neuigkeiten */}
          {clubNews.length > 0 && (
            <Card className="p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <MessageCircle className="w-5 h-5" style={{ color: clubColor }} />
                <span className="font-black">{t('news')}</span>
              </div>
              <div className="space-y-3">
                {clubNews.map(news => (
                  <div key={news.id} className="p-3 bg-[#FFD700]/[0.03] rounded-xl border border-[#FFD700]/15">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20">
                        Club-Nachricht
                      </span>
                      <span className="text-[10px] text-white/30">{formatTimeAgo(news.created_at)}</span>
                    </div>
                    <p className="text-sm text-white/80 leading-relaxed">{news.content}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-white/30">
                      <span>{news.author_display_name || news.author_handle}</span>
                      <span>{news.upvotes - news.downvotes} Stimmen</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Aktive Votes Preview */}
          {activeVotesPreview.length > 0 && (
            <Card className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Vote className="w-5 h-5" style={{ color: clubColor }} />
                  <span className="font-black">{t('activeVotes')}</span>
                </div>
              </div>
              <div className="space-y-2">
                {activeVotesPreview.map(vote => {
                  const totalVotes = (vote.options as { label: string; votes: number }[]).reduce((s, o) => s + o.votes, 0);
                  return (
                    <div
                      key={vote.id}
                      className="p-3 bg-white/[0.02] rounded-xl border border-white/10"
                    >
                      <div className="font-bold text-sm mb-1 truncate">{vote.question}</div>
                      <div className="flex items-center gap-3 text-xs text-white/40">
                        <span>{totalVotes} Stimme{totalVotes !== 1 ? 'n' : ''}</span>
                        <span>Endet {new Date(vote.ends_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Letzte Ergebnisse */}
          {clubId && <LastResultsCard fixtures={clubFixtures} clubId={clubId} />}

          {/* Club Info */}
          <Card className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-white/50" />
              <span className="font-black">{t('clubInfo')}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {club.stadium && (
                <div className="bg-white/[0.02] rounded-xl p-3">
                  <div className="text-xs text-white/50 mb-1">{t('stadium')}</div>
                  <div className="font-bold text-sm">{club.stadium}</div>
                </div>
              )}
              {club.city && (
                <div className="bg-white/[0.02] rounded-xl p-3">
                  <div className="text-xs text-white/50 mb-1">{t('city')}</div>
                  <div className="font-bold text-sm">{club.city}</div>
                </div>
              )}
              <div className="bg-white/[0.02] rounded-xl p-3">
                <div className="text-xs text-white/50 mb-1">{t('league')}</div>
                <div className="font-bold text-sm">{club.league}</div>
              </div>
              <div className="bg-white/[0.02] rounded-xl p-3">
                <div className="text-xs text-white/50 mb-1">{t('players')}</div>
                <div className="font-bold text-sm text-[#22C55E]">{players.length}</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========== TAB: SPIELER ========== */}
      {tab === 'spieler' && (
        <div className="space-y-6">
          <div className="flex flex-col gap-3">
            <SearchInput value={spielerQuery} onChange={setSpielerQuery} placeholder={t('searchPlayers')} />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <PosFilter selected={posFilter} onChange={setPosFilter} showAll allCount={posCounts['ALL']} counts={posCounts} />
              <SortPills
                options={[
                  { id: 'perf', label: t('sortPerf') },
                  { id: 'price', label: t('sortPrice') },
                  { id: 'change', label: t('sortChange') },
                ]}
                active={sortBy}
                onChange={(id) => setSortBy(id as 'perf' | 'price' | 'change')}
              />
            </div>
          </div>

          <SponsorBanner placement="club_players" clubId={club.id} className="mb-3" />
          <div className="text-xs text-white/40 px-1">{t('playerCount', { count: filteredPlayers.length })}</div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredPlayers.map((player) => (
              <PlayerDisplay key={player.id} variant="card" player={player} showActions={false} />
            ))}
          </div>

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
                    'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-all flex items-center gap-1.5',
                    fixtureFilter === chip.id
                      ? 'bg-[#FFD700]/15 text-[#FFD700] border-[#FFD700]/30'
                      : 'bg-white/[0.02] text-white/50 border-white/10 hover:border-white/20'
                  )}
                >
                  {chip.icon && <chip.icon className="w-3 h-3" />}
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
                  const isExpanded = expandedGw.has(gw) || gw === firstUpcomingGw;
                  const gwPlayed = gwFixtures.some(f => f.status === 'simulated' || f.status === 'finished');

                  return (
                    <div key={gw} className="rounded-xl border border-white/10 overflow-hidden">
                      <button
                        onClick={() => setExpandedGw(prev => {
                          const next = new Set(prev);
                          if (next.has(gw)) next.delete(gw); else next.add(gw);
                          return next;
                        })}
                        className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.02] hover:bg-white/[0.04] transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black">{t('fixtureGameweek', { gw })}</span>
                          {gwPlayed && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#22C55E]/15 text-[#22C55E]">{t('fixturePlayed')}</span>
                          )}
                        </div>
                        <ChevronDown className={cn('w-4 h-4 text-white/30 transition-transform', isExpanded && 'rotate-180')} />
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

      {/* Club-Abo Modal */}
      <Modal title={t('subscription')} open={subModalOpen} onClose={() => { setSubModalOpen(false); setSubError(null); }}>
        <div className="p-6 max-w-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#FFD700]/10 flex items-center justify-center">
              <Crown className="w-5 h-5 text-[#FFD700]" />
            </div>
            <div>
              <h3 className="text-lg font-black">{t('subscription')}</h3>
              <p className="text-xs text-white/40">{club.name} — {t('chooseTier')}</p>
            </div>
          </div>

          {subError && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{subError}</div>
          )}

          <div className="space-y-3">
            {(Object.entries(TIER_CONFIG) as [SubscriptionTier, typeof TIER_CONFIG[SubscriptionTier]][]).map(([tier, cfg]) => {
              const isActive = subscription?.tier === tier && subscription?.status === 'active';
              return (
                <div
                  key={tier}
                  className={`rounded-xl border p-4 transition-all ${
                    isActive
                      ? `border-[${cfg.color}]/40 bg-[${cfg.color}]/10`
                      : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}>
                        <Crown className="w-3 h-3" />
                      </div>
                      <span className="font-black" style={{ color: cfg.color }}>{cfg.label}</span>
                      {isActive && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#22C55E]/20 text-[#22C55E]">Aktiv</span>}
                    </div>
                    <span className="font-mono font-bold text-sm">{fmtScout(cfg.priceBsd)} $SCOUT<span className="text-white/30 text-[10px]">/Monat</span></span>
                  </div>
                  <ul className="space-y-1 mb-3">
                    {cfg.benefits.map(b => (
                      <li key={b} className="text-xs text-white/50 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-[#22C55E] flex-shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                  {isActive ? (
                    <div className="flex gap-2">
                      {subscription?.auto_renew ? (
                        <Button variant="outline" size="sm" onClick={handleCancelSub} disabled={subLoading}>
                          {t('disableAutoRenew')}
                        </Button>
                      ) : (
                        <span className="text-xs text-white/30">Verlängerung deaktiviert</span>
                      )}
                    </div>
                  ) : (
                    <Button
                      variant={tier === 'gold' ? 'gold' : 'outline'}
                      size="sm"
                      className="w-full"
                      onClick={() => handleSubscribe(tier)}
                      disabled={subLoading}
                    >
                      {subLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('subscribe', { tier: cfg.label })}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-white/25 mt-4 text-center">
            {t('subscriptionDisclaimer')}
          </p>
        </div>
      </Modal>
    </div>
  );
}
