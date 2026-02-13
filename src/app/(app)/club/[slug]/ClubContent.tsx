'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Users, Trophy, BadgeCheck, ChevronRight, Clock, Vote, TrendingUp,
  Shield, BarChart3, Calendar, MapPin,
  Building2, Zap, Crown, Gift, MessageCircle, Share2,
  Bell, Flame, CheckCircle2, Briefcase, DollarSign,
  ArrowUpRight, ArrowDownRight, ExternalLink, Users2,
  Loader2, Plus, FileText, Settings,
} from 'lucide-react';
import { Card, Button, Chip, Modal, ErrorState, Skeleton, SkeletonCard } from '@/components/ui';
import { PositionBadge } from '@/components/player';
import { PlayerDisplay } from '@/components/player/PlayerRow';
import { useUser } from '@/components/providers/AuthProvider';
import { getPlayersByClubId, dbToPlayers, centsToBsd } from '@/lib/services/players';
import { getIposByClubId } from '@/lib/services/ipo';
import { getHoldings } from '@/lib/services/wallet';
import {
  getClubBySlug,
  getClubFollowerCount,
  isUserFollowingClub,
  toggleFollowClub,
  getClubRecentTrades,
  getClubDashboardStats,
} from '@/lib/services/club';
import { fmtBSD, cn } from '@/lib/utils';
import { withTimeout } from '@/lib/cache';
import { val } from '@/lib/settledHelpers';
import { getAllVotes, getUserVotedIds, castVote, createVote } from '@/lib/services/votes';
import { formatBsd } from '@/lib/services/wallet';
import { getResearchPosts, unlockResearch, rateResearch, resolveExpiredResearch } from '@/lib/services/research';
import ResearchCard from '@/components/community/ResearchCard';
import type { Player, Pos, DbPlayer, DbTrade, DbIpo, DbClubVote, ClubDashboardStats, ClubWithAdmin, ResearchPostWithAuthor } from '@/types';

// ============================================
// TYPES
// ============================================

type ClubTab = 'overview' | 'players' | 'membership' | 'community' | 'dashboard';

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

