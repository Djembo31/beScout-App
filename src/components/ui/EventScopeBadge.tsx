'use client';

import React from 'react';
import { Globe, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// EVENT SCOPE BADGE
// ============================================

interface EventScopeBadgeProps {
  scope: 'global' | 'club';
  size?: 'sm' | 'md';
}

const sizeClasses = {
  sm: {
    container: 'px-2 py-0.5 gap-1 text-[11px]',
    icon: 'size-3',
  },
  md: {
    container: 'px-2.5 py-1 gap-1.5 text-xs',
    icon: 'size-3.5',
  },
};

export function EventScopeBadge({ scope, size = 'sm' }: EventScopeBadgeProps) {
  const s = sizeClasses[size];

  if (scope === 'global') {
    return (
      <span
        className={cn(
          'inline-flex items-center font-bold rounded-full',
          'bg-gold/10 border border-gold/20 text-gold',
          s.container,
        )}
        aria-label="BeScout Event"
      >
        <Globe className={s.icon} aria-hidden="true" />
        BeScout Event
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-bold rounded-full',
        'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400',
        s.container,
      )}
      aria-label="Club Event"
    >
      <Shield className={s.icon} aria-hidden="true" />
      Club Event
    </span>
  );
}
