'use client';

import React from 'react';
import { History } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { getRelativeTime } from '@/lib/activityHelpers';
import type { DbTrade } from '@/types';

interface TradeHistoryChipsProps {
  trades: DbTrade[];
  maxDisplay?: number;
  className?: string;
}

export default function TradeHistoryChips({ trades, maxDisplay = 10, className = '' }: TradeHistoryChipsProps) {
  const ta = useTranslations('activity');
  const t = useTranslations('player');
  if (trades.length === 0) return null;

  const displayed = trades.slice(0, maxDisplay);

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-2">
        <History className="w-4 h-4 text-white/30" />
        <span className="text-xs font-bold text-white/40 uppercase tracking-wider">{t('tradeHistory')}</span>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide scroll-touch pb-1">
        {displayed.map((trade) => {
          const isIpo = !!trade.ipo_id;
          const price = centsToBsd(trade.price);

          return (
            <div
              key={trade.id}
              className="shrink-0 bg-surface-subtle border border-white/[0.08] rounded-xl px-3 py-2 min-w-[90px] flex flex-col items-center gap-0.5"
            >
              <span className="font-mono font-bold text-gold text-sm">
                {fmtScout(price)}
              </span>
              <span className="text-[9px] text-white/40">$SCOUT</span>
              <span className="text-[9px] text-white/30">
                {getRelativeTime(trade.executed_at, ta('justNow'))}
              </span>
              <span
                className={`text-[8px] font-black px-1.5 py-0.5 rounded-md mt-0.5 ${
                  isIpo
                    ? 'bg-green-500/15 text-green-500 border border-green-500/20'
                    : 'bg-sky-500/15 text-sky-300 border border-sky-500/20'
                }`}
              >
                {isIpo ? t('tradeSourceClub') : t('tradeSourceMarket')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
