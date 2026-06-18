'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { ListOrdered } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FAN_RANK_TIERS } from '@/lib/fanRanking';
import { FAN_RANK_PERKS } from '@/lib/fanRankPerks';
import { FAN_RANK_TIER_CONFIG } from '@/components/ui/FanRankBadge';
import type { FanRankTier } from '@/types';

// ============================================
// FAN-RANG LADDER — 6 Tiers + what each unlocks
// Slice 344 (E1.1): macht die Aufstiegs-Leiter + Perks sichtbar.
// Rendert auch ohne Rang (currentTier=null) als Anreiz ("was du erreichen kannst").
// ============================================

interface FanRankLadderProps {
  /** Current tier, or null when the user has no fan-rank yet. */
  currentTier: FanRankTier | null;
  /** Current total_score (0 when no rank yet). */
  currentScore: number;
}

function FanRankLadder({ currentTier, currentScore }: FanRankLadderProps) {
  const t = useTranslations('gamification');
  const effectiveTier: FanRankTier = currentTier ?? 'zuschauer';

  const currentIndex = FAN_RANK_TIERS.findIndex(d => d.tier === effectiveTier);
  const nextDef = currentIndex >= 0 ? FAN_RANK_TIERS[currentIndex + 1] : undefined;
  const progressText = nextDef
    ? t('fanRankNextTier', {
        n: Math.max(0, nextDef.minScore - currentScore),
        tier: t(FAN_RANK_TIER_CONFIG[nextDef.tier].labelKey),
      })
    : t('fanRankTopTier');

  return (
    <div className="mt-5 pt-4 border-t border-divider">
      {/* Header + progress */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-white/60 uppercase tracking-wider">
          <ListOrdered className="size-3.5 text-white/40" aria-hidden="true" />
          {t('fanRankLadderTitle')}
        </span>
        <span className="text-[10px] font-semibold text-gold/80 text-right">{progressText}</span>
      </div>

      {/* Ladder rows (top tier first for aspirational read) */}
      <div className="space-y-1.5">
        {FAN_RANK_TIERS.slice().reverse().map(def => {
          const cfg = FAN_RANK_TIER_CONFIG[def.tier];
          const perks = FAN_RANK_PERKS[def.tier];
          const isCurrent = def.tier === effectiveTier;
          const Icon = cfg.icon;

          return (
            <div
              key={def.tier}
              className={cn(
                'flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors',
                isCurrent
                  ? cn(cfg.bgClass, cfg.borderClass, cfg.glowClass)
                  : 'bg-white/[0.02] border-white/[0.06]',
              )}
            >
              <Icon
                className={cn('size-4 shrink-0', isCurrent ? cfg.textClass : 'text-white/40')}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn('text-xs font-black truncate', isCurrent ? cfg.textClass : 'text-white/70')}>
                    {t(cfg.labelKey)}
                  </span>
                  <span className="text-[10px] font-mono tabular-nums text-white/30 shrink-0">
                    {def.maxScore === null ? `${def.minScore}+` : `${def.minScore}–${def.maxScore}`}
                  </span>
                </div>
                <span className="text-[10px] text-white/40">
                  {t('fanRankPollWeight', { n: perks.pollWeight })}
                </span>
              </div>
              {isCurrent && (
                <span className="text-[9px] font-black uppercase tracking-wider text-gold shrink-0">
                  {t('fanRankCurrent')}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default React.memo(FanRankLadder);
