/**
 * Geofencing Infrastructure
 *
 * Region-based feature gating. Global OFF by default (feature flag).
 * When enabled, checks profile.region against geofencing_config matrix.
 * Unset region (null) = no restriction (all features allowed).
 */

export type GeoRegion = 'turkey' | 'eu_strict' | 'eu_rest' | 'global';
export type GeoFeature = 'dpc_trading' | 'free_fantasy' | 'prize_league' | 'scout_reports' | 'paid_research';

export const GEO_REGIONS: { value: GeoRegion; labelKey: string }[] = [
  { value: 'turkey', labelKey: 'geo.region.turkey' },
  { value: 'eu_strict', labelKey: 'geo.region.eu_strict' },
  { value: 'eu_rest', labelKey: 'geo.region.eu_rest' },
  { value: 'global', labelKey: 'geo.region.global' },
];

/** Static fallback matrix (used when DB not loaded) */
const REGION_FEATURES: Record<GeoFeature, Record<GeoRegion, boolean>> = {
  dpc_trading:   { turkey: true, eu_strict: false, eu_rest: true, global: true },
  free_fantasy:  { turkey: true, eu_strict: true,  eu_rest: true, global: true },
  prize_league:  { turkey: true, eu_strict: false, eu_rest: true, global: true },
  scout_reports: { turkey: true, eu_strict: true,  eu_rest: true, global: true },
  paid_research: { turkey: true, eu_strict: true,  eu_rest: true, global: true },
};

export const GEOFENCING_ENABLED = process.env.NEXT_PUBLIC_GEOFENCING_ENABLED === 'true';

/**
 * Check if a feature is allowed for the given region.
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
