'use client';

import { Heart, BarChart3, TrendingUp, History, Gift } from 'lucide-react';
import { Card } from '@/components/ui';
import { fmtBSD } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { getFormResult } from './helpers';

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
}) => {
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
              <span className="text-sm text-white/50">Total Gewinn</span>
              <span className="font-mono font-bold text-purple-400">{fmtBSD(totalRewardBsd)} BSD</span>
            </div>
          </div>
        </Card>
      </div>

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
