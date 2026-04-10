'use client';

import { useTranslations } from 'next-intl';
import { fmtScout, cn } from '@/lib/utils';
import { Briefcase } from 'lucide-react';

interface BestandHeaderProps {
  totalValueBsd: number;
  totalCostBsd: number;
  scCount: number;
}

export default function BestandHeader({ totalValueBsd, totalCostBsd, scCount }: BestandHeaderProps) {
  const t = useTranslations('market');
  const pnlBsd = totalValueBsd - totalCostBsd;
  const pnlPct = totalCostBsd > 0 ? (pnlBsd / totalCostBsd) * 100 : 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 flex items-center justify-between gap-4"
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-gold/10 flex items-center justify-center">
          <Briefcase className="size-5 text-gold" aria-hidden="true" />
        </div>
        <div>
          <div className="text-xs text-white/40">{t('bestandPortfolioValue')}</div>
          <div className="font-mono font-black text-lg tabular-nums text-gold">
            {fmtScout(totalValueBsd)} CR
          </div>
        </div>
      </div>

      <div className="text-right">
        <div className="text-xs text-white/40">
          {scCount} Scout Cards
        </div>
        <div className={cn(
          'font-mono font-bold text-sm tabular-nums',
          pnlBsd >= 0 ? 'text-green-500' : 'text-red-400'
        )}>
          {pnlBsd >= 0 ? '+' : ''}{fmtScout(pnlBsd)} CR ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)
        </div>
      </div>
    </div>
  );
}
