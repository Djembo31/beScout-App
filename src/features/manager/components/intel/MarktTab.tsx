'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { cn, fmtScout } from '@/lib/utils';
import type { Player } from '@/types';
import type { HoldingWithPlayer } from '@/lib/services/wallet';

/* -------------------------------------------------- */
/*  Types                                              */
/* -------------------------------------------------- */

interface MarktTabProps {
  player: Player;
  holdings: HoldingWithPlayer[];
  getFloor: (p: Player) => number;
}

/* -------------------------------------------------- */
/*  Mini Sparkline (7d price history)                  */
/* -------------------------------------------------- */

function MiniSparkline({ data }: { data: number[] }) {
  const W = 160;
  const H = 40;
  const PAD = 4;

  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const usableH = H - PAD * 2;
  const usableW = W - PAD * 2;
  const step = usableW / (data.length - 1);

  const points = data
    .map((v, i) => {
      const x = PAD + i * step;
      const y = PAD + usableH - ((v - min) / range) * usableH;
      return `${x},${y}`;
    })
    .join(' ');

  // Area polygon
  const first = `${PAD},${H - PAD}`;
  const last = `${PAD + step * (data.length - 1)},${H - PAD}`;
  const areaPoints = `${first} ${points} ${last}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: 40 }}
      aria-hidden="true"
    >
      <polygon points={areaPoints} fill="rgba(255,215,0,0.1)" />
      <polyline
        points={points}
        fill="none"
        stroke="#FFD700"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* -------------------------------------------------- */
/*  MarktTab                                           */
/* -------------------------------------------------- */

export default function MarktTab({ player, holdings, getFloor }: MarktTabProps) {
  const t = useTranslations('manager');
  const holding = holdings.find((h) => h.player_id === player.id);
  const floor = getFloor(player);

  if (!holding) {
    return (
      <div className="space-y-4 p-4">
        <div className="bg-white/[0.04] rounded-xl p-3">
          <p className="text-sm text-white/50">{t('notOwned')}</p>
        </div>

        {/* Deep-Links still available even without holdings */}
        <div className="flex gap-3">
          <Link
            href={`/market?player=${player.id}`}
            className="text-gold hover:text-gold/80 transition-colors text-sm font-medium"
          >
            {t('toTransfermarkt')} &rarr;
          </Link>
        </div>
      </div>
    );
  }

  const avgBuy = holding.avg_buy_price;
  const qty = holding.quantity;
  const pnl = (floor - avgBuy) * qty;
  const pnlPct = avgBuy > 0 ? ((floor - avgBuy) / avgBuy) * 100 : 0;
  const isPositive = pnl >= 0;
  const history7d = player.prices.history7d;

  return (
    <div className="space-y-4 p-4">
      {/* Holdings Info */}
      <div className="bg-white/[0.04] rounded-xl p-3 space-y-2">
        <p className="text-xs text-white/50">{t('holdingsInfo')}</p>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-white/50">{t('quantity')}</p>
            <p className="text-sm font-bold text-white font-mono tabular-nums">
              {qty}
            </p>
          </div>
          <div>
            <p className="text-xs text-white/50">{t('avgBuyPrice')}</p>
            <p className="text-sm font-bold text-white font-mono tabular-nums">
              {fmtScout(avgBuy)}
            </p>
          </div>
          <div>
            <p className="text-xs text-white/50">{t('floorPrice')}</p>
            <p className="text-sm font-bold text-white font-mono tabular-nums">
              {fmtScout(floor)}
            </p>
          </div>
        </div>
      </div>

      {/* P&L */}
      <div className="bg-white/[0.04] rounded-xl p-3 space-y-1">
        <p className="text-xs text-white/50">{t('pnlLabel')}</p>
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              'text-lg font-bold font-mono tabular-nums',
              isPositive ? 'text-emerald-400' : 'text-red-400',
            )}
          >
            {isPositive ? '+' : ''}{fmtScout(pnl)}
          </span>
          <span
            className={cn(
              'text-xs font-mono tabular-nums',
              isPositive ? 'text-emerald-400/70' : 'text-red-400/70',
            )}
          >
            ({isPositive ? '+' : ''}{pnlPct.toFixed(1)}%)
          </span>
        </div>
      </div>

      {/* 7d Sparkline */}
      {history7d && history7d.length >= 2 && (
        <div className="bg-white/[0.04] rounded-xl p-3">
          <p className="text-xs text-white/50 mb-2">{t('priceHistory7d')}</p>
          <MiniSparkline data={history7d} />
        </div>
      )}

      {/* Deep-Links */}
      <div className="flex gap-3">
        <Link
          href={`/market?player=${player.id}`}
          className="text-gold hover:text-gold/80 transition-colors text-sm font-medium"
        >
          {t('toTransfermarkt')} &rarr;
        </Link>
        <Link
          href={`/market?sell=${player.id}`}
          className="text-gold hover:text-gold/80 transition-colors text-sm font-medium"
        >
          {t('sellPlayer')}
        </Link>
      </div>
    </div>
  );
}
