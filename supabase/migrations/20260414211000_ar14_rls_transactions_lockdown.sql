-- =============================================================================
-- AR-14 (Operation Beta Ready, Journey #3) — P0 PRIVACY-LEAK-FIX
--
-- PROBLEM (Live-DB Beweis 2026-04-14):
--   anon-Client liest 949 / 1010 rows aus public.transactions (94% public).
--   Columns `balance_after`, `amount`, `user_id` → komplette Wallet-Historie
--   jedes Users rekonstruierbar durch jeden. Privacy/Trust-Issue.
--
-- ROOT:
--   Migration 20260408190000_transactions_public_rls.sql fuegte zwei SELECT
--   policies hinzu:
--     1. transactions_select_own (auth.uid() = user_id) — bleibt
--     2. transactions_select_public_types (20+ tx types) — DAS ist der Leak
--   Die public-types-Policy wurde eingefuehrt fuer Profile-Timeline (B3 2026-04-08).
--   CEO-Decision AR-14 (2026-04-14): Privacy > Cross-User-Timeline.
--
-- FIX (CEO-Empfehlung A P0):
--   DROP policy "transactions_select_public_types".
--   Nur owner-Read bleibt: auth.uid() = user_id.
--
-- IMPACT-NOTIZ:
--   Public Profile Timeline (useProfileData.ts:218 publicTransactions filter)
--   wird fuer fremde Profile 0 Rows zeigen. Das ist gewollt. Timeline-Tab
--   Visualisierung der Trades kommt ueber `trades` public-whitelist (AR-24)
--   + `activity_log` feed RLS (2026-04-08).
--
-- VERIFY nach Apply:
--   1. SELECT policyname, cmd FROM pg_policies
--        WHERE tablename = 'transactions' ORDER BY policyname;
--      Erwartet: NUR 'transactions_select_own' als SELECT policy
--               (+ evtl INSERT/UPDATE policies aus Baseline).
--   2. anon-Client: SELECT count FROM transactions → 0 rows
--   3. authenticated-Client (self): sieht eigene transactions alle types
-- =============================================================================

-- Drop the public-types policy that leaks balance_after
DROP POLICY IF EXISTS "transactions_select_public_types" ON public.transactions;

-- Re-assert the owner-only SELECT policy (idempotent — existiert bereits)
DROP POLICY IF EXISTS "transactions_select_own" ON public.transactions;
CREATE POLICY "transactions_select_own"
ON public.transactions
FOR SELECT
USING (auth.uid() = user_id);

COMMENT ON POLICY "transactions_select_own" ON public.transactions IS
  'AR-14 (2026-04-14): Owner-only read. Privacy-Lockdown. Ersetzt die 2026-04-08 '
  'transactions_select_public_types Policy (balance_after leak).';

-- NOTIZ fuer zukuenftige Entwickler:
-- Falls cross-user Timeline wieder gebraucht wird → View `transactions_public`
-- mit whitelist-Columns (OHNE balance_after) + GRANT SELECT TO anon, authenticated.
-- NICHT die alte Policy wiederherstellen (Leak).
