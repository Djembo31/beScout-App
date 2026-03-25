import type React from 'react';

/** Unified 6-tier score color system — SINGLE SOURCE OF TRUTH.
 *  Used for ALL score displays: L5, L15, GW scores, match ratings, fantasy.
 *  Scale: 0-100 (with >100 bonus tier for fantasy captain multipliers). */

export interface ScoreStyle {
  hex: string;
  bg: string;
  text: string;
  label: string;
  glow?: string;
}

const TIERS: { min: number; hex: string; bg: string; text: string; label: string; glow?: string }[] = [
  { min: 100, hex: '#FFD700', bg: 'bg-gold',            text: 'text-gold',         label: 'Bonus',             glow: '0 0 10px rgba(255,215,0,0.5)' },
  { min: 90,  hex: '#374DF5', bg: 'bg-[#374DF5]',       text: 'text-[#374DF5]',    label: 'Elite',             glow: '0 0 10px rgba(55,77,245,0.5)' },
  { min: 80,  hex: '#00ADC4', bg: 'bg-[#00ADC4]',       text: 'text-[#00ADC4]',    label: 'Sehr gut' },
  { min: 70,  hex: '#00C424', bg: 'bg-[#00C424]',       text: 'text-[#00C424]',    label: 'Gut' },
  { min: 60,  hex: '#D9AF00', bg: 'bg-[#D9AF00]',       text: 'text-[#D9AF00]',    label: 'Durchschnitt' },
  { min: 45,  hex: '#ED7E07', bg: 'bg-[#ED7E07]',       text: 'text-[#ED7E07]',    label: 'Unterdurchschnitt' },
  { min: 1,   hex: '#DC0C00', bg: 'bg-[#DC0C00]',       text: 'text-[#DC0C00]',    label: 'Schwach' },
];

const NEUTRAL: ScoreStyle = { hex: '#555555', bg: 'bg-white/5', text: 'text-white/50', label: 'N/A' };

export function getScoreStyle(score: number | null | undefined): ScoreStyle {
  if (score == null || score <= 0) return NEUTRAL;
  for (const tier of TIERS) {
    if (score >= tier.min) return tier;
  }
  return NEUTRAL;
}

/** Convenience: hex color for inline styles */
export const getScoreHex = (score: number | null | undefined): string => getScoreStyle(score).hex;

/** Convenience: Tailwind bg class */
export const getScoreBg = (score: number | null | undefined): string => getScoreStyle(score).bg;

/** Convenience: Tailwind text class */
export const getScoreTextClass = (score: number | null | undefined): string => getScoreStyle(score).text;

/** Convenience: React.CSSProperties for badge backgrounds (replaces ratingHeatStyle) */
export const getScoreBadgeStyle = (score: number | null | undefined): React.CSSProperties => {
  const s = getScoreStyle(score);
  return {
    background: s.hex,
    color: '#fff',
    ...(s.glow ? { textShadow: s.glow } : {}),
  };
};
