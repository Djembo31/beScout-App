'use client';

import { cn } from '@/lib/utils';
import { getScoreHex } from '@/components/player/scoreColor';

type FormEntry = {
  score: number;
  status: 'played' | 'bench' | 'not_in_squad';
};

interface FormBarsProps {
  entries: FormEntry[];
  className?: string;
}

const MAX_H = 28;
const MIN_H = 6;
const BAR_W = 6;
const GAP = 2;

export default function FormBars({ entries, className }: FormBarsProps) {
  const padded = Array.from({ length: 5 }, (_, i) => {
    const idx = i - (5 - entries.length);
    return idx >= 0 ? entries[idx] : null;
  });

  return (
    <div
      className={cn('flex items-end', className)}
      style={{ gap: GAP, height: MAX_H }}
      aria-label="Form last 5"
    >
      {padded.map((entry, i) => {
        if (!entry || entry.status !== 'played') {
          return (
            <div
              key={i}
              className="border border-dashed border-white/10 rounded-t-sm"
              style={{ width: BAR_W, height: 4 }}
            />
          );
        }
        const h = Math.max(MIN_H, (entry.score / 100) * MAX_H);
        return (
          <div
            key={i}
            className="rounded-t-sm"
            style={{
              width: BAR_W,
              height: h,
              backgroundColor: getScoreHex(entry.score),
            }}
          />
        );
      })}
    </div>
  );
}
