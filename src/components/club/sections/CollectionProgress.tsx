'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

type Props = {
  owned: number;
  total: number;
  clubColor: string;
};

export function CollectionProgress({ owned, total, clubColor }: Props) {
  const t = useTranslations('club');
  if (total === 0) return null;

  const pct = Math.min(100, (owned / total) * 100);

  return (
    <div className="p-3 bg-surface-subtle rounded-xl border border-white/[0.06]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-white/50">{t('collectionProgress')}</span>
        <span className="text-xs font-mono font-bold tabular-nums" style={{ color: clubColor }}>
          {owned} / {total}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: clubColor }}
        />
      </div>
    </div>
  );
}
