'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Zap } from 'lucide-react';

export default function HotSalesCarousel() {
  const t = useTranslations('market');

  return (
    <div className="bg-white/[0.02] border border-dashed border-white/[0.08] rounded-2xl p-4 flex items-center gap-3">
      <div className="size-10 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
        <Zap className="size-5 text-gold" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold text-white/60">{t('hotSalesTitle', { defaultMessage: 'Featured Sales' })}</div>
        <div className="text-[10px] text-white/30">{t('hotSalesPlaceholder', { defaultMessage: 'Clubs können hier ihre DPCs bewerben — bald verfügbar.' })}</div>
      </div>
    </div>
  );
}
