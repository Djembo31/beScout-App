'use client';

import { Crown } from 'lucide-react';
import type { SubscriptionTier } from '@/lib/services/clubSubscriptions';
import { TIER_CONFIG } from '@/lib/services/clubSubscriptions';

type Props = {
  tier: SubscriptionTier;
  size?: 'sm' | 'md';
};

export default function SubscriptionBadge({ tier, size = 'sm' }: Props) {
  const cfg = TIER_CONFIG[tier];
  if (!cfg) return null;

  const isSm = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded font-bold border ${
        isSm ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-xs'
      }`}
      style={{
        color: cfg.color,
        backgroundColor: `${cfg.color}15`,
        borderColor: `${cfg.color}25`,
      }}
    >
      <Crown className={isSm ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      {cfg.label}
    </span>
  );
}
