/** Spieltag helper functions — extracted from SpieltagTab */
import type React from 'react';

export const posColor = (pos: string) => {
  switch (pos) {
    case 'GK': return 'text-emerald-400 bg-emerald-500/15';
    case 'DEF': return 'text-amber-400 bg-amber-500/15';
    case 'MID': return 'text-sky-400 bg-sky-500/15';
    case 'ATT': return 'text-rose-400 bg-rose-500/15';
    default: return 'text-white/50 bg-white/10';
  }
};

/** Score badge color based on API-Football rating (0.0-10.0) */
export const scoreBadgeColor = (rating: number): string => {
  if (rating >= 8.0) return 'bg-gold text-black';
  if (rating >= 7.0) return 'bg-green-500 text-white';
  if (rating >= 6.5) return 'bg-sky-500 text-white';
  if (rating >= 6.0) return 'bg-orange-500 text-white';
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

/** Heat-map rating style — continuous gradient instead of 5-tier flat */
export const ratingHeatStyle = (rating: number): React.CSSProperties => {
  const t = Math.max(0, Math.min(1, (rating - 5) / 4));
  const r = Math.round(239 - t * 80);
  const g = Math.round(68 + t * 147);
  const b = Math.round(68 - t * 68);
  return {
    background: `rgba(${r},${g},${b},0.20)`,
    color: `rgb(${r},${g},${b})`,
    textShadow: rating >= 8 ? '0 0 8px rgba(255,215,0,0.3)' : 'none',
  };
};
