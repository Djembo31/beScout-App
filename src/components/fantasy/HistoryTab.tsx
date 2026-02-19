'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, BarChart3, TrendingUp, History, Trophy, Crown } from 'lucide-react';
import { Card, Skeleton } from '@/components/ui';
import { cn, fmtBSD } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { getSeasonLeaderboard, type SeasonLeaderboardEntry } from '@/lib/services/scoring';
import { getFormResult } from './helpers';
import SponsorBanner from '@/components/player/detail/SponsorBanner';

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

  return (
    <div className="space-y-6">
      {/* User Stats Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Profile Card */}
        <Card className="p-4 md:p-6 bg-gradient-to-br from-[#FFD700]/5 to-purple-500/5 border-[#FFD700]/20">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FFD700]/30 to-purple-500/30 flex items-center justify-center text-2xl font-black">
              {userDisplayName[0] || '?'}
            </div>
            <div>
              <span className="text-xl font-black">{userDisplayName}</span>
              {userFavoriteClub && (
                <div className="text-xs text-white/40 flex items-center gap-1 mt-1">
                  <Heart className="w-3 h-3 fill-pink-400 text-pink-400" />
                  {userFavoriteClub}
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-white/[0.03] rounded-lg">
              <div className="text-lg md:text-2xl font-mono font-black text-[#FFD700]">{fmtBSD(totalRewardBsd)}</div>
              <div className="text-[10px] text-white/40">Gewonnene BSD</div>
            </div>
            <div className="text-center p-3 bg-white/[0.03] rounded-lg">
              <div className="text-lg md:text-2xl font-mono font-black">{seasonPoints.toLocaleString()}</div>
              <div className="text-[10px] text-white/40">Season Punkte</div>
            </div>
          </div>
        </Card>

        {/* Performance Stats */}
        <Card className="p-4 md:p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            Performance
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-lg md:text-2xl font-mono font-black text-[#22C55E]">{wins}</div>
              <div className="text-xs text-white/50">Siege</div>
            </div>
            <div>
              <div className="text-lg md:text-2xl font-mono font-black text-sky-400">{top10}</div>
              <div className="text-xs text-white/50">Top 10</div>
            </div>
            <div>
              <div className="text-lg md:text-2xl font-mono font-black">{bestRank ? `#${bestRank}` : '\u2014'}</div>
              <div className="text-xs text-white/50">Beste Platzierung</div>
            </div>
            <div>
              <div className="text-lg md:text-2xl font-mono font-black text-purple-400">{eventsPlayed}</div>
              <div className="text-xs text-white/50">Events gespielt</div>
            </div>
          </div>
        </Card>

        {/* Advanced Stats */}
        <Card className="p-4 md:p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#22C55E]" />
            Statistiken
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50">Avg. Punkte</span>
              <span className="font-mono font-bold">{avgPoints}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50">Avg. Rang</span>
              <span className="font-mono font-bold">{avgRank > 0 ? `#${avgRank}` : '\u2014'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50">Beste Platzierung</span>
              <span className="font-mono font-bold text-[#FFD700]">{bestRank ? `#${bestRank}` : '\u2014'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50">Total Prämien</span>
              <span className="font-mono font-bold text-purple-400">{fmtBSD(totalRewardBsd)} BSD</span>
            </div>
          </div>
        </Card>
      </div>

      <SponsorBanner placement="fantasy_history" className="mb-4" />

      {/* Season Leaderboard */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2">
            <Crown className="w-4 h-4 text-[#FFD700]" />
            Saison-Rangliste
          </h3>
          <div className="text-sm text-white/40">{seasonBoard.length} Manager</div>
        </div>
        {boardLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}
          </div>
        ) : seasonBoard.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            <Trophy className="w-10 h-10 mx-auto mb-3 text-white/20" />
            <div className="text-sm">Noch keine Saison-Daten</div>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <table className="w-full hidden md:table">
              <thead>
                <tr className="border-b border-white/10 text-xs text-white/40">
                  <th className="py-3 px-4 text-left w-12">#</th>
                  <th className="py-3 px-4 text-left">Manager</th>
                  <th className="py-3 px-4 text-center">Events</th>
                  <th className="py-3 px-4 text-center">Siege</th>
                  <th className="py-3 px-4 text-center">Punkte</th>
                  <th className="py-3 px-4 text-right">Prämie</th>
                </tr>
              </thead>
              <tbody>
                {seasonBoard.map((entry) => {
                  const isMe = entry.userId === userId;
                  const rankColor = entry.rank === 1 ? 'text-[#FFD700]' : entry.rank === 2 ? 'text-zinc-300' : entry.rank === 3 ? 'text-amber-600' : 'text-white/50';
                  return (
                    <tr key={entry.userId} className={cn('border-b border-white/5 hover:bg-white/[0.02]', isMe && 'bg-[#FFD700]/[0.04]')}>
                      <td className={cn('py-3 px-4 font-mono font-bold text-sm', rankColor)}>
                        {entry.rank <= 3 ? <Trophy className={cn('w-4 h-4 inline', rankColor)} /> : `#${entry.rank}`}
                      </td>
                      <td className="py-3 px-4">
                        <Link href={`/profile/${entry.handle}`} className="hover:text-[#FFD700] transition-colors">
                          <span className={cn('font-semibold', isMe && 'text-[#FFD700]')}>
                            {entry.displayName ?? `@${entry.handle}`}
                          </span>
                          {isMe && <span className="ml-1.5 text-[10px] text-[#FFD700]/60">(Du)</span>}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-center text-sm font-mono">{entry.eventsPlayed}</td>
                      <td className="py-3 px-4 text-center text-sm font-mono text-[#22C55E]">{entry.wins}</td>
                      <td className="py-3 px-4 text-center text-sm font-mono font-bold">{entry.totalPoints.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">
                        {entry.totalRewardCents > 0 ? (
                          <span className="font-mono font-bold text-sm text-[#FFD700]">+{fmtBSD(centsToBsd(entry.totalRewardCents))} BSD</span>
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
                const rankColor = entry.rank === 1 ? 'text-[#FFD700]' : entry.rank === 2 ? 'text-zinc-300' : entry.rank === 3 ? 'text-amber-600' : 'text-white/50';
                return (
                  <Link key={entry.userId} href={`/profile/${entry.handle}`}>
                    <div className={cn(
                      'flex items-center justify-between gap-3 p-3 rounded-xl border border-white/[0.06]',
                      isMe ? 'bg-[#FFD700]/[0.06]' : 'bg-white/[0.02]'
                    )}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                          entry.rank <= 3 ? 'bg-[#FFD700]/15' : 'bg-white/5', rankColor
                        )}>
                          #{entry.rank}
                        </div>
                        <div className="min-w-0">
                          <div className={cn('font-medium text-sm truncate', isMe && 'text-[#FFD700]')}>
                            {entry.displayName ?? `@${entry.handle}`}
                            {isMe && <span className="text-[10px] text-[#FFD700]/60 ml-1">(Du)</span>}
                          </div>
                          <div className="text-[10px] text-white/40">{entry.eventsPlayed} Events · {entry.wins} Siege</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-sm">{entry.totalPoints.toLocaleString()}</div>
                        {entry.totalRewardCents > 0 && (
                          <div className="text-[11px] font-mono font-bold text-[#FFD700]">+{fmtBSD(centsToBsd(entry.totalRewardCents))}</div>
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
          <h3 className="font-bold">Event-Verlauf</h3>
          <div className="text-sm text-white/40">{participations.length} Events</div>
        </div>
        {participations.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            <History className="w-10 h-10 mx-auto mb-3 text-white/20" />
            <div className="text-sm">Noch keine ausgewerteten Events</div>
            <div className="text-xs text-white/25 mt-1">Tritt einem Event bei und warte auf die Auswertung.</div>
          </div>
        ) : (
          <>
            {/* Desktop: Table */}
            <table className="w-full hidden md:table">
              <thead>
                <tr className="border-b border-white/10 text-xs text-white/40">
                  <th className="py-3 px-4 text-left">Event</th>
                  <th className="py-3 px-4 text-center">GW</th>
                  <th className="py-3 px-4 text-center">Rang</th>
                  <th className="py-3 px-4 text-center">Punkte</th>
                  <th className="py-3 px-4 text-right">Reward</th>
                </tr>
              </thead>
              <tbody>
                {participations.map((p, i) => {
                  const formResult = getFormResult(p.rank, p.totalParticipants);
                  return (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-3 px-4">
                        <div className="font-medium">{p.eventName}</div>
                        <div className="text-[10px] text-white/40">{p.totalParticipants} Teilnehmer</div>
                      </td>
                      <td className="py-3 px-4 text-center text-sm">{p.gameweek}</td>
                      <td className="py-3 px-4 text-center">
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${formResult.color} text-white text-sm font-bold`}>
                          #{p.rank}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono">{p.points}</td>
                      <td className="py-3 px-4 text-right text-sm">
                        {p.rewardCents > 0 ? (
                          <span className="font-mono font-bold text-[#FFD700]">+{fmtBSD(centsToBsd(p.rewardCents))} BSD</span>
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
                  <div key={i} className="flex items-center justify-between gap-3 p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${formResult.color} text-white shrink-0`}>
                        #{p.rank}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{p.eventName}</div>
                        <div className="text-[10px] text-white/40">GW{p.gameweek} · {p.totalParticipants} Teilnehmer</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-sm">{p.points} Pkt</div>
                      {p.rewardCents > 0 ? (
                        <div className="text-[11px] font-mono font-bold text-[#FFD700]">+{fmtBSD(centsToBsd(p.rewardCents))}</div>
                      ) : (
                        <div className="text-[11px] text-white/30">{'\u2014'}</div>
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
