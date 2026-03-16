/**
 * Founding Passes — Tier Definitions & Constants
 *
 * 4 Tiers: Fan → Scout → Pro → Founder
 * Each tier grants $SCOUT + migration bonus % for future $SCOUT conversion.
 */

import type { FoundingPassTier } from '@/types';

// ============================================
// TIER DEFINITIONS
// ============================================

export type FoundingPassTierDef = {
  tier: FoundingPassTier;
  name: string;
  priceEurCents: number;
  priceLabel: string;
  bcreditsCents: number;
  bcreditsLabel: string;
  migrationBonusPct: number;
  extras: string[];
  color: string;
  icon: string;
};

export const FOUNDING_PASS_TIERS: FoundingPassTierDef[] = [
  {
    tier: 'fan',
    name: 'Fan Pass',
    priceEurCents: 999,
    priceLabel: '9,99 €',
    bcreditsCents: 250_000,
    bcreditsLabel: '2.500',
    migrationBonusPct: 15,
    extras: ['Early Access', 'Fan-Badge'],
    color: 'sky',
    icon: 'ticket',
  },
  {
    tier: 'scout',
    name: 'Scout Pass',
    priceEurCents: 2999,
    priceLabel: '29,99 €',
    bcreditsCents: 1_000_000,
    bcreditsLabel: '10.000',
    migrationBonusPct: 25,
    extras: ['Early Access', 'Priority Queue', 'Rare Cosmetic'],
    color: 'emerald',
    icon: 'search',
  },
  {
    tier: 'pro',
    name: 'Pro Pass',
    priceEurCents: 7499,
    priceLabel: '74,99 €',
    bcreditsCents: 3_500_000,
    bcreditsLabel: '35.000',
    migrationBonusPct: 35,
    extras: ['Early Access', 'Priority Queue', 'Epic Cosmetic'],
    color: 'purple',
    icon: 'zap',
  },
  {
    tier: 'founder',
    name: 'Founder Pass',
    priceEurCents: 19999,
    priceLabel: '199,99 €',
    bcreditsCents: 10_000_000,
    bcreditsLabel: '100.000',
    migrationBonusPct: 50,
    extras: ['Early Access', 'Priority Queue', 'VIP-Zugang', 'Legendary Cosmetic', '"Gründer" Titel'],
    color: 'gold',
    icon: 'crown',
  },
];

// ============================================
// CONSTANTS
// ============================================

/** Welcome bonus in cents (1.000 Credits) */
export const WELCOME_BONUS_CENTS = 100_000;

/** Label for users without a founding pass */
export const FREE_USER_LABEL = 'Free';

// ============================================
// HELPERS
// ============================================

const TIER_ORDER: Record<FoundingPassTier, number> = {
  fan: 1,
  scout: 2,
  pro: 3,
  founder: 4,
};

/** Compare two tiers: returns positive if a > b */
export function compareTiers(a: FoundingPassTier, b: FoundingPassTier): number {
  return TIER_ORDER[a] - TIER_ORDER[b];
}

/** Get tier definition by tier id */
export function getTierDef(tier: FoundingPassTier): FoundingPassTierDef {
  return FOUNDING_PASS_TIERS.find(t => t.tier === tier) ?? FOUNDING_PASS_TIERS[0];
}
