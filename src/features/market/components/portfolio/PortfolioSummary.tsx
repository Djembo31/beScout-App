'use client';

import { useTranslations } from 'next-intl';
import { cn, fmtScout } from '@/lib/utils';

interface PortfolioSummaryProps {
  totalValueScout: number;
  totalPnlScout: number;
  totalPnlPct: number;
  playerCount: number;
  topWinner: { name: string; pnlScout: number } | null;
  topLoser: { name: string; pnlScout: number } | null;
  openOrdersCount: number;
  incomingOffersCount: number;
}

function formatPnl(value: number): string {
  const formatted = fmtScout(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

function formatPnlPct(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `(${sign}${value.toFixed(1)}%)`;
}

export default function PortfolioSummary({
  totalValueScout,
  totalPnlScout,
  totalPnlPct,
  playerCount,
  topWinner,
  topLoser,
  openOrdersCount,
  incomingOffersCount,
}: PortfolioSummaryProps) {
  const t = useTranslations('market');

  const pnlColor = totalPnlScout >= 0 ? 'text-emerald-400' : 'text-red-400';

  return (
    <div
      className={cn(
        'bg-white/[0.02] border border-white/10 rounded-2xl p-4',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
      )}
    >
      {/* Section 1 — Value + P&L */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-white/40">{t('portfolioValue')}</p>
          <p className="text-xl font-black font-mono tabular-nums mt-0.5">
            {fmtScout(totalValueScout)} $SCOUT
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/40">{t('pnl')}</p>
          <p className={cn('font-mono tabular-nums mt-0.5', pnlColor)}>
            {formatPnl(totalPnlScout)} {formatPnlPct(totalPnlPct)}
          </p>
        </div>
      </div>

      {/* Section 2 — Player count */}
      <p className="text-sm text-white/50 mt-2">
        {t('playersCount', { count: playerCount })}
      </p>

      {/* Divider */}
      <div className="border-t border-white/[0.06] my-3" />

      {/* Section 3 — Top Winner / Top Loser */}
      <div className="grid grid-cols-2 gap-4">
        <div className="min-w-0">
          <span className="text-xs text-white/40">{t('topWinner')}:</span>{' '}
          {topWinner ? (
            <>
              <span className="text-sm text-white/70 truncate">
                {topWinner.name}
              </span>{' '}
              <span className="text-sm font-mono tabular-nums text-emerald-400">
                {formatPnl(topWinner.pnlScout)}
              </span>
            </>
          ) : (
            <span className="text-sm text-white/30">-</span>
          )}
        </div>
        <div className="min-w-0">
          <span className="text-xs text-white/40">{t('topLoser')}:</span>{' '}
          {topLoser ? (
            <>
              <span className="text-sm text-white/70 truncate">
                {topLoser.name}
              </span>{' '}
              <span className="text-sm font-mono tabular-nums text-red-400">
                {formatPnl(topLoser.pnlScout)}
              </span>
            </>
          ) : (
            <span className="text-sm text-white/30">-</span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/[0.06] my-3" />

      {/* Section 4 — Open Orders + Offers */}
      <p className="text-sm">
        <span className={cn(openOrdersCount > 0 ? 'text-white/70' : 'text-white/50')}>
          {t('openOrders', { count: openOrdersCount })}
        </span>
        <span className="text-white/30 mx-2" aria-hidden="true">
          &bull;
        </span>
        <span className={cn(incomingOffersCount > 0 ? 'text-white/70' : 'text-white/50')}>
          {t('incomingOffersSummary', { count: incomingOffersCount })}
        </span>
      </p>
    </div>
  );
}
