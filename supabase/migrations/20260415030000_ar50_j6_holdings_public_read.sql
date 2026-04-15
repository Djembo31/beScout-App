-- =============================================================================
-- AR-50 (J6, 2026-04-15) — Holdings Public-Read für Public-Profile
--
-- PROBLEM:
--   holdings_select policy: auth.uid() = user_id only.
--   Public-Profile ruft getHoldings(targetUserId) → RLS blockt silent.
--   Folge: portfolioValue=0, PnL=0, TopHoldings-Card leer, Widerspruch zu
--   userStats.portfolio_value_cents (bereits public) — inkonsistent.
--
-- DECISION (Beta, analog J3-AR-14 Pattern):
--   Full public read für authenticated (Holdings sind konsistent mit
--   public trades + userStats). Privacy-Refinement auf avg_buy_price
--   (Phase-2 RPC-Gate falls user-Complaint).
--
-- Kein anon-grant (Feed kann via RPC falls nötig).
-- =============================================================================

DROP POLICY IF EXISTS "holdings_select" ON public.holdings;

CREATE POLICY "holdings_select_all_authenticated" ON public.holdings
  FOR SELECT TO authenticated USING (true);

COMMENT ON POLICY "holdings_select_all_authenticated" ON public.holdings IS
  'AR-50 (2026-04-15): Public-Read für Public-Profile Trader-Tab. Konsistent mit userStats + public trades.';
