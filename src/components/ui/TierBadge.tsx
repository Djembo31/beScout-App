'use client';

import React from 'react';
import type { FanTier } from '@/types';
import { FAN_TIER_STYLES } from '@/types';

type TierBadgeSize = 'sm' | 'md' | 'lg';

export const TierBadge = ({ tier, size = 'sm' }: { tier: FanTier; size?: TierBadgeSize }) => {
  const style = FAN_TIER_STYLES[tier];

  const sizeClasses: Record<TierBadgeSize, string> = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-0.5',
    md: 'text-xs px-2 py-1 gap-1',
    lg: 'text-sm px-3 py-1.5 gap-1.5',
  };

  return (
    <span className={`inline-flex items-center rounded-full font-bold ${sizeClasses[size]} ${style.bg} ${style.color} border ${style.border}`}>
      <span>{style.icon}</span>
      <span>{tier}</span>
    </span>
  );
};
