'use client';

/**
 * Slice 201b (FM-4.3): Holders-Distribution-Mini-Bar.
 *
 * Sorare-Standard fuer Liquid/Iliquid-Erkennung. Zeigt visuell den Anteil
 * der Top-10-Holders am Total-Supply. Hoch-konzentrierte Player (>70% bei
 * Top-10) sind iliquid — Floor-Price kann taeuschen wenn 1 Holder 80% haelt.
 *
 * Color-Coding:
 *   - Top-10-pct >= 80%: text-orange-400 (concentrated, illiquid warning)
 *   - Top-10-pct >= 50%: text-amber-400 (medium-concentrated)
 *   - Top-10-pct <  50%: text-emerald-400 (well-distributed, liquid)
 *
 * Lazy-load via usePlayerHoldersConcentration enabled-Flag damit nicht
 * alle PlayerRows in TransferList eager-fetchen.
 */

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { usePlayerHoldersConcentration } from '@/lib/queries';

interface Props {
  playerId: string;
  /** Lazy-load gate. Caller setzt true z.B. bei expanded-Card oder Detail-View. */
  enabled?: boolean;
  /** Visual variant. `compact` rendert nur Bar+pct, `full` mit Holder-Count. */
  variant?: 'compact' | 'full';
  className?: string;
}

function getConcentrationColor(pct: number): string {
  if (pct >= 80) return 'text-orange-400';
  if (pct >= 50) return 'text-amber-400';
  return 'text-emerald-400';
}

function getBarColor(pct: number): string {
  if (pct >= 80) return 'bg-orange-400/80';
  if (pct >= 50) return 'bg-amber-400/80';
  return 'bg-emerald-400/80';
}

export function ConcentrationBar({ playerId, enabled = true, variant = 'compact', className }: Props) {
  const t = useTranslations('market');
  const { data, isLoading } = usePlayerHoldersConcentration(playerId, enabled);

  // Skeleton during load (only if enabled)
  if (enabled && isLoading) {
    return (
      <div
        className={cn('h-1.5 w-16 rounded bg-white/[0.06] animate-pulse motion-reduce:animate-none', className)}
        role="status"
        aria-busy="true"
        aria-label={t('concentrationLoading')}
      />
    );
  }

  // Early return: no data, zero holders → nothing to show
  if (!data || data.total_holders === 0) {
    return null;
  }

  const pct = data.top_10_pct;
  const colorText = getConcentrationColor(pct);
  const colorBar = getBarColor(pct);

  // Mini-SVG-Bar via div+inline-width (kein external lib).
  // Width: 64px container, top-N-share fills proportional.
  return (
    <div
      className={cn('inline-flex items-center gap-1.5', className)}
      title={t('concentrationTitle', { count: data.total_holders, pct: pct.toFixed(1) })}
    >
      <div className="relative h-1.5 w-16 rounded bg-white/[0.06] overflow-hidden">
        <div
          className={cn('absolute inset-y-0 left-0 rounded transition-all', colorBar)}
          style={{ width: `${Math.min(100, pct)}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('concentrationLabel', { pct: pct.toFixed(1) })}
        />
      </div>
      <span className={cn('text-[10px] font-mono font-bold tabular-nums', colorText)}>
        {pct.toFixed(0)}%
      </span>
      {variant === 'full' && (
        <span className="text-[10px] text-white/40 font-mono tabular-nums">
          {t('concentrationHolderCount', { count: data.total_holders })}
        </span>
      )}
    </div>
  );
}
