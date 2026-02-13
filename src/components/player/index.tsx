'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import type { Pos, PlayerStatus } from '@/types';

// ============================================
// POSITION BADGE
// ============================================

const posBadgeClasses: Record<Pos, string> = {
  GK: 'bg-emerald-500/15 border-emerald-400/25 text-emerald-200',
  DEF: 'bg-amber-500/15 border-amber-400/25 text-amber-200',
  MID: 'bg-sky-500/15 border-sky-400/25 text-sky-200',
  ATT: 'bg-rose-500/15 border-rose-400/25 text-rose-200',
};

export function PositionBadge({ pos, size = 'md' }: { pos: Pos; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'px-1.5 py-0.5 text-[10px]', md: 'px-2 py-1 text-[11px]', lg: 'px-3 py-1.5 text-xs' };
  return (
    <span className={`inline-flex items-center justify-center rounded-xl border font-black ${posBadgeClasses[pos]} ${sizes[size]}`}>
      {pos}
    </span>
  );
}

// ============================================
// STATUS BADGE
// ============================================

const statusClasses: Record<PlayerStatus, string> = {
  fit: 'bg-green-500/15 text-green-300 border-green-500/25',
  injured: 'bg-red-500/15 text-red-300 border-red-500/25',
  suspended: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
  doubtful: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/25',
};

export function StatusBadge({ status }: { status: PlayerStatus }) {
  if (status === 'fit') return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-xl border text-[11px] font-black ${statusClasses[status]}`}>
      <AlertTriangle className="w-3.5 h-3.5" />
      {status.toUpperCase()}
    </span>
  );
}

// ============================================
// SCORE CIRCLE
// ============================================

const toneClasses = {
  good: 'border-emerald-400/25 bg-emerald-500/12 text-emerald-200',
  mid: 'border-amber-400/25 bg-amber-500/12 text-amber-200',
  bad: 'border-rose-400/25 bg-rose-500/12 text-rose-200',
  neutral: 'border-white/10 bg-white/5 text-white/70',
};

export function ScoreCircle({ label, value, size = 48 }: { label: string; value: number; size?: number }) {
  const tone = value >= 65 ? 'good' : value >= 45 ? 'mid' : value > 0 ? 'bad' : 'neutral';
  return (
    <div
      className={`rounded-full border flex flex-col items-center justify-center ${toneClasses[tone]}`}
      style={{ width: size, height: size }}
    >
      <div className="text-[10px] font-black opacity-70 leading-none">{label}</div>
      <div className="text-base font-black leading-none mt-1">{Math.round(value)}</div>
    </div>
  );
}

// ============================================
// MINI SPARKLINE
// ============================================

export function MiniSparkline({ values, width = 100, height = 24 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const norm = (v: number) => (max === min ? 0.5 : (v - min) / (max - min));

  const pts = values
    .map((v, i) => {
      const x = 2 + (i * (width - 4)) / (values.length - 1);
      const y = 2 + (1 - norm(v)) * (height - 4);
      return `${x},${y}`;
    })
    .join(' ');

  const up = values[values.length - 1] >= values[0];

  return (
    <svg width={width} height={height} className="opacity-80">
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={up ? 'text-[#22C55E]' : 'text-red-400'}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ============================================
// IPO BADGE
// ============================================

export function IPOBadge({ status, progress }: { status: string; progress?: number }) {
  const isLive = status === 'open' || status === 'early_access';
  const isAnnounced = status === 'announced';
  if (!isLive && !isAnnounced) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-xl border text-[11px] font-black ${isLive ? 'bg-[#22C55E]/15 border-[#22C55E]/25 text-[#22C55E]' : 'bg-[#FFD700]/15 border-[#FFD700]/25 text-[#FFD700]'
        }`}
    >
      {isLive ? 'LIVE IPO' : 'SOON'}
      {isLive && progress !== undefined && <span className="font-mono">{progress}%</span>}
    </span>
  );
}

