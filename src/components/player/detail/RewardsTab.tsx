'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { TrendingUp, Trophy, Zap, Info } from 'lucide-react';
import { Card, InfoTooltip } from '@/components/ui';
import { calcSuccessFee } from '@/components/player/PlayerRow';
import { TradingDisclaimer } from '@/components/legal/TradingDisclaimer';
import { centsToBsd } from '@/lib/services/players';
import { fmtScout } from '@/lib/utils';
import type { Player } from '@/types';

interface RewardsTabProps {
  player: Player;
  holdingQty: number;
}

const formatMarketValue = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M\u20AC`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K\u20AC`;
  return `${value}\u20AC`;
};

type MilestoneKey = 'today' | 'doubled' | 'fivefold' | 'tenfold';

// Slice 113 — Linear Growth Visualization (replaces 10-Tier Ladder)
// Formula (CEO Pricing-Asset-Model): fee_per_card_cents = MV_EUR / 10
// Synced with liquidate_player RPC via calcSuccessFee() helper.
const MILESTONES: ReadonlyArray<{ key: MilestoneKey; multiplier: number; labelKey: string }> = [
  { key: 'today', multiplier: 1, labelKey: 'milestoneToday' },
  { key: 'doubled', multiplier: 2, labelKey: 'milestoneDoubled' },
  { key: 'fivefold', multiplier: 5, labelKey: 'milestoneFivefold' },
  { key: 'tenfold', multiplier: 10, labelKey: 'milestoneTenfold' },
];

export default function RewardsTab({ player, holdingQty }: RewardsTabProps) {
  const t = useTranslations('playerDetail');
  const marketValue = player.marketValue || 0;
  const ipoPrice = player.prices.ipoPrice ?? 0;
  const hasHolding = holdingQty > 0;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Intro */}
      <Card className="p-4 md:p-6 border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
            <Trophy aria-hidden="true" className="size-5 text-green-500" />
          </div>
          <div>
            <h3 className="font-black text-base mb-1 text-balance">{t('possibleRewards')}</h3>
            <p className="text-sm text-white/60 leading-relaxed text-pretty">
              {t('rewardsIntro', { name: `${player.first} ${player.last}` })}
            </p>
          </div>
        </div>
      </Card>

      {/* Current Status */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="text-[10px] text-white/40 mb-1">{t('currentMarketValue')}</div>
          <div className="font-mono font-black tabular-nums text-lg">
            {marketValue > 0 ? formatMarketValue(marketValue) : '–'}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] text-white/40 mb-1">{t('yourEntry')}</div>
          <div className="font-mono font-black tabular-nums text-lg">
            {ipoPrice > 0 ? (
              <>
                {fmtScout(ipoPrice)} <span className="text-sm text-white/40">Credits</span>
              </>
            ) : (
              '–'
            )}
          </div>
          {hasHolding && (
            <div className="text-[10px] text-sky-300 mt-0.5">
              {t('dpcOwnership', { count: holdingQty })}
            </div>
          )}
        </Card>
      </div>

      {/* Growth Milestones (Slice 113 — linear formula visualization) */}
      <Card className="p-4 md:p-6">
        <h3 className="font-black text-lg mb-1 flex items-center gap-2 text-balance">
          <TrendingUp aria-hidden="true" className="size-5 text-gold" />
          {t('growthMilestones')}
          <InfoTooltip text={t('growthFormulaTooltip')} />
        </h3>
        <p className="text-xs text-white/40 mb-4 text-pretty">{t('growthMilestonesDesc')}</p>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {MILESTONES.map(({ key, multiplier, labelKey }) => {
            const milestoneMv = marketValue * multiplier;
            const feeCents = calcSuccessFee(milestoneMv);
            const rewardPerCard = centsToBsd(feeCents);
            const totalReward = hasHolding ? rewardPerCard * holdingQty : 0;
            const isToday = key === 'today';

            return (
              <div
                key={key}
                className={`rounded-xl border p-3 transition-colors ${
                  isToday
                    ? 'bg-gold/[0.06] border-gold/30 ring-1 ring-gold/20'
                    : 'bg-surface-minimal border-divider'
                }`}
              >
                <div
                  className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${
                    isToday ? 'text-gold' : 'text-white/40'
                  }`}
                >
                  {t(labelKey)}
                </div>
                <div className={`text-sm font-mono tabular-nums ${isToday ? 'text-gold' : 'text-white/70'}`}>
                  {marketValue > 0 ? formatMarketValue(milestoneMv) : '–'}
                </div>
                <div className="mt-2 space-y-0.5">
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`font-mono font-bold tabular-nums text-base ${
                        isToday ? 'text-gold' : 'text-green-500'
                      }`}
                    >
                      {marketValue > 0 ? fmtScout(rewardPerCard) : '–'}
                    </span>
                    <span className="text-[10px] text-white/30">CR</span>
                  </div>
                  <div className="text-[10px] text-white/40">{t('perCard')}</div>
                  {hasHolding && marketValue > 0 && (
                    <div className="mt-1 pt-1 border-t border-white/[0.06]">
                      <div className="font-mono font-bold tabular-nums text-xs text-sky-300">
                        {fmtScout(totalReward)} CR
                      </div>
                      <div className="text-[10px] text-white/30">
                        {t('totalAtMilestone', { qty: holdingQty })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-start gap-2 text-[10px] text-white/30">
          <Info aria-hidden="true" className="size-3 mt-0.5 shrink-0" />
          <span className="text-pretty">{t('rewardDisclaimer')}</span>
        </div>
      </Card>

      <TradingDisclaimer />
    </div>
  );
}
