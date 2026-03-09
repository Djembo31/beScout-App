'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { formatCountdown } from '../helpers';

type UrgencyTimerProps = {
  lockTime: number;
  status: string;
  className?: string;
};

export function UrgencyTimer({ lockTime, status, className }: UrgencyTimerProps) {
  if (status === 'ended') {
    return <span className={cn('text-xs text-white/25', className)}>Beendet</span>;
  }

  if (status === 'running') {
    return <span className={cn('text-xs text-green-500 font-bold', className)}>LIVE</span>;
  }

  const diff = lockTime - Date.now();
  if (diff <= 0) {
    return <span className={cn('text-xs text-white/30', className)}>Gestartet</span>;
  }

  const hours = diff / 3600000;

  const urgencyClass =
    hours < 1 ? 'text-red-400 animate-pulse motion-reduce:animate-none font-bold' :
    hours < 6 ? 'text-amber-400 font-semibold' :
    hours < 24 ? 'text-white/60' :
    'text-white/40';

  return (
    <span className={cn('text-xs font-mono tabular-nums', urgencyClass, className)}>
      {formatCountdown(lockTime)}
    </span>
  );
}
