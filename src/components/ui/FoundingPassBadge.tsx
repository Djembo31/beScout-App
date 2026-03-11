'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { FoundingPassTier } from '@/types';

const TIER_CONFIG: Record<FoundingPassTier | 'free', { label: string; bgClass: string; textClass: string; borderClass: string }> = {
  free: { label: 'Free', bgClass: 'bg-white/[0.06]', textClass: 'text-white/50', borderClass: 'border-white/10' },
  fan: { label: 'Fan', bgClass: 'bg-sky-500/20', textClass: 'text-sky-400', borderClass: 'border-sky-500/30' },
  scout: { label: 'Scout', bgClass: 'bg-emerald-500/20', textClass: 'text-emerald-400', borderClass: 'border-emerald-500/30' },
  pro: { label: 'Pro', bgClass: 'bg-purple-500/20', textClass: 'text-purple-400', borderClass: 'border-purple-500/30' },
  founder: { label: 'Founder', bgClass: 'bg-gold/15', textClass: 'text-gold', borderClass: 'border-gold/30' },
};

interface FoundingPassBadgeProps {
  tier: FoundingPassTier | 'free' | null | undefined;
  size?: 'sm' | 'md';
  className?: string;
}

export default function FoundingPassBadge({ tier, size = 'sm', className }: FoundingPassBadgeProps) {
  const effectiveTier = tier ?? 'free';
  const cfg = TIER_CONFIG[effectiveTier];
  const isSm = size === 'sm';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-bold',
        cfg.bgClass,
        cfg.textClass,
        cfg.borderClass,
        isSm ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5',
        className,
      )}
    >
      {cfg.label}
    </span>
  );
}
