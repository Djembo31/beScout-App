'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

type FillBarProps = {
  current: number;
  max: number | null;
  /** 'card' = full width bar + text, 'mini' = 40px bar only */
  variant?: 'card' | 'mini';
};

export function FillBar({ current, max, variant = 'card' }: FillBarProps) {
  const t = useTranslations('fantasy');

  if (max === null || max === 0) {
    if (variant === 'mini') return null;
    return (
      <div className="text-xs text-white/40 font-mono tabular-nums">
        {current} {t('participants')}
      </div>
    );
  }

  const pct = Math.min((current / max) * 100, 100);
  const isFull = pct >= 100;

  const barColor =
    pct >= 95 ? 'bg-red-500' :
    pct >= 80 ? 'bg-amber-500' :
    'bg-green-500';

  if (variant === 'mini') {
    return (
      <div className="w-10 h-[3px] rounded-full bg-white/10 overflow-hidden" aria-hidden="true">
        <div className={cn('h-full rounded-full transition-colors', barColor)} style={{ width: `${pct}%` }} />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden" aria-hidden="true">
        <div className={cn('h-full rounded-full transition-colors', barColor)} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/40 font-mono tabular-nums">{current} / {max}</span>
        {isFull ? (
          <span className="text-red-400 font-bold">{t('eventFull')}</span>
        ) : (
          <span className="text-white/30 font-mono tabular-nums">{Math.round(pct)}%</span>
        )}
      </div>
    </div>
  );
}
