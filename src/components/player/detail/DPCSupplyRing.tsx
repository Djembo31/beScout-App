'use client';

import { fmtScout } from '@/lib/utils';

interface DPCSupplyRingProps {
  /** Total supply set by club (max_supply) */
  supply: number;
  /** Released to market so far, e.g. tranche 1 (dpc_total) */
  released: number;
  /** Sold / held by users (circulation) */
  sold: number;
  /** Held by current user */
  owned: number;
  className?: string;
}

export default function DPCSupplyRing({ supply, released, sold, owned, className = '' }: DPCSupplyRingProps) {
  const reserved = supply - released;       // Future tranches
  const available = released - sold;         // Buyable now
  const others = sold - owned;              // Other holders
  const total = supply || 1;

  // SVG donut chart parameters
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 58;
  const strokeWidth = 18;
  const circumference = 2 * Math.PI * radius;

  // Calculate segment percentages
  const reservedPct = reserved / total;
  const availablePct = available / total;
  const othersPct = others / total;
  const ownedPct = owned / total;

  // Segment offsets (cumulative)
  const reservedOffset = 0;
  const availableOffset = reservedPct * circumference;
  const othersOffset = (reservedPct + availablePct) * circumference;
  const ownedOffset = (reservedPct + availablePct + othersPct) * circumference;

  return (
    <div className={`flex items-center gap-6 ${className}`}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
          {/* Background ring */}
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeWidth}
          />
          {/* Reserved segment (dark) — future tranches */}
          {reservedPct > 0 && (
            <circle
              cx={cx} cy={cy} r={radius}
              fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth}
              strokeDasharray={`${reservedPct * circumference} ${circumference}`}
              strokeDashoffset={-reservedOffset}
              strokeLinecap="round"
            />
          )}
          {/* Available segment (gray) — buyable from pool */}
          {availablePct > 0 && (
            <circle
              cx={cx} cy={cy} r={radius}
              fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={strokeWidth}
              strokeDasharray={`${availablePct * circumference} ${circumference}`}
              strokeDashoffset={-availableOffset}
              strokeLinecap="round"
            />
          )}
          {/* Others segment (gold) */}
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
          <span className="font-mono font-black text-xl">{fmtScout(sold)}</span>
          <span className="text-[10px] text-white/40">von {fmtScout(supply)} verkauft</span>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2">
        {reserved > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-white/[0.06] border border-white/10 shrink-0" />
            <div>
              <div className="text-xs text-white/50">Reserviert</div>
              <div className="font-mono font-bold text-sm text-white/30">{fmtScout(reserved)}</div>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-white/15 shrink-0" />
          <div>
            <div className="text-xs text-white/50">Verfügbar</div>
            <div className="font-mono font-bold text-sm">{fmtScout(available)}</div>
          </div>
        </div>
        {others > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[#FFD700]/60 shrink-0" />
            <div>
              <div className="text-xs text-white/50">Andere Holder</div>
              <div className="font-mono font-bold text-sm">{fmtScout(others)}</div>
            </div>
          </div>
        )}
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
