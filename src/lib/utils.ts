/**
 * BeScout - Utility Functions
 */

export function fmtScout(value: number | undefined | null): string {
  if (value === undefined || value === null) return '0';
  return value.toLocaleString('de-DE', { maximumFractionDigits: 2 });
}

export function fmtCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString('de-DE');
}

export function fmtPct(value: number, showPlus = true): string {
  const sign = showPlus && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function humanTimeLeft(timestamp: number): string {
  const ms = Math.max(0, timestamp - Date.now());
  const mins = Math.floor(ms / 60_000);
  if (mins <= 0) return '0m';
  const hours = Math.floor(mins / 60);
  const mm = mins % 60;
  if (hours <= 0) return `${mm}m`;
  if (hours < 24) return `${hours}h ${mm}m`;
  const days = Math.floor(hours / 24);
  const hh = hours % 24;
  return `${days}d ${hh}h`;
}

export function timeAgo(timestamp: number): string {
  const ms = Date.now() - timestamp;
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '…';
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** Race a promise against a timeout. Rejects with Error('Timeout') on expiry. */
export function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout')), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

