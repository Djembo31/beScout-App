-- Slice 084 — Player-Row-Dedup (Same-Club Duplicates)
--
-- 2 Duplicates identifiziert per SELF-JOIN: (first_name, last_name, club_id) mit COUNT(*) > 1
-- Beide Fake-Rows haben 0 Matches, 0 Holdings, 0 Orders, 0 Trades — risk-free.
--
-- Kriterium Canonical: Höhere matches + früherer created_at
-- Kriterium Fake: matches = 0 + created_at = 2026-04-16 (Cross-Club-Contamination wie 081d)
--
-- Fix-Pattern: club_id=NULL + api_football_id=NULL (verhindert sync-daily Re-Link)

-- ============================================
-- 1. Safety-Check: sicherstellen dass Fake-Rows wirklich leer sind
-- ============================================

DO $$
DECLARE
  v_holdings_count INT;
  v_orders_count INT;
  v_trades_count INT;
BEGIN
  SELECT COUNT(*) INTO v_holdings_count FROM holdings
  WHERE player_id IN (
    '791ff869-be13-4365-868b-7e6a585ce501',
    '65f98e3d-3292-4f79-b8c4-c3fc0e5395c5'
  );
  IF v_holdings_count > 0 THEN
    RAISE EXCEPTION 'ABORT: Fake-Rows haben % Holdings — Merge-Logic noetig!', v_holdings_count;
  END IF;

  SELECT COUNT(*) INTO v_orders_count FROM orders
  WHERE player_id IN (
    '791ff869-be13-4365-868b-7e6a585ce501',
    '65f98e3d-3292-4f79-b8c4-c3fc0e5395c5'
  ) AND status = 'active';
  IF v_orders_count > 0 THEN
    RAISE EXCEPTION 'ABORT: Fake-Rows haben % active Orders!', v_orders_count;
  END IF;

  SELECT COUNT(*) INTO v_trades_count FROM trades
  WHERE player_id IN (
    '791ff869-be13-4365-868b-7e6a585ce501',
    '65f98e3d-3292-4f79-b8c4-c3fc0e5395c5'
  );
  IF v_trades_count > 0 THEN
    RAISE EXCEPTION 'ABORT: Fake-Rows haben % Trades — historische Daten!', v_trades_count;
  END IF;

  RAISE NOTICE 'Safety-Check OK: 0 Holdings, 0 Orders, 0 Trades an Fake-Rows.';
END $$;

-- ============================================
-- 2. Fake-Rows auf club_id=NULL + api_football_id=NULL
-- ============================================

-- Note: `club` (text legacy column) bleibt unberuehrt — NOT NULL constraint.
-- Nur club_id + api_football_id werden gecleart (analog Slice 081d).
UPDATE public.players
SET
  club_id = NULL,
  api_football_id = NULL,
  updated_at = NOW()
WHERE id IN (
  '791ff869-be13-4365-868b-7e6a585ce501',  -- Jake O'Brien fake duplicate
  '65f98e3d-3292-4f79-b8c4-c3fc0e5395c5'   -- Nico O'Reilly fake duplicate
);

-- ============================================
-- 3. Verifizierung (gibt aus wenn Erwartung nicht matcht)
-- ============================================

DO $$
DECLARE
  v_dupes INT;
BEGIN
  -- Darf keine Same-Club-Duplicates mehr geben
  SELECT COUNT(*) INTO v_dupes FROM (
    SELECT 1
    FROM players
    WHERE club_id IS NOT NULL
    GROUP BY LOWER(TRIM(first_name)), LOWER(TRIM(last_name)), club_id
    HAVING COUNT(*) > 1
  ) s;

  IF v_dupes > 0 THEN
    RAISE EXCEPTION 'POST-CHECK FAILED: Still % same-club duplicate groups', v_dupes;
  END IF;

  RAISE NOTICE 'Slice 084 OK — 0 same-club duplicates verbleibend.';
END $$;
