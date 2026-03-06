'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountdownProps {
  targetDate: string;
  className?: string;
  onExpired?: () => void;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'Beendet';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m ${secs}s`;
}

export function Countdown({ targetDate, className, onExpired }: CountdownProps) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, new Date(targetDate).getTime() - Date.now())
  );

  const stableOnExpired = useCallback(() => onExpired?.(), [onExpired]);

  useEffect(() => {
    const target = new Date(targetDate).getTime();
    const update = () => {
      const ms = Math.max(0, target - Date.now());
      setRemaining(ms);
      if (ms <= 0) stableOnExpired();
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetDate, stableOnExpired]);

  const isUrgent = remaining > 0 && remaining < 3600000;

  if (remaining <= 0) return null;

  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-xs tabular-nums',
      isUrgent ? 'text-red-400' : 'text-white/60',
      className
    )}>
      <Clock className={cn('size-3', isUrgent && 'animate-pulse motion-reduce:animate-none')} aria-hidden="true" />
      {formatRemaining(remaining)}
    </span>
  );
}
