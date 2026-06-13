import type { Listing } from '@/types';

/**
 * Resolves the cents-denominated price for the BuyConfirmModal `priceCents` prop.
 *
 * Background (Slice 033, P0 Money-Display-Drift):
 *   `prices.floor` is BSD/CR (filled via `centsToBsd(floor_price)` in dbToPlayer)
 *   but `BuyConfirmModal` expects `priceCents` in cents. Without `* 100`, the modal
 *   displayed prices 100x too low while the RPC would have charged the correct
 *   (DB-cents) amount → silent user-loss. Centralised here so the contract is
 *   covered by unit tests instead of inline ternaries.
 *
 * Slice 303 (S7 Floor-Source-of-Truth):
 *   Non-IPO buy-price = EINE Quelle `prices.floor` (= players.floor_price, DB-Canon
 *   via recalc_floor_price = MIN(non-expired open sell) → ipo → last_price). Der
 *   frühere `Math.min(listings)`-Branch war eine der 5-6 divergierenden Floor-
 *   Berechnungen (S7-Registry #1) und ist entfernt. `listings` bleibt im Interface
 *   für Aufruf-Kompatibilität, wird aber nicht mehr für den Preis genutzt.
 *
 * Source-of-truth per source:
 *   - `ipo.price`      → already cents (DB column `ipos.price`)
 *   - `prices.floor`   → BSD (display units)  → multiply by 100
 *
 * Returns 0 if nothing resolvable.
 */
export interface ResolveBuyPriceArgs {
  isIpo: boolean;
  ipoPriceCents?: number;
  /** @deprecated Slice 303 — nicht mehr für Preis genutzt (Floor = prices.floor). */
  listings?: Listing[];
  floorBsd?: number;
}

export function resolveBuyPriceCents({
  isIpo,
  ipoPriceCents,
  floorBsd,
}: ResolveBuyPriceArgs): number {
  if (isIpo && typeof ipoPriceCents === 'number') return ipoPriceCents;
  return Math.round((floorBsd ?? 0) * 100);
}