const TABS: { id: ClubTab; label: string; shortLabel: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Übersicht', shortLabel: 'Übersicht', icon: Building2 },
  { id: 'players', label: 'Spieler', shortLabel: 'Spieler', icon: Users },
  { id: 'membership', label: 'Membership', shortLabel: 'Member', icon: Crown },
  { id: 'community', label: 'Community', shortLabel: 'Social', icon: MessageCircle },
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Dashboard', icon: BarChart3 },
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

  return (
    <div className="relative h-[300px] md:h-[550px] -mx-4 md:-mx-6 -mt-4 md:-mt-6 mb-6 overflow-hidden">
      {/* Stadium Background */}
      <div className="absolute inset-0">
        <Image
          src="/Sakarya_Stadion.jpg"
          alt={club.stadium || club.name}
          fill
          className="object-cover blur-sm scale-105"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-[#0a0a0a]" />
        <div className="absolute inset-0" style={{ background: `linear-gradient(to right, ${clubColor}33, transparent)` }} />
      </div>

      {/* Center Content */}
      <div className="absolute inset-0 flex items-center justify-center pt-8">
        <div className="text-center space-y-5">
          {/* Club Logo */}
          <div className="flex justify-center">
            <div className="relative w-20 h-20 md:w-32 md:h-32 bg-white/10 backdrop-blur-md rounded-full p-2 border-4 border-white/20 shadow-2xl">
              <div className="relative w-full h-full">
                {club.logo_url ? (
                  <Image
                    src={club.logo_url}
                    alt={club.name}
                    fill
                    className="object-contain p-2"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-black text-white/50">
                    {club.short}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Club Name */}
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-3">
              <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white drop-shadow-lg">
                {club.name.toUpperCase()}
              </h1>
              {club.is_verified && (
                <BadgeCheck className="w-8 h-8 text-[#FFD700] drop-shadow-lg" />
              )}
            </div>
            <div className="flex items-center justify-center gap-2 md:gap-3 text-xs md:text-base text-white/70 flex-wrap">
              <span className="flex items-center gap-1.5">
                <Trophy className="w-4 h-4" />
                {club.league}
              </span>
              {club.city && (
                <>
                  <span className="text-white/30">•</span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {club.city}, {club.country}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center justify-center gap-3 md:gap-6">
            <div className="text-center">
              <div className="text-lg md:text-2xl font-black text-white">{followerCount.toLocaleString()}</div>
              <div className="text-xs text-white/50">Scouts</div>
            </div>
            <div className="w-px h-6 md:h-10 bg-white/20" />
            <div className="text-center">
              <div className="text-lg md:text-2xl font-black text-[#FFD700]">{fmtBSD(totalVolume24h)}</div>
              <div className="text-xs text-white/50">24h Volume</div>
            </div>
            <div className="w-px h-6 md:h-10 bg-white/20" />
            <div className="text-center">
              <div className="text-lg md:text-2xl font-black text-[#22C55E]">{playerCount}</div>
              <div className="text-xs text-white/50">Spieler</div>
            </div>
          </div>

          {/* Actions + Membership Badge */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center justify-center gap-3">
              <Button
                variant={isFollowing ? 'outline' : 'gold'}
                size="lg"
                onClick={onFollow}
                disabled={followLoading}
                className="min-w-[160px]"
              >
                {followLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isFollowing ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Abonniert
                  </>
                ) : (
                  <>
                    <Bell className="w-5 h-5" />
                    Club folgen
                  </>
                )}
              </Button>
              <Button variant="outline" size="lg">
                <Share2 className="w-5 h-5" />
                Teilen
              </Button>
            </div>

            {userTier && (
              <div className={`flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r ${userTier.color} border ${userTier.borderColor} backdrop-blur-sm`}>
                <Crown className="w-4 h-4 text-[#FFD700]" />
                <span className="text-sm font-bold">{userTier.name}</span>
                <span className="text-xs text-white/50">•</span>
                <span className="text-xs text-white/70">{userClubDpc} DPC</span>
              </div>
            )}
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
    <div className="max-w-[1600px] mx-auto">
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

  // ---- Club data ----
  const [club, setClub] = useState<ClubWithAdmin | null>(null);

  // ---- State ----
  const [tab, setTab] = useState<ClubTab>('overview');
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [notFound, setNotFound] = useState(false);

  // Real data
  const [dbPlayersRaw, setDbPlayersRaw] = useState<DbPlayer[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [userHoldingsQty, setUserHoldingsQty] = useState<Record<string, number>>({});
  const [recentTrades, setRecentTrades] = useState<TradeWithPlayer[]>([]);

  // Spieler Tab filters
  const [posFilter, setPosFilter] = useState<Pos | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'perf' | 'price' | 'change'>('perf');

  // Dashboard state
  const [dashboardStats, setDashboardStats] = useState<ClubDashboardStats | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  // Votes state
  const [clubVotes, setClubVotes] = useState<DbClubVote[]>([]);
  const [userVotedIds, setUserVotedIds] = useState<Set<string>>(new Set());
  const [votingId, setVotingId] = useState<string | null>(null);
  const [voteMsg, setVoteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [createVoteModalOpen, setCreateVoteModalOpen] = useState(false);
  const [cvQuestion, setCvQuestion] = useState('');
  const [cvOptions, setCvOptions] = useState(['', '']);
  const [cvCost, setCvCost] = useState('5');
  const [cvDays, setCvDays] = useState('7');
  const [cvLoading, setCvLoading] = useState(false);

  // Research state
  const [clubResearch, setClubResearch] = useState<ResearchPostWithAuthor[]>([]);
  const [researchUnlockingId, setResearchUnlockingId] = useState<string | null>(null);
  const [researchRatingId, setResearchRatingId] = useState<string | null>(null);

  // ---- Load Data ----
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setDataError(false);
      setNotFound(false);
      try {
        // Step 1: Load club by slug
        const clubData = await getClubBySlug(slug, user?.id);
        if (cancelled) return;
        if (!clubData) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setClub(clubData);
        const cid = clubData.id;

        // Step 2: Parallel fetch with timeout
        const clubResults = await withTimeout(Promise.allSettled([
          getPlayersByClubId(cid),
          getClubFollowerCount(cid),
        ]), 10000);

        if (cancelled) return;

        const playersResult = val(clubResults[0], []);
        const followerResult = val(clubResults[1], 0);

        if (clubResults[0].status === 'rejected') {
          if (!cancelled) setDataError(true);
          return;
        }

        setDbPlayersRaw(playersResult);
        setPlayers(dbToPlayers(playersResult));
        setFollowerCount(followerResult);

        // User-specific data
        if (user) {
          const [followingResult, holdingsResult] = await Promise.all([
            isUserFollowingClub(user.id, cid),
            getHoldings(user.id),
          ]);

          if (cancelled) return;

          setIsFollowing(followingResult);

          const clubPlayerIds = new Set(playersResult.map((p) => p.id));
          const holdingsMap: Record<string, number> = {};
          holdingsResult.forEach((h) => {
            if (clubPlayerIds.has(h.player_id)) {
              holdingsMap[h.player_id] = h.quantity;
            }
          });
          setUserHoldingsQty(holdingsMap);
        }

        // Trades
        const tradesResult = await getClubRecentTrades(cid, 10);
        if (!cancelled) setRecentTrades(tradesResult);

        // Club votes
        const votesResult = await getAllVotes(cid);
        if (!cancelled) setClubVotes(votesResult);

        if (user) {
          const votedResult = await getUserVotedIds(user.id);
          if (!cancelled) setUserVotedIds(votedResult);
        }

        // Research
        resolveExpiredResearch().catch(() => {});
        const researchResult = await getResearchPosts({ clubId: cid, currentUserId: user?.id });
        if (!cancelled) setClubResearch(researchResult);
      } catch {
        if (!cancelled) setDataError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [user, slug, retryCount]);

  // ---- Vote Handlers ----
  const handleCastVote = useCallback(async (voteId: string, optionIndex: number) => {
    if (!user || !club || votingId) return;
    setVotingId(voteId);
    setVoteMsg(null);
    try {
      await castVote(user.id, voteId, optionIndex);
      const [votesResult, votedResult] = await Promise.all([
        getAllVotes(club.id),
        getUserVotedIds(user.id),
      ]);
      setClubVotes(votesResult);
      setUserVotedIds(votedResult);
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
      const votesResult = await getAllVotes(club.id);
      setClubVotes(votesResult);
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
        const updated = await getResearchPosts({ clubId: club.id, currentUserId: user.id });
        setClubResearch(updated);
      }
    } catch {
      // silently fail
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
        setClubResearch(prev => prev.map(p =>
          p.id === researchId
            ? { ...p, avg_rating: result.avg_rating ?? p.avg_rating, ratings_count: result.ratings_count ?? p.ratings_count, user_rating: result.user_rating ?? p.user_rating }
            : p
        ));
      }
    } catch {
      // silently fail
    } finally {
      setResearchRatingId(null);
    }
  }, [user, researchRatingId]);

  // ---- Lazy-load Dashboard Stats ----
  useEffect(() => {
    if (tab !== 'dashboard' || dashboardStats !== null || !club) return;
    let cancelled = false;
    setDashboardLoading(true);
    getClubDashboardStats(club.id)
      .then((stats) => { if (!cancelled) setDashboardStats(stats); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setDashboardLoading(false); });
    return () => { cancelled = true; };
  }, [tab, dashboardStats, club]);

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

  const totalDpcCirculation = useMemo(
    () => dbPlayersRaw.reduce((sum, p) => sum + (p.dpc_total - p.dpc_available), 0),
    [dbPlayersRaw]
  );

  const voteRevenueCents = useMemo(
    () => clubVotes.reduce((sum, v) => sum + v.total_votes * v.cost_bsd, 0),
    [clubVotes]
  );

  const totalRevenueCents = useMemo(
    () => (dashboardStats?.ipo_revenue_cents ?? 0) + voteRevenueCents,
    [dashboardStats, voteRevenueCents]
  );

  const topTradedPlayers = useMemo(() => {
    const sorted = [...dbPlayersRaw].sort((a, b) => b.volume_24h - a.volume_24h);
    return sorted.slice(0, 5);
  }, [dbPlayersRaw]);

  const filteredPlayers = useMemo(() => {
    let filtered = posFilter === 'ALL' ? players : players.filter((p) => p.pos === posFilter);
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'perf') return b.perf.l5 - a.perf.l5;
      if (sortBy === 'price') return b.prices.lastTrade - a.prices.lastTrade;
      return b.prices.change24h - a.prices.change24h;
    });
    return filtered;
  }, [players, posFilter, sortBy]);

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

    setIsFollowing(newFollowing);
    setFollowerCount((prev) => prev + (newFollowing ? 1 : -1));

    try {
      await toggleFollowClub(user.id, club.id, club.name, newFollowing);
      await refreshProfile();
    } catch {
      setIsFollowing(!newFollowing);
      setFollowerCount((prev) => prev + (newFollowing ? -1 : 1));
    } finally {
      setFollowLoading(false);
    }
  }, [user, club, isFollowing, followLoading, refreshProfile]);

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
        <ErrorState onRetry={() => setRetryCount((c) => c + 1)} />
      </div>
    );
  }

  const clubColor = club.primary_color || '#006633';

  return (
    <div className="max-w-[1600px] mx-auto">

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

      {/* TABS + Admin Link */}
      <div className="flex items-center border-b border-white/10 overflow-x-auto mb-6 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-shrink-0 px-2.5 md:px-4 py-2.5 text-sm font-semibold transition-all relative whitespace-nowrap flex items-center gap-1.5 ${
              tab === t.id ? `text-white` : 'text-white/60 hover:text-white'
            }`}
          >
            <t.icon className="w-4 h-4 hidden md:block" />
            <span className="md:hidden">{t.shortLabel}</span>
            <span className="hidden md:inline">{t.label}</span>
            {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: clubColor }} />}
          </button>
        ))}
        {club.is_admin && (
          <Link
            href={`/club/${slug}/admin`}
            className="flex-shrink-0 px-2.5 md:px-4 py-2.5 text-sm font-semibold text-white/60 hover:text-white transition-all whitespace-nowrap flex items-center gap-1.5 ml-auto"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden md:inline">Admin</span>
          </Link>
        )}
      </div>

      {/* ========== TAB: OVERVIEW ========== */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <TopPlayersWidget players={players} onViewAll={() => setTab('players')} />
            <SquadOverviewWidget players={players} />
            <ActivityFeed trades={recentTrades} title="Aktivitäts-Feed" emptyText="Noch keine Trades für diesen Club" />
          </div>

          <div className="space-y-6">
            {userTier ? (
              <Card className={`p-6 bg-gradient-to-br ${userTier.color} ${userTier.borderColor}`}>
                <div className="flex items-center gap-2 mb-4">
                  <Crown className="w-5 h-5 text-[#FFD700]" />
                  <span className="font-black">Dein Status</span>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-2xl font-black">{userTier.name}</div>
                    <div className="text-sm text-white/50">{userClubDpc} DPC von {club.name}</div>
                  </div>
                  <div className="text-4xl">{userTier.icon}</div>
                </div>
                <Button variant="outline" fullWidth onClick={() => setTab('membership')}>
                  Membership Details
                </Button>
              </Card>
            ) : (
              <Card className="p-6 border-dashed border-white/20">
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="w-5 h-5 text-white/30" />
                  <span className="font-black text-white/50">Kein Membership</span>
                </div>
                <p className="text-sm text-white/40 mb-4">
                  Kaufe DPC von {club.name}-Spielern um Club-Member zu werden.
                </p>
                <Button variant="gold" fullWidth onClick={() => setTab('players')}>
                  <Briefcase className="w-4 h-4" />
                  Spieler ansehen
                </Button>
              </Card>
            )}

            {/* Club Info */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-white/50" />
                <span className="font-black">Club Info</span>
              </div>
              <div className="space-y-3 text-sm">
                {club.stadium && (
                  <div className="flex items-center justify-between">
                    <span className="text-white/50">Stadion</span>
                    <span>{club.stadium}</span>
                  </div>
                )}
                {club.city && (
                  <div className="flex items-center justify-between">
                    <span className="text-white/50">Stadt</span>
                    <span>{club.city}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-white/50">Liga</span>
                  <span>{club.league}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50">Spieler auf BeScout</span>
                  <span className="text-[#22C55E] font-bold">{players.length}</span>
                </div>
              </div>
            </Card>

            {/* Deine Spieler */}
            {userClubPlayers.length > 0 && (
              <Card className="p-6">
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
          </div>
        </div>
      )}

      {/* ========== TAB: PLAYERS ========== */}
      {tab === 'players' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              {(['ALL', 'GK', 'DEF', 'MID', 'ATT'] as const).map((pos) => (
                <button
                  key={pos}
                  onClick={() => setPosFilter(pos)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all ${
                    posFilter === pos
                      ? 'bg-white/10 border border-white/20 text-white'
                      : 'bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-white/20'
                  }`}
                  style={posFilter === pos ? { borderColor: `${clubColor}66`, backgroundColor: `${clubColor}22` } : {}}
                >
                  {pos === 'ALL' ? 'Alle' : pos}
                  <span className="ml-1 text-xs text-white/40">{posCounts[pos]}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {([
                { id: 'perf' as const, label: 'Perf L5' },
                { id: 'price' as const, label: 'Preis' },
                { id: 'change' as const, label: '24h Change' },
              ]).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSortBy(s.id)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all ${
                    sortBy === s.id
                      ? 'bg-white/10 border border-white/20 text-white'
                      : 'bg-white/5 border border-white/10 text-white/50 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-white/50 text-sm">{filteredPlayers.length} Spieler</div>

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

      {/* ========== TAB: MEMBERSHIP ========== */}
      {tab === 'membership' && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black mb-2">Club Membership</h2>
            <p className="text-white/50 max-w-2xl mx-auto">
              Je mehr DPC du von {club.name}-Spielern besitzt, desto höher dein Tier und desto mehr Benefits erhältst du.
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

          <Card className="p-6 bg-gradient-to-r from-white/5 to-white/[0.02] border-white/10" style={{ borderColor: `${clubColor}4D` }}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${clubColor}33` }}>
                <Gift className="w-6 h-6" style={{ color: clubColor }} />
              </div>
              <div className="flex-1">
                <div className="font-black text-lg mb-1">Wie steige ich auf?</div>
                <div className="text-sm text-white/60 mb-4">
                  Kaufe DPC von {club.name}-Spielern auf dem Marktplatz.
                  Die Summe aller deiner DPCs bestimmt dein Membership-Tier.
                </div>
                <Button variant="gold" onClick={() => setTab('players')}>
                  <Briefcase className="w-4 h-4" />
                  Spieler ansehen
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========== TAB: DASHBOARD ========== */}
      {tab === 'dashboard' && (
        <div className="space-y-6">

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="p-4 bg-gradient-to-br from-[#FFD700]/10 to-[#FFD700]/[0.02] border-[#FFD700]/20">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-[#FFD700]" />
                <span className="text-xs text-white/50">Gesamt-Umsatz</span>
              </div>
              {dashboardLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <div className="text-xl font-mono font-black text-[#FFD700]">
                  {formatBsd(totalRevenueCents)} <span className="text-sm text-white/50">BSD</span>
                </div>
              )}
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-white/50" />
                <span className="text-xs text-white/50">DPC Umsatz</span>
              </div>
              {dashboardLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <div className="text-xl font-mono font-black text-white">
                  {formatBsd(dashboardStats?.ipo_revenue_cents ?? 0)} <span className="text-sm text-white/50">BSD</span>
                </div>
              )}
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-white/50" />
                <span className="text-xs text-white/50">Trading Vol. 24h</span>
              </div>
              <div className="text-xl font-mono font-black text-white">
                {fmtBSD(totalVolume24h)} <span className="text-sm text-white/50">BSD</span>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Vote className="w-5 h-5 text-purple-400" />
                <span className="text-xs text-white/50">Vote Einnahmen</span>
              </div>
              <div className="text-xl font-mono font-black text-purple-400">
                {formatBsd(voteRevenueCents)} <span className="text-sm text-white/50">BSD</span>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Users2 className="w-5 h-5 text-sky-400" />
                  <span className="font-black text-lg">Fan-Metriken</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-white/[0.02] rounded-xl border border-white/10">
                    {dashboardLoading ? (
                      <Skeleton className="h-8 w-12 mx-auto mb-1" />
                    ) : (
                      <div className="text-2xl font-mono font-black text-white">{dashboardStats?.total_fans ?? 0}</div>
                    )}
                    <div className="text-xs text-white/50">Registrierte Fans</div>
                  </div>
                  <div className="text-center p-3 bg-white/[0.02] rounded-xl border border-white/10">
                    <div className="text-2xl font-mono font-black text-sky-400">{followerCount}</div>
                    <div className="text-xs text-white/50">Club Follower</div>
                  </div>
                  <div className="text-center p-3 bg-white/[0.02] rounded-xl border border-white/10">
                    <div className="text-2xl font-mono font-black text-[#FFD700]">{totalDpcCirculation.toLocaleString()}</div>
                    <div className="text-xs text-white/50">DPC im Umlauf</div>
                    <div className="text-[10px] text-white/30 mt-0.5">von {totalDpcFloat.toLocaleString()}</div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Flame className="w-5 h-5 text-orange-400" />
                  <span className="font-black text-lg">Meistgehandelte Spieler</span>
                </div>
                {topTradedPlayers.length === 0 ? (
                  <div className="text-center text-white/40 py-6">Keine Spieler geladen</div>
                ) : (
                  <div className="space-y-3">
                    {topTradedPlayers.map((p, i) => {
                      const priceBsd = centsToBsd(p.floor_price);
                      const vol = centsToBsd(p.volume_24h);
                      return (
                        <Link key={p.id} href={`/player/${p.id}`}>
                          <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/10 hover:border-[#FFD700]/30 transition-all">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${
                                i === 0 ? 'bg-[#FFD700]/20 text-[#FFD700]' :
                                i === 1 ? 'bg-white/10 text-white/70' :
                                i === 2 ? 'bg-orange-500/20 text-orange-400' :
                                'bg-white/5 text-white/40'
                              }`}>
                                {i + 1}
                              </div>
                              <PositionBadge pos={p.position as Pos} size="sm" />
                              <div>
                                <div className="font-bold text-sm">{p.first_name} {p.last_name}</div>
                                <div className="text-[10px] text-white/40">{fmtBSD(priceBsd)} BSD</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-bold text-[#FFD700] text-sm">{fmtBSD(vol)}</div>
                              <div className="text-[10px] text-white/40">Vol. 24h</div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-5 h-5 text-[#FFD700]" />
                  <span className="font-black text-lg">Top Fans</span>
                </div>
                {dashboardLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-3">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-24 mb-1" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (dashboardStats?.top_fans ?? []).length === 0 ? (
                  <div className="text-center py-8">
                    <Users2 className="w-10 h-10 mx-auto mb-3 text-white/20" />
                    <div className="text-white/40 text-sm">Noch keine Fans</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(dashboardStats?.top_fans ?? []).map((fan, i) => (
                      <div
                        key={fan.user_id}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-xl border transition-all',
                          i === 0 ? 'bg-[#FFD700]/[0.06] border-[#FFD700]/20' :
                          i === 1 ? 'bg-white/[0.03] border-white/15' :
                          i === 2 ? 'bg-orange-500/[0.04] border-orange-500/15' :
                          'bg-white/[0.02] border-white/10'
                        )}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${
                          i === 0 ? 'bg-[#FFD700]/20 text-[#FFD700]' :
                          i === 1 ? 'bg-white/10 text-white/70' :
                          i === 2 ? 'bg-orange-500/20 text-orange-400' :
                          'bg-white/5 text-white/40'
                        }`}>
                          {i + 1}
                        </div>

                        {fan.avatar_url ? (
                          <Image
                            src={fan.avatar_url}
                            alt={fan.handle}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/50">
                            {fan.handle.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm truncate">{fan.handle}</div>
                          <div className="text-[10px] text-white/40">{fan.holdings_count} DPC</div>
                        </div>

                        <div className="text-right">
                          <div className={`font-mono font-bold text-sm ${fan.total_score >= 70 ? 'text-[#FFD700]' : 'text-white/60'}`}>
                            {fan.total_score}
                          </div>
                          <div className="text-[10px] text-white/40">Score</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ========== TAB: COMMUNITY ========== */}
      {tab === 'community' && (
        <div className="space-y-6">
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ActivityFeed
              trades={recentTrades}
              title="Trade-Feed"
              emptyText="Noch keine Trades für diesen Club"
            />

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
                {clubResearch.slice(0, 5).map(post => (
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
          </div>

          <div className="space-y-6">
            <Card className="p-6">
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

            <Card className="p-6">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mx-auto">
                  <MessageCircle className="w-6 h-6 text-purple-400" />
                </div>
                <div className="font-black text-lg">Community</div>
                <p className="text-sm text-white/50">
                  Posts, Leaderboard und mehr in der Community.
                </p>
                <Link href="/community">
                  <Button variant="outline" size="sm">
                    Community öffnen
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
