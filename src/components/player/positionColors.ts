/**
 * Single Source of Truth for all position-based colors.
 * GK=emerald, DEF=amber, MID=sky, ATT=rose.
 *
 * Every component that styles by position imports from HERE.
 */
import type { Pos } from '@/types';

/** Canonical hex values — use for inline styles, dynamic borders, gradients */
export const posTintColors: Record<Pos, string> = {
  GK: '#34d399',   // emerald-400
  DEF: '#fbbf24',  // amber-400
  MID: '#38bdf8',  // sky-400
  ATT: '#fb7185',  // rose-400
};

/** Composite Tailwind tokens — bg/border/text at standard opacities */
export const posColors: Record<Pos, { bg: string; border: string; text: string }> = {
  GK: { bg: 'bg-emerald-500/20', border: 'border-emerald-400/30', text: 'text-emerald-200' },
  DEF: { bg: 'bg-amber-500/20', border: 'border-amber-400/30', text: 'text-amber-200' },
  MID: { bg: 'bg-sky-500/20', border: 'border-sky-400/30', text: 'text-sky-200' },
  ATT: { bg: 'bg-rose-500/20', border: 'border-rose-400/30', text: 'text-rose-200' },
};

/** PositionBadge pill styling */
export const posBadgeClasses: Record<Pos, string> = {
  GK: 'bg-emerald-500/15 border-emerald-400/25 text-emerald-200',
  DEF: 'bg-amber-500/15 border-amber-400/25 text-amber-200',
  MID: 'bg-sky-500/15 border-sky-400/25 text-sky-200',
  ATT: 'bg-rose-500/15 border-rose-400/25 text-rose-200',
};

/** Subtle card background tints (6% opacity) */
export const posCardBg: Record<Pos, string> = {
  GK: 'bg-emerald-500/[0.06]',
  DEF: 'bg-amber-500/[0.06]',
  MID: 'bg-sky-500/[0.06]',
  ATT: 'bg-rose-500/[0.06]',
};

/** Solid dots — ClubCard position breakdown, SquadOverview bars */
export const posDot: Record<Pos, string> = {
  GK: 'bg-emerald-400',
  DEF: 'bg-amber-400',
  MID: 'bg-sky-400',
  ATT: 'bg-rose-400',
};

/** Position filter pill colors (active state) */
export const posFilter: Record<Pos, { bg: string; border: string; text: string }> = {
  GK: { bg: 'bg-emerald-500/20', border: 'border-emerald-400', text: 'text-emerald-300' },
  DEF: { bg: 'bg-amber-500/20', border: 'border-amber-400', text: 'text-amber-300' },
  MID: { bg: 'bg-sky-500/20', border: 'border-sky-400', text: 'text-sky-300' },
  ATT: { bg: 'bg-rose-500/20', border: 'border-rose-400', text: 'text-rose-300' },
};

/** Card glow shadows (outer + inset top-light) */
export const posGlowShadows: Record<Pos, string> = {
  GK: '0 4px 24px rgba(16,185,129,0.20), inset 0 1px 0 rgba(16,185,129,0.10)',
  DEF: '0 4px 24px rgba(245,158,11,0.20), inset 0 1px 0 rgba(245,158,11,0.10)',
  MID: '0 4px 24px rgba(14,165,233,0.20), inset 0 1px 0 rgba(14,165,233,0.10)',
  ATT: '0 4px 24px rgba(244,63,94,0.20), inset 0 1px 0 rgba(244,63,94,0.10)',
};

/** Ring glow for player photo circles (TradingCard, detail views) */
export const posRingGlow: Record<Pos, string> = {
  GK: '0 0 24px rgba(16,185,129,0.25), 0 0 48px rgba(16,185,129,0.12)',
  DEF: '0 0 24px rgba(245,158,11,0.25), 0 0 48px rgba(245,158,11,0.12)',
  MID: '0 0 24px rgba(14,165,233,0.25), 0 0 48px rgba(14,165,233,0.12)',
  ATT: '0 0 24px rgba(244,63,94,0.25), 0 0 48px rgba(244,63,94,0.12)',
};

/** IPO Card frame — gradient bg + border class + glow shadow */
export const posCardFrame: Record<Pos, { border: string; glow: string; bg: string }> = {
  GK: {
    border: 'border-emerald-400/30',
    glow: '0 4px 20px rgba(16,185,129,0.15), inset 0 1px 0 rgba(16,185,129,0.08)',
    bg: 'from-emerald-500/[0.08] to-transparent',
  },
  DEF: {
    border: 'border-amber-400/30',
    glow: '0 4px 20px rgba(245,158,11,0.15), inset 0 1px 0 rgba(245,158,11,0.08)',
    bg: 'from-amber-500/[0.08] to-transparent',
  },
  MID: {
    border: 'border-sky-400/30',
    glow: '0 4px 20px rgba(14,165,233,0.15), inset 0 1px 0 rgba(14,165,233,0.08)',
    bg: 'from-sky-500/[0.08] to-transparent',
  },
  ATT: {
    border: 'border-rose-400/30',
    glow: '0 4px 20px rgba(244,63,94,0.15), inset 0 1px 0 rgba(244,63,94,0.08)',
    bg: 'from-rose-500/[0.08] to-transparent',
  },
};
