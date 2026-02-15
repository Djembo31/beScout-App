'use client';

interface SentimentGaugeProps {
  buyCount: number;
  sellCount: number;
  className?: string;
}

export default function SentimentGauge({ buyCount, sellCount, className = '' }: SentimentGaugeProps) {
  const total = buyCount + sellCount;
  const ratio = total > 0 ? buyCount / total : 0.5;
  const pct = Math.round(ratio * 100);

  // SVG half-circle gauge
  const size = 180;
  const cx = size / 2;
  const cy = size / 2 + 10;
  const radius = 65;
  const strokeWidth = 14;

  // Half circle = PI * radius
  const halfCircumference = Math.PI * radius;
  const filledLength = ratio * halfCircumference;

  // Label
  const label = pct >= 70 ? 'Bullish' : pct >= 40 ? 'Neutral' : 'Bearish';
  const labelColor = pct >= 70 ? 'text-[#22C55E]' : pct >= 40 ? 'text-[#FFD700]' : 'text-red-400';
  const strokeColor = pct >= 70 ? '#22C55E' : pct >= 40 ? '#FFD700' : '#EF4444';

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative" style={{ width: size, height: size / 2 + 20 }}>
        <svg viewBox={`0 0 ${size} ${size / 2 + 30}`} className="w-full h-full">
          {/* Background arc */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Filled arc */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${filledLength} ${halfCircumference}`}
            opacity={0.7}
          />
        </svg>
        {/* Center label */}
        <div className="absolute bottom-0 left-0 right-0 text-center">
          <div className={`font-mono font-black text-2xl ${labelColor}`}>{pct}%</div>
          <div className={`text-xs font-bold ${labelColor}`}>{label}</div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 mt-2">
        <div className="text-center">
          <div className="font-mono font-bold text-sm text-[#22C55E]">{buyCount}</div>
          <div className="text-[10px] text-white/40">Käufe</div>
        </div>
        <div className="w-px h-6 bg-white/10" />
        <div className="text-center">
          <div className="font-mono font-bold text-sm text-red-400">{sellCount}</div>
          <div className="text-[10px] text-white/40">Verkäufe</div>
        </div>
      </div>
    </div>
  );
}
