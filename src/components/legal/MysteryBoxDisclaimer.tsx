'use client';

import { Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface MysteryBoxDisclaimerProps {
  variant?: 'inline' | 'card';
  className?: string;
}

/**
 * Mystery-Box-Compliance-Disclaimer (AR-47, Journey #5).
 *
 * Mystery Box ist Gambling-adjacent (Zufalls-Reward) ohne Geldwert.
 * Pflicht-Hinweis zu virtuellem Charakter, variablen Drop-Raten,
 * Auszahlungs-/Uebertragungs-Verbot und 18+-Empfehlung.
 * Analog zu TradingDisclaimer + FantasyDisclaimer.
 *
 * Variants:
 *  - `inline`: kompakte Zeile (unter Modal-Bodies, in Footers).
 *  - `card`: voller Block mit Hintergrund (Content-Seiten, oberhalb History-Listen).
 */
export function MysteryBoxDisclaimer({ variant = 'inline', className }: MysteryBoxDisclaimerProps) {
  const t = useTranslations('legal');

  if (variant === 'card') {
    return (
      <div className={cn('flex items-start gap-2 p-3 bg-surface-minimal border border-divider rounded-xl', className)}>
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-white/25" aria-hidden="true" />
        <span className="text-[10px] text-white/30 leading-relaxed">{t('mysteryBoxDisclaimer')}</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1.5 pt-2', className)}>
      <Info className="w-3 h-3 shrink-0 text-white/20" aria-hidden="true" />
      <span className="text-[10px] text-white/30">{t('mysteryBoxDisclaimerShort')}</span>
    </div>
  );
}
