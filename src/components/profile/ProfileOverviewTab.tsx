'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, BarChart3, Trophy } from 'lucide-react';
import { Card, StatCard, Button } from '@/components/ui';
import { PositionBadge } from '@/components/player';
import { fmtBSD, cn } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { formatBsd } from '@/lib/services/wallet';
import { getAchievementDef } from '@/lib/achievements';
import { getRelativeTime } from '@/lib/activityHelpers';
import type { Pos, DbUserAchievement, UserTradeWithPlayer, UserFantasyResult } from '@/types';

// ============================================
// TYPES
// ============================================

export type HoldingRow = {
  id: string;
  player_id: string;
  quantity: number;
  avg_buy_price: number; // cents
  player: {
    first_name: string;
    last_name: string;
    position: string;
    club: string;
    floor_price: number; // cents
    price_change_24h: number;
    shirt_number: number;
    age: number;
    perf_l5: number;
    matches: number;
    goals: number;
    assists: number;
  };
};

interface ProfileOverviewTabProps {
  holdings: HoldingRow[];
  recentTrades: UserTradeWithPlayer[];
  fantasyResults: UserFantasyResult[];
  achievements: DbUserAchievement[];
  portfolioValueCents: number;
  portfolioCostCents: number;
  totalDpcs: number;
  userId: string | undefined;
}

// ============================================
// COMPONENT
// ============================================

