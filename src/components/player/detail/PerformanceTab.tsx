'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import {
  Info, Calendar, AlertTriangle, Flame, CheckCircle2,
  PiggyBank, BarChart3, Users, Unlock, ShoppingBag,
  Activity,
} from 'lucide-react';
import { Card, InfoTooltip } from '@/components/ui';
import { PositionBadge } from '@/components/player';
import { getContractInfo } from '@/components/player/PlayerRow';
import { fmtScout } from '@/lib/utils';
import type { Player } from '@/types';
import type { MatchTimelineEntry } from '@/lib/services/scoring';
import DPCSupplyRing from './DPCSupplyRing';
import UpcomingFixtures from './UpcomingFixtures';
import FantasyCTA from './FantasyCTA';
import StatsBreakdown from './StatsBreakdown';
import MatchTimeline from './MatchTimeline';

interface PerformanceTabProps {
  player: Player;
  dpcAvailable: number;
  holdingQty: number;
  holderCount: number;
  matchTimeline: MatchTimelineEntry[];
  matchTimelineLoading?: boolean;
  allPlayers?: Player[];
}

const formatMarketValue = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M\u20AC`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K\u20AC`;
  return `${value}\u20AC`;
};

export default function PerformanceTab({
  player, dpcAvailable, holdingQty, holderCount,
  matchTimeline, matchTimelineLoading, allPlayers = [],
}: PerformanceTabProps) {
  const t = useTranslations('playerDetail');
  const tp = useTranslations('player');
  const contract = getContractInfo(player.contractMonthsLeft);
  const pbt = player.pbt || { balance: 0, sources: { trading: 0, votes: 0, content: 0, ipo: 0 } };

  return (
    <div className="space-y-4 md:space-y-6">

      {/* ── Status Banner ── */}
      {player.status !== 'fit' && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-3">
          <AlertTriangle className="size-4 text-amber-400 shrink-0" />
          <span className="text-sm text-amber-200">
            {player.status === 'injured'
              ? tp('statusInjured', { gw: player.lastAppearanceGw })
              : player.status === 'suspended'
                ? tp('statusSuspended')
                : tp('statusInactive', { gw: player.lastAppearanceGw })}
          </span>
        </div>
      )}

      {/* ── 1. Match Timeline (L5/L15 Hero + per-match rows) ── */}
      <MatchTimeline
        player={player}
        entries={matchTimeline}
        allPlayers={allPlayers}
        loading={matchTimelineLoading}
      />

      {/* ── 2. Season Stats (compact 3-col grid) ── */}
      <Card className="p-4 md:p-6">
        <h3 className="font-black text-lg mb-3 flex items-center gap-2 text-balance">
          <Activity className="size-5 text-gold" aria-hidden="true" />
          {t('seasonStats')}
        </h3>
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          <div className="text-center bg-black/20 rounded-xl py-3">
            <div className="text-2xl font-mono font-black tabular-nums">{player.stats.matches}</div>
            <div className="text-[10px] text-white/50">{t('matches')}</div>
          </div>
          <div className="text-center bg-black/20 rounded-xl py-3">
            <div className="text-2xl font-mono font-black tabular-nums text-green-500">{player.stats.goals}</div>
            <div className="text-[10px] text-white/50">{t('goals')}</div>
          </div>
          <div className="text-center bg-black/20 rounded-xl py-3">
            <div className="text-2xl font-mono font-black tabular-nums text-sky-300">{player.stats.assists}</div>
            <div className="text-[10px] text-white/50">{t('assists')}</div>
          </div>
        </div>
      </Card>

      {/* ── 3. Stats Breakdown (Opta-style percentile bars) ── */}
      {allPlayers.length >= 5 && (
        <StatsBreakdown player={player} allPlayers={allPlayers} />
      )}

      {/* ── 4. Upcoming Fixtures ── */}
      {player.clubId && (
        <UpcomingFixtures clubId={player.clubId} />
      )}

      {/* ── 5. Fantasy CTA ── */}
      <FantasyCTA holdingQty={holdingQty} />

      {/* ── 6. Player Info Grid ── */}
      <Card className="p-4 md:p-6">
        <h3 className="font-black text-lg mb-4 flex items-center gap-2 text-balance">
          <Info className="size-5 text-white/50" aria-hidden="true" />
          {t('playerInfo')}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <div>
            <div className="text-xs text-white/50">{t('marketValue')}</div>
            <div className="font-bold">{player.marketValue ? formatMarketValue(player.marketValue) : '\u2013'}</div>
          </div>
          <div>
            <div className="text-xs text-white/50">{t('position')}</div>
            <div className="font-bold flex items-center gap-2">
              <PositionBadge pos={player.pos} size="sm" />
              {player.pos}
            </div>
          </div>
          <div>
            <div className="text-xs text-white/50">{t('nationality')}</div>
            <div className="font-bold">{player.country}</div>
          </div>
          <div>
            <div className="text-xs text-white/50">{t('holder')}</div>
            <div className="font-bold tabular-nums">{holderCount}</div>
          </div>
        </div>
      </Card>

      {/* ── 7. DPC Supply Ring ── */}
      <Card className="p-4 md:p-6">
        <h3 className="font-black text-lg mb-4 flex items-center gap-2 text-balance">
          <BarChart3 className="size-5 text-gold" aria-hidden="true" />
          {t('dpcDistribution')}
        </h3>
        <DPCSupplyRing
          supply={player.dpc.supply}
          released={player.dpc.float}
          sold={player.dpc.circulation}
          owned={player.dpc.owned}
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="bg-surface-base border border-white/10 rounded-xl p-3">
            <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
              <BarChart3 className="size-3" aria-hidden="true" />{t('supply')}
            </div>
            <div className="font-mono font-bold tabular-nums">{fmtScout(player.dpc.supply)}</div>
          </div>
          <div className="bg-surface-base border border-white/10 rounded-xl p-3">
            <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
              <ShoppingBag className="size-3" aria-hidden="true" />{t('released')}
            </div>
            <div className="font-mono font-bold tabular-nums">{fmtScout(player.dpc.float)}</div>
          </div>
          <div className="bg-surface-base border border-white/10 rounded-xl p-3">
            <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
              <Users className="size-3" aria-hidden="true" />{t('sold')}
            </div>
            <div className="font-mono font-bold tabular-nums">{fmtScout(player.dpc.circulation)}</div>
          </div>
          <div className="bg-surface-base border border-white/10 rounded-xl p-3">
            <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
              <Unlock className="size-3" aria-hidden="true" />{t('available')}
            </div>
            <div className="font-mono font-bold tabular-nums text-gold">{fmtScout(dpcAvailable)}</div>
          </div>
        </div>
      </Card>

      {/* ── 8. Contract Status ── */}
      {player.contractMonthsLeft > 0 && (() => {
        const progressPercent = Math.max(0, Math.min(100, ((36 - player.contractMonthsLeft) / 36) * 100));
        return (
          <Card className="overflow-hidden">
            <div className={`p-4 ${contract.urgent ? 'bg-red-500/10' : player.contractMonthsLeft <= 12 ? 'bg-orange-500/10' : 'bg-surface-base'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="size-5 text-white/50" aria-hidden="true" />
                  <span className="font-bold">{t('contractStatus')}</span>
                </div>
                {contract.urgent && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-red-500/20 text-red-300">
                    <AlertTriangle className="size-3" aria-hidden="true" />
                    {t('expiringSoon')}
                  </div>
                )}
                {!contract.urgent && player.contractMonthsLeft <= 12 && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-orange-500/20 text-orange-300">
                    <AlertTriangle className="size-3" aria-hidden="true" />
                    {t('expiringLabel')}
                  </div>
                )}
              </div>
              <div className="flex items-end justify-between mb-2">
                <div>
                  <div className="text-xs text-white/40">{t('contractEnd')}</div>
                  <div className={`font-mono font-bold tabular-nums text-lg ${contract.color}`}>{contract.dateStr}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-white/40">{t('remainingTerm')}</div>
                  <div className={`font-mono font-bold tabular-nums text-lg ${contract.color}`}>{t('monthsCount', { count: contract.monthsLeft })}</div>
                </div>
              </div>
              <div className="mt-3">
                <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-colors ${contract.urgent ? 'bg-red-400' : player.contractMonthsLeft <= 12 ? 'bg-orange-400' : 'bg-green-500'}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
            {(contract.urgent || player.contractMonthsLeft <= 12) && (
              <div className={`p-4 border-t ${contract.urgent ? 'border-red-500/20 bg-red-500/5' : 'border-orange-500/20 bg-orange-500/5'}`}>
                <div className="flex items-start gap-3">
                  <Flame className={`size-5 mt-0.5 ${contract.urgent ? 'text-red-400' : 'text-orange-400'}`} aria-hidden="true" />
                  <div>
                    <div className={`font-bold text-sm ${contract.urgent ? 'text-red-300' : 'text-orange-300'}`}>
                      {t('dpcBurnIn', { months: contract.monthsLeft })}
                    </div>
                    <div className="text-xs text-white/50 mt-1 text-pretty">{t('dpcBurnInfo')}</div>
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <CheckCircle2 className="size-3 text-green-500" aria-hidden="true" />
                      <span className="text-white/60">{t('pbtRewardAuto')}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        );
      })()}

      {/* ── 9. PBT Widget ── */}
      <Card className="overflow-hidden">
        <div className={`${player.isLiquidated ? 'bg-gradient-to-r from-white/5 to-white/[0.02]' : 'bg-gradient-to-r from-gold/20 to-orange-500/10'} border-b border-gold/20 p-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PiggyBank className={`size-5 ${player.isLiquidated ? 'text-white/30' : 'text-gold'}`} aria-hidden="true" />
              <span className="font-black">{t('pbt')}</span>
              <InfoTooltip text={t('pbtTooltip')} />
            </div>
            <div className="flex items-center gap-1 text-xs text-white/50">
              <Info className="size-3" aria-hidden="true" />
              <span>{player.isLiquidated ? t('pbtDistributed') : t('pbtLiquidationInfo')}</span>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="bg-black/20 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-sm">{player.isLiquidated ? t('reservedSuccessFee') : t('treasuryBalance')}</span>
              <span className={`font-mono font-black tabular-nums text-2xl ${player.isLiquidated ? 'text-white/30' : 'text-gold'}`}>{fmtScout(pbt.balance)} CR</span>
            </div>
          </div>
          {pbt.sources && (
            <div>
              <div className="text-xs text-white/40 mb-2">{t('inflowsBySource')}</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-surface-base rounded-lg p-2 flex items-center justify-between">
                  <span className="text-xs text-white/50">{t('tradingFees')}</span>
                  <span className="font-mono tabular-nums text-sm">{fmtScout(pbt.sources.trading)}</span>
                </div>
                <div className="bg-surface-base rounded-lg p-2 flex items-center justify-between">
                  <span className="text-xs text-white/50">{t('votesLabel')}</span>
                  <span className="font-mono tabular-nums text-sm">{fmtScout(pbt.sources.votes)}</span>
                </div>
                <div className="bg-surface-base rounded-lg p-2 flex items-center justify-between">
                  <span className="text-xs text-white/50">{t('contentLabel')}</span>
                  <span className="font-mono tabular-nums text-sm">{fmtScout(pbt.sources.content)}</span>
                </div>
                <div className="bg-surface-base rounded-lg p-2 flex items-center justify-between">
                  <span className="text-xs text-white/50">{t('initialSale')}</span>
                  <span className="font-mono tabular-nums text-sm">{fmtScout(pbt.sources.ipo)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
