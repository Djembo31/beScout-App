'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import type { FanTier } from '@/types';
import { FAN_TIER_STYLES } from '@/types';
import { cn } from '@/lib/utils';

type TierBadgeSize = 'sm' | 'md' | 'lg';

export const TierBadge = ({ tier, size = 'sm' }: { tier: FanTier; size?: TierBadgeSize }) => {
  const t = useTranslations('gamification');
  const style = FAN_TIER_STYLES[tier];

  const sizeClasses: Record<TierBadgeSize, string> = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-0.5',
    md: 'text-xs px-2 py-1 gap-1',
    lg: 'text-sm px-3 py-1.5 gap-1.5',
  };

  // FIX-12 (J9F-13): aria-label + role="status" for screen-reader live-region on tier-up
  const ariaLabel = t('tierLabel', { tier });

  return (
    <span
      className={cn('inline-flex items-center rounded-full font-bold border', sizeClasses[size], style.bg, style.color, style.border)}
      role="status"
      aria-label={ariaLabel}
    >
      <span aria-hidden="true">{style.icon}</span>
      <span>{tier}</span>
    </span>
  );
};
