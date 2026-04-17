-- =============================================================================
-- Slice 012 — Zero-Qty Holding Cleanup (2026-04-17)
--
-- Deletes any holdings row with quantity = 0. In the live pilot DB, one
-- orphan exists (jarvisqa user, player Livan Burcu, quantity=0,
-- avg_buy_price=10000) — a residue of a sell-all transaction where the
-- trading RPC used `UPDATE holdings SET quantity = quantity - p_qty`
-- instead of DELETE-when-zero.
--
-- This migration is a one-shot data hygiene step. INV-08 + EDGE-17 failed
-- because they assert `holdings.quantity > 0` for every row.
--
-- NOT in this migration (CEO-Scope, separate slice):
--   - Changing the trading RPCs (buy_player_sc, accept_offer,
--     buy_from_order, buy_from_ipo) to DELETE rows that would hit
--     quantity = 0.
--   - Tightening the CHECK constraint from `quantity >= 0` to
--     `quantity > 0` (only valid together with the RPC fix — otherwise
--     every sell-all transaction would roll back on CHECK violation).
--
-- Data-safety: rows with quantity = 0 represent 0 DPCs = 0 SC = no value.
-- Deleting them does not affect user balances, trades, or treasury state.
-- =============================================================================

DELETE FROM public.holdings WHERE quantity = 0;

-- No CHECK constraint change, no RPC change — see Slice 012 spec for rationale.
