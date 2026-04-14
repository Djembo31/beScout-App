-- =============================================================================
-- AR-13 (Operation Beta Ready, Journey #3) — Phantom-Supply Backfill
--
-- PROBLEM (Live-DB Beweis 2026-04-14):
--   707 SCs live gehalten, davon 553 SCs haben ipo_id zeigen auf GELOESCHTE
--   IPOs (177 orphan ipo_ids in trades + ipo_purchases). Die Supply ist echt
--   (trades + ipo_purchases stimmen ueberein), aber die IPO-Referenz-Integrity
--   ist broken:
--     - 679 null-seller trades (pool-mint) — 529 davon mit orphan ipo_id
--     - 679 ipo_purchases rows — 529 davon mit orphan ipo_id
--     - 707 holdings.quantity SUM — alles gebacked by null-seller trades + purchases
--   Root: AR-5 Bulk-IPO-Reset (Commit 6937b01, 2026-04-14) hat alte IPOs DELETED
--   statt archived → FK-lose Waisen.
--
-- FIX (CEO-Empfehlung A + C):
--   A) Reconstruct die 177 orphan IPOs mit ORIGINAL UUID aus trades.ipo_id.
--      status='ended' (closed, no further purchases). Alle Metadata (price,
--      total_offered, sold, player_id) aus trades/ipo_purchases aggregiert.
--   C) Architektur-Notiz: Seed-Script + zukuenftige IPO-Deletes muessen
--      per archived-flag laufen, nicht DELETE. (Separate Migration post-Beta.)
--
-- STRATEGIE:
--   Statt neue UUIDs zu generieren (bricht existing trades + ipo_purchases FKs),
--   nutze ich die ORIGINAL UUIDs aus den orphan-records. Das macht beide
--   Tabellen (trades + ipo_purchases) sofort wieder FK-valid.
--
-- VERIFY nach Apply:
--   1. SELECT COUNT(*) FROM trades WHERE seller_id IS NULL AND ipo_id IS NOT NULL
--        AND ipo_id NOT IN (SELECT id FROM ipos) → 0
--   2. SELECT COUNT(*) FROM ipo_purchases WHERE ipo_id NOT IN (SELECT id FROM ipos) → 0
--   3. Supply-Invariant:
--      SELECT
--        (SELECT SUM(quantity) FROM holdings) AS total_held,
--        (SELECT SUM(quantity) FROM ipo_purchases) AS total_purchased,
--        (SELECT SUM(quantity) FROM trades WHERE seller_id IS NULL) AS total_minted
--      Erwartet: total_held = total_purchased = total_minted = 707
--   4. SELECT status, COUNT(*) FROM ipos GROUP BY status
--      Erwartet: 'ended' Count ist um 177 gestiegen (vs pre-migration).
-- =============================================================================

-- Reconstruct orphan IPOs with ORIGINAL UUIDs from trades.ipo_id
--
-- Per orphan ipo_id we derive:
--   player_id     = von trades (immer konsistent pro ipo_id, da aus seeding)
--   price         = avg(trades.price * trades.quantity) / sum(quantity)
--                    (weighted avg — handles bulk-trades)
--   total_offered = SUM(quantity) aus trades (= total sold aus diesem IPO)
--   sold          = total_offered (all sold, status='ended')
--   status        = 'ended' (CHECK constraint compatible — NICHT archived)
--   starts_at     = MIN(executed_at) aus trades
--   ends_at       = MAX(executed_at) + 1 day (muss > starts_at sein)
--   max_per_user  = 50 (default)
--   total_offered (NOT NULL)
--
-- INSERT ... ON CONFLICT DO NOTHING — idempotent, falls Migration 2x laeuft.

INSERT INTO public.ipos (
  id, player_id, status, format, price, total_offered, sold,
  max_per_user, member_discount, starts_at, ends_at, season,
  created_at, updated_at
)
SELECT
  t.ipo_id                                                      AS id,
  t.player_id                                                   AS player_id,
  'ended'                                                       AS status,
  'fixed'                                                       AS format,
  (SUM(t.price * t.quantity) / SUM(t.quantity))::BIGINT         AS price,
  SUM(t.quantity)::INTEGER                                      AS total_offered,
  SUM(t.quantity)::INTEGER                                      AS sold,
  50                                                            AS max_per_user,
  0                                                             AS member_discount,
  MIN(t.executed_at)                                            AS starts_at,
  (MAX(t.executed_at) + INTERVAL '1 day')                       AS ends_at,
  1                                                             AS season,
  MIN(t.executed_at)                                            AS created_at,
  MAX(t.executed_at)                                            AS updated_at
FROM public.trades t
WHERE t.seller_id IS NULL
  AND t.ipo_id IS NOT NULL
  AND t.ipo_id NOT IN (SELECT id FROM public.ipos)
GROUP BY t.ipo_id, t.player_id
ON CONFLICT (id) DO NOTHING;

-- Post-Migration Supply-Invariant Check (runs im selben Transaction-Kontext)
--
-- Diese anonymous-block RAISE NOTICE wird im apply_migration-Output sichtbar
-- und kann nachtraeglich verifiziert werden.
DO $$
DECLARE
  v_held BIGINT;
  v_purchased BIGINT;
  v_minted BIGINT;
  v_orphan_trades BIGINT;
  v_orphan_purchases BIGINT;
BEGIN
  SELECT COALESCE(SUM(quantity), 0) INTO v_held FROM public.holdings;
  SELECT COALESCE(SUM(quantity), 0) INTO v_purchased FROM public.ipo_purchases;
  SELECT COALESCE(SUM(quantity), 0) INTO v_minted FROM public.trades WHERE seller_id IS NULL;

  SELECT COUNT(*) INTO v_orphan_trades
    FROM public.trades
   WHERE seller_id IS NULL
     AND ipo_id IS NOT NULL
     AND ipo_id NOT IN (SELECT id FROM public.ipos);

  SELECT COUNT(*) INTO v_orphan_purchases
    FROM public.ipo_purchases
   WHERE ipo_id IS NOT NULL
     AND ipo_id NOT IN (SELECT id FROM public.ipos);

  RAISE NOTICE 'AR-13 Supply-Invariant: held=% purchased=% minted=% orphan_trades=% orphan_purchases=%',
    v_held, v_purchased, v_minted, v_orphan_trades, v_orphan_purchases;

  IF v_orphan_trades > 0 THEN
    RAISE EXCEPTION 'AR-13 FAILED: % orphan trades remain after backfill', v_orphan_trades;
  END IF;

  IF v_held <> v_purchased OR v_held <> v_minted THEN
    RAISE EXCEPTION 'AR-13 FAILED: Supply-Invariant broken: held=% purchased=% minted=%',
      v_held, v_purchased, v_minted;
  END IF;
END $$;

-- Audit comment on reconstructed IPOs (kann SELECT-gefiltert werden post-Apply)
COMMENT ON TABLE public.ipos IS
  'AR-13 (2026-04-14): 177 orphan IPOs reconstructed mit status=ended '
  'aus trades+ipo_purchases Aggregation. Supply-Invariant gruen (707 SCs backed).';
