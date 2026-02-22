'use client';

import { Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface TradingDisclaimerProps {
  variant?: 'inline' | 'card';
  className?: string;
}

export function TradingDisclaimer({ variant = 'inline', className }: TradingDisclaimerProps) {
  const t = useTranslations('legal');

  if (variant === 'card') {
    return (
      <div className={cn('flex items-start gap-2 p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl', className)}>
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-white/25" />
        <span className="text-[10px] text-white/30 leading-relaxed">{t('tradingDisclaimer')}</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1.5 pt-2', className)}>
      <Info className="w-3 h-3 shrink-0 text-white/20" />
      <span className="text-[10px] text-white/30">{t('tradingDisclaimerShort')}</span>
    </div>
  );
}
