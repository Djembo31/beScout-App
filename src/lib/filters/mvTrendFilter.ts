/**
 * Slice 197d — MV-Trend-Filter universal helper.
 *
 * Shared filter logic for the MV-Trend pill-group (all/rising/stable/falling) used in
 * /market (Marktplatz Filter) and /manager Kader-Tab. Per-Page-State pro Page-Kontext
 * (Power-User-Standard analog 197a Form-L5).
 *
 * Backend-Datenquelle: `players.mv_trend_7d` ENUM (`rising` | `stable` | `falling` | NULL)
 * — siehe Backend-Track Slice 197d. NULL bedeutet: Daten fehlen (z. B. neu importierter
 * Spieler, weniger als 7 Tage MV-Historie). NULL-Items werden bei aktivem Filter (!= 'all')
 * ausgeblendet — analog Form-L5 Semantics.
 */

export type MvTrendValue = 'all' | 'rising' | 'stable' | 'falling';
export type MvTrend = 'rising' | 'stable' | 'falling';

export const MV_TREND_VALUES: readonly MvTrendValue[] = [
  'all',
  'rising',
  'stable',
  'falling',
] as const;

/**
 * Type guard: ensures value is a valid MvTrendValue (incl. 'all').
 */
export function isMvTrendValue(value: string): value is MvTrendValue {
  return (MV_TREND_VALUES as readonly string[]).includes(value);
}

/**
 * Apply MV-Trend filter to a list of items.
 *
 * Generic over `T` — caller supplies `getValue` to extract the trend from item shape.
 * NULL/undefined extracted values are filtered out for any non-'all' filter (consistent
 * with Form-L5 semantics: missing data = excluded when filter is active).
 *
 * @param items - List of items to filter
 * @param trend - MV-Trend filter ('all' = no-op, 'rising'/'stable'/'falling' = match)
 * @param getValue - Extracts the trend from an item; nullable accepted
 * @returns Filtered list (same array reference if trend === 'all')
 */
export function applyMvTrendFilter<T>(
  items: T[],
  trend: MvTrendValue,
  getValue: (item: T) => MvTrend | null | undefined,
): T[] {
  if (trend === 'all') return items;
  return items.filter((item) => getValue(item) === trend);
}

/**
 * Returns the i18n-key segment for an MV-Trend value.
 *
 * For 'all' returns the literal 'all' (caller resolves via `t('common.all')`).
 * For 'rising'/'stable'/'falling' returns the value itself (caller resolves via
 * `t('mvTrend.rising')` etc.). Convention parallels `getFormL5Label`.
 */
export function getMvTrendLabel(trend: MvTrendValue): string {
  return trend;
}
