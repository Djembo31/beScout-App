/**
 * Slice 197a — Form-L5-Filter universal helper.
 *
 * Shared filter logic for the Form-L5 pill-group (0/45+/55+/65+) used in
 * /market, /manager Kader-Tab, and /watchlist. Per-Page-State (no global store)
 * because Power-User-Standard erwartet unterschiedliche Filter pro Page-Kontext
 * (Spec 197a Edge-Case 1).
 *
 * Single source of truth for the threshold values + label-mapping. Existing
 * MarketFilters previously inlined `L5_VALUES = [0, 45, 55, 65]` and
 * `L5_LABELS = ['sortAll', '45+', '55+', '65+']` — diese werden auf diesen
 * Helper migriert.
 */

export const FORM_L5_VALUES = [0, 45, 55, 65] as const;
export type FormL5Threshold = (typeof FORM_L5_VALUES)[number];

/**
 * Type guard: ensures `value` is a valid Form-L5 threshold.
 */
export function isFormL5Threshold(value: number): value is FormL5Threshold {
  return (FORM_L5_VALUES as readonly number[]).includes(value);
}

/**
 * Apply Form-L5 filter to a list of items.
 *
 * Generic over `T` so it works with any item shape — caller provides a
 * value-extractor (`getValue`). Items whose extracted L5-value is `null` /
 * `undefined` are treated as `0` and filtered out for any threshold > 0
 * (consistent with existing MarketFilters semantics: missing data = excluded).
 *
 * @param items - List of items to filter
 * @param threshold - Form-L5 threshold (0 = all, 45+/55+/65+ = filter)
 * @param getValue - Extracts the L5-value from an item; nullable accepted
 * @returns Filtered list (same array reference if threshold === 0)
 */
export function applyFormL5Filter<T>(
  items: T[],
  threshold: FormL5Threshold,
  getValue: (item: T) => number | null | undefined,
): T[] {
  if (threshold === 0) return items;
  return items.filter((item) => (getValue(item) ?? 0) >= threshold);
}

/**
 * Returns the label for a Form-L5 threshold.
 *
 * Returns the i18n-key literal for `0` (caller resolves via `t('common.all')`)
 * or the static "{n}+" string for non-zero values.
 *
 * Convention: callers use `value === 0 ? t('common.all') : getFormL5Label(value)`
 * to keep i18n boundary at the call site.
 */
export function getFormL5Label(value: FormL5Threshold): string {
  if (value === 0) return 'all';
  return `${value}+`;
}
