'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import {
  Info, Calendar, AlertTriangle, Flame, CheckCircle2,
  PiggyBank, BarChart3, Users, Unlock, ShoppingBag,
  Activity, TrendingUp, TrendingDown,
} from 'lucide-react';
import { Card, InfoTooltip } from '@/components/ui';
import { PositionBadge, ScoreCircle, MiniSparkline, getL5Hex } from '@/components/player';
import { getContractInfo } from '@/components/player/PlayerRow';
import { fmtScout } from '@/lib/utils';
import type { Player } from '@/types';
import type { PlayerGameweekScore } from '@/lib/services/scoring';
import DPCSupplyRing from './DPCSupplyRing';
import GameweekScoreBar from './GameweekScoreBar';
import UpcomingFixtures from './UpcomingFixtures';
import FantasyCTA from './FantasyCTA';
import { RadarChart, buildPlayerRadarAxes } from '@/components/player/RadarChart';
import { usePositionPercentile } from '@/lib/hooks/usePositionPercentile';
import { posTintColors } from '@/components/player/PlayerRow';

interface PerformanceTabProps {
  player: Player;
  dpcAvailable: number;
  holdingQty: number;
  holderCount: number;
  gwScores: PlayerGameweekScore[];
  allPlayers?: Player[];
}

const formatMarketValue = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M\u20AC`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K\u20AC`;
  return `${value}\u20AC`;
};

