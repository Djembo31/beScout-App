/**
 * Orderbook-Anzeige-Helper — SSOT der Eigene-Gebot-Exclusion (Welle 1.6, Slice 416).
 *
 * Eigene Kaufgebote (`bids`) dürfen nicht als „höchste Nachfrage" / Best-Bid
 * angezeigt werden: man kann das eigene Gebot nicht selbst annehmen
 * (`accept_offer`-Guard: sender ≠ acceptor). Die Regel `sender_id !== userId`
 * war über mehrere Surfaces dupliziert (von-allem-N, errors-frontend S414/S415)
 * → hier zentralisiert, damit sie nicht erneut driftet.
 *
 * Pure (keine Server-Deps) → in jeder Client-Component importierbar.
 * Einheit: Rückgabe in **cents** (Caller macht `centsToBsd` fürs Display).
 *
 * Hinweis: Die ask-Seite (eigene Sell-Orders) nutzt das server-projizierte
 * boolean `PublicOrder.is_own` und bleibt bewusst inline (`!o.is_own`) — ein
 * boolean-Feld kann nicht „unterschiedlich gerechnet" werden, daher kein
 * Drift-Risiko und kein Helper nötig.
 */

/** Eigene Gebote raus. userId undefined (logged-out) → alle durchlassen. */
export function excludeOwnBids<T extends { sender_id: string }>(
  bids: T[],
  userId?: string,
): T[] {
  return userId ? bids.filter((b) => b.sender_id !== userId) : bids;
}

/** Höchstes FREMDES Gebot in cents, oder null wenn keins. */
export function bestForeignBidCents(
  bids: { price: number; sender_id: string }[],
  userId?: string,
): number | null {
  const foreign = excludeOwnBids(bids, userId);
  return foreign.length > 0 ? Math.max(...foreign.map((b) => b.price)) : null;
}
