'use client';

import React from 'react';
import { Target } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn, fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';

type MissionHintProps = {
  title: string;
  icon: string;
  reward: number;
  progress: number;
  target: number;
  compact?: boolean;
};

export default function MissionHint({ title, reward, progress, target, compact }: MissionHintProps) {
  const t = useTranslations('missions');
  const pct = Math.min(100, (progress / target) * 100);
  const rewardBsd = fmtScout(centsToBsd(reward));

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-gold/[0.04] border border-gold/10 text-[10px]">
        <Target className="size-3.5 text-gold shrink-0" />
        <span className="text-white/70 truncate">{title}</span>
        <span className="font-mono text-white/40 shrink-0">{t('hintProgress', { current: progress, target })}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gold/[0.04] border border-gold/10">
      <Target className="size-4 text-gold shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs text-white/70 truncate">
            <span className="font-semibold text-gold/80">{t('hintTitle')}: </span>
            {title}
          </span>
          <span className="text-[10px] font-mono text-gold/60 shrink-0">+{rewardBsd} CR</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-surface-base rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gold/60"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-white/40 shrink-0">
            {t('hintProgress', { current: progress, target })}
          </span>
        </div>
      </div>
    </div>
  );
}
