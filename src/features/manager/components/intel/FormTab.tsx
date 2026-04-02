'use client';

import { cn } from '@/lib/utils';
import { getScoreHex } from '@/components/player/index';

interface FormTabProps {
  recentScores: number[];
}

export default function FormTab({ recentScores }: FormTabProps) {
  const maxScore = Math.max(...recentScores, 1);

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-black text-white/40 uppercase tracking-wider">
        Formkurve (letzte {recentScores.length} Spieltage)
      </h3>

      {/* Sparkline bars */}
      {recentScores.length > 0 ? (
        <div className="flex items-end gap-1 h-10">
          {recentScores.map((score, i) => {
            const height = Math.max((score / maxScore) * 100, 8);
            const hex = getScoreHex(score);
            return (
              <div
                key={i}
                className="w-2 rounded-sm transition-colors"
                style={{
                  height: `${height}%`,
                  backgroundColor: hex,
                  opacity: score >= 100 ? 1 : score >= 70 ? 0.6 : 0.4,
                }}
                title={`Score: ${score}`}
              />
            );
          })}
        </div>
      ) : (
        <p className="text-white/40 text-sm">Keine Daten verfuegbar</p>
      )}

      {/* Score list */}
      {recentScores.length > 0 && (
        <>
          <h4 className="text-xs font-black text-white/40 uppercase tracking-wider mt-4">
            Letzte Scores
          </h4>
          <div className="space-y-1">
            {recentScores.map((score, i) => (
              <div key={i} className="flex items-center justify-between py-1.5">
                <span className="text-white/50 text-sm">GW{recentScores.length - i}</span>
                <span
                  className={cn('font-mono tabular-nums text-sm font-semibold')}
                  style={{ color: getScoreHex(score) }}
                >
                  {score}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
