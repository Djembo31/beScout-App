'use client';

import React from 'react';

export type RadarAxis = {
  key: string;
  label: string;
  value: number;   // 0-100 normalized
  maxValue?: number;
};

export type RadarDataSet = {
  axes: RadarAxis[];
  color: string;
  fillOpacity?: number;
  label?: string;
};

type RadarChartProps = {
  datasets: RadarDataSet[];
  size?: number;
  rings?: number;
  showLabels?: boolean;
  className?: string;
};

export const RadarChart = ({ datasets, size = 240, rings = 4, showLabels = true, className = '' }: RadarChartProps) => {
  if (datasets.length === 0 || datasets[0].axes.length < 3) return null;

  const axes = datasets[0].axes;
  const n = axes.length;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - (showLabels ? 36 : 12);

  const getPoint = (index: number, value: number): { x: number; y: number } => {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
    const r = (value / 100) * radius;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  const getPolygonPoints = (values: number[]): string => {
    return values.map((v, i) => {
      const p = getPoint(i, v);
      return `${p.x},${p.y}`;
    }).join(' ');
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className}>
      {/* Background rings */}
      {Array.from({ length: rings }).map((_, i) => {
        const r = (radius * (i + 1)) / rings;
        const points = Array.from({ length: n }).map((_, j) => {
          const angle = (Math.PI * 2 * j) / n - Math.PI / 2;
          return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
        }).join(' ');
        return (
          <polygon
            key={`ring-${i}`}
            points={points}
            fill="none"
            stroke="white"
            strokeOpacity={0.08}
            strokeWidth={1}
          />
        );
      })}

      {/* Axis lines */}
      {axes.map((_, i) => {
        const p = getPoint(i, 100);
        return (
          <line
            key={`axis-${i}`}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="white"
            strokeOpacity={0.06}
            strokeWidth={1}
          />
        );
      })}

      {/* Data shapes */}
      {datasets.map((ds, dsIdx) => (
        <polygon
          key={`data-${dsIdx}`}
          points={getPolygonPoints(ds.axes.map(a => a.value))}
          fill={ds.color}
          fillOpacity={ds.fillOpacity ?? 0.15}
          stroke={ds.color}
          strokeWidth={2}
          strokeOpacity={0.8}
        />
      ))}

      {/* Data points */}
      {datasets.map((ds, dsIdx) =>
        ds.axes.map((a, i) => {
          const p = getPoint(i, a.value);
          return (
            <circle
              key={`point-${dsIdx}-${i}`}
              cx={p.x}
              cy={p.y}
              r={3}
              fill={ds.color}
              stroke="#0a0a0a"
              strokeWidth={1.5}
            />
          );
        })
      )}

      {/* Labels */}
      {showLabels && axes.map((axis, i) => {
        const labelPoint = getPoint(i, 115);
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const textAnchor = Math.abs(Math.cos(angle)) < 0.1 ? 'middle' :
          Math.cos(angle) > 0 ? 'start' : 'end';
        const dy = Math.abs(Math.sin(angle)) < 0.1 ? '0.35em' :
          Math.sin(angle) > 0 ? '0.8em' : '-0.3em';

        return (
          <text
            key={`label-${i}`}
            x={labelPoint.x}
            y={labelPoint.y}
            textAnchor={textAnchor}
            dy={dy}
            fill="white"
            fillOpacity={0.5}
            fontSize={10}
            fontWeight={600}
          >
            {axis.label}
          </text>
        );
      })}
    </svg>
  );
};

// ============================================
// Helper: Build radar data from player stats
// ============================================

export type PlayerRadarData = {
  goals: number;
  assists: number;
  cleanSheets: number;
  matches: number;
  perfL5: number;
  perfL15: number;
  bonus: number;
  minutes: number;
};

const DEFAULT_AXES_CONFIG = [
  { key: 'goals', label: 'Tore', max: 20 },
  { key: 'assists', label: 'Assists', max: 15 },
  { key: 'cleanSheets', label: 'CS', max: 15 },
  { key: 'matches', label: 'Spiele', max: 38 },
  { key: 'perfL5', label: 'L5', max: 100 },
  { key: 'perfL15', label: 'L15', max: 100 },
  { key: 'bonus', label: 'Bonus', max: 30 },
  { key: 'minutes', label: 'Minuten', max: 3420 },
];

export function buildPlayerRadarAxes(data: PlayerRadarData): RadarAxis[] {
  return DEFAULT_AXES_CONFIG.map(cfg => ({
    key: cfg.key,
    label: cfg.label,
    value: Math.min(100, Math.round(((data[cfg.key as keyof PlayerRadarData] ?? 0) / cfg.max) * 100)),
    maxValue: cfg.max,
  }));
}
