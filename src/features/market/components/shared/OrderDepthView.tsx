'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { getSellOrders, getAllOpenBuyOrders } from '@/lib/services/trading';
import { fmtScout, cn } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { qk } from '@/lib/queries/keys';

interface OrderDepthViewProps {
  playerId: string;
}

/** Price level aggregation for depth visualization */
type PriceLevel = {
  price: number;
  priceBsd: number;
  quantity: number;
  orderCount: number;
  cumulative: number;
};

/** A point on the depth chart (price in cents, cumulative volume) */
type DepthPoint = { price: number; cumulative: number };

// ============================================
// SVG Depth Chart
// ============================================

const CHART_HEIGHT = 100;
const CHART_PADDING_TOP = 8;
const CHART_PADDING_BOTTOM = 18; // space for x-axis labels
const CHART_PADDING_X = 4;

/** Build a step-style SVG path for an area chart (staircase shape like real exchanges) */
function buildStepPath(
  points: DepthPoint[],
  minPrice: number,
  maxPrice: number,
  maxVolume: number,
  chartWidth: number,
  direction: 'bid' | 'ask'
): { area: string; line: string } {
  if (points.length === 0) return { area: '', line: '' };

  const drawH = CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;
  const drawW = chartWidth - 2 * CHART_PADDING_X;
  const priceRange = maxPrice - minPrice || 1;

  const toX = (price: number) =>
    CHART_PADDING_X + ((price - minPrice) / priceRange) * drawW;
  const toY = (vol: number) =>
    CHART_PADDING_TOP + drawH - (vol / maxVolume) * drawH;

  const baseY = CHART_PADDING_TOP + drawH;

  // Build step segments
  const lineSegments: string[] = [];
  const sorted =
    direction === 'bid'
      ? [...points].sort((a, b) => b.price - a.price) // highest bid first → step down left
      : [...points].sort((a, b) => a.price - b.price); // lowest ask first → step up right

  // Starting edge
  const firstX = toX(sorted[0].price);
  const firstY = toY(sorted[0].cumulative);
  lineSegments.push(`M${firstX},${firstY}`);

  for (let i = 1; i < sorted.length; i++) {
    const prevX = toX(sorted[i - 1].price);
    const currX = toX(sorted[i].price);
    const currY = toY(sorted[i].cumulative);
    // Horizontal step to new price, then vertical to new volume
    const stepX = direction === 'bid' ? currX : prevX;
    lineSegments.push(`H${stepX}`);
    lineSegments.push(`V${currY}`);
    if (direction === 'ask') {
      lineSegments.push(`H${currX}`);
    }
  }

  const line = lineSegments.join('');

  // Area = line path closed to baseline
  const area = `${line}V${baseY}H${firstX}Z`;

  return { area, line: `${line}` };
}

/** Format price for x-axis labels */
function fmtAxisPrice(cents: number): string {
  const bsd = centsToBsd(cents);
  if (bsd >= 1000) return `${(bsd / 1000).toFixed(1)}K`;
  if (bsd >= 100) return Math.round(bsd).toString();
  return bsd.toFixed(bsd < 10 ? 1 : 0);
}

