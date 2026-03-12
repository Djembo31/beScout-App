'use client';

import { cn } from '@/lib/utils';

/* ── Dimension colors (from gamification design system) ─────────── */
const DIMENSION_COLORS = {
  manager: '#c084fc',  // purple-400
  trader: '#38bdf8',   // sky-400
  analyst: '#34d399',  // emerald-400
} as const;

/* ── Axis config: angle in degrees, label abbreviation ──────────── */
const AXES: { key: 'manager' | 'trader' | 'analyst'; angle: number; label: string }[] = [
  { key: 'manager', angle: 270, label: 'MGR' },
  { key: 'trader',  angle: 30,  label: 'TRD' },
  { key: 'analyst', angle: 150, label: 'ANL' },
];

/* ── Props ──────────────────────────────────────────────────────── */
interface RadarChartProps {
  scores: { manager: number; trader: number; analyst: number };
  max?: number;
  size?: number;
  className?: string;
}

/* ── Helpers ────────────────────────────────────────────────────── */
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function polygonPoints(cx: number, cy: number, r: number, angles: number[]): string {
  return angles
    .map((a) => {
      const { x, y } = polarToCartesian(cx, cy, r, a);
      return `${x},${y}`;
    })
    .join(' ');
}

/* ── Component ──────────────────────────────────────────────────── */
export function RadarChart({
  scores,
  max = 3000,
  size = 180,
  className,
}: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 24;
  const angles = AXES.map((a) => a.angle);

  // Normalized scores capped at 1
  const normalized = AXES.map((a) => Math.min(scores[a.key] / max, 1));

  // Data points in cartesian
  const dataPoints = AXES.map((a, i) =>
    polarToCartesian(cx, cy, radius * normalized[i], a.angle),
  );

  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Label positions (pushed outward beyond the chart edge)
  const labelOffset = radius + 16;

  return (
    <svg
      role="img"
      aria-label={`Radar chart — Manager: ${scores.manager}, Trader: ${scores.trader}, Analyst: ${scores.analyst}`}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('shrink-0', className)}
    >
      {/* ── Grid rings (25%, 50%, 75%, 100%) ── */}
      {[0.25, 0.5, 0.75, 1].map((pct) => (
        <polygon
          key={pct}
          points={polygonPoints(cx, cy, radius * pct, angles)}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1}
        />
      ))}

      {/* ── Axis lines ── */}
      {AXES.map((a) => {
        const end = polarToCartesian(cx, cy, radius, a.angle);
        return (
          <line
            key={a.key}
            x1={cx}
            y1={cy}
            x2={end.x}
            y2={end.y}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={1}
          />
        );
      })}

      {/* ── Data polygon ── */}
      <polygon
        points={dataPolygon}
        fill="rgba(255,215,0,0.15)"
        stroke="#FFD700"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* ── Data points (colored circles) ── */}
      {AXES.map((a, i) => (
        <circle
          key={a.key}
          cx={dataPoints[i].x}
          cy={dataPoints[i].y}
          r={3}
          fill={DIMENSION_COLORS[a.key]}
        />
      ))}

      {/* ── Labels ── */}
      {AXES.map((a) => {
        const pos = polarToCartesian(cx, cy, labelOffset, a.angle);
        return (
          <text
            key={a.key}
            x={pos.x}
            y={pos.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill={DIMENSION_COLORS[a.key]}
            fontSize={11}
            fontWeight="bold"
          >
            {a.label}
          </text>
        );
      })}
    </svg>
  );
}
