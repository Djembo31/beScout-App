'use client';

import React from 'react';
import { Globe, Building2, Gift, Star, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EventType } from '@/components/fantasy/types';

// ============================================
// EVENT TYPE BADGE (replaces old EventScopeBadge)
// Shows event ownership: BeScout, Club, Sponsor, Special, Creator
// ============================================

interface EventTypeBadgeProps {
  type: EventType;
  clubName?: string;
  clubLogo?: string;
  sponsorName?: string;
  size?: 'sm' | 'md';
}

const sizeClasses = {
  sm: { container: 'px-2 py-0.5 gap-1 text-[10px]', icon: 'size-3', logo: 'size-3.5' },
  md: { container: 'px-2.5 py-1 gap-1.5 text-xs', icon: 'size-3.5', logo: 'size-4' },
};

const TYPE_CONFIG: Record<EventType, {
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  label: string;
}> = {
  bescout: { icon: Globe, color: 'text-gold', bg: 'bg-gold/10', border: 'border-gold/20', label: 'BeScout' },
  club: { icon: Building2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Club Event' },
  sponsor: { icon: Gift, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20', label: 'Sponsor' },
  special: { icon: Star, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', label: 'Special' },
  creator: { icon: UserPlus, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', label: 'Community' },
};

export function EventTypeBadge({ type, clubName, clubLogo, sponsorName, size = 'sm' }: EventTypeBadgeProps) {
  const s = sizeClasses[size];
  const config = TYPE_CONFIG[type] ?? TYPE_CONFIG.bescout;

  const label = type === 'club' && clubName ? clubName
    : type === 'sponsor' && sponsorName ? sponsorName
    : config.label;

  const Icon = config.icon;

  return (
    <span
      className={cn('inline-flex items-center font-bold rounded-full', config.bg, `border ${config.border}`, config.color, s.container)}
      aria-label={label}
    >
      {type === 'club' && clubLogo ? (
        <img src={clubLogo} alt="" className={cn(s.logo, 'rounded-full object-contain')} />
      ) : type === 'bescout' ? (
        <img src="/icons/bescout_icon_premium.svg" alt="" className={cn(s.logo, 'rounded-full object-contain')} />
      ) : (
        <Icon className={s.icon} aria-hidden="true" />
      )}
      {label}
    </span>
  );
}

// Backward compat — old consumers can still import EventScopeBadge
export { EventTypeBadge as EventScopeBadge };
