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

/** Relative time from ISO date string — "5m", "3h", "2d" or localized date */
export function formatTimeAgo(dateStr: string, nowLabel = 'just now', dateLocale = 'de-DE'): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return nowLabel;
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString(dateLocale);
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

/** Convert ISO 3166-1 alpha-2 country code to flag emoji (e.g. "TR" → 🇹🇷) */
export function countryToFlag(code: string): string {
  if (!code || code.length !== 2) return '';
  return String.fromCodePoint(
    ...Array.from(code.toUpperCase()).map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
  );
}

/** Download data as a CSV file. Headers = keys of first row. */
export function downloadCsv(rows: Record<string, string | number | boolean | null | undefined>[], filename: string) {
  if (rows.length === 0) return;
  try {
    const headers = Object.keys(rows[0]);
    const escape = (v: string | number | boolean | null | undefined) => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      headers.join(','),
      ...rows.map(row => headers.map(h => escape(row[h])).join(',')),
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('[downloadCsv] Export failed:', err);
  }
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

