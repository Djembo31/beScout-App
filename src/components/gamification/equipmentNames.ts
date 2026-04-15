import type { DbEquipmentDefinition } from '@/types';

/**
 * Resolve an equipment-definition name for the given locale, with DE fallback
 * when the TR column is empty (robust: analog J7-AR-54 `resolveMissionTitle`).
 *
 * Consumers pass `useLocale()` from next-intl.
 *
 * J11F-01 (FIX-01): Previously 9+ call sites rendered `def.name_de` directly —
 * TR users saw "Feuerschuss/Bananen-Flanke/Eiserne Mauer/..." despite `name_tr`
 * being populated in `equipment_definitions`. This helper is the single source
 * of truth.
 */
export function resolveEquipmentName(
  def: Pick<DbEquipmentDefinition, 'name_de' | 'name_tr'>,
  locale: string,
): string {
  if (locale === 'tr' && def.name_tr) return def.name_tr;
  return def.name_de;
}

/**
 * Resolve an equipment-definition description for the given locale, with DE
 * fallback when the TR column is NULL. Description is optional so both sides
 * may be null → returns null in that case (caller decides whether to render).
 */
export function resolveEquipmentDescription(
  def: Pick<DbEquipmentDefinition, 'description_de' | 'description_tr'>,
  locale: string,
): string | null {
  if (locale === 'tr' && def.description_tr) return def.description_tr;
  return def.description_de;
}
