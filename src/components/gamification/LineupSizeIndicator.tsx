'use client';

import React from 'react';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// LINEUP SIZE INDICATOR
// ============================================

interface LineupSizeIndicatorProps {
  currentCount: number;
  maxSize: 7 | 11;
}

export default function LineupSizeIndicator({ currentCount, maxSize }: LineupSizeIndicatorProps) {
  const isFull = currentCount >= maxSize;
  const pct = Math.min(100, (currentCount / maxSize) * 100);

  return (
    <div className="flex items-center gap-2.5">
      <Users
        className={cn('size-4 flex-shrink-0', isFull ? 'text-gold' : 'text-white/50')}
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className={cn(
            'text-xs font-bold',
            isFull ? 'text-gold' : 'text-white/50',
          )}>
            <span className="font-mono tabular-nums">{currentCount}/{maxSize}</span> Spieler
          </span>
        </div>
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              isFull ? 'bg-gold' : 'bg-white/20',
            )}
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={currentCount}
            aria-valuemin={0}
            aria-valuemax={maxSize}
            aria-label={`${currentCount} von ${maxSize} Spieler ausgewählt`}
          />
        </div>
      </div>
    </div>
  );
}