export default function PerformanceTab({
  player, dpcAvailable, holdingQty, holderCount, gwScores, allPlayers = [],
}: PerformanceTabProps) {
  const t = useTranslations('playerDetail');
  const tp = useTranslations('player');
  const contract = getContractInfo(player.contractMonthsLeft);

  const radarLabels = {
    goals: tp('statGoals'), assists: tp('statAssists'), cleanSheets: tp('statCS'),
    matches: tp('statMatches'), perfL5: tp('statL5'), perfL15: tp('statL15'),
    saves: tp('statSaves'), minutes: tp('statMinutes'),
  };

  const pbt = player.pbt || { balance: 0, sources: { trading: 0, votes: 0, content: 0, ipo: 0 } };
  const percentile = usePositionPercentile(player.pos, player.perf.l5, allPlayers);
  const posTint = posTintColors[player.pos];

  const avgScore = gwScores.length > 0
    ? Math.round(gwScores.reduce((s, g) => s + g.score, 0) / gwScores.length)
    : 0;
  const scoreColor = avgScore >= 100 ? 'text-gold' : avgScore >= 70 ? 'text-white' : avgScore > 0 ? 'text-red-400' : 'text-white/30';

  return (
    <div className="space-y-4 md:space-y-6">
      {/* ── Score Dashboard (from StatistikTab) ── */}
      <Card className="p-4 md:p-6">
        <h3 className="font-black text-lg mb-4 flex items-center gap-2 text-balance">
          <Activity className="size-5 text-gold" aria-hidden="true" />
          {t('perfOverview')}
        </h3>

        <div className="flex items-end gap-4 md:gap-6 mb-6">
          <div className="flex flex-col items-center gap-1">
            <div style={{ filter: `drop-shadow(0 0 8px ${getL5Hex(player.perf.l5)}40)` }}>
              <ScoreCircle label="L5" value={player.perf.l5} size={64} />
            </div>
            <span className="text-[9px] font-mono tabular-nums text-white/40">
              {player.perf.l5 > 0 ? `${Math.round((player.perf.l5 / 100) * 100)}%` : '--'}
            </span>
            {percentile && (
              <span className="text-[9px] font-bold" style={{ color: posTint }}>
                Top {100 - percentile.percentile}% {player.pos}
              </span>
            )}
          </div>
          <div className="flex flex-col items-center gap-1">
            <ScoreCircle label="L15" value={player.perf.l15} size={52} />
            <span className="text-[9px] font-mono tabular-nums text-white/40">
              {player.perf.l15 > 0 ? `${Math.round((player.perf.l15 / 100) * 100)}%` : '--'}
            </span>
          </div>
          {avgScore > 0 && (
            <div className="flex flex-col items-center gap-1">
              <ScoreCircle label={t('season')} value={avgScore} size={48} />
              <span className="text-[9px] font-mono tabular-nums text-white/40">
                {Math.round((avgScore / 100) * 100)}%
              </span>
            </div>
          )}
          <div className="flex flex-col items-center gap-0.5 ml-2">
            <div className={`font-bold flex items-center gap-1 ${player.perf.trend === 'UP' ? 'text-green-500' : player.perf.trend === 'DOWN' ? 'text-red-300' : 'text-white/60'}`}>
              {player.perf.trend === 'UP' ? <TrendingUp className="size-4" aria-hidden="true" /> : player.perf.trend === 'DOWN' ? <TrendingDown className="size-4" aria-hidden="true" /> : null}
              {player.perf.trend === 'UP' ? 'Hot' : player.perf.trend === 'DOWN' ? 'Cold' : 'Stable'}
            </div>
            <div className="text-white/50 text-[9px]">{t('form')}</div>
          </div>
        </div>

        <div>
          <div className="text-xs text-white/50 mb-3">{t('seasonStats')}</div>
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
        </div>

        {gwScores.length >= 3 && (
          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-white/50">{t('seasonTrend')}</div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40">&empty;</span>
                <span className={`font-mono font-bold tabular-nums text-sm ${scoreColor}`}>{avgScore}</span>
              </div>
            </div>
            <MiniSparkline values={gwScores.map(g => g.score)} width={400} height={48} />
          </div>
        )}
      </Card>

      {/* ── Gameweek Score Bars ── */}
      {gwScores.length > 0 ? (
        <GameweekScoreBar scores={gwScores} maxDisplay={15} />
      ) : (
        <Card className="p-6 text-center">
          <Activity className="size-8 text-white/15 mx-auto mb-2" aria-hidden="true" />
          <div className="text-sm text-white/40">{t('noGwScores')}</div>
          <div className="text-xs text-white/25 mt-1 text-pretty">{t('noGwScoresHint')}</div>
        </Card>
      )}

      {/* ── Upcoming Fixtures ── */}
      {player.clubId && (
        <UpcomingFixtures clubId={player.clubId} />
      )}

      {/* ── Fantasy CTA ── */}
      <FantasyCTA holdingQty={holdingQty} />

      {/* ── Attribute Radar ── */}
      <Card className="p-4 md:p-6">
        <h3 className="font-black text-lg mb-4 flex items-center gap-2 text-balance">
          <Activity className="size-5 text-sky-400" aria-hidden="true" />
          {t('attributeRadar')}
        </h3>
        <div className="flex justify-center">
          <RadarChart
            datasets={[{
              axes: buildPlayerRadarAxes({
                goals: player.stats.goals,
                assists: player.stats.assists,
                cleanSheets: player.stats.cleanSheets,
                matches: player.stats.matches,
                perfL5: player.perf.l5,
                perfL15: player.perf.l15,
                saves: player.stats.saves,
                minutes: player.stats.minutes,
              }, radarLabels),
              color: player.pos === 'GK' ? '#34d399' : player.pos === 'DEF' ? '#fbbf24' : player.pos === 'MID' ? '#38bdf8' : '#fb7185',
            }]}
            size={260}
          />
        </div>
      </Card>

      {/* ── Player Info Grid ── */}
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

      {/* ── DPC Supply Ring ── */}
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

      {/* ── Contract Status ── */}
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

      {/* ── PBT Widget ── */}
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
              <span className={`font-mono font-black tabular-nums text-2xl ${player.isLiquidated ? 'text-white/30' : 'text-gold'}`}>{fmtScout(pbt.balance)} bCredits</span>
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
