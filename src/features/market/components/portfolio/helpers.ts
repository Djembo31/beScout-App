import type { Pos } from '@/types';

export const getPosColor = (pos: Pos): string => {
  switch (pos) {
    case 'GK': return '#34d399';
    case 'DEF': return '#fbbf24';
    case 'MID': return '#38bdf8';
    case 'ATT': return '#fb7185';
  }
};

export const getPosBorderClass = (pos: Pos): string => {
  switch (pos) {
    case 'GK': return 'border-emerald-400/40';
    case 'DEF': return 'border-amber-400/40';
    case 'MID': return 'border-sky-400/40';
    case 'ATT': return 'border-rose-400/40';
  }
};

export const getScoreColor = (score: number): string => {
  if (score >= 100) return '#FFD700';
  if (score >= 70) return '#ffffff';
  return '#ff6b6b';
};

/** Get slot positions within SVG viewBox (400x500) for a given row and count */
export function getSlotPosition(row: number, col: number, countInRow: number): { x: number; y: number } {
  // Y positions: ATT at top, GK at bottom
  const yMap: Record<number, number> = { 0: 440, 1: 340, 2: 220, 3: 90 };
  const y = yMap[row] ?? 250;

  // Center slots horizontally in the 400px width
  const spacing = Math.min(80, 320 / Math.max(countInRow, 1));
  const totalWidth = spacing * (countInRow - 1);
  const startX = 200 - totalWidth / 2;
  const x = countInRow === 1 ? 200 : startX + col * spacing;

  return { x, y };
}
