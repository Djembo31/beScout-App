'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { TrendingUp, Trophy, Zap, Star, Info } from 'lucide-react';
import { Card } from '@/components/ui';
import { SUCCESS_FEE_TIERS, getSuccessFeeTier } from '@/components/player/PlayerRow';
import { TradingDisclaimer } from '@/components/legal/TradingDisclaimer';
import { centsToBsd } from '@/lib/services/players';
import { fmtScout } from '@/lib/utils';
import type { Player } from '@/types';

interface RewardsTabProps {
  player: Player;
  holdingQty: number;
}

const formatMarketValue = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M\u20AC`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K\u20AC`;
  return `${value}\u20AC`;
};

const formatGrowthLabel = (currentValue: number, tierMaxValue: number): string => {
  if (tierMaxValue === Infinity || currentValue <= 0) return '';
  const mult = tierMaxValue / currentValue;
  if (mult <= 1) return '';
  return `${formatMarketValue(tierMaxValue)} ${t_static_marketValue}`;
};

// Static label for formatGrowthLabel (outside component scope)
const t_static_marketValue = 'Marktwert';

export default function RewardsTab({ player, holdingQty }: RewardsTabProps) {
  const t = useTranslations('playerDetail');
  const marketValue = player.marketValue || 500000;
  const currentTier = getSuccessFeeTier(marketValue);
  const ipoPrice = player.prices.ipoPrice ?? 100;

  // Find current tier index
  const currentIdx = SUCCESS_FEE_TIERS.findIndex(t => t === currentTier);

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
          <div className="font-mono font-black tabular-nums text-lg">{formatMarketValue(marketValue)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] text-white/40 mb-1">{t('yourEntry')}</div>
          <div className="font-mono font-black tabular-nums text-lg">{fmtScout(ipoPrice)} <span className="text-sm text-white/40">$SCOUT</span></div>
          {holdingQty > 0 && (
            <div className="text-[10px] text-sky-300 mt-0.5">{t('dpcOwnership', { count: holdingQty })}</div>
          )}
        </Card>
      </div>

      {/* Reward Ladder */}
      <Card className="p-4 md:p-6">
        <h3 className="font-black text-lg mb-1 flex items-center gap-2 text-balance">
          <TrendingUp aria-hidden="true" className="size-5 text-gold" />
          {t('rewardLadder')}
        </h3>
        <p className="text-xs text-white/40 mb-4 text-pretty">{t('rewardLadderDesc')}</p>

        <div className="space-y-1.5">
          {SUCCESS_FEE_TIERS.map((tier, i) => {
            const isActive = tier === currentTier;
            const isPast = i < currentIdx;
            const isFuture = i > currentIdx;
            const reward = centsToBsd(tier.fee);
            const growthLabel = formatGrowthLabel(marketValue, tier.maxValue);

            return (
              <div
                key={tier.label}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
                  isActive
                    ? 'bg-gold/[0.08] border-gold/30 ring-2 ring-gold/40 shadow-glow-gold scale-[1.02]'
                    : isPast
                    ? 'bg-white/[0.01] border-white/[0.04] opacity-40'
                    : 'bg-white/[0.02] border-white/[0.06]'
                }`}
              >
                {/* Tier indicator */}
                <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isActive
                    ? 'bg-gold/20'
                    : isFuture
                    ? 'bg-white/5'
                    : 'bg-white/[0.03]'
                }`}>
                  {isActive ? (
                    <Star aria-hidden="true" className="size-4 text-gold" />
                  ) : isFuture ? (
                    <Zap aria-hidden="true" className="size-4 text-white/30" />
                  ) : (
                    <div className="size-2 rounded-full bg-white/20" />
                  )}
                </div>

                {/* Tier range */}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-bold ${isActive ? 'text-gold' : ''}`}>
                    {tier.maxValue === Infinity ? `ab ${formatMarketValue(tier.minValue)}` : formatMarketValue(tier.maxValue)}
                  </div>
                  {growthLabel && isFuture && (
                    <div className="text-[10px] text-white/40 font-mono">ab {growthLabel}</div>
                  )}
                  {isActive && (
                    <div className="text-[10px] text-gold/50">{t('currentTier')}</div>
                  )}
                </div>

                {/* Reward amount */}
                <div className="text-right shrink-0">
                  <div className={`font-mono font-bold tabular-nums text-sm ${
                    isActive ? 'text-gold' : isFuture ? 'text-green-500' : 'text-white/30'
                  }`}>
                    {fmtScout(reward)} $SCOUT
                  </div>
                  {isActive && (
                    <div className="text-[10px] font-mono text-gold/50">/DPC</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Potential Earnings (if holding) */}
      {holdingQty > 0 && (
        <Card className="p-4 md:p-6 border-sky-400/20 bg-gradient-to-br from-sky-400/5 to-transparent">
          <h3 className="font-black text-base mb-3 flex items-center gap-2 text-balance">
            <Zap aria-hidden="true" className="size-5 text-sky-400" />
            {t('yourPotential')}
          </h3>
          <div className="space-y-2">
            {SUCCESS_FEE_TIERS.filter((_, i) => i >= currentIdx).slice(0, 4).map(tier => {
              const reward = centsToBsd(tier.fee);
              const totalReward = reward * holdingQty;

              return (
                <div key={tier.label} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                  <div className="text-sm text-white/60">
                    {t('atValue', { value: tier.maxValue === Infinity ? `ab ${formatMarketValue(tier.minValue)}` : formatMarketValue(tier.maxValue) })}
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold tabular-nums text-sm">{fmtScout(totalReward)} $SCOUT</span>
                    <div className="text-[10px] text-white/30 tabular-nums">{holdingQty} DPC</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-start gap-2 text-[10px] text-white/30">
            <Info aria-hidden="true" className="size-3 mt-0.5 shrink-0" />
            <span className="text-pretty">{t('rewardDisclaimer')}</span>
          </div>
          <TradingDisclaimer className="mt-3" />
        </Card>
      )}
    </div>
  );
}
