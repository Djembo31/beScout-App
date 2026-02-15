'use client';

import React from 'react';
import { Shield } from 'lucide-react';
import type { BadgeLevel } from '@/lib/services/scoutNetwork';
import { BADGE_STYLES } from '@/lib/services/scoutNetwork';

type ScoutBadgeProps = {
  level: BadgeLevel;
  size?: 'sm' | 'md';
};

export function ScoutBadge({ level, size = 'sm' }: ScoutBadgeProps) {
  const style = BADGE_STYLES[level];
  const isSmall = size === 'sm';

  return (
    <span className={`inline-flex items-center gap-1 px-${isSmall ? '1.5' : '2'} py-0.5 rounded-full text-[${isSmall ? '9px' : '10px'}] font-bold ${style.bg} ${style.color} ${style.border} border`}>
      <Shield className={`${isSmall ? 'w-2.5 h-2.5' : 'w-3 h-3'}`} />
      {style.icon} {style.label}
    </span>
  );
}