export default function ProfileOverviewTab({
  holdings,
  recentTrades,
  fantasyResults,
  achievements,
  portfolioValueCents,
  portfolioCostCents,
  totalDpcs,
  userId,
}: ProfileOverviewTabProps) {
  const pnlCents = portfolioValueCents - portfolioCostCents;

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Portfoliowert" value={`${formatBsd(portfolioValueCents)} BSD`} icon={<BarChart3 className="w-4 h-4 text-white/40" />} />
        <StatCard
          label="Gewinn/Verlust"
          value={`${pnlCents >= 0 ? '+' : ''}${formatBsd(pnlCents)} BSD`}
          trend={pnlCents >= 0 ? 'up' : 'down'}
          icon={pnlCents >= 0 ? <TrendingUp className="w-4 h-4 text-[#22C55E]" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
        />
        <StatCard label="Spieler" value={holdings.length} />
        <StatCard label="DPCs" value={totalDpcs} />
      </div>

      {/* Top Holdings */}
      {holdings.length > 0 && (
        <Card className="p-4 md:p-6">
          <h3 className="font-black mb-3">Top Positionen</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {holdings
              .sort((a, b) => (b.quantity * b.player.floor_price) - (a.quantity * a.player.floor_price))
              .slice(0, 3)
              .map((h) => {
                const valueCents = h.quantity * h.player.floor_price;
                const pnl = h.quantity * (h.player.floor_price - h.avg_buy_price);
                return (
                  <Link key={h.id} href={`/player/${h.player_id}`}>
                    <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.06] hover:border-white/10 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <PositionBadge pos={h.player.position as Pos} size="sm" />
                        <span className="text-sm font-bold text-white truncate">{h.player.first_name} {h.player.last_name}</span>
                      </div>
                      <div className="text-xs text-white/40 mb-1">{h.player.club} · {h.quantity}x</div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-[#FFD700] text-sm">{fmtBSD(centsToBsd(valueCents))}</span>
                        <span className={cn('text-xs font-mono', pnl >= 0 ? 'text-[#22C55E]' : 'text-red-400')}>
                          {pnl >= 0 ? '+' : ''}{fmtBSD(centsToBsd(pnl))}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
          </div>
        </Card>
      )}

      {/* Achievements */}
      {achievements.length > 0 && (
        <Card className="p-6">
          <h3 className="font-black mb-4">Errungenschaften</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {achievements.map((a) => {
              const def = getAchievementDef(a.achievement_key);
              if (!def) return null;
              return (
                <div key={a.id} className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                  <div className="text-xl mb-1">{def.icon}</div>
                  <div className="text-sm font-bold">{def.label}</div>
                  <div className="text-[10px] text-white/40 mt-0.5">{def.description}</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Letzte Trades */}
      {recentTrades.length > 0 && (
        <Card className="p-4 md:p-6">
          <h3 className="font-black mb-4">Letzte Trades</h3>
          <div className="space-y-1">
            {recentTrades.map((trade) => {
              const isBuy = trade.buyer_id === userId;
              const totalCents = trade.price * trade.quantity;
              const unitBsd = centsToBsd(trade.price);
              return (
                <Link key={trade.id} href={`/player/${trade.player_id}`}>
                  <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition-colors">
                    <div className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-lg shrink-0',
                      isBuy ? 'text-[#FFD700] bg-[#FFD700]/10' : 'text-[#22C55E] bg-[#22C55E]/10'
                    )}>
                      {isBuy ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <PositionBadge pos={trade.player_position as Pos} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">
                        {trade.player_first_name} {trade.player_last_name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn(
                          'px-1.5 py-0.5 rounded text-[10px] font-bold',
                          isBuy ? 'bg-[#FFD700]/15 text-[#FFD700]' : 'bg-[#22C55E]/15 text-[#22C55E]'
                        )}>
                          {isBuy ? 'Kauf' : 'Verkauf'}
                        </span>
                        <span className="text-[10px] text-white/30">{trade.quantity}x · {getRelativeTime(trade.executed_at)}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={cn('text-sm font-mono font-bold', isBuy ? 'text-white' : 'text-[#22C55E]')}>
                        {isBuy ? '-' : '+'}{fmtBSD(centsToBsd(totalCents))} BSD
                      </div>
                      <div className="text-[10px] text-white/30 font-mono">à {fmtBSD(unitBsd)}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      {/* Fantasy-Ergebnisse */}
      {fantasyResults.length > 0 && (
        <Card className="p-4 md:p-6">
          <h3 className="font-black mb-4">Fantasy-Ergebnisse</h3>
          {/* Summary */}
          <div className="grid grid-cols-4 gap-3 mb-4 p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
            <div className="text-center">
              <div className="text-lg font-mono font-black text-white">{fantasyResults.length}</div>
              <div className="text-[10px] text-white/40">Events</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-mono font-black text-white">
                {Math.round(fantasyResults.reduce((s, r) => s + r.totalScore, 0) / fantasyResults.length)}
              </div>
              <div className="text-[10px] text-white/40">Avg Score</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-mono font-black text-[#FFD700]">
                #{Math.min(...fantasyResults.filter(r => r.rank > 0).map(r => r.rank))}
              </div>
              <div className="text-[10px] text-white/40">Bester Rang</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-mono font-black text-[#22C55E]">
                {fmtBSD(centsToBsd(fantasyResults.reduce((s, r) => s + r.rewardAmount, 0)))}
              </div>
              <div className="text-[10px] text-white/40">Gewonnen</div>
            </div>
          </div>
          {/* Event List */}
          <div className="space-y-1">
            {fantasyResults.map((result) => {
              const rankColor = result.rank === 1 ? 'text-[#FFD700]' : result.rank === 2 ? 'text-zinc-300' : result.rank === 3 ? 'text-amber-600' : 'text-white/50';
              const scoreColor = result.totalScore >= 100 ? 'text-[#FFD700]' : result.totalScore >= 70 ? 'text-white' : 'text-red-400';
              return (
                <div key={result.eventId} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition-colors">
                  <div className={cn('flex items-center justify-center w-8 h-8 rounded-lg shrink-0', rankColor, 'bg-white/5')}>
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{result.eventName}</div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-white/30">
                      {result.gameweek && <span>GW {result.gameweek}</span>}
                      {result.eventDate && <span>{new Date(result.eventDate).toLocaleDateString('de-DE')}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <div className={cn('text-sm font-mono font-bold', rankColor)}>#{result.rank}</div>
                      <div className="text-[10px] text-white/30">Rang</div>
                    </div>
                    <div className="text-right">
                      <div className={cn('text-sm font-mono font-bold', scoreColor)}>{result.totalScore}</div>
                      <div className="text-[10px] text-white/30">Score</div>
                    </div>
                    {result.rewardAmount > 0 && (
                      <div className="text-right">
                        <div className="text-sm font-mono font-bold text-[#22C55E]">+{fmtBSD(centsToBsd(result.rewardAmount))}</div>
                        <div className="text-[10px] text-white/30">BSD</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Bestande */}
      <Card className="p-6">
        <h3 className="font-black mb-4">Bestände</h3>
        {holdings.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-white/30 mb-3">Noch keine DPCs im Portfolio</div>
            <Link href="/market">
              <Button variant="gold" size="sm">Zum Marktplatz</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {holdings.map((h) => {
              const floorBsd = centsToBsd(h.player?.floor_price ?? 0);
              const avgBsd = centsToBsd(h.avg_buy_price);
              const holdingPnl = (floorBsd - avgBsd) * h.quantity;
              return (
                <Link key={h.id} href={`/player/${h.player_id}`}>
                  <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl hover:bg-white/[0.04] transition-all">
                    <div className="flex items-center gap-3">
                      <PositionBadge pos={h.player?.position as Pos} size="sm" />
                      <div>
                        <div className="font-bold">{h.player?.first_name} {h.player?.last_name}</div>
                        <div className="text-xs text-white/50">{h.player?.club}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold">{h.quantity} DPC</div>
                      <div className={`text-xs font-mono ${holdingPnl >= 0 ? 'text-[#22C55E]' : 'text-red-300'}`}>
                        {holdingPnl >= 0 ? '+' : ''}{fmtBSD(Math.round(holdingPnl))} BSD
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </>
  );
}
