/** Spieltag helper functions — extracted from SpieltagTab */

export const posColor = (pos: string) => {
  switch (pos) {
    case 'GK': return 'text-emerald-400 bg-emerald-500/15';
    case 'DEF': return 'text-amber-400 bg-amber-500/15';
    case 'MID': return 'text-sky-400 bg-sky-500/15';
    case 'ATT': return 'text-rose-400 bg-rose-500/15';
    default: return 'text-white/50 bg-white/10';
  }
};

export const scoreBadgeColor = (pts: number): string => {
  if (pts >= 80) return 'bg-gold text-black';
  if (pts >= 60) return 'bg-green-500 text-white';
  if (pts >= 40) return 'bg-sky-500 text-white';
  if (pts >= 20) return 'bg-orange-500 text-white';
  return 'bg-red-500 text-white';
};

export const posOrder = (pos: string): number => {
  switch (pos) { case 'ATT': return 0; case 'MID': return 1; case 'DEF': return 2; case 'GK': return 3; default: return 4; }
};

export const getPosAccent = (pos: string): string => {
  switch (pos) {
    case 'GK': return '#34d399';
    case 'DEF': return '#fbbf24';
    case 'MID': return '#38bdf8';
    case 'ATT': return '#fb7185';
    default: return 'rgba(255,255,255,0.5)';
  }
};

/** Position dot color for GoalTicker pills */
export const getPosDotColor = (pos: string): string => {
  switch (pos) {
    case 'GK': return 'bg-emerald-400';
    case 'DEF': return 'bg-amber-400';
    case 'MID': return 'bg-sky-400';
    case 'ATT': return 'bg-rose-400';
    default: return 'bg-white/50';
  }
};
