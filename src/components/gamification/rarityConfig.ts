import type { MysteryBoxRarity } from '@/types';

/**
 * Visual configuration for each Mystery Box rarity tier.
 * Used by MysteryBoxModal for animation intensity, colors, and particle counts.
 */

export interface RarityVisualConfig {
  label_de: string;
  label_tr: string;
  /** Primary color (hex) for particles and glow */
  color: string;
  /** CSS glow color with alpha for box-shadow */
  glowColor: string;
  /** Tailwind bg class */
  bgClass: string;
  /** Tailwind text class */
  textClass: string;
  /** Tailwind border class */
  borderClass: string;
  /** Optional glow shadow class */
  glowClass: string;
  /** Number of particles in burst */
  particleCount: number;
  /** Celebration phase duration in ms */
  celebrationDuration: number;
  /** Full-screen white flash on reveal */
  screenFlash: boolean;
  /** Haptic vibration on reveal (ms) */
  hapticMs: number;
}

export const RARITY_CONFIG: Record<MysteryBoxRarity, RarityVisualConfig> = {
  common: {
    label_de: 'Gewoehnlich',
    label_tr: 'Siradan',
    color: '#9CA3AF',       // gray-400
    glowColor: 'rgba(156, 163, 175, 0.25)',
    bgClass: 'bg-white/[0.06]',
    textClass: 'text-white/60',
    borderClass: 'border-white/10',
    glowClass: '',
    particleCount: 8,
    celebrationDuration: 800,
    screenFlash: false,
    hapticMs: 0,
  },
  // Legacy-safe entry for 3 pre-type-update rows in `mystery_box_results` (AR-46).
  // Green matches existing CosmeticRarity 'uncommon' convention (CosmeticTitle +
  // CosmeticsSection). Between common (grey) and rare (sky) on the rarity ladder.
  uncommon: {
    label_de: 'Ungewoehnlich',
    label_tr: 'Siradisi',
    color: '#4ADE80',       // green-400 (matches CosmeticRarity.uncommon)
    glowColor: 'rgba(74, 222, 128, 0.28)',
    bgClass: 'bg-green-500/15',
    textClass: 'text-green-400',
    borderClass: 'border-green-500/25',
    glowClass: 'shadow-[0_0_10px_rgba(74,222,128,0.22)]',
    particleCount: 14,
    celebrationDuration: 900,
    screenFlash: false,
    hapticMs: 15,
  },
  rare: {
    label_de: 'Selten',
    label_tr: 'Nadir',
    color: '#38BDF8',       // sky-400
    glowColor: 'rgba(56, 189, 248, 0.3)',
    bgClass: 'bg-sky-500/15',
    textClass: 'text-sky-400',
    borderClass: 'border-sky-500/25',
    glowClass: 'shadow-[0_0_12px_rgba(56,189,248,0.25)]',
    particleCount: 20,
    celebrationDuration: 1000,
    screenFlash: false,
    hapticMs: 30,
  },
  epic: {
    label_de: 'Episch',
    label_tr: 'Epik',
    color: '#A855F7',       // purple-400
    glowColor: 'rgba(168, 85, 247, 0.35)',
    bgClass: 'bg-purple-500/15',
    textClass: 'text-purple-400',
    borderClass: 'border-purple-500/25',
    glowClass: 'shadow-[0_0_16px_rgba(168,85,247,0.3)]',
    particleCount: 35,
    celebrationDuration: 1200,
    screenFlash: false,
    hapticMs: 50,
  },
  legendary: {
    label_de: 'Legendaer',
    label_tr: 'Efsanevi',
    color: '#FFD700',       // gold
    glowColor: 'rgba(255, 215, 0, 0.4)',
    bgClass: 'bg-gold/15',
    textClass: 'text-gold',
    borderClass: 'border-gold/30',
    glowClass: 'shadow-[0_0_24px_rgba(255,215,0,0.35)]',
    particleCount: 50,
    celebrationDuration: 1500,
    screenFlash: true,
    hapticMs: 80,
  },
  mythic: {
    label_de: 'Mythisch',
    label_tr: 'Mitolojik',
    color: '#FFD700',       // gold (cycles to rainbow via animation)
    glowColor: 'rgba(255, 215, 0, 0.5)',
    bgClass: 'bg-gradient-to-r from-gold/20 via-purple-500/20 to-sky-500/20',
    textClass: 'text-gold',
    borderClass: 'border-gold/40',
    glowClass: 'shadow-[0_0_32px_rgba(255,215,0,0.45)]',
    particleCount: 50,
    celebrationDuration: 2000,
    screenFlash: true,
    hapticMs: 120,
  },
};

/** Position colors for equipment display (matches existing design tokens) */
export const EQUIPMENT_POSITION_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  ATT: { text: 'text-rose-400', bg: 'bg-rose-500/15', border: 'border-rose-500/25' },
  MID: { text: 'text-sky-400', bg: 'bg-sky-500/15', border: 'border-sky-500/25' },
  DEF: { text: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/25' },
  GK:  { text: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/25' },
  ALL: { text: 'text-gold', bg: 'bg-gold/15', border: 'border-gold/25' },
};
