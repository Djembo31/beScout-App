'use client';

import React from 'react';
import { useLocale } from 'next-intl';
import { Users, Star, Flame, Crown, Award, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FanRankTier } from '@/types';

// ============================================
// FAN-RANG BADGE — Club-specific Fan Ranking
// ============================================

const TIER_CONFIG: Record<FanRankTier, {
  label: string;
  labelTr: string;
  icon: React.ElementType;
  bgClass: string;
  textClass: string;
  borderClass: string;
  glowClass?: string;
}> = {
  zuschauer: {
    label: 'Zuschauer',
    labelTr: 'Seyirci',
    icon: Users,
    bgClass: 'bg-white/[0.06]',
    textClass: 'text-white/60',
    borderClass: 'border-white/10',
  },
  stammgast: {
    label: 'Stammgast',
    labelTr: 'Müdavim',
    icon: Star,
    bgClass: 'bg-sky-500/15',
    textClass: 'text-sky-400',
    borderClass: 'border-sky-500/25',
  },
  ultra: {
    label: 'Ultra',
    labelTr: 'Ultra',
    icon: Flame,
    bgClass: 'bg-purple-500/15',
    textClass: 'text-purple-400',
    borderClass: 'border-purple-500/25',
  },
  legende: {
    label: 'Legende',
    labelTr: 'Efsane',
    icon: Crown,
    bgClass: 'bg-amber-500/15',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500/25',
  },
  ehrenmitglied: {
    label: 'Ehrenmitglied',
    labelTr: 'Onur Üyesi',
    icon: Award,
    bgClass: 'bg-emerald-500/15',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/25',
  },
  vereinsikone: {
    label: 'Vereinsikone',
    labelTr: 'Kulüp İkonu',
    icon: Shield,
    bgClass: 'bg-gold/15',
    textClass: 'text-gold',
    borderClass: 'border-gold/30',
    glowClass: 'shadow-[0_0_12px_rgba(255,215,0,0.25)]',
  },
};

type FanRankBadgeSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<FanRankBadgeSize, { badge: string; icon: string; text: string; mult: string }> = {
  sm: { badge: 'px-2 py-0.5 gap-1', icon: 'size-3', text: 'text-[10px]', mult: 'text-[9px]' },
  md: { badge: 'px-2.5 py-1 gap-1.5', icon: 'size-3.5', text: 'text-[10px]', mult: 'text-[10px]' },
  lg: { badge: 'px-3 py-1.5 gap-2', icon: 'size-4', text: 'text-xs', mult: 'text-[10px]' },
};

export interface FanRankBadgeProps {
  tier: FanRankTier;
  csfMultiplier?: number;
  clubName?: string;
  size?: FanRankBadgeSize;
  showMultiplier?: boolean;
  className?: string;
}

export default function FanRankBadge({
  tier,
  csfMultiplier,
  clubName,
  size = 'md',
  showMultiplier,
  className,
}: FanRankBadgeProps) {
  const locale = useLocale();
  const cfg = TIER_CONFIG[tier];
  const s = sizeClasses[size];
  const Icon = cfg.icon;
  const displayLabel = locale === 'tr' ? cfg.labelTr : cfg.label;

  const title = clubName
    ? `${displayLabel} — ${clubName}`
    : displayLabel;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-xl border font-black',
        cfg.bgClass,
        cfg.textClass,
        cfg.borderClass,
        cfg.glowClass,
        s.badge,
        className,
      )}
      title={title}
    >
      <Icon className={s.icon} aria-hidden="true" />
      {size !== 'sm' && <span className={s.text}>{displayLabel}</span>}
      {showMultiplier && csfMultiplier != null && csfMultiplier > 1 && (
        <span className={cn(s.mult, 'font-mono tabular-nums opacity-70')}>
          {csfMultiplier.toFixed(2)}x
        </span>
      )}
    </span>
  );
}

/** Export tier config for use in FanRankOverview */
export { TIER_CONFIG as FAN_RANK_TIER_CONFIG };
