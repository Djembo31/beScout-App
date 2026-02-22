'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Trophy, BadgeCheck, TrendingUp, TrendingDown, BarChart3, Gamepad2, Search, Award, Users, Zap, Swords } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import FollowBtn from '@/components/community/FollowBtn';
import type { LeaderboardUser, DbUserStats } from '@/types';
import { getRang, getDimensionColor, type Dimension } from '@/lib/gamification';
import { RangBadge, RangScorePill } from '@/components/ui/RangBadge';
import { useScoutLeaderboard } from '@/lib/queries';
import { getExpertBadges } from '@/lib/expertBadges';
import { getMedianScore } from '@/lib/services/scoutScores';
import { useTranslations } from 'next-intl';

function getTopRole(u: LeaderboardUser, dimLabels: { trader: string; manager: string; analyst: string }): { label: string; icon: React.ReactNode; color: string } | null {
  const scores = [
    { label: dimLabels.trader, score: u.tradingScore, icon: <BarChart3 className="w-3 h-3" />, color: 'text-sky-300 bg-sky-500/15 border-sky-500/20' },
    { label: dimLabels.manager, score: u.managerScore, icon: <Gamepad2 className="w-3 h-3" />, color: 'text-purple-300 bg-purple-500/15 border-purple-500/20' },
    { label: dimLabels.analyst, score: u.scoutScore, icon: <Search className="w-3 h-3" />, color: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/20' },
  ];
  const best = scores.reduce((a, b) => a.score >= b.score ? a : b);
  if (best.score < 10) return null;
  return best;
}

// ============================================
// TYPES
// ============================================

type ScoreTab = 'overall' | 'trader' | 'manager' | 'analyst';

interface CommunityLeaderboardTabProps {
  leaderboard: LeaderboardUser[];
  followingIds: Set<string>;
  onFollowToggle: (targetId: string) => void;
  userId?: string;
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
// LEADERBOARD ROW (Reputation)
// ============================================

function LeaderboardRow({ user: lUser, rank, rankChange, isFollowed, onFollow, isSelf }: {
  user: LeaderboardUser;
  rank: number;
  rankChange: number | null;
  isFollowed: boolean;
  onFollow: () => void;
  isSelf?: boolean;
}) {
  const tg = useTranslations('gamification');
  const rankStyle = rank === 1
    ? 'bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/30'
    : rank === 2
    ? 'bg-white/10 text-white/80 border-white/20'
    : rank === 3
    ? 'bg-orange-500/20 text-orange-300 border-orange-500/30'
    : 'bg-white/5 text-white/50 border-white/10';

  const topRole = getTopRole(lUser, {
    trader: tg('dimension.trader'),
    manager: tg('dimension.manager'),
    analyst: tg('dimension.analyst'),
  });

  return (
    <Link href={`/profile/${lUser.handle}`} className="block">
      <div className={cn(
        'flex items-center gap-4 p-4 border rounded-xl hover:bg-white/[0.04] hover:border-white/20 transition-all',
        isSelf ? 'bg-[#FFD700]/[0.04] border-[#FFD700]/20' : isFollowed ? 'bg-[#22C55E]/[0.02] border-[#22C55E]/20' : 'bg-white/[0.02] border-white/10'
      )}>
        <div className="relative">
          <div className={cn('w-10 h-10 rounded-xl border flex items-center justify-center font-black', rankStyle)}>
            {rank <= 3 ? <Trophy className="w-5 h-5" /> : <span>{rank}</span>}
          </div>
          {rankChange !== null && rankChange !== 0 && (
            <div className={cn(
              'absolute -top-1.5 -right-1.5 flex items-center gap-0.5 px-1 py-0.5 rounded-md text-[9px] font-black',
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
            {isSelf && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FFD700]/15 text-[#FFD700] border border-[#FFD700]/20">Du</span>}
            {lUser.verified && <BadgeCheck className="w-4 h-4 text-[#FFD700]" />}
            {topRole && (
              <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border', topRole.color)}>
                {topRole.icon}
                {topRole.label}
              </span>
            )}
          </div>
          <div className="text-xs text-white/50 flex items-center gap-3 mt-0.5 flex-wrap">
            <span>Lv {lUser.level}</span>
            <span>{lUser.followersCount} Follower</span>
            {(() => {
              const synthStats = {
                trading_score: lUser.tradingScore,
                manager_score: lUser.managerScore,
                scout_score: lUser.scoutScore,
                total_score: lUser.totalScore,
                rank: lUser.rank,
                followers_count: lUser.followersCount,
              } as DbUserStats;
              const earned = getExpertBadges(synthStats).filter(b => b.earned);
              const ICONS: Record<string, React.ElementType> = { TrendingUp, Trophy, Search, Award, Users, Zap };
              return earned.slice(0, 3).map(b => {
                const I = ICONS[b.icon] ?? Award;
                return (
                  <span key={b.key} className={cn('inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold border', b.bgColor, b.color)}>
                    <I className="w-2.5 h-2.5" />
                    {b.label}
                  </span>
                );
              });
            })()}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-center">
              <div className="font-mono font-bold text-sky-300 text-xs">{lUser.tradingScore}</div>
              <div className="text-[9px] text-white/30">TRD</div>
            </div>
            <div className="text-center">
              <div className="font-mono font-bold text-purple-300 text-xs">{lUser.managerScore}</div>
              <div className="text-[9px] text-white/30">MGR</div>
            </div>
            <div className="text-center">
              <div className="font-mono font-bold text-emerald-300 text-xs">{lUser.scoutScore}</div>
              <div className="text-[9px] text-white/30">SCT</div>
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
// SCORE TAB LABELS
// ============================================

const SCORE_TABS: { id: ScoreTab; dimKey: string; color: string }[] = [
  { id: 'overall', dimKey: 'overall', color: 'text-[#FFD700]' },
  { id: 'trader', dimKey: 'trader', color: 'text-sky-400' },
  { id: 'manager', dimKey: 'manager', color: 'text-purple-400' },
  { id: 'analyst', dimKey: 'analyst', color: 'text-emerald-400' },
];

// ============================================
// COMMUNITY LEADERBOARD TAB
// ============================================

export default function CommunityLeaderboardTab({
  leaderboard,
  followingIds,
  onFollowToggle,
  userId,
}: CommunityLeaderboardTabProps) {
  const tg = useTranslations('gamification');
  const [scoreTab, setScoreTab] = useState<ScoreTab>('overall');

  // Load previous snapshot and compute rank changes
  const rankChanges = useMemo(() => {
    const prevSnapshot = getRankSnapshot();
    const changes: Record<string, number | null> = {};
    for (const u of leaderboard) {
      const prevRank = prevSnapshot[u.userId];
      changes[u.userId] = prevRank != null ? prevRank - u.rank : null;
    }
    return changes;
  }, [leaderboard]);

  // Save current snapshot
  useEffect(() => {
    if (leaderboard.length > 0) {
      saveRankSnapshot(leaderboard);
    }
  }, [leaderboard]);

  const dim: Dimension | 'overall' = scoreTab;
  const { data: scoutTop = [] } = useScoutLeaderboard(dim, 10);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Scout Score Rangliste (4 Tabs) */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Swords className="w-5 h-5 text-amber-400" />
          <h3 className="font-black text-sm uppercase tracking-wider">{tg('leaderboard.scoutRanking')}</h3>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 mb-3 bg-white/[0.03] rounded-xl p-1 border border-white/[0.06]">
          {SCORE_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setScoreTab(tab.id)}
              className={cn(
                'flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                scoreTab === tab.id
                  ? `bg-white/10 ${tab.color}`
                  : 'text-white/40 hover:text-white/60'
              )}
            >
              {tg(`dimension.${tab.dimKey}`)}
            </button>
          ))}
        </div>

        <Card className="divide-y divide-white/[0.06]">
          {scoutTop.length === 0 ? (
            <div className="p-8 text-center text-white/30 text-sm">{tg('leaderboard.noRankings')}</div>
          ) : (
            scoutTop.map((entry, idx) => {
              const rank = idx + 1;
              const isSelf = entry.user_id === userId;
              const displayScore = scoreTab === 'overall'
                ? getMedianScore(entry)
                : entry[`${scoreTab}_score` as keyof typeof entry] as number;
              const rang = getRang(displayScore);

              return (
                <Link key={entry.user_id} href={`/profile/${entry.handle}`} className="block">
                  <div className={cn(
                    'flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors',
                    isSelf && 'bg-[#FFD700]/[0.04]'
                  )}>
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm',
                      rank === 1 ? 'bg-[#FFD700]/20 text-[#FFD700]' :
                      rank === 2 ? 'bg-white/10 text-white/70' :
                      rank === 3 ? 'bg-orange-500/20 text-orange-300' :
                      'bg-white/5 text-white/40'
                    )}>
                      {rank <= 3 ? <Trophy className="w-4 h-4" /> : rank}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold overflow-hidden flex-shrink-0">
                      {entry.avatar_url
                        ? <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                        : (entry.display_name ?? entry.handle).charAt(0).toUpperCase()
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm truncate">{entry.display_name ?? entry.handle}</span>
                        {isSelf && <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-[#FFD700]/15 text-[#FFD700]">Du</span>}
                      </div>
                      <RangScorePill score={displayScore} />
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={cn('font-mono font-bold text-sm', rang.color)}>
                        {displayScore.toLocaleString('de-DE')}
                      </div>
                      {scoreTab === 'overall' && (
                        <div className="text-[9px] text-white/30 flex gap-2 justify-end">
                          <span className="text-sky-400">{entry.trader_score} T</span>
                          <span className="text-purple-400">{entry.manager_score} M</span>
                          <span className="text-emerald-400">{entry.analyst_score} A</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </Card>
      </div>

      {/* Scout Reputation Rangliste */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Award className="w-5 h-5 text-purple-400" />
          <h3 className="font-black text-sm uppercase tracking-wider">{tg('leaderboard.scoutReputation')}</h3>
        </div>
        <div className="space-y-3">
          {leaderboard.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="text-white/30 mb-2">{tg('leaderboard.noRankings')}</div>
              <div className="text-xs text-white/20">{tg('leaderboard.rankingsHint')}</div>
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
                isSelf={u.userId === userId}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
