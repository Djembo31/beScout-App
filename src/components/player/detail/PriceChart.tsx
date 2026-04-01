'use client';

import { memo, useState, useRef, useCallback, useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Card } from '@/components/ui';
import { fmtScout, cn } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import type { DbTrade } from '@/types';

interface PriceChartProps {
  trades: DbTrade[];
  ipoPrice?: number;
  referencePrice?: number;
  className?: string;
}

type TimeRange = '1W' | '1M' | '3M' | 'ALL';

const RANGE_MS: Record<TimeRange, number> = {
  '1W': 7 * 86_400_000,
  '1M': 30 * 86_400_000,
  '3M': 90 * 86_400_000,
  'ALL': Infinity,
};

/** Catmull-Rom spline → SVG cubic bezier path */
function catmullRomPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  if (pts.length === 2) return `M${pts[0].x},${pts[0].y} L${pts[1].x},${pts[1].y}`;

  const d: string[] = [`M${pts[0].x},${pts[0].y}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d.push(`C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`);
  }
  return d.join(' ');
}

function PriceChartInner({ trades, ipoPrice, referencePrice, className = '' }: PriceChartProps) {
  const t = useTranslations('player');
  const tpd = useTranslations('playerDetail');
  const locale = useLocale();
  const [range, setRange] = useState<TimeRange>('ALL');
  const [crosshair, setCrosshair] = useState<{ idx: number; x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const sorted = useMemo(() =>
    [...trades].sort((a, b) => new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime()),
    [trades]
  );

  const filtered = useMemo(() => {
    if (range === 'ALL') return sorted;
    const cutoff = Date.now() - RANGE_MS[range];
    return sorted.filter(t => new Date(t.executed_at).getTime() >= cutoff);
  }, [sorted, range]);

  const W = 400;
  const H = 160;
  const padX = 50;
  const padY = 20;
  const chartW = W - padX - 10;
  const chartH = H - padY * 2;

  const chartData = useMemo(() => {
    if (filtered.length < 2) return null;
    const prices = filtered.map(t => centsToBsd(t.price as number));
    const dates = filtered.map(t => new Date(t.executed_at));
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const rangeVal = max - min || 1;

    const pts = prices.map((v, i) => ({
      x: padX + (i * chartW) / (prices.length - 1),
      y: padY + (1 - (v - min) / rangeVal) * chartH,
    }));

    const linePath = catmullRomPath(pts);
    const areaPath = `${linePath} L${pts[pts.length - 1].x},${padY + chartH} L${pts[0].x},${padY + chartH} Z`;
    const up = prices[prices.length - 1] >= prices[0];
    const change = prices[prices.length - 1] - prices[0];
    const changePct = prices[0] > 0 ? (change / prices[0]) * 100 : 0;
    const yLabels = Array.from({ length: 5 }, (_, i) => min + (rangeVal * i) / 4);

    const ipoBsd = ipoPrice ? centsToBsd(ipoPrice) : null;
    const ipoY = ipoBsd && ipoBsd >= min && ipoBsd <= max
      ? padY + (1 - (ipoBsd - min) / rangeVal) * chartH
      : null;

    return { prices, dates, min, rangeVal, pts, linePath, areaPath, up, change, changePct, yLabels, ipoY };
  }, [filtered, ipoPrice, padX, padY, chartW, chartH]);

  const handlePointer = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || !chartData) return;
    const rect = svg.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    let closest = 0;
    let closestDist = Infinity;
    for (let i = 0; i < chartData.pts.length; i++) {
      const d = Math.abs(chartData.pts[i].x - svgX);
      if (d < closestDist) { closestDist = d; closest = i; }
    }
    setCrosshair({ idx: closest, x: chartData.pts[closest].x, y: chartData.pts[closest].y });
  }, [chartData]);

  if (!chartData) {
    const placeholderPrice = ipoPrice ? centsToBsd(ipoPrice) : referencePrice ? centsToBsd(referencePrice) : null;
    return (
      <Card className={`p-4 md:p-6 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-lg flex items-center gap-2 text-balance">
            <BarChart3 className="size-5 text-gold" aria-hidden="true" />
            {t('priceHistory')}
          </h3>
        </div>
        <div className="relative h-[160px] flex items-center justify-center">
          {placeholderPrice != null && (
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-gold/30" />
          )}
          <div className="relative z-10 text-center">
            <BarChart3 className="size-8 mx-auto mb-2 text-white/15" aria-hidden="true" />
            <p className="text-sm text-white/40 font-medium">{tpd('emptyChartTitle')}</p>
            {placeholderPrice != null && (
              <p className="text-xs text-gold/60 font-mono tabular-nums mt-1">
                {tpd('emptyChartIpo', { price: fmtScout(placeholderPrice) })}
              </p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  const { prices, dates, min: minPrice, rangeVal, pts, linePath, areaPath, up, change, changePct, yLabels, ipoY } = chartData;

  const dateFmt = (d: Date) =>
    d.toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'de-DE', { day: '2-digit', month: 'short' });

  const activePrice = crosshair ? prices[crosshair.idx] : prices[prices.length - 1];
  const activeDate = crosshair ? dates[crosshair.idx] : null;

  return (
    <Card className={`p-4 md:p-6 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black text-lg flex items-center gap-2 text-balance">
          <BarChart3 className="size-5 text-gold" aria-hidden="true" />
          {t('priceHistory')}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-bold">{fmtScout(activePrice)} CR</span>
          {!crosshair && (
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg ${up ? 'bg-vivid-green/10 text-vivid-green' : 'bg-vivid-red/10 text-vivid-red'}`}>
              {change >= 0 ? '+' : ''}{changePct.toFixed(1)}%
            </span>
          )}
          {activeDate && (
            <span className="text-[10px] text-white/40 font-mono">{dateFmt(activeDate)}</span>
          )}
        </div>
      </div>

      {/* Time Range Toggle */}
      <div className="flex gap-1 mb-3">
        {(['1W', '1M', '3M', 'ALL'] as TimeRange[]).map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={cn(
              'px-3 py-1 rounded-lg text-xs font-bold transition-colors min-h-[32px]',
              range === r
                ? 'bg-gold/20 text-gold border border-gold/30'
                : 'text-white/40 hover:text-white/60 border border-transparent'
            )}
          >
            {r === 'ALL' ? tpd('showAll') : r}
          </button>
        ))}
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto touch-none"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={t('priceHistoryChart')}
        onPointerMove={handlePointer}
        onPointerLeave={() => setCrosshair(null)}
      >
        {/* Grid lines */}
        {yLabels.map((v, i) => {
          const y = padY + (1 - (v - minPrice) / rangeVal) * chartH;
          return (
            <g key={i}>
              <line x1={padX} y1={y} x2={W - 10} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
              <text x={padX - 6} y={y + 3} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="monospace">
                {v.toFixed(2)}
              </text>
            </g>
          );
        })}
        {/* IPO baseline */}
        {ipoY !== null && (
          <line x1={padX} y1={ipoY} x2={W - 10} y2={ipoY} stroke="var(--gold)" strokeWidth="1" strokeDasharray="6,4" opacity={0.3} />
        )}
        {/* Area fill */}
        <path d={areaPath} fill={up ? 'color-mix(in srgb, var(--vivid-green) 10%, transparent)' : 'color-mix(in srgb, var(--vivid-red) 10%, transparent)'} />
        {/* Smooth line */}
        <path d={linePath} fill="none" stroke={up ? 'var(--vivid-green)' : 'var(--vivid-red)'} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {/* Crosshair */}
        {crosshair && (
          <>
            <line x1={crosshair.x} y1={padY} x2={crosshair.x} y2={padY + chartH} stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="3,3" />
            <circle cx={crosshair.x} cy={crosshair.y} r="4" fill={up ? 'var(--vivid-green)' : 'var(--vivid-red)'} stroke="#0a0a0a" strokeWidth="2" />
          </>
        )}
      </svg>
      <div className="flex justify-between text-[10px] text-white/30 mt-1 px-1">
        <span>{dateFmt(dates[0])}</span>
        {dates.length > 2 && (
          <span>{dateFmt(dates[Math.floor(dates.length / 2)])}</span>
        )}
        <span>{dateFmt(dates[dates.length - 1])}</span>
      </div>
    </Card>
  );
}

export default memo(PriceChartInner);
