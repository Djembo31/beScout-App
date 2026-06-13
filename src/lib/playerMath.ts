/**
 * Shared player-math utilities.
 *
 * Slice 052: Extracted from PlayerKPIs/PlayerRow/WatchlistView/useMarketData
 * to eliminate 4 duplicated floor-price calculations.
 */

import type { Player } from '@/types';

/**
 * Liefert den Floor-Preis eines Players.
 *
 * Slice 303 (S7 Floor-Source-of-Truth): EINE Quelle = `players.floor_price`
 * (via `prices.floor`). Die DB-RPC `recalc_floor_price` pflegt diesen Wert nach
 * JEDEM Trade UND jeder Sell-Order-Platzierung/-Stornierung mit der Kanon-Formel
 * `LEAST(MIN(non-expired open sell), aktive IPO) → last_price>0 → keep`.
 * Kein Client-seitiger listings/orders-Recompute mehr (war Divergenz-Quelle:
 * 5-6 abweichende Floor-Berechnungen, keine replizierte die DB-Formel).
 */
export function computePlayerFloor(
  player: Pick<Player, 'prices'>
): number {
  return player.prices.floor ?? 0;
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
