'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, BarChart3, Trophy, Coins, FileText, Vote, Target, Flame, Crosshair, Banknote, UserCheck, Sparkles, Megaphone, Shield, CheckCircle, XCircle, Clock, CircleDollarSign, Star, Search, Award, Users, Zap, Lock, MessageCircle, ArrowUp } from 'lucide-react';
import { Card, StatCard } from '@/components/ui';
import { PositionBadge } from '@/components/player';
import { fmtScout, cn } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { formatScout } from '@/lib/services/wallet';
import { getAchievementDef, getFeaturedAchievements } from '@/lib/achievements';
import { getRelativeTime } from '@/lib/activityHelpers';
import { getExpertBadges } from '@/lib/expertBadges';
import ScoreRoadCard from '@/components/gamification/ScoreRoadCard';
import PredictionStatsCard from '@/components/profile/PredictionStatsCard';
import { useTranslations, useLocale } from 'next-intl';
import type { Pos, DbUserStats, DbUserAchievement, DbTransaction, ResearchPostWithAuthor, AuthorTrackRecord, UserTradeWithPlayer, UserFantasyResult, PostWithAuthor } from '@/types';

interface ScoutingStatsData {
  reportCount: number;
  totalCalls: number;
  hitRate: number;
  avgRating: number;
  approvedBounties: number;
}

interface ProfileStatsTabProps {
  userId: string;
  userStats: DbUserStats | null;
  achievements: DbUserAchievement[];
  myResearch: ResearchPostWithAuthor[];
  trackRecord: AuthorTrackRecord | null;
  recentTrades: UserTradeWithPlayer[];
  fantasyResults: UserFantasyResult[];
  topPost: PostWithAuthor | null;
  scoutingStats: ScoutingStatsData | null;
  isSelf: boolean;
  transactions?: DbTransaction[];
}

const EARNING_TYPES: { type: string; labelKey: string; icon: React.ElementType; color: string }[] = [
  { type: 'research_earning', labelKey: 'earningReports', icon: FileText, color: 'text-purple-400' },
  { type: 'bounty_reward', labelKey: 'earningBounties', icon: Target, color: 'text-amber-400' },
  { type: 'fantasy_reward', labelKey: 'earningFantasy', icon: Trophy, color: 'text-gold' },
  { type: 'poll_revenue', labelKey: 'earningPolls', icon: Vote, color: 'text-sky-400' },
  { type: 'mission_reward', labelKey: 'earningMissions', icon: Crosshair, color: 'text-emerald-400' },
  { type: 'streak_reward', labelKey: 'earningStreaks', icon: Flame, color: 'text-orange-400' },
  { type: 'pbt_liquidation', labelKey: 'earningPbt', icon: Banknote, color: 'text-gold' },
  { type: 'tip_receive', labelKey: 'earningTips', icon: Coins, color: 'text-pink-400' },
  { type: 'scout_subscription_earning', labelKey: 'earningSubscription', icon: UserCheck, color: 'text-indigo-400' },
  { type: 'creator_fund_payout', labelKey: 'earningCreatorFund', icon: Sparkles, color: 'text-cyan-400' },
  { type: 'ad_revenue_payout', labelKey: 'earningAdRevenue', icon: Megaphone, color: 'text-lime-400' },
];