function DepthChart({
  askLevels,
  bidLevels,
}: {
  askLevels: PriceLevel[];
  bidLevels: PriceLevel[];
}) {
  const t = useTranslations('market');
  const chartData = useMemo(() => {
    const askPoints: DepthPoint[] = askLevels.map((l) => ({
      price: l.price,
      cumulative: l.cumulative,
    }));

    const bidPoints: DepthPoint[] = bidLevels.map((l) => ({
      price: l.price,
      cumulative: l.cumulative,
    }));

    const allPrices = [
      ...askPoints.map((p) => p.price),
      ...bidPoints.map((p) => p.price),
    ];
    if (allPrices.length === 0) return null;

    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    // Add 5% padding on each side
    const priceRange = maxPrice - minPrice || 1;
    const padded = priceRange * 0.05;
    const chartMin = Math.max(0, minPrice - padded);
    const chartMax = maxPrice + padded;

    // Bid points sorted descending by price — last index has highest cumulative
    const maxVolume = Math.max(
      askPoints.length > 0 ? askPoints[askPoints.length - 1].cumulative : 0,
      bidPoints.length > 0 ? bidPoints[bidPoints.length - 1].cumulative : 0,
      1
    );

    return { askPoints, bidPoints, chartMin, chartMax, maxVolume };
  }, [askLevels, bidLevels]);

  if (!chartData) return null;

  const { askPoints, bidPoints, chartMin, chartMax, maxVolume } = chartData;

  // Fixed internal width for viewBox — SVG scales responsively via width="100%"
  const viewW = 400;

  const askPaths = buildStepPath(
    askPoints,
    chartMin,
    chartMax,
    maxVolume,
    viewW,
    'ask'
  );
  const bidPaths = buildStepPath(
    bidPoints,
    chartMin,
    chartMax,
    maxVolume,
    viewW,
    'bid'
  );

  // X-axis tick positions (3-5 ticks)
  const priceRange = chartMax - chartMin;
  const tickCount = 5;
  const ticks: number[] = [];
  for (let i = 0; i < tickCount; i++) {
    ticks.push(chartMin + (priceRange * i) / (tickCount - 1));
  }

  const toTickX = (price: number) =>
    CHART_PADDING_X +
    ((price - chartMin) / priceRange) * (viewW - 2 * CHART_PADDING_X);

  // Spread label
  const bestBid =
    bidPoints.length > 0
      ? Math.max(...bidPoints.map((p) => p.price))
      : null;
  const bestAsk =
    askPoints.length > 0
      ? Math.min(...askPoints.map((p) => p.price))
      : null;
  const spread =
    bestBid !== null && bestAsk !== null ? bestAsk - bestBid : null;

  return (
    <div className="relative w-full">
      <svg
        width="100%"
        viewBox={`0 0 ${viewW} ${CHART_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="block"
        role="img"
        aria-label={t('depthChartLabel', { defaultMessage: 'Tiefe' })}
      >
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((frac) => {
          const y =
            CHART_PADDING_TOP +
            (CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM) *
              (1 - frac);
          return (
            <line
              key={frac}
              x1={CHART_PADDING_X}
              x2={viewW - CHART_PADDING_X}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Bid area (buy orders — emerald) */}
        {bidPaths.area && (
          <>
            <path
              d={bidPaths.area}
              fill="rgba(16,185,129,0.15)"
              stroke="none"
            />
            <path
              d={bidPaths.line}
              fill="none"
              stroke="rgba(16,185,129,0.6)"
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
          </>
        )}

        {/* Ask area (sell orders — sky) */}
        {askPaths.area && (
          <>
            <path
              d={askPaths.area}
              fill="rgba(14,165,233,0.15)"
              stroke="none"
            />
            <path
              d={askPaths.line}
              fill="none"
              stroke="rgba(14,165,233,0.6)"
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
          </>
        )}

        {/* Spread line (dashed vertical between best bid and best ask) */}
        {bestBid !== null && bestAsk !== null && bestBid < bestAsk && (
          <>
            <line
              x1={toTickX((bestBid + bestAsk) / 2)}
              x2={toTickX((bestBid + bestAsk) / 2)}
              y1={CHART_PADDING_TOP}
              y2={
                CHART_HEIGHT - CHART_PADDING_BOTTOM
              }
              stroke="rgba(255,215,0,0.25)"
              strokeWidth={1}
              strokeDasharray="3,3"
            />
          </>
        )}

        {/* X-axis ticks */}
        {ticks.map((tick, i) => (
          <text
            key={i}
            x={toTickX(tick)}
            y={CHART_HEIGHT - 4}
            textAnchor="middle"
            fill="rgba(255,255,255,0.25)"
            fontSize={8}
            fontFamily="monospace"
          >
            {fmtAxisPrice(tick)}
          </text>
        ))}
      </svg>

      {/* Spread badge */}
      {spread !== null && spread > 0 && (
        <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] font-mono text-white/30 bg-surface-subtle rounded px-1.5 py-0.5">
          {t('depthSpread', { defaultMessage: 'Spread' })}: {fmtScout(centsToBsd(spread))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export default function OrderDepthView({ playerId }: OrderDepthViewProps) {
  const t = useTranslations('market');

  const { data: sellOrders, isLoading: sellLoading } = useQuery({
    queryKey: qk.orders.orderbook(playerId),
    queryFn: () => getSellOrders(playerId),
    staleTime: 30_000,
  });

  const { data: buyOrders, isLoading: buyLoading } = useQuery({
    queryKey: qk.orders.orderbookBuy(playerId),
    queryFn: () => getAllOpenBuyOrders(playerId),
    staleTime: 30_000,
  });

  const isLoading = sellLoading || buyLoading;

  // Aggregate sell orders by price level (ask side — cumulative from lowest)
  const askLevels = useMemo(() => {
    if (!sellOrders || sellOrders.length === 0) return [];
    const grouped = new Map<number, { qty: number; count: number }>();
    for (const o of sellOrders) {
      const available = o.quantity - o.filled_qty;
      if (available <= 0) continue;
      const existing = grouped.get(o.price);
      if (existing) {
        existing.qty += available;
        existing.count++;
      } else {
        grouped.set(o.price, { qty: available, count: 1 });
      }
    }

    let cumulative = 0;
    const result: PriceLevel[] = [];
    const entries = Array.from(grouped.entries()).sort((a, b) => a[0] - b[0]);
    for (const [price, { qty, count }] of entries) {
      cumulative += qty;
      result.push({
        price,
        priceBsd: centsToBsd(price),
        quantity: qty,
        orderCount: count,
        cumulative,
      });
    }
    return result;
  }, [sellOrders]);

  // Aggregate buy orders by price level (bid side — cumulative from highest)
  const bidLevels = useMemo(() => {
    if (!buyOrders || buyOrders.length === 0) return [];
    const grouped = new Map<number, { qty: number; count: number }>();
    for (const o of buyOrders) {
      const available = o.quantity - o.filled_qty;
      if (available <= 0) continue;
      const existing = grouped.get(o.price);
      if (existing) {
        existing.qty += available;
        existing.count++;
      } else {
        grouped.set(o.price, { qty: available, count: 1 });
      }
    }

    let cumulative = 0;
    const result: PriceLevel[] = [];
    // Sort descending (highest bid first) for cumulative calculation
    const entries = Array.from(grouped.entries()).sort((a, b) => b[0] - a[0]);
    for (const [price, { qty, count }] of entries) {
      cumulative += qty;
      result.push({
        price,
        priceBsd: centsToBsd(price),
        quantity: qty,
        orderCount: count,
        cumulative,
      });
    }
    return result;
  }, [buyOrders]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="size-4 animate-spin text-white/30 motion-reduce:animate-none" />
      </div>
    );
  }

  if (askLevels.length === 0 && bidLevels.length === 0) {
    return (
      <div className="text-center py-3 text-[10px] text-white/30">
        {t('noOrdersForPlayer', { defaultMessage: 'Keine aktiven Angebote' })}
      </div>
    );
  }

  const maxCum = askLevels.length > 0 ? askLevels[askLevels.length - 1].cumulative : 1;

  return (
    <div className="space-y-1 py-2">
      {/* SVG Depth Chart */}
      {(askLevels.length > 0 || bidLevels.length > 0) && (
        <div className="mb-2 rounded-xl bg-surface-minimal border border-divider overflow-hidden">
          <div className="flex items-center justify-between px-2 pt-1.5 pb-0.5">
            <span className="text-[9px] text-white/30 font-bold uppercase tracking-wider">
              {t('depthChartLabel', { defaultMessage: 'Tiefe' })}
            </span>
            <div className="flex items-center gap-2 text-[8px]">
              {bidLevels.length > 0 && (
                <span className="flex items-center gap-1 text-emerald-400/60">
                  <span className="inline-block w-2 h-1.5 rounded-sm bg-emerald-500/40" />
                  {t('depthBid', { defaultMessage: 'Kaufgesuche' })}
                </span>
              )}
              <span className="flex items-center gap-1 text-sky-400/60">
                <span className="inline-block w-2 h-1.5 rounded-sm bg-sky-500/40" />
                {t('depthAsk', { defaultMessage: 'Angebote' })}
              </span>
            </div>
          </div>
          <DepthChart askLevels={askLevels} bidLevels={bidLevels} />
        </div>
      )}

      {/* Price Level Rows (Ask side only — the detailed orderbook) */}
      {askLevels.length > 0 && (
        <>
          <div className="flex items-center justify-between text-[9px] text-white/30 font-bold uppercase tracking-wider px-1 mb-1">
            <span>{t('depthPrice', { defaultMessage: 'Preis' })}</span>
            <span>{t('depthQty', { defaultMessage: 'Menge' })}</span>
            <span>{t('depthCumulative', { defaultMessage: 'Kumuliert' })}</span>
          </div>
          {askLevels.map((level, i) => (
            <div key={level.price} className="relative flex items-center justify-between px-2 py-1.5 rounded-lg text-xs">
              {/* Depth bar background */}
              <div
                className={cn(
                  'absolute inset-0 rounded-lg',
                  i === 0 ? 'bg-green-500/10' : 'bg-sky-500/[0.06]'
                )}
                style={{ width: `${(level.cumulative / maxCum) * 100}%` }}
              />
              <span className={cn(
                'relative font-mono font-bold tabular-nums',
                i === 0 ? 'text-gold' : 'text-white/60'
              )}>
                {fmtScout(level.priceBsd)}
              </span>
              <span className="relative font-mono tabular-nums text-white/50">
                {level.quantity} <span className="text-[9px] text-white/25">({level.orderCount})</span>
              </span>
              <span className="relative font-mono tabular-nums text-white/40">
                {level.cumulative}
              </span>
            </div>
          ))}
        </>
      )}

      {/* Bid rows (buy orders) */}
      {bidLevels.length > 0 && (
        <>
          <div className="flex items-center justify-between text-[9px] text-emerald-400/40 font-bold uppercase tracking-wider px-1 mt-2 mb-1">
            <span>{t('depthBid', { defaultMessage: 'Kaufgesuche' })}</span>
            <span>{t('depthQty', { defaultMessage: 'Menge' })}</span>
            <span>{t('depthCumulative', { defaultMessage: 'Kumuliert' })}</span>
          </div>
          {bidLevels.map((level, i) => (
            <div key={level.price} className="relative flex items-center justify-between px-2 py-1.5 rounded-lg text-xs">
              <div
                className="absolute inset-0 rounded-lg bg-emerald-500/[0.06]"
                style={{
                  width: `${(level.cumulative / (bidLevels[bidLevels.length - 1]?.cumulative || 1)) * 100}%`,
                }}
              />
              <span className={cn(
                'relative font-mono font-bold tabular-nums',
                i === 0 ? 'text-emerald-400' : 'text-white/60'
              )}>
                {fmtScout(level.priceBsd)}
              </span>
              <span className="relative font-mono tabular-nums text-white/50">
                {level.quantity} <span className="text-[9px] text-white/25">({level.orderCount})</span>
              </span>
              <span className="relative font-mono tabular-nums text-white/40">
                {level.cumulative}
              </span>
            </div>
          ))}
        </>
      )}

      <div className="text-[9px] text-white/20 text-center pt-1">
        {t('depthLevels', {
          defaultMessage: '{count} Preisstufen',
          count: askLevels.length + bidLevels.length,
        })}
      </div>
    </div>
  );
}
