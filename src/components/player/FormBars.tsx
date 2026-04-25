'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { getScoreHex } from '@/components/player/scoreColor';

type FormStatus = 'played' | 'bench' | 'not_in_squad';

type FormEntry = {
  score: number;
  status: FormStatus;
  /** Optional gameweek number for tooltip context. Falls back to bar index. */
  gameweek?: number | null;
};

interface FormBarsProps {
  entries: FormEntry[];
  className?: string;
  /**
   * Slice 198 fm 5.1 — Enable per-bar hover/tap tooltip with GW + score.
   * Default false to keep existing call-sites unchanged.
   */
  showTooltip?: boolean;
}

const MAX_H = 28;
const MIN_H = 6;
const BAR_W = 6;
const GAP = 2;

function statusKey(status: FormStatus): 'played' | 'bench' | 'notInSquad' {
  return status === 'not_in_squad' ? 'notInSquad' : status;
}

export default function FormBars({ entries, className, showTooltip = false }: FormBarsProps) {
  const t = useTranslations('formBars');
  const [openIdx, setOpenIdx] = React.useState<number | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Click-outside to close on mobile-tap.
  React.useEffect(() => {
    if (openIdx === null) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenIdx(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openIdx]);

  const padded = Array.from({ length: 5 }, (_, i) => {
    const idx = i - (5 - entries.length);
    return idx >= 0 ? entries[idx] : null;
  });

  return (
    <div
      ref={containerRef}
      className={cn('relative flex items-end', className)}
      style={{ gap: GAP, height: MAX_H }}
      aria-label={t('ariaLabel')}
    >
      {padded.map((entry, i) => {
        const isPlayed = entry?.status === 'played';
        const h = isPlayed ? Math.max(MIN_H, ((entry?.score ?? 0) / 100) * MAX_H) : 4;

        // Tooltip text per-bar.
        let tooltipText = '';
        if (showTooltip && entry) {
          const statusLabel = t(statusKey(entry.status));
          const gwLabel = entry.gameweek != null ? t('gw', { gw: entry.gameweek }) : '';
          if (isPlayed) {
            // GW {n} · {score} pts (or just score if no gw).
            tooltipText = gwLabel
              ? t('played', { gw: entry.gameweek, score: Math.round(entry.score) })
              : `${Math.round(entry.score)}`;
          } else {
            tooltipText = gwLabel ? `${gwLabel} · ${statusLabel}` : statusLabel;
          }
        }

        // Common bar element factory.
        const barEl = isPlayed ? (
          <div
            className="rounded-t-sm"
            style={{
              width: BAR_W,
              height: h,
              backgroundColor: getScoreHex(entry!.score),
            }}
          />
        ) : (
          <div
            className="border border-dashed border-white/10 rounded-t-sm"
            style={{ width: BAR_W, height: 4 }}
          />
        );

        if (!showTooltip) {
          // Legacy/compact path — no interaction overhead.
          return <React.Fragment key={i}>{barEl}</React.Fragment>;
        }

        const isOpen = openIdx === i;
        return (
          <button
            key={i}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpenIdx(isOpen ? null : i);
            }}
            onMouseEnter={() => setOpenIdx(i)}
            onMouseLeave={() => setOpenIdx((cur) => (cur === i ? null : cur))}
            aria-label={tooltipText || t('ariaBar', { idx: i + 1 })}
            aria-expanded={isOpen}
            className="relative flex items-end p-0 m-0 bg-transparent border-0 outline-none focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30 rounded-t-sm"
            style={{ height: MAX_H }}
          >
            {barEl}
            {isOpen && tooltipText && (
              <div
                role="tooltip"
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded-md bg-surface-popover/95 backdrop-blur-sm border border-white/[0.12] shadow-card-md text-[10px] text-white/80 whitespace-nowrap z-50 anim-dropdown pointer-events-none"
              >
                {tooltipText}
                <div className="absolute top-full left-1/2 -translate-x-1/2 size-1.5 rotate-45 bg-surface-popover/95 border-r border-b border-white/[0.12] -mt-[3px]" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
