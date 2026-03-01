'use client';

import React from 'react';
import { Shield } from 'lucide-react';
import type { BadgeLevel } from '@/lib/services/scoutNetwork';
import { BADGE_STYLES } from '@/lib/services/scoutNetwork';
import { cn } from '@/lib/utils';

type ScoutBadgeProps = {
  level: BadgeLevel;
  size?: 'sm' | 'md';
};

const badgeSizes = {
  sm: { wrapper: 'px-1.5 text-[9px]', icon: 'size-2.5' },
  md: { wrapper: 'px-2 text-[10px]', icon: 'size-3' },
};

export function ScoutBadge({ level, size = 'sm' }: ScoutBadgeProps) {
  const style = BADGE_STYLES[level];
  const s = badgeSizes[size];

  return (
    <span className={cn('inline-flex items-center gap-1 py-0.5 rounded-full font-bold border', s.wrapper, style.bg, style.color, style.border)}>
      <Shield className={s.icon} />
      {style.icon} {style.label}
    </span>
  );
}
