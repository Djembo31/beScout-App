'use client';

import { useTranslations } from 'next-intl';
import { Briefcase } from 'lucide-react';
import { fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';

type Props = {
  balanceCents: number;
};

export default function MarketHeader({ balanceCents }: Props) {
  const t = useTranslations('market');
  const tc = useTranslations('common');

  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl md:text-3xl font-black flex items-center gap-3 text-balance">
        <Briefcase className="size-7 text-gold" />
        {t('title')}
      </h1>
      <div className="flex items-center gap-2 bg-surface-subtle border border-white/[0.08] rounded-xl px-3 py-1.5">
        <span className="text-xs text-white/50">{tc('balance')}:</span>
        <span className="font-mono font-bold text-base tabular-nums text-gold">{fmtScout(centsToBsd(balanceCents))} CR</span>
      </div>
    </div>
  );
}
