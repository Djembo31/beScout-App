'use client';

import { Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface MissionDisclaimerProps {
  variant?: 'inline' | 'card';
  className?: string;
}

/**
 * Mission-Compliance-Disclaimer (AR-56, Journey #7).
 *
 * Missions zahlen Credits-Rewards aus (und Tickets). Pflicht-Hinweis zu
 * virtuellem Charakter, Anpassungs-Vorbehalt, Auszahlungs-/Uebertragungs-
 * Verbot und 18+-Empfehlung.
 * Analog zu TradingDisclaimer + FantasyDisclaimer + MysteryBoxDisclaimer.
 *
 * Variants:
 *  - `inline`: kompakte Zeile (unter Modal-Bodies, in Footers).
 *  - `card`: voller Block mit Hintergrund (Content-Seiten, oberhalb History-Listen).
 */
export function MissionDisclaimer({ variant = 'inline', className }: MissionDisclaimerProps) {
  const t = useTranslations('legal');

  if (variant === 'card') {
    return (
      <div className={cn('flex items-start gap-2 p-3 bg-surface-minimal border border-divider rounded-xl', className)}>
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-white/25" aria-hidden="true" />
        <span className="text-[10px] text-white/30 leading-relaxed">{t('missionDisclaimer')}</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1.5 pt-2', className)}>
      <Info className="w-3 h-3 shrink-0 text-white/20" aria-hidden="true" />
      <span className="text-[10px] text-white/30">{t('missionDisclaimerShort')}</span>
    </div>
  );
}
