// ============================================
// Fan Rank Feature Gates — Tier-based unlocks
// ============================================

import type { FanRankTier } from '@/types';

export type FanRankPerk = {
  tier: FanRankTier;
  labelDe: string;
  labelTr: string;
  icon: string;
};

/** Ordered from lowest to highest tier */
const TIER_ORDER: FanRankTier[] = [
  'zuschauer', 'stammgast', 'ultra', 'legende', 'ehrenmitglied', 'vereinsikone',
];

/** Perks unlocked at each tier */
export const FAN_RANK_PERKS: FanRankPerk[] = [
  // Stammgast (Silver)
  { tier: 'stammgast', labelDe: 'Custom Profil-Titel', labelTr: 'Özel profil unvanı', icon: '🏷️' },
  { tier: 'stammgast', labelDe: '2 Mystery Boxes pro Woche', labelTr: 'Haftada 2 gizemli kutu', icon: '🎁' },
  // Ultra (Gold)
  { tier: 'ultra', labelDe: 'Early Access auf Events (1h)', labelTr: 'Etkinliklere erken erişim (1s)', icon: '⏰' },
  { tier: 'ultra', labelDe: 'Research-Vorschau', labelTr: 'Araştırma önizleme', icon: '🔍' },
  // Legende (Diamond)
  { tier: 'legende', labelDe: 'Priorität bei Bounties', labelTr: 'Ödül görevlerinde öncelik', icon: '🎯' },
  { tier: 'legende', labelDe: 'Exklusive Cosmetics', labelTr: 'Özel kozmetikler', icon: '✨' },
  // Ehrenmitglied
  { tier: 'ehrenmitglied', labelDe: 'Direkt-Nachricht an Club', labelTr: 'Kulübe doğrudan mesaj', icon: '💬' },
  { tier: 'ehrenmitglied', labelDe: 'Beta-Features', labelTr: 'Beta özellikleri', icon: '🧪' },
  // Vereinsikone
  { tier: 'vereinsikone', labelDe: 'VIP-Zugang zu Club-Events', labelTr: 'Kulüp etkinliklerine VIP erişim', icon: '👑' },
  { tier: 'vereinsikone', labelDe: 'Legendärer Club-Rahmen', labelTr: 'Efsanevi kulüp çerçevesi', icon: '🖼️' },
];

/** Get tier index (0-based) for comparison */
function tierIndex(tier: FanRankTier): number {
  return TIER_ORDER.indexOf(tier);
}

/** Check if user's tier meets or exceeds required tier */
export function meetsRankTier(userTier: FanRankTier, requiredTier: FanRankTier): boolean {
  return tierIndex(userTier) >= tierIndex(requiredTier);
}

/** Get all perks unlocked at user's current tier */
export function getUnlockedPerks(userTier: FanRankTier): FanRankPerk[] {
  return FAN_RANK_PERKS.filter(p => meetsRankTier(userTier, p.tier));
}

/** Get perks at next tier (motivation to rank up) */
export function getNextTierPerks(userTier: FanRankTier): { tier: FanRankTier; perks: FanRankPerk[] } | null {
  const idx = tierIndex(userTier);
  if (idx >= TIER_ORDER.length - 1) return null;
  const nextTier = TIER_ORDER[idx + 1];
  return {
    tier: nextTier,
    perks: FAN_RANK_PERKS.filter(p => p.tier === nextTier),
  };
}
