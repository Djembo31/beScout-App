'use client';

import { fmtScout } from '@/lib/utils';

interface DPCSupplyRingProps {
  supply: number;
  circulation: number;
  owned: number;
  className?: string;
}

export default function DPCSupplyRing({ supply, circulation, owned, className = '' }: DPCSupplyRingProps) {
  const pool = supply - circulation;
  const othersCirculation = circulation - owned;
  const total = supply || 1;

  // SVG donut chart parameters
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 58;
  const strokeWidth = 18;
  const circumference = 2 * Math.PI * radius;

  // Calculate segment sizes
  const poolPct = pool / total;
  const othersPct = othersCirculation / total;
  const ownedPct = owned / total;

  // Segment offsets (cumulative)
  const poolOffset = 0;
  const othersOffset = poolPct * circumference;
  const ownedOffset = (poolPct + othersPct) * circumference;

  return (
    <div className={`flex items-center gap-6 ${className}`}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
          {/* Background ring */}
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeWidth}
          />
          {/* Pool segment (gray) */}
          {poolPct > 0 && (
            <circle
              cx={cx} cy={cy} r={radius}
              fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={strokeWidth}
              strokeDasharray={`${poolPct * circumference} ${circumference}`}
              strokeDashoffset={-poolOffset}
              strokeLinecap="round"
            />
          )}
          {/* Circulation segment (gold) */}
          {othersPct > 0 && (
            <circle
              cx={cx} cy={cy} r={radius}
              fill="none" stroke="#FFD700" strokeWidth={strokeWidth}
              strokeDasharray={`${othersPct * circumference} ${circumference}`}
              strokeDashoffset={-othersOffset}
              strokeLinecap="round"
              opacity={0.6}
            />
          )}
          {/* Owned segment (blue) */}
          {ownedPct > 0 && (
            <circle
              cx={cx} cy={cy} r={radius}
              fill="none" stroke="#38BDF8" strokeWidth={strokeWidth}
              strokeDasharray={`${ownedPct * circumference} ${circumference}`}
              strokeDashoffset={-ownedOffset}
              strokeLinecap="round"
            />
          )}
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono font-black text-xl">{fmtScout(circulation)}</span>
          <span className="text-[10px] text-white/40">von {fmtScout(supply)}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-white/15 shrink-0" />
          <div>
            <div className="text-xs text-white/50">Pool (verfügbar)</div>
            <div className="font-mono font-bold text-sm">{fmtScout(pool)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-[#FFD700]/60 shrink-0" />
          <div>
            <div className="text-xs text-white/50">Im Umlauf</div>
            <div className="font-mono font-bold text-sm">{fmtScout(othersCirculation)}</div>
          </div>
        </div>
        {owned > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-sky-400 shrink-0" />
            <div>
              <div className="text-xs text-white/50">Du besitzt</div>
              <div className="font-mono font-bold text-sm text-sky-300">{owned}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
