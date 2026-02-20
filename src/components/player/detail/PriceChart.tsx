'use client';

import { BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui';
import { fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import type { DbTrade } from '@/types';

interface PriceChartProps {
  trades: DbTrade[];
  ipoPrice?: number;
  className?: string;
}

export default function PriceChart({ trades, ipoPrice, className = '' }: PriceChartProps) {
  if (trades.length < 2) return null;

  const sorted = [...trades].sort((a, b) => new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime());
  const prices = sorted.map(t => centsToBsd(t.price as number));
  const dates = sorted.map(t => new Date(t.executed_at));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const W = 400;
  const H = 160;
  const padX = 50;
  const padY = 20;
  const chartW = W - padX - 10;
  const chartH = H - padY * 2;

  const pts = prices.map((v, i) => ({
    x: padX + (i * chartW) / (prices.length - 1),
    y: padY + (1 - (v - min) / range) * chartH,
  }));

  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
  const up = prices[prices.length - 1] >= prices[0];
  const change = prices[prices.length - 1] - prices[0];
  const changePct = prices[0] > 0 ? (change / prices[0]) * 100 : 0;

  // Y-axis labels (5 steps)
  const yLabels = Array.from({ length: 5 }, (_, i) => min + (range * i) / 4);

  // Area fill path
  const areaPath = `M${pts[0].x},${padY + chartH} ${pts.map(p => `L${p.x},${p.y}`).join(' ')} L${pts[pts.length - 1].x},${padY + chartH} Z`;

  // IPO baseline
  const ipoBsd = ipoPrice ? centsToBsd(ipoPrice) : null;
  const ipoY = ipoBsd && ipoBsd >= min && ipoBsd <= max
    ? padY + (1 - (ipoBsd - min) / range) * chartH
    : null;

  return (
    <Card className={`p-4 md:p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-lg flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#FFD700]" />
          Preisverlauf
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-bold">{fmtScout(prices[prices.length - 1])} $SCOUT</span>
          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg ${up ? 'bg-[#22C55E]/10 text-[#22C55E]' : 'bg-red-500/10 text-red-400'}`}>
            {change >= 0 ? '+' : ''}{fmtScout(change)} ({changePct >= 0 ? '+' : ''}{changePct.toFixed(1)}%)
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {yLabels.map((v, i) => {
          const y = padY + (1 - (v - min) / range) * chartH;
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
          <line x1={padX} y1={ipoY} x2={W - 10} y2={ipoY} stroke="#FFD700" strokeWidth="1" strokeDasharray="6,4" opacity={0.3} />
        )}
        {/* Area fill */}
        <path d={areaPath} fill={up ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)'} />
        {/* Line */}
        <polyline points={polyline} fill="none" stroke={up ? '#22C55E' : '#EF4444'} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {/* Data points */}
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill={up ? '#22C55E' : '#EF4444'} stroke="#0a0a0a" strokeWidth="1.5" />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-white/30 mt-1 px-1">
        <span>{dates[0].toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}</span>
        {dates.length > 2 && (
          <span>{dates[Math.floor(dates.length / 2)].toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}</span>
        )}
        <span>{dates[dates.length - 1].toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}</span>
      </div>
    </Card>
  );
}
