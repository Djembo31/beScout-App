'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Users, Trophy, BadgeCheck, ChevronRight, Clock, Vote, TrendingUp,
  Shield, BarChart3, Calendar, MapPin,
  Building2, Zap, Crown, Gift, MessageCircle, Share2,
  Bell, Flame, CheckCircle2, Briefcase,
  ArrowUpRight, ArrowDownRight, ExternalLink, Users2,
  Loader2, Plus, FileText, Settings,
} from 'lucide-react';
import { Card, Button, Chip, Modal, ErrorState, Skeleton, SkeletonCard, TabBar, SearchInput, PosFilter, SortPills } from '@/components/ui';
import { PositionBadge } from '@/components/player';
import { PlayerDisplay } from '@/components/player/PlayerRow';
import { useUser } from '@/components/providers/AuthProvider';
import { dbToPlayers, centsToBsd } from '@/lib/services/players';
import { toggleFollowClub } from '@/lib/services/club';
import { fmtBSD, cn } from '@/lib/utils';
import { getAllVotes, castVote, createVote } from '@/lib/services/votes';
import { formatBsd } from '@/lib/services/wallet';
import { unlockResearch, rateResearch, resolveExpiredResearch } from '@/lib/services/research';
import { subscribeTo, cancelSubscription, TIER_CONFIG } from '@/lib/services/clubSubscriptions';
import type { ClubSubscription, SubscriptionTier } from '@/lib/services/clubSubscriptions';
import ResearchCard from '@/components/community/ResearchCard';
import { useClubBySlug, useClubSubscription } from '@/lib/queries/misc';
import { usePlayersByClub } from '@/lib/queries/players';
import { useClubFollowerCount, useIsFollowingClub } from '@/lib/queries/social';
import { useClubRecentTrades } from '@/lib/queries/trades';
import { useHoldings } from '@/lib/queries/holdings';
import { useClubVotes, useUserVotedIds } from '@/lib/queries/votes';
import { useClubResearch } from '@/lib/queries/research';
import { queryClient } from '@/lib/queryClient';
import { qk } from '@/lib/queries/keys';
import type { Player, Pos, DbPlayer, DbTrade, DbIpo, DbClubVote, ClubWithAdmin, ResearchPostWithAuthor } from '@/types';

// ============================================
// TYPES
// ============================================

type ClubTab = 'uebersicht' | 'spieler' | 'club';

type TradeWithPlayer = DbTrade & {
  player: { first_name: string; last_name: string; position: string };
};

// ============================================
// MEMBERSHIP TIERS (constant)
// ============================================

const MEMBERSHIP_TIERS = [
  {
    id: 'supporter',
    name: 'Supporter',
    minDpc: 1,
    maxDpc: 99,
    color: 'from-white/20 to-white/5',
    borderColor: 'border-white/20',
    icon: '🎫',
    benefits: [
      'Zugang zu Club Votes',
      'Club News & Updates',
      'Basis-Badge im Profil',
    ],
  },
  {
    id: 'member',
    name: 'Member',
    minDpc: 100,
    maxDpc: 499,
    color: 'from-green-500/20 to-green-500/5',
    borderColor: 'border-green-500/30',
    icon: '⭐',
    benefits: [
      'Alle Supporter Benefits',
      'Frühzeitiger Zugang zu IPOs',
      '5% Rabatt auf Votes',
      'Exklusiver Discord-Kanal',
    ],
  },
  {
    id: 'vip',
    name: 'VIP',
    minDpc: 500,
    maxDpc: 1999,
    color: 'from-purple-500/20 to-purple-500/5',
    borderColor: 'border-purple-500/30',
    icon: '💎',
    benefits: [
      'Alle Member Benefits',
      '10% Rabatt auf alle Fees',
      'Monatlicher AMA mit Spielern',
      'Signiertes Merchandise (jährlich)',
    ],
  },
  {
    id: 'legend',
    name: 'Legend',
    minDpc: 2000,
    maxDpc: null as number | null,
    color: 'from-[#FFD700]/20 to-[#FFD700]/5',
    borderColor: 'border-[#FFD700]/30',
    icon: '👑',
    benefits: [
      'Alle VIP Benefits',
      '20% Rabatt auf alle Fees',
      'Meet & Greet (1x pro Saison)',
      'VIP-Tickets (2x pro Saison)',
      'Name auf der Ehrentafel',
    ],
  },
];

