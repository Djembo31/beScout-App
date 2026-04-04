'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Heart, BarChart3, TrendingUp, History, Trophy, Crown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, Skeleton, CosmeticAvatar, CosmeticTitle } from '@/components/ui';
import { cn, fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { getSeasonLeaderboard, type SeasonLeaderboardEntry } from '@/lib/services/scoring';
import { useBatchEquippedCosmetics } from '@/lib/queries/cosmetics';
import { getFormResult } from './helpers';
import dynamic from 'next/dynamic';
const SponsorBanner = dynamic(() => import('@/components/player/detail/SponsorBanner'), { ssr: false });

export const HistoryTab = ({
  participations,
  userDisplayName,
  userFavoriteClub,
  seasonPoints,
  eventsPlayed,
  bestRank,
  totalRewardBsd,
  wins,
  top10,
  avgPoints,
  avgRank,
  userId,
}: {
  participations: { eventId: string; eventName: string; gameweek: number; rank: number; totalParticipants: number; points: number; rewardCents: number }[];
  userDisplayName: string;
  userFavoriteClub: string | null;
  seasonPoints: number;
  eventsPlayed: number;
  bestRank: number | null;
  totalRewardBsd: number;
  wins: number;
  top10: number;
  avgPoints: number;
  avgRank: number;
  userId?: string;
}) => {
  const t = useTranslations('fantasy');
  const [seasonBoard, setSeasonBoard] = useState<SeasonLeaderboardEntry[]>([]);
  const [boardLoading, setBoardLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getSeasonLeaderboard(50)
      .then(data => { if (!cancelled) setSeasonBoard(data); })
      .catch(err => console.error('[HistoryTab] Season leaderboard failed:', err))
      .finally(() => { if (!cancelled) setBoardLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Batch-fetch cosmetics for season leaderboard users
  const seasonUserIds = useMemo(() => seasonBoard.map(e => e.userId), [seasonBoard]);
  const { data: cosmeticsMap } = useBatchEquippedCosmetics(seasonUserIds);

  return (
    <div className="space-y-6">
      {/* User Stats Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Profile Card */}
        <Card className="p-4 md:p-6 bg-gold/[0.04] border-gold/20">
          <div className="flex items-center gap-4 mb-4">
            <div className="size-16 rounded-full bg-gold/20 flex items-center justify-center text-2xl font-black">
              {userDisplayName[0] || '?'}
            </div>
            <div>
              <span className="text-xl font-black">{userDisplayName}</span>
              {userFavoriteClub && (
                <div className="text-xs text-white/40 flex items-center gap-1 mt-1">
                  <Heart className="size-3 fill-pink-400 text-pink-400" aria-hidden="true" />
                  {userFavoriteClub}
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-surface-subtle rounded-lg">
              <div className="text-lg md:text-2xl font-mono font-black text-gold tabular-nums">{fmtScout(totalRewardBsd)}</div>
              <div className="text-xs text-white/40">{t('wonScout')}</div>
            </div>
            <div className="text-center p-3 bg-surface-subtle rounded-lg">
              <div className="text-lg md:text-2xl font-mono font-black tabular-nums">{seasonPoints.toLocaleString()}</div>
              <div className="text-xs text-white/40">{t('seasonPoints')}</div>
            </div>
          </div>
        </Card>

        {/* Performance Stats */}
        <Card className="p-4 md:p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2 text-balance">
            <BarChart3 className="size-4 text-purple-400" aria-hidden="true" />
            {t('performanceTitle')}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-lg md:text-2xl font-mono font-black text-green-500 tabular-nums">{wins}</div>
              <div className="text-xs text-white/50">{t('winsLabel')}</div>
            </div>
            <div>
              <div className="text-lg md:text-2xl font-mono font-black text-sky-400 tabular-nums">{top10}</div>
              <div className="text-xs text-white/50">{t('topTen')}</div>
            </div>
            <div>
              <div className="text-lg md:text-2xl font-mono font-black tabular-nums">{bestRank ? `#${bestRank}` : '\u2014'}</div>
              <div className="text-xs text-white/50">{t('bestPlacement')}</div>
            </div>
            <div>
              <div className="text-lg md:text-2xl font-mono font-black text-purple-400 tabular-nums">{eventsPlayed}</div>
              <div className="text-xs text-white/50">{t('eventsPlayedLabel')}</div>
            </div>
          </div>
        </Card>

        {/* Advanced Stats */}
        <Card className="p-4 md:p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2 text-balance">
            <TrendingUp className="size-4 text-green-500" aria-hidden="true" />
            {t('statisticsTitle')}
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50">{t('avgPointsLabel')}</span>
              <span className="font-mono font-bold tabular-nums">{avgPoints}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50">{t('avgRankLabel')}</span>
              <span className="font-mono font-bold tabular-nums">{avgRank > 0 ? `#${avgRank}` : '\u2014'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50">{t('bestPlacement')}</span>
              <span className="font-mono font-bold text-gold tabular-nums">{bestRank ? `#${bestRank}` : '\u2014'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50">{t('totalRewards')}</span>
              <span className="font-mono font-bold text-purple-400 tabular-nums">{fmtScout(totalRewardBsd)} CR</span>
            </div>
          </div>
        </Card>
      </div>

      <SponsorBanner placement="fantasy_history" className="mb-4" />

      {/* Season Leaderboard */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2 text-balance">
            <Crown className="size-4 text-gold" aria-hidden="true" />
            {t('seasonLeaderboard')}
          </h3>
          <div className="text-sm text-white/40">{t('managerCount', { count: seasonBoard.length })}</div>
        </div>
        {boardLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}
          </div>
        ) : seasonBoard.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            <Trophy className="size-10 mx-auto mb-3 text-white/20" aria-hidden="true" />
            <div className="text-sm">{t('noSeasonData')}</div>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <table className="w-full hidden md:table">
              <thead>
                <tr className="border-b border-white/10 text-xs text-white/40">
                  <th className="py-3 px-4 text-left w-12">#</th>
                  <th className="py-3 px-4 text-left">{t('thManager')}</th>
                  <th className="py-3 px-4 text-center">{t('thEvents')}</th>
                  <th className="py-3 px-4 text-center">{t('thWins')}</th>
                  <th className="py-3 px-4 text-center">{t('thPoints')}</th>
                  <th className="py-3 px-4 text-right">{t('thReward')}</th>
                </tr>
              </thead>
              <tbody>
                {seasonBoard.map((entry) => {
                  const isMe = entry.userId === userId;
                  const rankColor = entry.rank === 1 ? 'text-gold' : entry.rank === 2 ? 'text-zinc-300' : entry.rank === 3 ? 'text-amber-600' : 'text-white/50';
                  return (
                    <tr key={entry.userId} className={cn('border-b border-white/5 hover:bg-surface-minimal', isMe && 'bg-gold/[0.04]')}>
                      <td className={cn('py-3 px-4 font-mono font-bold text-sm tabular-nums', rankColor)}>
                        {entry.rank <= 3 ? <Trophy className={cn('size-4 inline', rankColor)} aria-hidden="true" /> : `#${entry.rank}`}
                      </td>
                      <td className="py-3 px-4">
                        <Link href={`/profile/${entry.handle}`} className="hover:text-gold transition-colors flex items-center gap-2">
                          <CosmeticAvatar
                            avatarUrl={entry.avatarUrl}
                            displayName={entry.displayName ?? entry.handle}
                            size={28}
                            frameCssClass={cosmeticsMap?.get(entry.userId)?.frameCssClass}
                            className="rounded-full"
                          />
                          <div>
                            <span className={cn('font-semibold', isMe && 'text-gold')}>
                              {entry.displayName ?? `@${entry.handle}`}
                            </span>
                            {isMe && <span className="ml-1.5 text-xs text-gold/60">{t('youLabel')}</span>}
                            <CosmeticTitle
                              title={cosmeticsMap?.get(entry.userId)?.titleName ?? null}
                              rarity={cosmeticsMap?.get(entry.userId)?.titleRarity}
                              className="block"
                            />
                          </div>
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-center text-sm font-mono tabular-nums">{entry.eventsPlayed}</td>
                      <td className="py-3 px-4 text-center text-sm font-mono text-green-500 tabular-nums">{entry.wins}</td>
                      <td className="py-3 px-4 text-center text-sm font-mono font-bold tabular-nums">{entry.totalPoints.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">
                        {entry.totalRewardCents > 0 ? (
                          <span className="font-mono font-bold text-sm text-gold tabular-nums">+{fmtScout(centsToBsd(entry.totalRewardCents))} CR</span>
                        ) : (
                          <span className="text-white/30">{'\u2014'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile */}
            <div className="md:hidden p-3 space-y-2">
              {seasonBoard.slice(0, 20).map((entry) => {
                const isMe = entry.userId === userId;
                const rankColor = entry.rank === 1 ? 'text-gold' : entry.rank === 2 ? 'text-zinc-300' : entry.rank === 3 ? 'text-amber-600' : 'text-white/50';
                return (
                  <Link key={entry.userId} href={`/profile/${entry.handle}`}>
                    <div className={cn(
                      'flex items-center justify-between gap-3 p-3 rounded-xl border border-divider',
                      isMe ? 'bg-gold/[0.06]' : 'bg-surface-minimal'
                    )}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn('size-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                          entry.rank <= 3 ? 'bg-gold/15' : 'bg-white/5', rankColor
                        )}>
                          #{entry.rank}
                        </div>
                        <CosmeticAvatar
                          avatarUrl={entry.avatarUrl}
                          displayName={entry.displayName ?? entry.handle}
                          size={28}
                          frameCssClass={cosmeticsMap?.get(entry.userId)?.frameCssClass}
                          className="rounded-full shrink-0"
                        />
                        <div className="min-w-0">
                          <div className={cn('font-medium text-sm truncate', isMe && 'text-gold')}>
                            {entry.displayName ?? `@${entry.handle}`}
                            {isMe && <span className="text-xs text-gold/60 ml-1">{t('youLabel')}</span>}
                          </div>
                          <CosmeticTitle
                            title={cosmeticsMap?.get(entry.userId)?.titleName ?? null}
                            rarity={cosmeticsMap?.get(entry.userId)?.titleRarity}
                          />
                          <div className="text-xs text-white/40">{t('eventsAndWins', { events: entry.eventsPlayed, wins: entry.wins })}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-sm tabular-nums">{entry.totalPoints.toLocaleString()}</div>
                        {entry.totalRewardCents > 0 && (
                          <div className="text-xs font-mono font-bold text-gold tabular-nums">+{fmtScout(centsToBsd(entry.totalRewardCents))}</div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {/* Event History Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-bold text-balance">{t('eventHistory')}</h3>
          <div className="text-sm text-white/40">{t('eventHistoryCount', { count: participations.length })}</div>
        </div>
        {participations.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            <History className="size-10 mx-auto mb-3 text-white/20" aria-hidden="true" />
            <div className="text-sm">{t('noScoredEvents')}</div>
            <div className="text-xs text-white/25 mt-1 text-pretty">{t('joinEventHint')}</div>
          </div>
        ) : (
          <>
            {/* Desktop: Table */}
            <table className="w-full hidden md:table">
              <thead>
                <tr className="border-b border-white/10 text-xs text-white/40">
                  <th className="py-3 px-4 text-left">{t('thEvent')}</th>
                  <th className="py-3 px-4 text-center">{t('thGw')}</th>
                  <th className="py-3 px-4 text-center">{t('thRank')}</th>
                  <th className="py-3 px-4 text-center">{t('thPoints')}</th>
                  <th className="py-3 px-4 text-right">{t('thReward')}</th>
                </tr>
              </thead>
              <tbody>
                {participations.map((p, i) => {
                  const formResult = getFormResult(p.rank, p.totalParticipants);
                  return (
                    <tr key={i} className="border-b border-white/5 hover:bg-surface-minimal">
                      <td className="py-3 px-4">
                        <div className="font-medium">{p.eventName}</div>
                        <div className="text-xs text-white/40">{p.totalParticipants} {t('participantsLabel')}</div>
                      </td>
                      <td className="py-3 px-4 text-center text-sm tabular-nums">{p.gameweek}</td>
                      <td className="py-3 px-4 text-center">
                        <div className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-sm font-bold tabular-nums', formResult.color)}>
                          #{p.rank}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono tabular-nums">{p.points}</td>
                      <td className="py-3 px-4 text-right text-sm">
                        {p.rewardCents > 0 ? (
                          <span className="font-mono font-bold text-gold tabular-nums">+{fmtScout(centsToBsd(p.rewardCents))} CR</span>
                        ) : (
                          <span className="text-white/30">{'\u2014'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile: Cards */}
            <div className="md:hidden p-3 space-y-2">
              {participations.map((p, i) => {
                const formResult = getFormResult(p.rank, p.totalParticipants);
                return (
                  <div key={i} className="flex items-center justify-between gap-3 p-3 bg-surface-minimal border border-divider rounded-xl">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn('size-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 tabular-nums', formResult.color)}>
                        #{p.rank}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{p.eventName}</div>
                        <div className="text-xs text-white/40">{t('thGw')}{p.gameweek} · {p.totalParticipants} {t('participantsLabel')}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-sm tabular-nums">{p.points} {t('ptsLabel')}</div>
                      {p.rewardCents > 0 ? (
                        <div className="text-xs font-mono font-bold text-gold tabular-nums">+{fmtScout(centsToBsd(p.rewardCents))}</div>
                      ) : (
                        <div className="text-xs text-white/30">{'\u2014'}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
