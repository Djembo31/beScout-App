-- =============================================================================
-- AR-20 (Operation Beta Ready, Journey #3) — FK Referential Integrity Schema-Fix
--
-- KONTEXT:
--   AR-13 Migration (20260414210000) hat die 177 orphan IPOs reconstructed,
--   wodurch alle trades.ipo_id wieder auf lebende IPOs zeigen. Diese Migration
--   macht das FUTURE-PROOF: FK ON DELETE SET NULL.
--
-- PROBLEM (Pre-AR-13 Beweis):
--   529 trades hatten ipo_id → IPO bereits aus public.ipos geloescht.
--   Aktuelle FK `trades_ipo_id_fkey` hatte KEIN ON DELETE SET NULL,
--   wodurch alte trades.ipo_id auf tote UUIDs zeigten (Zombie-Referenzen).
--
-- FIX (CEO-Empfehlung B):
--   DROP bestehende FK (ohne CASCADE), CREATE neue mit ON DELETE SET NULL.
--   Falls in Zukunft eine IPO wirklich geloescht wird (was vermieden werden
--   sollte — archived statt delete), zeigen alte trades sauber auf NULL
--   statt auf dead UUIDs.
--
-- IDEMPOTENZ:
--   DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT. Safe zu re-runnen.
--
-- PARALLEL-FIX (ipo_purchases):
--   Selber Fix auch auf ipo_purchases.ipo_id_fkey angewendet (gleiches Pattern,
--   529 orphans in ipo_purchases vor AR-13 Backfill). Nach AR-13 sind alle
--   lebenden, aber FK-Regel bleibt gueltig fuer Zukunft.
--
-- VERIFY nach Apply:
--   1. SELECT conname, confdeltype FROM pg_constraint
--        WHERE conrelid = 'public.trades'::regclass AND conname LIKE '%ipo_id%'
--      → confdeltype = 'n' (SET NULL)
--   2. SELECT conname, confdeltype FROM pg_constraint
--        WHERE conrelid = 'public.ipo_purchases'::regclass AND conname LIKE '%ipo_id%'
--      → confdeltype = 'n' (SET NULL) — falls ipo_purchases.ipo_id ist NOT NULL,
--        dann DEFERRABLE-check macht ON DELETE SET NULL auf NOT NULL column
--        unmoeglich → in dem Fall bleibt die default-FK stehen.
-- =============================================================================

-- trades.ipo_id FK — SET NULL on IPO delete
ALTER TABLE public.trades
  DROP CONSTRAINT IF EXISTS trades_ipo_id_fkey;

ALTER TABLE public.trades
  ADD CONSTRAINT trades_ipo_id_fkey
  FOREIGN KEY (ipo_id) REFERENCES public.ipos(id)
  ON DELETE SET NULL;

COMMENT ON CONSTRAINT trades_ipo_id_fkey ON public.trades IS
  'AR-20 (2026-04-14): ON DELETE SET NULL gegen zukuenftige Orphan-Situations. '
  'Pre-Migration Backfill via AR-13 (20260414210000). Architektur-Empfehlung: '
  'IPOs per status=cancelled/ended archivieren statt DELETE.';

-- ipo_purchases.ipo_id FK — nur wenn Column nullable ist
-- Baseline definiert ipo_purchases.ipo_id als NOT NULL → ON DELETE SET NULL
-- waere bei Parent-Delete invalid. Daher: ON DELETE RESTRICT (sicherer Default).
-- Falls Column nullable wird post-Beta, kann das auf SET NULL umgestellt werden.
ALTER TABLE public.ipo_purchases
  DROP CONSTRAINT IF EXISTS ipo_purchases_ipo_id_fkey;

ALTER TABLE public.ipo_purchases
  ADD CONSTRAINT ipo_purchases_ipo_id_fkey
  FOREIGN KEY (ipo_id) REFERENCES public.ipos(id)
  ON DELETE RESTRICT;

COMMENT ON CONSTRAINT ipo_purchases_ipo_id_fkey ON public.ipo_purchases IS
  'AR-20 (2026-04-14): ON DELETE RESTRICT (ipo_id ist NOT NULL). '
  'Blockiert zukuenftige IPO-Deletes mit existenten Purchases — erzwingt '
  'Architektur-Best-Practice: status=cancelled/ended archivieren statt DELETE.';