function getUserMembershipTier(totalDpc: number) {
  if (totalDpc >= 2000) return MEMBERSHIP_TIERS[3];
  if (totalDpc >= 500) return MEMBERSHIP_TIERS[2];
  if (totalDpc >= 100) return MEMBERSHIP_TIERS[1];
  if (totalDpc >= 1) return MEMBERSHIP_TIERS[0];
  return null;
}

// ============================================
// TABS CONFIG
// ============================================

const TABS: { id: ClubTab; label: string }[] = [
  { id: 'uebersicht', label: 'Übersicht' },
  { id: 'spieler', label: 'Spieler' },
  { id: 'club', label: 'Club & Member' },
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
  userTier,
  userClubDpc,
  totalVolume24h,
  playerCount,
}: {
  club: ClubWithAdmin;
  followerCount: number;
  isFollowing: boolean;
  followLoading: boolean;
  onFollow: () => void;
  userTier: typeof MEMBERSHIP_TIERS[0] | null;
  userClubDpc: number;
  totalVolume24h: number;
  playerCount: number;
}) {
  const clubColor = club.primary_color || '#006633';
  const stadiumSrc = `/stadiums/${club.slug}.jpg`;

  return (
    <div className="relative h-[160px] md:h-[350px] -mx-4 md:-mx-6 -mt-4 md:-mt-6 mb-6 overflow-hidden">
      {/* Stadium Background */}
      <div className="absolute inset-0">
        <Image
          src={stadiumSrc}
          alt={club.stadium || club.name}
          fill
          className="object-cover blur-sm scale-105"
          priority
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
                <h1 className="text-lg md:text-4xl font-black tracking-tight text-white drop-shadow-lg">
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
              <div className="text-[10px] md:text-xs text-white/50">Scouts</div>
            </div>
            <div className="w-px h-5 md:h-10 bg-white/20" />
            <div className="text-center">
              <div className="text-sm md:text-2xl font-black text-[#FFD700]">{fmtBSD(totalVolume24h)}</div>
              <div className="text-[10px] md:text-xs text-white/50">24h Vol</div>
            </div>
            <div className="w-px h-5 md:h-10 bg-white/20" />
            <div className="text-center">
              <div className="text-sm md:text-2xl font-black text-[#22C55E]">{playerCount}</div>
              <div className="text-[10px] md:text-xs text-white/50">Spieler</div>
            </div>
            <div className="w-px h-5 md:h-10 bg-white/20 hidden md:block" />
            <Button
              variant={isFollowing ? 'outline' : 'gold'}
              size="sm"
              onClick={onFollow}
              disabled={followLoading}
              className="hidden md:flex"
            >
              {followLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isFollowing ? <><CheckCircle2 className="w-4 h-4" /> Abonniert</> : <><Bell className="w-4 h-4" /> Folgen</>}
            </Button>
          </div>

          {/* Mobile-only follow button */}
          <div className="md:hidden flex items-center justify-center gap-2">
            <Button
              variant={isFollowing ? 'outline' : 'gold'}
              size="sm"
              onClick={onFollow}
              disabled={followLoading}
            >
              {followLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isFollowing ? 'Abonniert' : 'Folgen'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// STATS BAR
// ============================================

function StatsBar({
  totalVolume24h,
  totalDpcFloat,
  avgPerf,
  followerCount,
  playerCount,
}: {
  totalVolume24h: number;
  totalDpcFloat: number;
  avgPerf: number;
  followerCount: number;
  playerCount: number;
}) {
  const stats = [
    { label: '24h Volume', value: fmtBSD(totalVolume24h), suffix: 'BSD', icon: BarChart3, color: 'text-[#FFD700]' },
    { label: 'DPC Float', value: totalDpcFloat.toLocaleString(), suffix: 'DPC', icon: Briefcase, color: 'text-white' },
    { label: 'Ø Performance', value: avgPerf.toFixed(1), suffix: '', icon: TrendingUp, color: 'text-purple-400' },
    { label: 'Scouts', value: followerCount.toLocaleString(), suffix: '', icon: Users2, color: 'text-sky-400' },
    { label: 'Spieler', value: playerCount.toString(), suffix: '', icon: Users, color: 'text-[#22C55E]' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {stats.map((stat, i) => (
        <Card key={i} className="p-3 md:p-4 hover:border-white/20 transition-all">
          <div className="flex items-start justify-between mb-2">
            <stat.icon className={`w-5 h-5 ${stat.color}`} />
          </div>
          <div className={`text-xl font-mono font-black ${stat.color}`}>
            {stat.value}
            {stat.suffix && <span className="text-sm text-white/50 ml-1">{stat.suffix}</span>}
          </div>
          <div className="text-xs text-white/50">{stat.label}</div>
        </Card>
      ))}
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
        <Chip className="mt-2 bg-purple-500/15 text-purple-300 border-purple-500/25">Abgestimmt</Chip>
      )}
      {!hasVoted && isActive && vote.cost_bsd > 0 && (
        <div className="text-[10px] text-white/30 mt-2">Kosten: {formatBsd(vote.cost_bsd)} BSD</div>
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
}: {
  players: Player[];
  onViewAll: () => void;
}) {
  const topPlayers = useMemo(
    () => [...players].sort((a, b) => b.prices.change24h - a.prices.change24h).slice(0, 3),
    [players]
  );

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-400" />
          <span className="font-black text-lg">Trending Spieler</span>
        </div>
        <button onClick={onViewAll} className="text-xs text-[#FFD700] hover:underline flex items-center gap-1">
          Alle anzeigen <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-3">
        {topPlayers.map((player, i) => (
          <Link key={player.id} href={`/player/${player.id}`}>
            <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/10 hover:border-[#FFD700]/30 transition-all">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${
                  i === 0 ? 'bg-[#FFD700]/20 text-[#FFD700]' :
                  i === 1 ? 'bg-white/10 text-white/70' :
                  'bg-orange-500/20 text-orange-400'
                }`}>
                  {i + 1}
                </div>
                <PositionBadge pos={player.pos} size="sm" />
                <div>
                  <div className="font-bold text-sm">{player.first} {player.last}</div>
                  <div className="text-[10px] text-white/40">{fmtBSD(player.prices.lastTrade)} BSD</div>
                </div>
              </div>
              <div className={`flex items-center gap-1 font-mono font-bold ${player.prices.change24h >= 0 ? 'text-[#22C55E]' : 'text-red-400'}`}>
                {player.prices.change24h >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {Math.abs(player.prices.change24h).toFixed(1)}%
              </div>
            </div>
          </Link>
        ))}
        {topPlayers.length === 0 && (
          <div className="text-center text-white/40 py-6">Keine Spieler geladen</div>
        )}
      </div>
    </Card>
  );
}

// ============================================
// SQUAD OVERVIEW WIDGET
// ============================================

function SquadOverviewWidget({ players }: { players: Player[] }) {
  const breakdown = useMemo(() => {
    const counts: Record<Pos, number> = { GK: 0, DEF: 0, MID: 0, ATT: 0 };
    players.forEach((p) => { counts[p.pos]++; });
    return counts;
  }, [players]);

  const total = players.length;
  const posColors: Record<Pos, string> = { GK: 'bg-emerald-500', DEF: 'bg-amber-500', MID: 'bg-sky-500', ATT: 'bg-rose-500' };
  const posLabels: Record<Pos, string> = { GK: 'Torwart', DEF: 'Verteidiger', MID: 'Mittelfeld', ATT: 'Angriff' };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-white/50" />
        <span className="font-black text-lg">Squad-Überblick</span>
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
                  <div className="font-mono font-bold text-[#FFD700]">{fmtBSD(priceBsd)} BSD</div>
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

function MembershipTierCard({
  tier,
  isCurrentTier,
  userDpc,
}: {
  tier: typeof MEMBERSHIP_TIERS[0];
  isCurrentTier: boolean;
  userDpc: number;
}) {
  const nextTierIndex = MEMBERSHIP_TIERS.findIndex((t) => t.id === tier.id) + 1;
  const nextTier = nextTierIndex < MEMBERSHIP_TIERS.length ? MEMBERSHIP_TIERS[nextTierIndex] : null;
  const dpcToNextTier = nextTier ? nextTier.minDpc - userDpc : 0;

  return (
    <Card className={`p-6 transition-all ${isCurrentTier ? `bg-gradient-to-br ${tier.color} ${tier.borderColor} border-2` : 'opacity-60'}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Crown className={`w-6 h-6 ${isCurrentTier ? 'text-[#FFD700]' : 'text-white/30'}`} />
          <div>
            <div className="font-black text-lg">{tier.name}</div>
            <div className="text-xs text-white/50">{tier.minDpc}+ DPC{tier.maxDpc ? ` (bis ${tier.maxDpc})` : ''}</div>
          </div>
        </div>
        {isCurrentTier && (
          <Chip className="bg-[#FFD700]/15 text-[#FFD700] border-[#FFD700]/25">Dein Tier</Chip>
        )}
      </div>

      {isCurrentTier && nextTier && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-white/50">Fortschritt zu {nextTier.name}</span>
            <span className="font-mono">{userDpc} / {nextTier.minDpc} DPC</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#FFD700] to-[#22C55E] rounded-full"
              style={{ width: `${(userDpc / nextTier.minDpc) * 100}%` }}
            />
          </div>
          <div className="text-xs text-white/40 mt-1">
            Noch {dpcToNextTier} DPC bis zum nächsten Tier
          </div>
        </div>
      )}

      <div className="space-y-2">
        {tier.benefits.map((benefit, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <CheckCircle2 className={`w-4 h-4 ${isCurrentTier ? 'text-[#22C55E]' : 'text-white/30'}`} />
            <span className={isCurrentTier ? 'text-white/80' : 'text-white/40'}>{benefit}</span>
          </div>
        ))}
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
  const { user, profile, refreshProfile } = useUser();
  const userId = user?.id;

  // ── React Query Hooks (ALL before early returns) ──
  const { data: club, isLoading: clubLoading, isError: clubError } = useClubBySlug(slug, userId);
  const clubId = club?.id;
  const { data: dbPlayersRaw = [], isLoading: playersLoading, isError: playersError } = usePlayersByClub(clubId);
  const { data: followerCountData = 0 } = useClubFollowerCount(clubId);
  const { data: isFollowingData = false } = useIsFollowingClub(userId, clubId);
  const { data: recentTradesData = [] } = useClubRecentTrades(clubId);
  const { data: dbHoldings = [] } = useHoldings(userId);
  const { data: clubVotesData = [] } = useClubVotes(clubId ?? null);
  const { data: userVotedIdsData } = useUserVotedIds(userId);
  const { data: clubResearchData = [] } = useClubResearch(clubId, userId);
  const { data: subscriptionData = null } = useClubSubscription(userId, clubId);

  // Resolve expired research (fire-and-forget)
  useEffect(() => {
    resolveExpiredResearch().catch(err => console.error('[Club] Resolve expired research failed:', err));
  }, []);

  // ---- Derived data from hooks ----
  const players = useMemo(() => dbToPlayers(dbPlayersRaw), [dbPlayersRaw]);
  const recentTrades = recentTradesData as TradeWithPlayer[];
  const clubVotes = clubVotesData;
  const userVotedIds = userVotedIdsData ?? new Set<string>();
  const clubResearch = clubResearchData;

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
  const loading = clubLoading || (!!clubId && playersLoading);
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

  // Votes state
  const [votingId, setVotingId] = useState<string | null>(null);
  const [voteMsg, setVoteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [createVoteModalOpen, setCreateVoteModalOpen] = useState(false);
  const [cvQuestion, setCvQuestion] = useState('');
  const [cvOptions, setCvOptions] = useState(['', '']);
  const [cvCost, setCvCost] = useState('5');
  const [cvDays, setCvDays] = useState('7');
  const [cvLoading, setCvLoading] = useState(false);

  // Research state
  const [researchUnlockingId, setResearchUnlockingId] = useState<string | null>(null);
  const [researchRatingId, setResearchRatingId] = useState<string | null>(null);

  // Club-Abo state
  const [subscription, setSubscription] = useState<ClubSubscription | null>(null);
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);

  // Sync subscription from query
  useEffect(() => {
    if (subscriptionData !== undefined) setSubscription(subscriptionData);
  }, [subscriptionData]);

  // ---- Vote Handlers ----
  const handleCastVote = useCallback(async (voteId: string, optionIndex: number) => {
    if (!user || !club || votingId) return;
    setVotingId(voteId);
    setVoteMsg(null);
    try {
      await castVote(user.id, voteId, optionIndex);
      queryClient.invalidateQueries({ queryKey: qk.votes.byClub(club.id) });
      queryClient.invalidateQueries({ queryKey: qk.clubs.votedIds(user.id) });
      setVoteMsg({ type: 'success', text: 'Stimme abgegeben!' });
    } catch (err) {
      setVoteMsg({ type: 'error', text: err instanceof Error ? err.message : 'Fehler beim Abstimmen.' });
    } finally {
      setVotingId(null);
    }
  }, [user, club, votingId]);

  const handleCreateVote = useCallback(async () => {
    if (!user || !club || cvLoading) return;
    const validOptions = cvOptions.filter(o => o.trim());
    if (!cvQuestion.trim() || validOptions.length < 2) return;
    setCvLoading(true);
    try {
      await createVote({
        userId: user.id,
        clubId: club.id,
        clubName: club.name,
        question: cvQuestion.trim(),
        options: validOptions.map(o => o.trim()),
        costCents: Math.round(parseFloat(cvCost || '0') * 100),
        durationDays: parseInt(cvDays || '7'),
      });
      setCreateVoteModalOpen(false);
      setCvQuestion('');
      setCvOptions(['', '']);
      setCvCost('5');
      setCvDays('7');
      queryClient.invalidateQueries({ queryKey: qk.votes.byClub(club.id) });
    } catch (err) {
      setVoteMsg({ type: 'error', text: err instanceof Error ? err.message : 'Fehler beim Erstellen.' });
    } finally {
      setCvLoading(false);
    }
  }, [user, club, cvLoading, cvQuestion, cvOptions, cvCost, cvDays]);

  // ---- Research Handlers ----
  const handleResearchUnlock = useCallback(async (researchId: string) => {
    if (!user || !club || researchUnlockingId) return;
    setResearchUnlockingId(researchId);
    try {
      const result = await unlockResearch(user.id, researchId);
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['research'] });
      }
    } catch (err) {
      console.error('[Club] Research unlock failed:', err);
    } finally {
      setResearchUnlockingId(null);
    }
  }, [user, club, researchUnlockingId]);

  const handleResearchRate = useCallback(async (researchId: string, rating: number) => {
    if (!user || researchRatingId) return;
    setResearchRatingId(researchId);
    try {
      const result = await rateResearch(user.id, researchId, rating);
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['research'] });
      }
    } catch (err) {
      console.error('[Club] Research rate failed:', err);
    } finally {
      setResearchRatingId(null);
    }
  }, [user, researchRatingId]);

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

  const userTier = useMemo(() => getUserMembershipTier(userClubDpc), [userClubDpc]);

  const userClubPlayers = useMemo(
    () => players.filter((p) => userHoldingsQty[p.id] > 0),
    [players, userHoldingsQty]
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
      queryClient.invalidateQueries({ queryKey: qk.clubs.isFollowing(user.id, club.id) });
      queryClient.invalidateQueries({ queryKey: qk.clubs.followers(club.id) });
    } catch {
      setLocalFollowing(!newFollowing);
      setLocalFollowerDelta(prev => prev + (newFollowing ? -1 : 1));
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
    } catch (err) { console.error('[Club] Cancel subscription failed:', err); }
    finally { setSubLoading(false); }
  }, [user, club]);

  // ---- Loading / Error ----
  if (loading) return <ClubSkeleton />;

  if (notFound) {
    return (
      <div className="max-w-xl mx-auto mt-20 text-center">
        <Building2 className="w-16 h-16 mx-auto mb-4 text-white/20" />
        <h2 className="text-2xl font-black mb-2">Club nicht gefunden</h2>
        <p className="text-white/50 mb-6">Der Club &quot;{slug}&quot; existiert nicht.</p>
        <Link href="/">
          <Button variant="outline">Zurück zur Startseite</Button>
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
        userTier={userTier}
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
                  <div className="text-sm font-bold">{TIER_CONFIG[subscription.tier as SubscriptionTier]?.label}-Mitglied</div>
                  <div className="text-[10px] text-white/40">
                    {subscription.auto_renew ? 'Verlängert am' : 'Läuft ab am'} {new Date(subscription.expires_at).toLocaleDateString('de-DE')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setSubModalOpen(true)}>
                  {subscription.auto_renew ? 'Verwalten' : 'Verlängern'}
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
                    <div className="text-sm font-bold">Club-Mitglied werden</div>
                    <div className="text-[10px] text-white/40">Ab 500 BSD/Monat — Early Access, Badges, Premium Events</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/30" />
              </div>
            </Card>
          )}
        </div>
      )}

      {/* TABS + Admin Link */}
      <div className="flex items-center gap-2 mb-6">
        <div className="flex-1">
          <TabBar tabs={TABS} activeTab={tab} onChange={(id) => setTab(id as ClubTab)} />
        </div>
        {club.is_admin && (
          <Link
            href={`/club/${slug}/admin`}
            className="flex-shrink-0 px-3 py-2 text-sm font-semibold text-white/60 hover:text-white transition-all whitespace-nowrap flex items-center gap-1.5"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden md:inline">Admin</span>
          </Link>
        )}
      </div>

      {/* ========== TAB: ÜBERSICHT ========== */}
      {tab === 'uebersicht' && (
        <div className="space-y-6">
          {/* Dein Status */}
          {userTier ? (
            <Card className={`p-4 bg-gradient-to-br ${userTier.color} ${userTier.borderColor}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{userTier.icon}</span>
                  <div>
                    <div className="font-black">{userTier.name}</div>
                    <div className="text-xs text-white/50">{userClubDpc} DPC</div>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setTab('club')}>
                  Details
                </Button>
              </div>
            </Card>
          ) : null}

          <TopPlayersWidget players={players} onViewAll={() => setTab('spieler')} />

          {/* Deine Spieler */}
          {userClubPlayers.length > 0 && (
            <Card className="p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Briefcase className="w-5 h-5 text-[#FFD700]" />
                <span className="font-black">Deine Spieler</span>
              </div>
              <div className="space-y-2">
                {userClubPlayers.map((player) => (
                  <Link key={player.id} href={`/player/${player.id}`}>
                    <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/10 hover:border-[#FFD700]/30 transition-all">
                      <div className="flex items-center gap-2">
                        <PositionBadge pos={player.pos} size="sm" />
                        <div>
                          <div className="font-bold text-sm">{player.first} {player.last}</div>
                          <div className="text-[10px] text-white/40">{fmtBSD(player.prices.lastTrade)} BSD</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-[#FFD700]">{userHoldingsQty[player.id]}</div>
                        <div className="text-[10px] text-white/40">DPC</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          <ActivityFeed trades={recentTrades} title="Aktivitäts-Feed" emptyText="Noch keine Trades für diesen Club" />

          {/* Club Info */}
          <Card className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-white/50" />
              <span className="font-black">Club Info</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {club.stadium && (
                <div className="bg-white/[0.02] rounded-xl p-3">
                  <div className="text-xs text-white/50 mb-1">Stadion</div>
                  <div className="font-bold text-sm">{club.stadium}</div>
                </div>
              )}
              {club.city && (
                <div className="bg-white/[0.02] rounded-xl p-3">
                  <div className="text-xs text-white/50 mb-1">Stadt</div>
                  <div className="font-bold text-sm">{club.city}</div>
                </div>
              )}
              <div className="bg-white/[0.02] rounded-xl p-3">
                <div className="text-xs text-white/50 mb-1">Liga</div>
                <div className="font-bold text-sm">{club.league}</div>
              </div>
              <div className="bg-white/[0.02] rounded-xl p-3">
                <div className="text-xs text-white/50 mb-1">Spieler</div>
                <div className="font-bold text-sm text-[#22C55E]">{players.length}</div>
              </div>
            </div>
          </Card>

          <SquadOverviewWidget players={players} />
        </div>
      )}

      {/* ========== TAB: SPIELER ========== */}
      {tab === 'spieler' && (
        <div className="space-y-6">
          <div className="flex flex-col gap-3">
            <SearchInput value={spielerQuery} onChange={setSpielerQuery} placeholder="Spieler suchen..." />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <PosFilter selected={posFilter} onChange={setPosFilter} showAll allCount={posCounts['ALL']} counts={posCounts} />
              <SortPills
                options={[
                  { id: 'perf', label: 'Perf L5' },
                  { id: 'price', label: 'Preis' },
                  { id: 'change', label: '24h Change' },
                ]}
                active={sortBy}
                onChange={(id) => setSortBy(id as 'perf' | 'price' | 'change')}
              />
            </div>
          </div>

          <div className="text-xs text-white/40 px-1">{filteredPlayers.length} Spieler</div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredPlayers.map((player) => (
              <PlayerDisplay key={player.id} variant="card" player={player} showActions={false} />
            ))}
          </div>

          {filteredPlayers.length === 0 && (
            <div className="text-center text-white/40 py-12">
              Keine Spieler in dieser Kategorie
            </div>
          )}
        </div>
      )}

      {/* ========== TAB: CLUB & MEMBER ========== */}
      {tab === 'club' && (
        <div className="space-y-6">
          {/* Membership Tiers */}
          <div className="text-center mb-4">
            <h2 className="text-2xl font-black mb-1">Club Membership</h2>
            <p className="text-sm text-white/50">
              Je mehr DPC du von {club.name}-Spielern besitzt, desto höher dein Tier.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {MEMBERSHIP_TIERS.map((tier) => (
              <MembershipTierCard
                key={tier.id}
                tier={tier}
                isCurrentTier={userTier?.id === tier.id}
                userDpc={userClubDpc}
              />
            ))}
          </div>

          {/* Votes Section */}
          <Card className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Vote className="w-5 h-5 text-purple-400" />
                <span className="font-black">Abstimmungen</span>
              </div>
              {club.is_admin && (
                <Button variant="outline" size="sm" onClick={() => setCreateVoteModalOpen(true)}>
                  <Plus className="w-3.5 h-3.5" />
                  Neu
                </Button>
              )}
            </div>

            {voteMsg && (
              <div className={cn(
                'flex items-center gap-2 p-2.5 mb-3 rounded-xl border text-xs',
                voteMsg.type === 'success' ? 'bg-[#22C55E]/10 border-[#22C55E]/20 text-[#22C55E]' : 'bg-red-500/10 border-red-400/20 text-red-200'
              )}>
                {voteMsg.text}
              </div>
            )}

            {clubVotes.length === 0 ? (
              <div className="text-center py-6 text-white/30 text-sm">
                Noch keine Abstimmungen
              </div>
            ) : (
              <div className="space-y-4">
                {clubVotes.map((vote) => (
                  <ClubVoteCard
                    key={vote.id}
                    vote={vote}
                    hasVoted={userVotedIds.has(vote.id)}
                    onVote={handleCastVote}
                    voting={votingId}
                  />
                ))}
              </div>
            )}
          </Card>

          {/* Create Vote Modal */}
          <Modal open={createVoteModalOpen} title="Neue Abstimmung" onClose={() => setCreateVoteModalOpen(false)}>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 font-semibold mb-1.5 block">Frage</label>
                <input
                  type="text"
                  value={cvQuestion}
                  onChange={(e) => setCvQuestion(e.target.value.slice(0, 200))}
                  placeholder="z.B. Welches Trikot-Design bevorzugt ihr?"
                  className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40"
                />
              </div>

              {cvOptions.map((opt, idx) => (
                <div key={idx}>
                  <label className="text-xs text-white/50 font-semibold mb-1.5 block">Option {idx + 1}</label>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const next = [...cvOptions];
                      next[idx] = e.target.value.slice(0, 100);
                      setCvOptions(next);
                    }}
                    placeholder={`Option ${idx + 1}`}
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40"
                  />
                </div>
              ))}

              {cvOptions.length < 4 && (
                <Button variant="outline" size="sm" onClick={() => setCvOptions([...cvOptions, ''])}>
                  <Plus className="w-3.5 h-3.5" />
                  Option hinzufügen
                </Button>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 font-semibold mb-1.5 block">Kosten (BSD)</label>
                  <input
                    type="number"
                    value={cvCost}
                    onChange={(e) => setCvCost(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#FFD700]/40"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 font-semibold mb-1.5 block">Laufzeit (Tage)</label>
                  <input
                    type="number"
                    value={cvDays}
                    onChange={(e) => setCvDays(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#FFD700]/40"
                  />
                </div>
              </div>

              <Button variant="gold" fullWidth loading={cvLoading} onClick={handleCreateVote}>
                Abstimmung erstellen
              </Button>
            </div>
          </Modal>

          {/* Research Preview */}
          {clubResearch.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-400" />
                  <span className="font-black">Research</span>
                  <span className="text-xs text-white/40">{clubResearch.length} Berichte</span>
                </div>
                <Link href="/community" className="text-xs text-[#FFD700] hover:underline">
                  Alle anzeigen
                </Link>
              </div>
              {clubResearch.slice(0, 3).map(post => (
                <ResearchCard
                  key={post.id}
                  post={post}
                  onUnlock={handleResearchUnlock}
                  unlockingId={researchUnlockingId}
                  onRate={handleResearchRate}
                  ratingId={researchRatingId}
                />
              ))}
            </div>
          )}

          {/* Community Guidelines */}
          {club?.community_guidelines && (
            <Card className="p-4 border-[#FFD700]/10 bg-[#FFD700]/[0.02]">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-[#FFD700]" />
                <span className="font-bold text-sm text-[#FFD700]">Community-Richtlinien</span>
              </div>
              <p className="text-sm text-white/70 whitespace-pre-line">{club.community_guidelines}</p>
            </Card>
          )}
        </div>
      )}

      {/* Club-Abo Modal */}
      <Modal title="Club-Mitgliedschaft" open={subModalOpen} onClose={() => { setSubModalOpen(false); setSubError(null); }}>
        <div className="p-6 max-w-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#FFD700]/10 flex items-center justify-center">
              <Crown className="w-5 h-5 text-[#FFD700]" />
            </div>
            <div>
              <h3 className="text-lg font-black">Club-Mitgliedschaft</h3>
              <p className="text-xs text-white/40">{club.name} — Wähle deinen Tier</p>
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
                    <span className="font-mono font-bold text-sm">{fmtBSD(cfg.priceBsd)} BSD<span className="text-white/30 text-[10px]">/Monat</span></span>
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
                          Auto-Renew deaktivieren
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
                      {subLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : `${cfg.label} abonnieren`}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-white/25 mt-4 text-center">
            Abos werden monatlich in BSD abgerechnet. Jederzeit kündbar.
          </p>
        </div>
      </Modal>
    </div>
  );
}
