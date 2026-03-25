'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Info, Calendar, AlertTriangle, Flame, CheckCircle2,
  PiggyBank, BarChart3, Users, Unlock, ShoppingBag,
  Activity, ChevronDown,
} from 'lucide-react';
import { Card, InfoTooltip } from '@/components/ui';
import { PositionBadge } from '@/components/player';
import { getContractInfo } from '@/components/player/PlayerRow';
import { cn, fmtScout } from '@/lib/utils';
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

/** Collapsible section header with ChevronDown toggle */
function CollapsibleHeader({
  icon,
  title,
  open,
  onToggle,
  trailing,
}: {
  icon: React.ReactNode;
  title: string;
  open: boolean;
  onToggle: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="w-full flex items-center justify-between p-4 md:p-6 min-h-[44px] text-left"
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-black text-lg text-balance">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        {trailing}
        <ChevronDown
          className={cn('size-4 text-white/30 transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
      </div>
    </button>
  );
}

export default function PerformanceTab({
  player, dpcAvailable, holdingQty, holderCount,
  matchTimeline, matchTimelineLoading, allPlayers = [],
}: PerformanceTabProps) {
  const t = useTranslations('playerDetail');
  const tp = useTranslations('player');
  const contract = getContractInfo(player.contractMonthsLeft);
  const pbt = player.pbt || { balance: 0, sources: { trading: 0, votes: 0, content: 0, ipo: 0 } };

  // Collapsible states (collapsed by default for secondary sections)
  const [dpcOpen, setDpcOpen] = useState(false);
  const [pbtOpen, setPbtOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(
    // Auto-expand if contract is urgent or expiring within 12 months
    contract.urgent || player.contractMonthsLeft <= 12
  );

  return (
    <div className="space-y-5 md:space-y-8">

      {/* ── Status Banner ── */}
      {player.status !== 'fit' && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-3">
          <AlertTriangle className="size-4 text-amber-400 shrink-0" />
          <span className="text-sm text-amber-200">
            {player.status === 'injured'
              ? tp('explainInjured', { gw: player.lastAppearanceGw })
              : player.status === 'suspended'
                ? tp('explainSuspended')
                : tp('explainInactive', { gw: player.lastAppearanceGw })}
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

      {/* ── 3. Upcoming Fixtures (moved up — actionable) ── */}
      {player.clubId && (
        <UpcomingFixtures clubId={player.clubId} />
      )}

      {/* ── 4. Stats Breakdown (Opta-style percentile bars) ── */}
      {allPlayers.length >= 5 && (
        <StatsBreakdown player={player} allPlayers={allPlayers} />
      )}

      {/* ── 5. Player Info Grid ── */}
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

      {/* ── 6. Contract Status (collapsible, auto-expanded if urgent) ── */}
      {player.contractMonthsLeft > 0 && (() => {
        const progressPercent = Math.max(0, Math.min(100, ((36 - player.contractMonthsLeft) / 36) * 100));
        return (
          <Card className="overflow-hidden">
            <CollapsibleHeader
              icon={<Calendar className="size-5 text-white/50" aria-hidden="true" />}
              title={t('contractStatus')}
              open={contractOpen}
              onToggle={() => setContractOpen(prev => !prev)}
              trailing={
                <>
                  {contract.urgent && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-500/20 text-red-300">
                      <AlertTriangle className="size-3" aria-hidden="true" />
                      {t('expiringSoon')}
                    </span>
                  )}
                  {!contract.urgent && player.contractMonthsLeft <= 12 && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-orange-500/20 text-orange-300">
                      <AlertTriangle className="size-3" aria-hidden="true" />
                      {t('expiringLabel')}
                    </span>
                  )}
                  {!contract.urgent && player.contractMonthsLeft > 12 && (
                    <span className={cn('font-mono font-bold tabular-nums text-sm', contract.color)}>
                      {t('monthsCount', { count: contract.monthsLeft })}
                    </span>
                  )}
                </>
              }
            />
            {contractOpen && (
              <div className={`px-4 md:px-6 pb-4 ${contract.urgent ? 'bg-red-500/10' : player.contractMonthsLeft <= 12 ? 'bg-orange-500/10' : ''}`}>
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
                {(contract.urgent || player.contractMonthsLeft <= 12) && (
                  <div className="mt-4 pt-3 border-t border-white/[0.06]">
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
              </div>
            )}
          </Card>
        );
      })()}

      {/* ── 7. DPC Supply Ring (collapsible, collapsed by default) ── */}
      <Card className="overflow-hidden">
        <CollapsibleHeader
          icon={<BarChart3 className="size-5 text-gold" aria-hidden="true" />}
          title={t('dpcDistribution')}
          open={dpcOpen}
          onToggle={() => setDpcOpen(prev => !prev)}
          trailing={
            <span className="font-mono text-xs text-white/40 tabular-nums">
              {fmtScout(player.dpc.circulation)}/{fmtScout(player.dpc.supply)}
            </span>
          }
        />
        {dpcOpen && (
          <div className="px-4 md:px-6 pb-4">
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
          </div>
        )}
      </Card>

      {/* ── 8. PBT Widget (collapsible, collapsed by default) ── */}
      <Card className="overflow-hidden">
        <CollapsibleHeader
          icon={<PiggyBank className={`size-5 ${player.isLiquidated ? 'text-white/30' : 'text-gold'}`} aria-hidden="true" />}
          title={t('pbt')}
          open={pbtOpen}
          onToggle={() => setPbtOpen(prev => !prev)}
          trailing={
            <span className={cn('font-mono font-bold tabular-nums text-sm', player.isLiquidated ? 'text-white/30' : 'text-gold')}>
              {fmtScout(pbt.balance)} CR
            </span>
          }
        />
        {pbtOpen && (
          <div className="p-4 pt-0 space-y-4">
            <div className="flex items-center gap-1 text-xs text-white/50 mb-2">
              <Info className="size-3" aria-hidden="true" />
              <span>{player.isLiquidated ? t('pbtDistributed') : t('pbtLiquidationInfo')}</span>
            </div>
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
        )}
      </Card>

      {/* ── 9. Fantasy CTA (moved to bottom) ── */}
      <FantasyCTA holdingQty={holdingQty} />
    </div>
  );
}
