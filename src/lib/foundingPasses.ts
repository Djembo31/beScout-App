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
    bcreditsCents: 100_000,
    bcreditsLabel: '1.000',
    migrationBonusPct: 15,
    extras: ['founding.extraAccess', 'founding.extraBadge'],
    color: 'sky',
    icon: 'ticket',
  },
  {
    tier: 'scout',
    name: 'Scout Pass',
    priceEurCents: 2999,
    priceLabel: '29,99 €',
    bcreditsCents: 500_000,
    bcreditsLabel: '5.000',
    migrationBonusPct: 25,
    extras: ['founding.extraAccess', 'founding.extraBadge', 'founding.extraIpoEarly'],
    color: 'emerald',
    icon: 'search',
  },
  {
    tier: 'pro',
    name: 'Pro Pass',
    priceEurCents: 7499,
    priceLabel: '74,99 €',
    bcreditsCents: 2_000_000,
    bcreditsLabel: '20.000',
    migrationBonusPct: 35,
    extras: ['founding.extraAccess', 'founding.extraBadge', 'founding.extraIpoEarly', 'founding.extraBetaFeatures', 'founding.extraPrivateChannel'],
    color: 'purple',
    icon: 'zap',
  },
  {
    tier: 'founder',
    name: 'Founder Pass',
    priceEurCents: 19999,
    priceLabel: '199,99 €',
    bcreditsCents: 5_000_000,
    bcreditsLabel: '50.000',
    migrationBonusPct: 50,
    extras: ['founding.extraAccess', 'founding.extraBadge', 'founding.extraIpoEarly', 'founding.extraBetaFeatures', 'founding.extraPrivateChannel', 'founding.extraGenesisBadge', 'founding.extraDirectLine', 'founding.extraFoundersWall'],
    color: 'gold',
    icon: 'crown',
  },
];

/** Tier limits (total passes per tier) */
export const FOUNDING_PASS_LIMITS: Record<FoundingPassTier, number> = {
  fan: 5_000,
  scout: 3_000,
  pro: 1_500,
  founder: 500,
};

/** Total founding passes limit */
export const FOUNDING_PASS_TOTAL_LIMIT = 10_000;

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
