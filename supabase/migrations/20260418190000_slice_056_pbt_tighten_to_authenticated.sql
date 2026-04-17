-- Slice 056 — pbt_treasury/pbt_transactions Policies tighten
-- Date: 2026-04-18
-- Nitpick aus Slice 045 Review: Policies waren `TO public` (= anon + authenticated).
-- Jetzt `TO authenticated` — nur eingeloggte User sehen Treasury-State.
--
-- Impact-Analyse:
-- - Frontend-Services (getPbtForPlayer, getPbtTransactions) werden nur von
--   authenticated-User-Flows aufgerufen (Trading-Pages, Club-Admin Revenue-Tab).
-- - Keine anon-Landing-Page nutzt PBT-Daten.
-- - Transparenz bleibt fuer alle eingeloggten User gegeben.

DROP POLICY IF EXISTS pbt_treasury_select ON public.pbt_treasury;
CREATE POLICY pbt_treasury_select ON public.pbt_treasury
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS pbt_transactions_select ON public.pbt_transactions;
CREATE POLICY pbt_transactions_select ON public.pbt_transactions
  FOR SELECT TO authenticated USING (true);

COMMENT ON POLICY pbt_treasury_select ON public.pbt_treasury IS
  'Slice 056: authenticated-only (war public). Platform Treasury-Transparenz nur fuer eingeloggte User.';
COMMENT ON POLICY pbt_transactions_select ON public.pbt_transactions IS
  'Slice 056: authenticated-only (war public). PBT-Transaction-History nur fuer eingeloggte User.';
