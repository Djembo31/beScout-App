-- =============================================================================
-- Phase 3 (Operation Beta Ready, 2026-04-14) — Transactions $SCOUT Historical Backfill
--
-- PROBLEM:
--   Historische `transactions.description` Rows enthalten noch "$SCOUT" Ticker
--   (Compliance-Verletzung per business.md — $SCOUT darf NICHT user-facing sein).
--   Live-DB hat 8 Rows mit dem Pattern.
--
-- Neue Rows werden bereits via AR-55 J7 RPCs compliance-clean erzeugt, aber die
-- historischen Rows tauchen weiterhin auf Transactions-Seite / Profil / Activity
-- Timeline auf.
--
-- FIX:
--   Regex-Replace "$SCOUT" → "Credits" in bestehenden Rows.
--   Idempotent: WHERE Filter stellt sicher, dass nur betroffene Rows
--   angefasst werden. Rerun-safe.
-- =============================================================================

UPDATE public.transactions
SET description = REGEXP_REPLACE(description, '\$SCOUT', 'Credits', 'g')
WHERE description ~ '\$SCOUT';

COMMENT ON COLUMN public.transactions.description IS
  'User-facing description. Compliance: NIEMALS $SCOUT, Investment, ROI, Profit, Ownership (siehe business.md). Use Credits / Platform Credits.';
