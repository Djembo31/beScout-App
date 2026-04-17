/**
 * Shared player-math utilities.
 *
 * Slice 052: Extracted from PlayerKPIs/PlayerRow/WatchlistView/useMarketData
 * to eliminate 4 duplicated floor-price calculations.
 */

import type { Player } from '@/types';

/**
 * Berechnet den Floor-Preis eines Players.
 * Fallback-Chain: aktuellste Listings.min → prices.floor → prices.referencePrice → 0
 */
export function computePlayerFloor(
  player: Pick<Player, 'listings' | 'prices'>
): number {
  if (player.listings && player.listings.length > 0) {
    return Math.min(...player.listings.map((l) => l.price));
  }
  return player.prices.floor ?? player.prices.referencePrice ?? 0;
}

/**
 * Berechnet PnL (Profit und Loss) + PnL-Prozent fuer ein Holding.
 * @param floor Aktueller Floor-Preis des Players
 * @param holding Holding-Daten mit avgBuyPriceBsd + quantity
 * @returns { pnl, pnlPct, up } — pnl in cents, pnlPct als Prozent (z.B. 15.3), up=pnl>=0
 */
export function computeHoldingPnL(
  floor: number,
  holding: { avgBuyPriceBsd: number; quantity: number }
): { pnl: number; pnlPct: number; up: boolean } {
  const pnl = (floor - holding.avgBuyPriceBsd) * holding.quantity;
  const pnlPct =
    holding.avgBuyPriceBsd > 0
      ? ((floor - holding.avgBuyPriceBsd) / holding.avgBuyPriceBsd) * 100
      : 0;
  return { pnl, pnlPct, up: pnl >= 0 };
}
