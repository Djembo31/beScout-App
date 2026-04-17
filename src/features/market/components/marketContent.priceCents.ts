import type { Listing } from '@/types';

/**
 * Resolves the cents-denominated price for the BuyConfirmModal `priceCents` prop.
 *
 * Background (Slice 033, P0 Money-Display-Drift):
 *   `Listing.price` is BSD/CR (filled via `centsToBsd(o.price)` in enriched.ts) but
 *   `BuyConfirmModal` expects `priceCents` in cents. Without `* 100`, the modal
 *   displayed prices 100x too low while the RPC would have charged the correct
 *   (DB-cents) amount → silent user-loss. Centralised here so the contract is
 *   covered by unit tests instead of inline ternaries.
 *
 * Source-of-truth per source:
 *   - `ipo.price`      → already cents (DB column `ipos.price`)
 *   - `Listing.price`  → BSD (display units)  → multiply by 100
 *   - `prices.floor`   → BSD (display units)  → multiply by 100
 *
 * Order matters: when listings exist they are the live-floor; the enriched
 * `prices.floor` is the secondary fallback (matches the chain in
 * `useMarketData.ts:floorMap`). Returns 0 if nothing resolvable.
 */
export interface ResolveBuyPriceArgs {
  isIpo: boolean;
  ipoPriceCents?: number;
  listings: Listing[];
  floorBsd?: number;
}

export function resolveBuyPriceCents({
  isIpo,
  ipoPriceCents,
  listings,
  floorBsd,
}: ResolveBuyPriceArgs): number {
  if (isIpo && typeof ipoPriceCents === 'number') return ipoPriceCents;
  if (listings.length > 0) {
    return Math.round(Math.min(...listings.map((l) => l.price)) * 100);
  }
  return Math.round((floorBsd ?? 0) * 100);
}
