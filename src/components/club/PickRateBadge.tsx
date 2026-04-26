'use client';

import { Flame } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PickRateBadgeProps {
  pct: number;
}

/**
 * Slice 204 — Squad-Tab Fantasy-Pick-Rate Badge.
 * Anonymized aggregate badge (D46 reuse: useEventPlayerPickRates).
 * Threshold ≥5% — kein Noise-Display fuer marginale Werte.
 */
export function PickRateBadge({ pct }: PickRateBadgeProps) {
  const t = useTranslations('club.pickRate');
  if (pct < 5) return null;
  const rounded = Math.round(pct);
  return (
    <div
      className="absolute bottom-2 right-2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-sm border border-amber-400/40 text-amber-300 text-[10px] font-bold tabular-nums shadow-sm pointer-events-none"
      aria-label={t('ariaLabel', { pct: rounded })}
    >
      <Flame className="size-2.5" aria-hidden="true" />
      <span>{t('label', { pct: rounded })}</span>
    </div>
  );
}
