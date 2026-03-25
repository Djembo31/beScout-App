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


/** Status accent classes for fixture/event status */
export const getStatusAccent = (status: string) => {
  switch (status) {
    case 'running': case 'live':
      return { border: 'border-vivid-green/30', dot: 'bg-vivid-green', glow: 'status-live' };
    case 'simulated': case 'finished':
      return { border: 'border-gold/20', dot: 'bg-gold', glow: 'status-ended' };
    default:
      return { border: 'border-white/[0.08]', dot: 'bg-white/20', glow: '' };
  }
};

/** Position ring frame class for player photos */
export const getRingFrameClass = (pos: string): string => {
  switch (pos) {
    case 'GK': return 'ring-frame-gk';
    case 'DEF': return 'ring-frame-def';
    case 'MID': return 'ring-frame-mid';
    case 'ATT': return 'ring-frame-att';
    default: return '';
  }
};

/** Convert fixture stat to 0-100 BeScout score. Returns null if no API rating available. */
export const getMatchScore = (stat: { rating?: number | null }): number | null =>
  stat.rating != null ? Math.round(stat.rating * 10) : null;

