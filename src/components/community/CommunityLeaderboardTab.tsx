'use client';

import React, { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Trophy, BadgeCheck, TrendingUp, TrendingDown, Minus, BarChart3, Gamepad2, Search } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import FollowBtn from '@/components/community/FollowBtn';
import type { LeaderboardUser } from '@/types';
import { getLevelTier } from '@/types';

function getTopRole(u: LeaderboardUser): { label: string; icon: React.ReactNode; color: string } | null {
  const scores = [
    { label: 'Trader', score: u.tradingScore, icon: <BarChart3 className="w-3 h-3" />, color: 'text-sky-300 bg-sky-500/15 border-sky-500/20' },
    { label: 'Manager', score: u.managerScore, icon: <Gamepad2 className="w-3 h-3" />, color: 'text-purple-300 bg-purple-500/15 border-purple-500/20' },
    { label: 'Scout', score: u.scoutScore, icon: <Search className="w-3 h-3" />, color: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/20' },
  ];
  const best = scores.reduce((a, b) => a.score >= b.score ? a : b);
  if (best.score < 10) return null;
  return best;
}

// ============================================
// TYPES
// ============================================

interface CommunityLeaderboardTabProps {
  leaderboard: LeaderboardUser[];
  followingIds: Set<string>;
  onFollowToggle: (targetId: string) => void;
}

// ============================================
// RANK SNAPSHOT (localStorage)
// ============================================

const RANK_SNAPSHOT_KEY = 'bescout-rank-snapshot';

function getRankSnapshot(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(RANK_SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveRankSnapshot(leaderboard: LeaderboardUser[]): void {
  const snapshot: Record<string, number> = {};
  for (const u of leaderboard) {
    snapshot[u.userId] = u.rank;
  }
  localStorage.setItem(RANK_SNAPSHOT_KEY, JSON.stringify(snapshot));
}

// ============================================
// LEADERBOARD ROW
// ============================================

function LeaderboardRow({ user: lUser, rank, rankChange, isFollowed, onFollow }: {
  user: LeaderboardUser;
  rank: number;
  rankChange: number | null;
  isFollowed: boolean;
  onFollow: () => void;
}) {
  const rankStyle = rank === 1
    ? 'bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/30'
    : rank === 2
    ? 'bg-white/10 text-white/80 border-white/20'
    : rank === 3
    ? 'bg-orange-500/20 text-orange-300 border-orange-500/30'
    : 'bg-white/5 text-white/50 border-white/10';

  const tier = getLevelTier(lUser.level);
  const topRole = getTopRole(lUser);

  return (
    <Link href={`/profile/${lUser.handle}`} className="block">
      <div className={cn(
        'flex items-center gap-4 p-4 border rounded-xl hover:bg-white/[0.04] hover:border-white/20 transition-all',
        isFollowed ? 'bg-[#22C55E]/[0.02] border-[#22C55E]/20' : 'bg-white/[0.02] border-white/10'
      )}>
        <div className="relative">
          <div className={cn('w-10 h-10 rounded-xl border flex items-center justify-center font-black', rankStyle)}>
            {rank <= 3 ? <Trophy className="w-5 h-5" /> : <span>{rank}</span>}
          </div>
          {rankChange !== null && rankChange !== 0 && (
            <div className={cn(
              'absolute -top-1.5 -right-1.5 flex items-center gap-0.5 px-1 py-0.5 rounded-md text-[8px] font-black',
              rankChange > 0 ? 'bg-[#22C55E]/20 text-[#22C55E]' : 'bg-red-500/20 text-red-400'
            )}>
              {rankChange > 0 ? <TrendingUp className="w-2 h-2" /> : <TrendingDown className="w-2 h-2" />}
              {Math.abs(rankChange)}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold">{lUser.displayName || lUser.handle}</span>
            {lUser.verified && <BadgeCheck className="w-4 h-4 text-[#FFD700]" />}
            <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold border', tier.color, 'bg-white/5 border-white/10')}>
              {tier.name}
            </span>
            {topRole && (
              <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border', topRole.color)}>
                {topRole.icon}
                {topRole.label}
              </span>
            )}
          </div>
          <div className="text-xs text-white/50 flex items-center gap-3 mt-0.5">
            <span>Lv {lUser.level}</span>
            <span>{lUser.followersCount} Follower</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-center">
              <div className="font-mono font-bold text-sky-300 text-xs">{lUser.tradingScore}</div>
              <div className="text-[8px] text-white/30">TRD</div>
            </div>
            <div className="text-center">
              <div className="font-mono font-bold text-purple-300 text-xs">{lUser.managerScore}</div>
              <div className="text-[8px] text-white/30">MGR</div>
            </div>
            <div className="text-center">
              <div className="font-mono font-bold text-emerald-300 text-xs">{lUser.scoutScore}</div>
              <div className="text-[8px] text-white/30">SCT</div>
            </div>
          </div>
          <div className="text-center">
            <div className="font-mono font-bold text-[#FFD700]">{lUser.totalScore}</div>
            <div className="text-[10px] text-white/40">Score</div>
          </div>
        </div>

        <div onClick={e => { e.preventDefault(); e.stopPropagation(); }}>
          <FollowBtn isFollowed={isFollowed} onToggle={onFollow} />
        </div>
      </div>
    </Link>
  );
}

// ============================================
// COMMUNITY LEADERBOARD TAB
// ============================================

export default function CommunityLeaderboardTab({
  leaderboard,
  followingIds,
  onFollowToggle,
}: CommunityLeaderboardTabProps) {
  // Load previous snapshot and compute rank changes
  const rankChanges = useMemo(() => {
    const prevSnapshot = getRankSnapshot();
    const changes: Record<string, number | null> = {};
    for (const u of leaderboard) {
      const prevRank = prevSnapshot[u.userId];
      changes[u.userId] = prevRank != null ? prevRank - u.rank : null; // positive = went UP
    }
    return changes;
  }, [leaderboard]);

  // Save current snapshot (debounced, only once)
  useEffect(() => {
    if (leaderboard.length > 0) {
      saveRankSnapshot(leaderboard);
    }
  }, [leaderboard]);

  return (
    <div className="max-w-3xl mx-auto space-y-3">
      {leaderboard.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-white/30 mb-2">Noch keine Rankings</div>
          <div className="text-xs text-white/20">Rankings werden nach Aktivität berechnet.</div>
        </Card>
      ) : (
        leaderboard.map((u) => (
          <LeaderboardRow
            key={u.userId}
            user={u}
            rank={u.rank}
            rankChange={rankChanges[u.userId] ?? null}
            isFollowed={followingIds.has(u.userId)}
            onFollow={() => onFollowToggle(u.userId)}
          />
        ))
      )}
    </div>
  );
}
