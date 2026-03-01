'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface FoundingScoutBadgeProps {
  rank?: number;
  size?: 'sm' | 'md';
}

export default function FoundingScoutBadge({ rank, size = 'md' }: FoundingScoutBadgeProps) {
  const isSm = size === 'sm';

  return (
    <div
      className={cn('inline-flex items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/15', isSm ? 'px-2 py-0.5' : 'px-2.5 py-1')}
    >
      <span className={isSm ? 'text-xs' : 'text-sm'} aria-hidden="true">🌟</span>
      <span className={cn('font-black text-gold', isSm ? 'text-[10px]' : 'text-xs')}>
        Founding Scout
      </span>
      {rank && (
        <span className={cn('font-mono font-bold tabular-nums text-gold/50', isSm ? 'text-[9px]' : 'text-[10px]')}>
          #{rank}
        </span>
      )}
    </div>
  );
}
