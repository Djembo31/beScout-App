'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ScoreCircle, getL5Hex } from '@/components/player';
import { useNumTick } from '@/lib/hooks/useNumTick';
import { MASTERY_XP_THRESHOLDS } from '@/lib/services/mastery';
import type { Trend } from '@/types';

interface ScoreMasteryStripProps {
  l5: number;
  l15: number;
  trend: Trend;
  mastery?: {
    level: number;
    xp: number;
    hold_days: number;
    fantasy_uses: number;
    content_count: number;
  } | null;
  className?: string;
}

export default function ScoreMasteryStrip({
  l5, l15, trend, mastery, className = '',
}: ScoreMasteryStripProps) {
  const l5Tick = useNumTick(l5);
  const t = useTranslations('player');
  const l5Hex = getL5Hex(l5);
  const l5Pct = l5 > 0 ? Math.round((l5 / 100) * 100) : 0;
  const l15Pct = l15 > 0 ? Math.round((l15 / 100) * 100) : 0;

  return (
    <div className={`flex items-stretch gap-0 bg-surface-subtle border border-white/[0.08] rounded-2xl overflow-hidden ${className}`}>
      {/* Scores Section */}
      <div className="flex items-center gap-3 md:gap-4 px-4 py-3 flex-1 min-w-0">
        {/* L5 Score Circle (primary) */}
        <div className={`flex flex-col items-center gap-1 ${l5Tick}`}>
          <div style={{ filter: `drop-shadow(0 0 8px ${l5Hex}40)` }}>
            <ScoreCircle label="L5" value={l5} size={64} />
          </div>
          <span className="text-[9px] font-mono text-white/40">{l5Pct}%</span>
        </div>

        {/* L15 Score Circle (secondary) */}
        <div className="flex flex-col items-center gap-1">
          <ScoreCircle label="L15" value={l15} size={48} />
          <span className="text-[9px] font-mono text-white/40">{l15Pct}%</span>
        </div>

        {/* Trend indicator */}
        <div className="flex flex-col items-center gap-0.5">
          {trend === 'UP' && (
            <>
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-[10px] font-bold text-green-500">Hot</span>
            </>
          )}
          {trend === 'DOWN' && (
            <>
              <TrendingDown className="w-4 h-4 text-red-300" />
              <span className="text-[10px] font-bold text-red-300">Cold</span>
            </>
          )}
          {trend === 'FLAT' && (
            <>
              <Minus className="w-4 h-4 text-white/40" />
              <span className="text-[10px] font-bold text-white/40">Stable</span>
            </>
          )}
        </div>
      </div>

      {/* Mastery Section (if available) */}
      {mastery && (
        <>
          <div className="w-px bg-white/10 my-2" />
          <div className="flex flex-col justify-center gap-1.5 px-4 py-3 min-w-[130px]">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Mastery</span>
              <span className="px-1.5 py-0.5 rounded-md bg-gold/15 text-gold text-[9px] font-black border border-gold/25">
                Lv{mastery.level} {t(`masteryLevel${mastery.level}`)}
              </span>
            </div>
            {mastery.level < 5 && (
              <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-gold/50 to-gold/20 transition-all"
                  style={{ width: `${Math.min((mastery.xp / (MASTERY_XP_THRESHOLDS[mastery.level] || 1)) * 100, 100)}%` }}
                />
              </div>
            )}
            <div className="flex gap-2 text-[9px] text-white/30 font-mono">
              <span>{mastery.hold_days}d</span>
              <span>{mastery.fantasy_uses}x</span>
              <span>{mastery.content_count}x</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
