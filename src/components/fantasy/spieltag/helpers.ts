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

/** Score badge color based on API-Football rating (0.0-10.0) — SofaScore-inspired 6-tier */
export const scoreBadgeColor = (rating: number): string => {
  if (rating >= 9.0) return 'bg-[#374DF5] text-white';       // Royal Blue — Excellent
  if (rating >= 8.0) return 'bg-[#00ADC4] text-white';       // Cyan — Very Good
  if (rating >= 7.0) return 'bg-[#00C424] text-white';       // Green — Good
  if (rating >= 6.5) return 'bg-[#D9AF00] text-white';       // Gold — Average
  if (rating >= 6.0) return 'bg-[#ED7E07] text-white';       // Orange — Below Average
  return 'bg-[#DC0C00] text-white';                           // Red — Poor
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

/** Derive match rating from stat — single source of truth */
export const getRating = (stat: { rating?: number | null; fantasy_points: number }): number =>
  stat.rating ?? stat.fantasy_points / 10;

/** Heat-map rating style — SofaScore-inspired 6-tier with solid opaque backgrounds */
export const ratingHeatStyle = (rating: number): React.CSSProperties => {
  if (rating >= 9.0) return { background: '#374DF5', color: '#fff', textShadow: '0 0 10px rgba(55,77,245,0.5)' };
  if (rating >= 8.0) return { background: '#00ADC4', color: '#fff' };
  if (rating >= 7.0) return { background: '#00C424', color: '#fff' };
  if (rating >= 6.5) return { background: '#D9AF00', color: '#fff' };
  if (rating >= 6.0) return { background: '#ED7E07', color: '#fff' };
  return { background: '#DC0C00', color: '#fff' };
};
