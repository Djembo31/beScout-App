/**
 * Geofencing Infrastructure (ADR-028)
 *
 * 5-Tier system matching business.md:
 * TIER_FULL (Rest EU) | TIER_CASP (EU strict) | TIER_FREE (DE/FR/AT/UK) |
 * TIER_RESTRICTED (TR) | TIER_BLOCKED (USA/CN/OFAC)
 *
 * Country detection: Vercel x-vercel-ip-country header → tier mapping.
 * Feature flag OFF = no restrictions (development default).
 */

export type GeoTier = 'full' | 'casp' | 'free' | 'restricted' | 'blocked';
export type GeoFeature = 'dpc_trading' | 'free_fantasy' | 'paid_fantasy' | 'scout_reports' | 'paid_research' | 'content';

// Legacy alias for existing code
export type GeoRegion = 'turkey' | 'eu_strict' | 'eu_rest' | 'global';

export const GEO_TIERS: { value: GeoTier; label: string }[] = [
  { value: 'full', label: 'Full Access (EU)' },
  { value: 'casp', label: 'CASP (EU strict)' },
  { value: 'free', label: 'Free Only (DE/FR/AT/UK)' },
  { value: 'restricted', label: 'Restricted (TR)' },
  { value: 'blocked', label: 'Blocked (USA/CN/OFAC)' },
];

// Legacy export for existing admin UI
export const GEO_REGIONS: { value: GeoRegion; labelKey: string }[] = [
  { value: 'turkey', labelKey: 'geo.region.turkey' },
  { value: 'eu_strict', labelKey: 'geo.region.eu_strict' },
  { value: 'eu_rest', labelKey: 'geo.region.eu_rest' },
  { value: 'global', labelKey: 'geo.region.global' },
];

// ============================================
// Country → Tier Mapping
// ============================================

const BLOCKED_COUNTRIES = new Set([
  'US', 'CN', 'KP', 'IR', 'SY', 'CU', 'VE', 'MM', 'RU', 'BY',
]);

const FREE_COUNTRIES = new Set(['DE', 'FR', 'AT', 'GB']);

const RESTRICTED_COUNTRIES = new Set(['TR']);

const CASP_COUNTRIES = new Set([
  'NL', 'BE', 'IT', 'ES', 'SE', 'NO', 'FI', 'DK', 'PL', 'CZ',
  'SK', 'HU', 'RO', 'BG', 'HR', 'SI', 'LT', 'LV', 'EE',
]);

export function countryToTier(countryCode: string | null | undefined): GeoTier | null {
  if (!countryCode) return null;
  const cc = countryCode.toUpperCase();
  if (BLOCKED_COUNTRIES.has(cc)) return 'blocked';
  if (RESTRICTED_COUNTRIES.has(cc)) return 'restricted';
  if (FREE_COUNTRIES.has(cc)) return 'free';
  if (CASP_COUNTRIES.has(cc)) return 'casp';
  return 'full';
}

// ============================================
// Feature × Tier Matrix
// ============================================

/** What each tier can access */
const TIER_FEATURES: Record<GeoFeature, Record<GeoTier, boolean>> = {
  content:        { full: true,  casp: true,  free: true,  restricted: true,  blocked: false },
  free_fantasy:   { full: true,  casp: true,  free: true,  restricted: true,  blocked: false },
  dpc_trading:    { full: true,  casp: true,  free: false, restricted: false, blocked: false },
  paid_fantasy:   { full: true,  casp: false, free: false, restricted: false, blocked: false },
  scout_reports:  { full: true,  casp: true,  free: true,  restricted: true,  blocked: false },
  paid_research:  { full: true,  casp: true,  free: true,  restricted: true,  blocked: false },
};

// Legacy matrix for existing useRegionGuard hook
const REGION_FEATURES: Record<string, Record<GeoRegion, boolean>> = {
  dpc_trading:   { turkey: false, eu_strict: true, eu_rest: true, global: true },
  free_fantasy:  { turkey: true,  eu_strict: true, eu_rest: true, global: true },
  prize_league:  { turkey: false, eu_strict: false, eu_rest: true, global: true },
  scout_reports: { turkey: true,  eu_strict: true, eu_rest: true, global: true },
  paid_research: { turkey: true,  eu_strict: true, eu_rest: true, global: true },
};

export const GEOFENCING_ENABLED = process.env.NEXT_PUBLIC_GEOFENCING_ENABLED === 'true';

/**
 * Check if a feature is allowed for the given tier.
 */
export function isFeatureAllowedForTier(feature: GeoFeature, tier: GeoTier | null): boolean {
  if (!GEOFENCING_ENABLED) return true;
  if (!tier) return true;
  return TIER_FEATURES[feature]?.[tier] ?? true;
}

/**
 * Check if a feature is allowed for the given region (legacy).
 * - If geofencing is OFF → always true
 * - If region is null/undefined → always true (unset = no restriction)
 * - Otherwise → check static matrix
 */
export function isFeatureAllowed(feature: GeoFeature, region: string | null | undefined): boolean {
  if (!GEOFENCING_ENABLED) return true;
  if (!region) return true;

  const featureMap = REGION_FEATURES[feature];
  if (!featureMap) return true;

  const allowed = featureMap[region as GeoRegion];
  return allowed ?? true;
}

/**
 * Check if a country is completely blocked.
 */
export function isCountryBlocked(countryCode: string | null | undefined): boolean {
  if (!GEOFENCING_ENABLED) return false;
  if (!countryCode) return false;
  return BLOCKED_COUNTRIES.has(countryCode.toUpperCase());
}
