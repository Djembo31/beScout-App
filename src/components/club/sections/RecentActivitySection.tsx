'use client';

import React from 'react';
import { Zap } from 'lucide-react';
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
        <span className="font-black text-balance">{t('recentActivity')}</span>
      </div>
      <div className="space-y-2">
        {trades.slice(0, 5).map(trade => (
          <div key={trade.id} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
            <div className="text-sm min-w-0">
              <span className="text-white/60">{trade.buyer_handle ?? t('someone')}</span>
              <span className="text-white/30"> {t('bought')} </span>
              <span className="font-semibold truncate">{trade.player_name}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/30 flex-shrink-0 ml-2">
              <span className="font-mono text-gold tabular-nums">{fmtScout(trade.price_cents)}</span>
              <span>{formatTimeAgo(trade.executed_at)}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
