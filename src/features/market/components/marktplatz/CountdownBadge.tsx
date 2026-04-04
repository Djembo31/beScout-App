'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountdownBadgeProps {
  targetDate: string;
  className?: string;
  compact?: boolean;
  onExpired?: () => void;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return '\u2014';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  if (days > 0) return `${days}T ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  if (hours > 0) return `${hours}h ${String(mins).padStart(2, '0')}m`;
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
}

function getUrgencyColor(ms: number): string {
  if (ms <= 0) return 'text-white/30';
  if (ms < 3600000) return 'text-vivid-red';      // < 1h: red
  if (ms < 86400000) return 'text-orange-400';     // < 1d: orange
  if (ms < 259200000) return 'text-amber-400';     // < 3d: amber
  if (ms < 604800000) return 'text-vivid-green';   // < 7d: green
  return 'text-white/50';                           // > 7d: neutral
}

function shouldPulse(ms: number): boolean {
  return ms > 0 && ms < 3600000;
}

export default function CountdownBadge({ targetDate, className, compact, onExpired }: CountdownBadgeProps) {
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

  if (remaining <= 0) return null;

  const color = getUrgencyColor(remaining);
  const pulse = shouldPulse(remaining);

  return (
    <span className={cn(
      'inline-flex items-center gap-1 tabular-nums font-mono font-bold',
      compact ? 'text-[10px]' : 'text-xs',
      color,
      pulse && 'animate-pulse motion-reduce:animate-none',
      className,
    )}>
      <Clock
        className={cn(compact ? 'size-3' : 'size-3.5')}
        aria-hidden="true"
      />
      {formatRemaining(remaining)}
    </span>
  );
}

export function getEarliestEndDate(dates: string[]): string | null {
  if (dates.length === 0) return null;
  return dates.reduce((earliest, d) =>
    new Date(d).getTime() < new Date(earliest).getTime() ? d : earliest
  );
}
