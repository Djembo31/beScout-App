'use client';

import React from 'react';
import { Zap, ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui';
import { fmtScout } from '@/lib/utils';
import { formatTimeAgo } from '@/components/community/PostCard';

type Trade = {
  id: string;
  buyer_handle?: string;
  player_name: string;
  price_cents: number;
  executed_at: string;
};

type Props = {
  trades: Trade[];
  clubColor: string;
};

export function RecentActivitySection({ trades, clubColor }: Props) {
  const t = useTranslations('club');

  if (trades.length === 0) return null;

  return (
    <Card className="p-4 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="size-5" style={{ color: clubColor }} />
        <h2 className="font-black text-balance">{t('recentActivity')}</h2>
      </div>
      <div className="space-y-2">
        {trades.slice(0, 5).map(trade => (
          <div key={trade.id} className="flex items-center gap-2.5 py-1.5 border-b border-white/[0.04] last:border-0">
            <div className="size-7 rounded-full bg-white/[0.06] flex items-center justify-center text-[10px] font-bold text-white/40 flex-shrink-0">
              {trade.player_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div className="text-sm min-w-0 flex-1">
              <span className="text-white/60">{trade.buyer_handle ?? t('aScout')}</span>
              <span className="text-white/30"> {t('bought')} </span>
              <span className="font-semibold truncate">{trade.player_name}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/30 flex-shrink-0 ml-2">
              <ArrowUpRight className="size-3 text-green-500 flex-shrink-0" />
              <span className="font-mono tabular-nums" style={{ color: 'var(--club-primary, #FFD700)' }}>{fmtScout(trade.price_cents)}</span>
              <span>{formatTimeAgo(trade.executed_at)}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
