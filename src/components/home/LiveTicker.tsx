'use client';

import { cn } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { fmtScout } from '@/lib/utils';
import { posTintColors } from '@/components/player/PlayerRow';
import { useTranslations } from 'next-intl';
import type { Pos } from '@/types';
import type { GlobalTrade } from '@/lib/services/trading';

interface LiveTickerProps {
  trades: GlobalTrade[];
}

export default function LiveTicker({ trades }: LiveTickerProps) {
  const t = useTranslations('home');

  if (trades.length === 0) return null;

  return (
    <div>
      <div className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2">{t('liveTrades')}</div>
      <div className="flex flex-wrap gap-1.5">
        {trades.map((trade) => {
          const posColor = posTintColors[trade.playerPos] ?? '#FFD700';
          return (
            <div
              key={trade.id}
              className="flex items-center gap-1.5 px-2 py-1 bg-white/[0.03] border border-white/[0.06] rounded-lg"
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: posColor }} />
              <span className="text-[10px] text-white/60 whitespace-nowrap">
                {trade.quantity}× {trade.playerName}
              </span>
              <span className="text-[9px] font-mono text-[#FFD700]/60">
                {fmtScout(centsToBsd(trade.price))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
