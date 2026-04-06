'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { Player } from '@/types';

/* -------------------------------------------------- */
/*  Types                                              */
/* -------------------------------------------------- */

interface FormTabProps {
  player: Player;
  scores: (number | null)[] | undefined;
}

/* -------------------------------------------------- */
/*  Helpers                                            */
/* -------------------------------------------------- */

/** Standard deviation of non-null scores */
function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sqDiffs = values.map((v) => (v - mean) ** 2);
  return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / values.length);
}

/** Map data points into an SVG polyline path within viewBox */
function buildSparklinePath(
  data: number[],
  width: number,
  height: number,
  padding: number,
): string {
  if (data.length === 0) return '';
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1; // avoid division by zero
  const usableH = height - padding * 2;
  const usableW = width - padding * 2;
  const step = data.length > 1 ? usableW / (data.length - 1) : 0;

  return data
    .map((v, i) => {
      const x = padding + i * step;
      const y = padding + usableH - ((v - min) / range) * usableH;
      return `${x},${y}`;
    })
    .join(' ');
}

/* -------------------------------------------------- */
/*  Score Sparkline (SVG)                              */
/* -------------------------------------------------- */

function ScoreSparkline({ data }: { data: number[] }) {
  const W = 320;
  const H = 80;
  const PAD = 8;
  const points = buildSparklinePath(data, W, H, PAD);

  if (data.length === 0) return null;

  // Build area polygon (close path to bottom)
  const first = `${PAD},${H - PAD}`;
  const last = `${PAD + (data.length > 1 ? ((W - PAD * 2) / (data.length - 1)) * (data.length - 1) : 0)},${H - PAD}`;
  const areaPoints = `${first} ${points} ${last}`;

  // Individual point positions for circles
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const usableH = H - PAD * 2;
  const usableW = W - PAD * 2;
  const step = data.length > 1 ? usableW / (data.length - 1) : 0;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: 80 }}
      aria-hidden="true"
    >
      {/* Area fill */}
      <polygon points={areaPoints} fill="rgba(255,215,0,0.1)" />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke="#FFD700"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Dots */}
      {data.map((v, i) => {
        const x = PAD + i * step;
        const y = PAD + usableH - ((v - min) / range) * usableH;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="3"
            fill="#FFD700"
          />
        );
      })}
    </svg>
  );
}

/* -------------------------------------------------- */
/*  Score Grid (last 5)                                */
/* -------------------------------------------------- */

function ScoreGrid({ scores }: { scores: number[] }) {
  const last5 = scores.slice(-5);

  return (
    <div className="flex gap-2">
      {last5.map((score, i) => (
        <span
          key={i}
          className={cn(
            'bg-white/[0.04] rounded-lg px-2 py-1 font-mono tabular-nums text-sm',
            score >= 80
              ? 'text-gold'
              : score >= 60
                ? 'text-white'
                : 'text-red-400',
          )}
        >
          {score}
        </span>
      ))}
    </div>
  );
}

/* -------------------------------------------------- */
/*  Form Assessment Badge                              */
/* -------------------------------------------------- */

function FormBadge({ scores }: { scores: number[] }) {
  const t = useTranslations('manager');
  const sd = stdev(scores);

  let label: string;
  let color: string;

  if (sd < 10) {
    label = t('formConstant');
    color = 'text-emerald-400 bg-emerald-400/10';
  } else if (sd <= 20) {
    label = t('formFluctuating');
    color = 'text-yellow-400 bg-yellow-400/10';
  } else {
    label = t('formVolatile');
    color = 'text-red-400 bg-red-400/10';
  }

  return (
    <span className={cn('inline-block rounded-full px-3 py-1 text-xs font-medium', color)}>
      {label}
    </span>
  );
}

/* -------------------------------------------------- */
/*  FormTab                                            */
/* -------------------------------------------------- */

export default function FormTab({ player, scores }: FormTabProps) {
  const t = useTranslations('manager');

  // Filter out nulls for calculations
  const validScores = (scores ?? []).filter((s): s is number => s !== null);
  // Take last 10 for sparkline
  const last10 = validScores.slice(-10);

  if (last10.length === 0) {
    return (
      <div className="space-y-4 p-4">
        <p className="text-sm text-white/50">{t('noScores')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Score Sparkline */}
      <div className="bg-white/[0.04] rounded-xl p-3">
        <p className="text-xs text-white/50 mb-2">{t('scoreHistory')}</p>
        <ScoreSparkline data={last10} />
      </div>

      {/* Score Grid + Form Assessment */}
      <div className="bg-white/[0.04] rounded-xl p-3 space-y-3">
        <div>
          <p className="text-xs text-white/50 mb-2">{t('lastScores')}</p>
          <ScoreGrid scores={validScores} />
        </div>
        <div>
          <p className="text-xs text-white/50 mb-2">{t('formAssessment')}</p>
          <FormBadge scores={validScores} />
        </div>
      </div>
    </div>
  );
}
