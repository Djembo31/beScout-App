/**
 * Chip System — Constants & Helpers (Gamification v5 Phase C)
 *
 * 4 chip types with ticket costs, season limits, and i18n labels.
 * Season = football season July-June (e.g. '2025-2026').
 */

import type { ChipType, ChipDefinition } from '@/types';

// ============================================
// CHIP DEFINITIONS
// ============================================

export const CHIP_DEFINITIONS: ChipDefinition[] = [
  {
    type: 'triple_captain',
    name_de: 'Triple Captain',
    name_tr: 'Uclu Kaptan',
    cost_tickets: 15,
    season_limit: 1,
    description_de: 'Dein Kapitaen erzielt 3x Punkte statt 1.5x fuer diesen Spieltag.',
    description_tr: 'Kaptanin bu hafta 1.5x yerine 3x puan kazanir.',
    icon: 'crown',
  },
  {
    type: 'synergy_surge',
    name_de: 'Synergie-Boost',
    name_tr: 'Sinerji Patlamasi',
    cost_tickets: 10,
    season_limit: 2,
    description_de: 'Alle Synergie-Boni werden verdoppelt fuer diesen Spieltag.',
    description_tr: 'Bu hafta tum sinerji bonuslari iki katina cikar.',
    icon: 'zap',
  },
  {
    type: 'second_chance',
    name_de: 'Zweite Chance',
    name_tr: 'Ikinci Sans',
    cost_tickets: 10,
    season_limit: 2,
    description_de: 'Dein schlechtester Spieler wird durch den besten Bankspieler ersetzt.',
    description_tr: 'En kotu oyuncun yedekteki en iyi oyuncuyla degistirilir.',
    icon: 'refresh-cw',
  },
  {
    type: 'wildcard',
    name_de: 'Wildcard',
    name_tr: 'Joker',
    cost_tickets: 5,
    season_limit: 1,
    description_de: 'Du kannst dein gesamtes Lineup nach dem Lock-Zeitpunkt nochmal aendern.',
    description_tr: 'Kilit suresinden sonra tum kadromu degistirebilirsin.',
    icon: 'sparkles',
  },
];

// ============================================
// QUICK LOOKUPS
// ============================================

/** Ticket cost per chip type */
export const CHIP_COSTS: Record<ChipType, number> = {
  triple_captain: 15,
  synergy_surge: 10,
  second_chance: 10,
  wildcard: 5,
};

/** Max uses per season per chip type */
export const CHIP_SEASON_LIMITS: Record<ChipType, number> = {
  triple_captain: 1,
  synergy_surge: 2,
  second_chance: 2,
  wildcard: 1,
};

/** Get full chip definition by type */
export function getChipDef(type: ChipType): ChipDefinition {
  const def = CHIP_DEFINITIONS.find(c => c.type === type);
  if (!def) throw new Error(`Unknown chip type: ${type}`);
  return def;
}

/**
 * Get current football season string (July-June).
 * e.g. in March 2026 → '2025-2026', in August 2026 → '2026-2027'
 */
export function getCurrentSeason(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed: 0=Jan, 6=Jul

  // Football season starts in July (month index 6)
  if (month >= 6) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}
