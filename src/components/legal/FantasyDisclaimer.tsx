'use client';

import { Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface FantasyDisclaimerProps {
  variant?: 'inline' | 'card';
  className?: string;
}

/**
 * Fantasy-Compliance-Disclaimer (AR-33, Journey #4).
 *
 * Fantasy-Turniere zahlen Credits-Rewards aus, daher PFLICHT-Hinweis zu
 * Unterhaltungscharakter + Pilot-Phase-Kostenlos + Ermessens-Verteilung.
 * Analog zu TradingDisclaimer.
 *
 * Variants:
 *  - `inline`: kompakte Zeile (unter Modal-Bodies, in Footers).
 *  - `card`: voller Block mit Hintergrund (Content-Seiten, Empty-States).
 */
export function FantasyDisclaimer({ variant = 'inline', className }: FantasyDisclaimerProps) {
  const t = useTranslations('legal');

  if (variant === 'card') {
    return (
      <div className={cn('flex items-start gap-2 p-3 bg-surface-minimal border border-divider rounded-xl', className)}>
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-white/25" aria-hidden="true" />
        <span className="text-[10px] text-white/30 leading-relaxed">{t('fantasyDisclaimer')}</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1.5 pt-2', className)}>
      <Info className="w-3 h-3 shrink-0 text-white/20" aria-hidden="true" />
      <span className="text-[10px] text-white/30">{t('fantasyDisclaimerShort')}</span>
    </div>
  );
}
