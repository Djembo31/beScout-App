-- =============================================================================
-- Slice 021 — RLS Tighten: orders.orders_select (2026-04-17)
--
-- AUTH-08-class fix (Slice 019 finding, CEO Option 2). DROPs `orders_select`
-- (qual='true' = permissive-for-all-authenticated) and CREATEs
-- `orders_select_own_or_admin` with the same three-branch USING clause as
-- `holdings_select_own_or_admin` (Slice 014):
--   - own: auth.uid() = user_id
--   - club-admin: EXISTS club_admins row for caller
--   - platform-admin: EXISTS platform_admins row for caller
--
-- Cross-user orderbook reads now go through `get_public_orderbook` RPC
-- (SECURITY DEFINER, handle+is_own projection, no user_id) — deployed in
-- Slice 020.
--
-- Prerequisites verified:
--   - src/lib/services/trading.ts uses rpc('get_public_orderbook') for
--     getSellOrders/getAllOpenSellOrders/getAllOpenBuyOrders
--   - buyFromOrder takes playerId from caller (no .from('orders') preflight)
--   - seller notification uses TradeResult.seller_id (no post-buy read)
--   - Only remaining production .from('orders') read is self-only
--     (social.ts:308 count user_id=self)
-- =============================================================================

DROP POLICY IF EXISTS "orders_select" ON public.orders;

CREATE POLICY "orders_select_own_or_admin"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM club_admins ca WHERE ca.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid())
  );

COMMENT ON POLICY "orders_select_own_or_admin" ON public.orders IS
  'Slice 021 (2026-04-17): tightens from qual=true (AUTH-08 class). Cross-user orderbook reads go via get_public_orderbook RPC (Slice 020).';
