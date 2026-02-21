'use client';

import React from 'react';
import { TrendingUp, Trophy, Zap, Star, Info } from 'lucide-react';
import { Card } from '@/components/ui';
import { SUCCESS_FEE_TIERS, getSuccessFeeTier } from '@/components/player/PlayerRow';
import { centsToBsd } from '@/lib/services/players';
import { fmtScout } from '@/lib/utils';
import type { Player } from '@/types';

interface RewardsTabProps {
  player: Player;
  holdingQty: number;
}

const formatMarketValue = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M€`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K€`;
  return `${value}€`;
};

const getMultiplier = (currentValue: number, tierMaxValue: number): string => {
  if (tierMaxValue === Infinity || currentValue <= 0) return '';
  const mult = tierMaxValue / currentValue;
  if (mult <= 1) return '';
  return `x${mult >= 10 ? Math.round(mult) : mult.toFixed(1)}`;
};

export default function RewardsTab({ player, holdingQty }: RewardsTabProps) {
  const marketValue = player.marketValue || 500000;
  const currentTier = getSuccessFeeTier(marketValue);
  const ipoPrice = player.prices.ipoPrice ?? 100;

  // Find current tier index
  const currentIdx = SUCCESS_FEE_TIERS.findIndex(t => t === currentTier);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Intro */}
      <Card className="p-4 md:p-6 border-[#22C55E]/20 bg-gradient-to-br from-[#22C55E]/5 to-transparent">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#22C55E]/10 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-[#22C55E]" />
          </div>
          <div>
            <h3 className="font-black text-base mb-1">Mögliche Rewards</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Je höher der Marktwert von <span className="text-white font-bold">{player.first} {player.last}</span> steigt,
              desto mehr verdienst du als DPC-Holder. Der Verein beteiligt dich am Erfolg.
            </p>
          </div>
        </div>
      </Card>

      {/* Current Status */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="text-[10px] text-white/40 mb-1">Aktueller Marktwert</div>
          <div className="font-mono font-black text-lg">{formatMarketValue(marketValue)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] text-white/40 mb-1">Dein Einstieg</div>
          <div className="font-mono font-black text-lg">{fmtScout(ipoPrice)} <span className="text-sm text-white/40">$SCOUT</span></div>
          {holdingQty > 0 && (
            <div className="text-[10px] text-sky-300 mt-0.5">{holdingQty} DPC im Besitz</div>
          )}
        </Card>
      </div>

      {/* Reward Ladder */}
      <Card className="p-4 md:p-6">
        <h3 className="font-black text-lg mb-1 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#FFD700]" />
          Reward-Treppe
        </h3>
        <p className="text-xs text-white/40 mb-4">Erfolgsbonus pro DPC bei steigendem Marktwert</p>

        <div className="space-y-1.5">
          {SUCCESS_FEE_TIERS.map((tier, i) => {
            const isActive = tier === currentTier;
            const isPast = i < currentIdx;
            const isFuture = i > currentIdx;
            const reward = centsToBsd(tier.fee);
            const roi = ipoPrice > 0 ? reward / ipoPrice : 0;
            const multiplier = getMultiplier(marketValue, tier.maxValue);

            return (
              <div
                key={tier.label}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-[#FFD700]/[0.08] border-[#FFD700]/30 ring-1 ring-[#FFD700]/20'
                    : isPast
                    ? 'bg-white/[0.01] border-white/[0.04] opacity-40'
                    : 'bg-white/[0.02] border-white/[0.06]'
                }`}
              >
                {/* Tier indicator */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isActive
                    ? 'bg-[#FFD700]/20'
                    : isFuture
                    ? 'bg-white/5'
                    : 'bg-white/[0.03]'
                }`}>
                  {isActive ? (
                    <Star className="w-4 h-4 text-[#FFD700]" />
                  ) : isFuture ? (
                    <Zap className="w-4 h-4 text-white/30" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-white/20" />
                  )}
                </div>

                {/* Tier range */}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-bold ${isActive ? 'text-[#FFD700]' : ''}`}>
                    {tier.maxValue === Infinity ? `ab ${formatMarketValue(tier.minValue)}` : formatMarketValue(tier.maxValue)}
                  </div>
                  {multiplier && isFuture && (
                    <div className="text-[10px] text-[#22C55E] font-mono">{multiplier} Marktwert-Wachstum</div>
                  )}
                  {isActive && (
                    <div className="text-[10px] text-[#FFD700]/60">Aktueller Tier</div>
                  )}
                </div>

                {/* Reward amount */}
                <div className="text-right shrink-0">
                  <div className={`font-mono font-bold text-sm ${
                    isActive ? 'text-[#FFD700]' : isFuture ? 'text-[#22C55E]' : 'text-white/30'
                  }`}>
                    {fmtScout(reward)} $SCOUT
                  </div>
                  {isFuture && roi > 1 && (
                    <div className="text-[10px] font-mono text-[#22C55E]/70">
                      x{roi >= 10 ? Math.round(roi) : roi.toFixed(1)} ROI
                    </div>
                  )}
                  {isActive && (
                    <div className="text-[10px] font-mono text-[#FFD700]/50">/DPC</div>
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
          <h3 className="font-black text-base mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-sky-400" />
            Dein Potenzial
          </h3>
          <div className="space-y-2">
            {SUCCESS_FEE_TIERS.filter((_, i) => i >= currentIdx).slice(0, 4).map(tier => {
              const reward = centsToBsd(tier.fee);
              const totalReward = reward * holdingQty;
              const totalInvested = ipoPrice * holdingQty;
              const profit = totalReward - totalInvested;

              return (
                <div key={tier.label} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                  <div className="text-sm text-white/60">
                    Bei {tier.maxValue === Infinity ? `ab ${formatMarketValue(tier.minValue)}` : formatMarketValue(tier.maxValue)}
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-sm">{fmtScout(totalReward)} $SCOUT</span>
                    {profit > 0 && (
                      <span className="text-[10px] text-[#22C55E] ml-2">+{fmtScout(profit)}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-start gap-2 text-[10px] text-white/30">
            <Info className="w-3 h-3 mt-0.5 shrink-0" />
            <span>Erfolgsbonus = Belohnung vom Verein bei Marktwert-Wachstum. Zusätzlich zu Trading-Gewinnen und PBT-Ausschüttung.</span>
          </div>
        </Card>
      )}
    </div>
  );
}