export default function ProfileStatsTab({
  userId,
  userStats,
  achievements,
  myResearch,
  trackRecord,
  recentTrades,
  fantasyResults,
  topPost,
  scoutingStats,
  isSelf,
  transactions = [],
}: ProfileStatsTabProps) {
  const tp = useTranslations('profile');
  const tg = useTranslations('gamification');
  const ta = useTranslations('activity');
  const locale = useLocale();
  const [showAllAchievements, setShowAllAchievements] = useState(false);
  const [showAllTrades, setShowAllTrades] = useState(false);

  // Aggregate earnings
  const earnings = useMemo(() => {
    if (!transactions || transactions.length === 0) return null;
    const earningTypeSet = new Set(EARNING_TYPES.map(e => e.type));
    const byType = new Map<string, number>();
    let total = 0;
    for (const tx of transactions) {
      if (earningTypeSet.has(tx.type) && tx.amount > 0) {
        byType.set(tx.type, (byType.get(tx.type) ?? 0) + tx.amount);
        total += tx.amount;
      }
    }
    if (total === 0) return null;
    return { byType, total };
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Track Record */}
      {trackRecord && trackRecord.totalCalls > 0 && (
        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="size-5 text-gold" aria-hidden="true" />
            <h3 className="font-black">Track Record</h3>
            <div className="flex-1" />
            {trackRecord.totalCalls >= 5 && trackRecord.hitRate >= 60 ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-gold/15 text-gold border border-gold/25">
                <Shield className="size-3" aria-hidden="true" />
                {tp('verifiedScout')}
              </span>
            ) : trackRecord.totalCalls < 5 ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-white/5 text-white/40 border border-white/10">
                <Shield className="size-3" aria-hidden="true" />
                {tp('callsProgress', { n: trackRecord.totalCalls })}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-white/5 text-white/40 border border-white/10">
                <Shield className="size-3" aria-hidden="true" />
                {trackRecord.hitRate}%/60% Hit-Rate
              </span>
            )}
          </div>
          <div className="flex items-center gap-6 flex-wrap">
            <div className="text-center">
              <div className={cn(
                'text-3xl font-mono font-black',
                trackRecord.hitRate >= 60 ? 'text-gold' : trackRecord.hitRate >= 40 ? 'text-white' : 'text-red-400'
              )}>
                {trackRecord.hitRate}%
              </div>
              <div className="text-[11px] text-white/40 mt-0.5">Hit-Rate</div>
            </div>
            <div>
              <div className="text-sm text-white/60 mb-1">
                {trackRecord.correctCalls} / {trackRecord.totalCalls} Calls
              </div>
              <div className="w-40 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold rounded-full transition-colors"
                  style={{ width: `${trackRecord.hitRate}%` }}
                />
              </div>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-white/50">
                <span className="flex items-center gap-1">
                  <CheckCircle className="size-3 text-green-500" aria-hidden="true" />
                  {trackRecord.correctCalls}
                </span>
                <span className="flex items-center gap-1">
                  <XCircle className="size-3 text-red-400" aria-hidden="true" />
                  {trackRecord.incorrectCalls}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3 text-white/30" aria-hidden="true" />
                  {trackRecord.pendingCalls}
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Research Earnings */}
      {myResearch.length > 0 && (() => {
        const totalEarned = myResearch.reduce((s, p) => s + p.total_earned, 0);
        const totalUnlocks = myResearch.reduce((s, p) => s + p.unlock_count, 0);
        const rated = myResearch.filter(p => p.avg_rating > 0);
        const avgRating = rated.length > 0 ? rated.reduce((s, p) => s + p.avg_rating, 0) / rated.length : 0;
        if (totalEarned === 0 && totalUnlocks === 0) return null;
        return (
          <Card className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <CircleDollarSign className="size-5 text-green-500" aria-hidden="true" />
              <h3 className="font-black">{tp('researchEarnings')}</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-green-500/5 border border-green-500/10 rounded-xl">
                <div className="text-2xl font-mono font-black text-green-500">{fmtScout(centsToBsd(totalEarned))}</div>
                <div className="text-[11px] text-white/40 mt-1">{tp('scoutEarned')}</div>
              </div>
              <div className="text-center p-3 bg-surface-base border border-white/[0.06] rounded-xl">
                <div className="text-2xl font-mono font-black">{totalUnlocks}</div>
                <div className="text-[11px] text-white/40 mt-1">{tp('salesLabel')}</div>
              </div>
              <div className="text-center p-3 bg-surface-base border border-white/[0.06] rounded-xl">
                <div className="text-2xl font-mono font-black text-gold">{avgRating > 0 ? avgRating.toFixed(1) : '-'}</div>
                <div className="text-[11px] text-white/40 mt-1 flex items-center justify-center gap-0.5">
                  <Star className="w-3 h-3" aria-hidden="true" /> {tp('avgRating')}
                </div>
              </div>
              <div className="text-center p-3 bg-surface-base border border-white/[0.06] rounded-xl">
                <div className="text-2xl font-mono font-black">{myResearch.length}</div>
                <div className="text-[11px] text-white/40 mt-1">{tp('reportsCount')}</div>
              </div>
            </div>
          </Card>
        );
      })()}

      {/* Expert Badges (moved from sidebar) */}
      {userStats && (() => {
        const badges = getExpertBadges(userStats);
        const earnedCount = badges.filter(b => b.earned).length;
        const BADGE_ICONS: Record<string, React.ElementType> = {
          TrendingUp, Trophy, Search, Award, Users, Zap,
        };
        return (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black">{tp('expertBadges')}</h3>
              <span className="text-[11px] text-white/40">{earnedCount}/{badges.length} {tp('earned')}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {badges.map(badge => {
                const IconComp = BADGE_ICONS[badge.icon] ?? Award;
                return (
                  <div
                    key={badge.key}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border transition-colors',
                      badge.earned
                        ? `${badge.bgColor} border`
                        : 'bg-white/[0.02] border-white/[0.06] opacity-50'
                    )}
                  >
                    <div className={cn(
                      'size-8 rounded-lg flex items-center justify-center flex-shrink-0',
                      badge.earned ? badge.bgColor : 'bg-white/5'
                    )}>
                      {badge.earned
                        ? <IconComp className={cn('size-4', badge.color)} aria-hidden="true" />
                        : <Lock className="size-3.5 text-white/20" aria-hidden="true" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={cn('text-[11px] font-bold', badge.earned ? badge.color : 'text-white/30')}>
                        {tg(`badge.${badge.key}`)}
                      </div>
                      {!badge.earned && (
                        <div className="mt-1">
                          <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-white/20 transition-colors"
                              style={{ width: `${badge.progress}%` }}
                            />
                          </div>
                          <div className="text-[11px] text-white/20 mt-0.5">{badge.progress}%</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })()}

      {/* Achievements (full) */}
      {(() => {
        const unlockedKeys = new Set(achievements.map(a => a.achievement_key));
        const featured = getFeaturedAchievements();
        const unlockedHidden = achievements
          .filter(a => { const d = getAchievementDef(a.achievement_key); return d && !d.featured; })
          .map(a => ({ key: a.achievement_key, def: getAchievementDef(a.achievement_key)! }));

        const allItems = [
          ...featured.map(def => ({ key: def.key, def, isUnlocked: unlockedKeys.has(def.key), isHidden: false })),
          ...unlockedHidden.map(({ key, def }) => ({ key, def, isUnlocked: true, isHidden: true })),
        ];
        const INITIAL_SHOW = 6;
        const visibleItems = showAllAchievements ? allItems : allItems.slice(0, INITIAL_SHOW);
        const hasMore = allItems.length > INITIAL_SHOW;

        return allItems.length > 0 ? (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black">{tg('achievement.title')}</h3>
              <span className="text-[11px] text-white/40">{unlockedKeys.size}/{allItems.length}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {visibleItems.map(({ key, def, isUnlocked, isHidden }) => isHidden ? (
                <div key={key} className="p-3 bg-gold/[0.04] rounded-xl border border-gold/15">
                  <div className="text-xl mb-1">{def.icon}</div>
                  <div className="text-sm font-bold text-gold">{tg(`achievement.${def.key}`)}</div>
                  <div className="text-[11px] text-white/40 mt-0.5">{tg(`achievement.${def.key}Desc`)}</div>
                  <div className="text-[11px] text-gold/50 mt-1 uppercase font-bold">{tg('achievement.hidden')}</div>
                </div>
              ) : (
                <div key={key} className={cn(
                  'p-3 rounded-xl border',
                  isUnlocked
                    ? 'bg-white/[0.03] border-white/[0.06]'
                    : 'bg-white/[0.01] border-white/[0.03] opacity-40'
                )}>
                  <div className="text-xl mb-1">{isUnlocked ? def.icon : '🔒'}</div>
                  <div className="text-sm font-bold">{tg(`achievement.${def.key}`)}</div>
                  <div className="text-[11px] text-white/40 mt-0.5">{tg(`achievement.${def.key}Desc`)}</div>
                </div>
              ))}
            </div>
            {hasMore && (
              <button
                onClick={() => setShowAllAchievements(prev => !prev)}
                className="w-full mt-3 py-2 text-[11px] text-white/40 hover:text-white/60 transition-colors"
              >
                {showAllAchievements ? tg('achievement.showLess') : tg('achievement.showAll', { count: allItems.length })}
              </button>
            )}
          </Card>
        ) : null;
      })()}

      {/* Fantasy Results */}
      {fantasyResults.length > 0 && (
        <Card className="p-4 md:p-6">
          <h3 className="font-black mb-4">{tp('fantasyResults')}</h3>
          <div className="grid grid-cols-4 gap-3 mb-4 p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
            <div className="text-center">
              <div className="text-lg font-mono font-black text-white">{fantasyResults.length}</div>
              <div className="text-[11px] text-white/40">Events</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-mono font-black text-white">
                {Math.round(fantasyResults.reduce((s, r) => s + r.totalScore, 0) / fantasyResults.length)}
              </div>
              <div className="text-[11px] text-white/40">Avg Score</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-mono font-black text-gold">
                #{Math.min(...fantasyResults.filter(r => r.rank > 0).map(r => r.rank))}
              </div>
              <div className="text-[11px] text-white/40">{tp('bestRank')}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-mono font-black text-green-500">
                {fmtScout(centsToBsd(fantasyResults.reduce((s, r) => s + r.rewardAmount, 0)))}
              </div>
              <div className="text-[11px] text-white/40">{tp('wonLabel')}</div>
            </div>
          </div>
          <div className="space-y-1">
            {fantasyResults.map((result) => {
              const rankColor = result.rank === 1 ? 'text-gold' : result.rank === 2 ? 'text-zinc-300' : result.rank === 3 ? 'text-amber-600' : 'text-white/50';
              const scoreColor = result.totalScore >= 100 ? 'text-gold' : result.totalScore >= 70 ? 'text-white' : 'text-red-400';
              return (
                <div key={result.eventId} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition-colors">
                  <div className={cn('flex items-center justify-center size-8 rounded-lg shrink-0', rankColor, 'bg-white/5')}>
                    <Trophy className="size-4" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{result.eventName}</div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-white/30">
                      {result.gameweek && <span>GW {result.gameweek}</span>}
                      {result.eventDate && <span>{new Date(result.eventDate).toLocaleDateString(locale)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <div className={cn('text-sm font-mono font-bold', rankColor)}>#{result.rank}</div>
                      <div className="text-[11px] text-white/30">{tp('rankLabel')}</div>
                    </div>
                    <div className="text-right">
                      <div className={cn('text-sm font-mono font-bold', scoreColor)}>{result.totalScore}</div>
                      <div className="text-[11px] text-white/30">Score</div>
                    </div>
                    {result.rewardAmount > 0 && (
                      <div className="text-right">
                        <div className="text-sm font-mono font-bold text-green-500">+{fmtScout(centsToBsd(result.rewardAmount))}</div>
                        <div className="text-[11px] text-white/30">bCredits</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Score Road */}
      {userId && <ScoreRoadCard userId={userId} />}

      {/* Prediction Stats */}
      {userId && <PredictionStatsCard userId={userId} />}

      {/* Earnings Breakdown */}
      {earnings && (
        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black flex items-center gap-2">
              <Coins className="size-4 text-gold" aria-hidden="true" />
              {tp('earnings')}
            </h3>
            <span className="text-sm font-mono font-bold text-green-500">+{fmtScout(centsToBsd(earnings.total))} bCredits</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {EARNING_TYPES.map(et => {
              const amount = earnings.byType.get(et.type) ?? 0;
              if (amount === 0) return null;
              const Icon = et.icon;
              return (
                <div key={et.type} className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon className={cn('size-3.5', et.color)} aria-hidden="true" />
                    <span className="text-[11px] text-white/50">{tp(et.labelKey)}</span>
                  </div>
                  <div className="text-sm font-mono font-bold text-white">+{fmtScout(centsToBsd(amount))} bCredits</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Recent Trades */}
      {recentTrades.length > 0 && (() => {
        const INITIAL_TRADES = 5;
        const visibleTrades = showAllTrades ? recentTrades : recentTrades.slice(0, INITIAL_TRADES);
        const hasMoreTrades = recentTrades.length > INITIAL_TRADES;
        return (
          <Card className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black">{tp('recentTrades')}</h3>
              <span className="text-[11px] text-white/40">{tp('tradesCount', { count: recentTrades.length })}</span>
            </div>
            <div className="space-y-1">
              {visibleTrades.map((trade) => {
                const isBuy = trade.buyer_id === userId;
                const totalCents = trade.price * trade.quantity;
                const unitBsd = centsToBsd(trade.price);
                return (
                  <Link key={trade.id} href={`/player/${trade.player_id}`}>
                    <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition-colors">
                      <div className={cn(
                        'flex items-center justify-center size-8 rounded-lg shrink-0',
                        isBuy ? 'text-gold bg-gold/10' : 'text-green-500 bg-green-500/10'
                      )}>
                        {isBuy ? <ArrowDownRight className="size-4" aria-hidden="true" /> : <ArrowUpRight className="size-4" aria-hidden="true" />}
                      </div>
                      <PositionBadge pos={trade.player_position as Pos} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">
                          {trade.player_first_name} {trade.player_last_name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={cn(
                            'px-1.5 py-0.5 rounded text-[11px] font-bold',
                            isBuy ? 'bg-gold/15 text-gold' : 'bg-green-500/15 text-green-500'
                          )}>
                            {isBuy ? tp('tradeBuy') : tp('tradeSell')}
                          </span>
                          <span className="text-[11px] text-white/30">{trade.quantity}x · {getRelativeTime(trade.executed_at, ta('justNow'), locale)}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={cn('text-sm font-mono font-bold', isBuy ? 'text-white' : 'text-green-500')}>
                          {isBuy ? '-' : '+'}{fmtScout(centsToBsd(totalCents))} bCredits
                        </div>
                        <div className="text-[11px] text-white/30 font-mono">à {fmtScout(unitBsd)}</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            {hasMoreTrades && (
              <button
                onClick={() => setShowAllTrades(prev => !prev)}
                className="w-full mt-3 py-2 text-[11px] text-white/40 hover:text-white/60 transition-colors"
              >
                {showAllTrades ? tp('showLessTrades') : tp('showAllTrades', { count: recentTrades.length })}
              </button>
            )}
          </Card>
        );
      })()}

      {/* Top Post (moved from header) */}
      {topPost && (
        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="size-4 text-sky-400" aria-hidden="true" />
            <h3 className="font-black text-sm">Top Beitrag</h3>
            <span className="flex items-center gap-0.5 ml-auto text-[11px] font-mono font-bold text-green-500">
              <ArrowUp className="size-3" aria-hidden="true" />
              {topPost.upvotes - topPost.downvotes}
            </span>
          </div>
          <p className="text-sm text-white/60">{topPost.content}</p>
        </Card>
      )}
    </div>
  );
}
