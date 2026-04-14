-- AR-21 (Operation Beta Ready, Journey #3) — get_price_cap: 100k SC Fallback entfernt.
-- Problem: `RETURN COALESCE(v_ipo_price * 3, 10000000);` erlaubt Listing-Preis bis 10M cents (100k SC)
-- fuer neue Multi-League-Spieler ohne `reference_price`. Floor-Manipulation bei 4.263 neuen Spielern.
-- CEO-Decision (Schnellbahn 2026-04-14): Option B = Kein Fallback, Listing blocked.
--
-- Alter Code (Zeile 164-166 in 20260319_pricing_architecture.sql):
--   IF v_ref_price IS NULL OR v_ref_price = 0 THEN
--     RETURN COALESCE(v_ipo_price * 3, 10000000);
--
-- Neuer Code (COALESCE-Fallback auf 0 = Listing wird sicher abgelehnt):
--   IF v_ref_price IS NULL OR v_ref_price = 0 THEN
--     RETURN COALESCE(v_ipo_price * 3, 0);
--
-- WARUM 0 statt NULL:
-- - place_sell_order guard ist `IF p_price > v_price_cap THEN reject`
-- - Wenn v_price_cap = NULL, dann `p_price > NULL` = NULL = falsy in PL/pgSQL -> Guard UEBERSPRUNGEN
-- - Wenn v_price_cap = 0, dann `p_price > 0` = true fuer jedes positive p_price -> Guard greift
-- - => RETURN 0 garantiert Listing-Block ohne NULL-Comparison-Bug (siehe common-errors.md NULL-in-Scalar)
--
-- Impact:
-- - Spieler mit IPO-Price (haben ipo_price != NULL) -> price_cap = 3x ipo_price (wie bisher)
-- - Spieler ohne reference + ohne ipo_price -> price_cap = 0 -> place_sell_order rejectet Listing
-- - Bestandskunden: AR-5 (J2) hat Multi-League Bulk-IPO-Launch gemacht, 4166/4285 (97%) haben jetzt IPO.
--   119 Spieler ohne IPO werden nicht listbar - gewollt (noch nicht "bereit fuer Sekundaer").
-- - Client-Service getPriceCap returnt number | null (returns 0, caller `cap !== null && priceCents > cap`
--   evaluiert zu `priceCents > 0` = true -> Service wirft maxPriceExceeded bereits client-side = OK).

CREATE OR REPLACE FUNCTION public.get_price_cap(p_player_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_ref_price BIGINT;
  v_ipo_price BIGINT;
  v_median_price BIGINT;
  v_trade_count INT;
  v_cap_from_ref BIGINT;
  v_cap_from_median BIGINT;
BEGIN
  SELECT reference_price, ipo_price INTO v_ref_price, v_ipo_price
  FROM public.players
  WHERE id = p_player_id;

  -- No reference price -> fallback to 3x IPO price, OR 0 wenn auch kein IPO.
  -- AR-21: 100k SC hard fallback (10M cents) removed. COALESCE auf 0 statt NULL vermeidet
  -- NULL-in-Scalar Bug beim caller-side `IF p_price > v_price_cap` guard (common-errors.md).
  IF v_ref_price IS NULL OR v_ref_price = 0 THEN
    RETURN COALESCE(v_ipo_price * 3, 0);
  END IF;

  v_cap_from_ref := v_ref_price * 3;

  SELECT count(*) INTO v_trade_count
  FROM public.trades
  WHERE player_id = p_player_id;

  -- Under 10 trades: cap = 3x reference only
  IF v_trade_count < 10 THEN
    RETURN v_cap_from_ref;
  END IF;

  -- Median of last 10 trades (manipulation-resistant)
  SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY price)::BIGINT
  INTO v_median_price
  FROM (
    SELECT price FROM public.trades
    WHERE player_id = p_player_id
    ORDER BY executed_at DESC
    LIMIT 10
  ) recent;

  v_cap_from_median := COALESCE(v_median_price, 0) * 3;

  -- Use the HIGHER of ref-based and median-based (prevents manipulation downward)
  RETURN GREATEST(v_cap_from_ref, v_cap_from_median);
END;
$$;

-- Permissions preserved (CREATE OR REPLACE keeps existing grants, aber defensiv reapplyen):
REVOKE ALL ON FUNCTION public.get_price_cap(UUID) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_price_cap(UUID) TO authenticated;

-- UI-Follow-Up (Frontend-Agent Scope, nicht diese Migration):
-- Wenn price_cap = 0 soll UI "Spieler noch nicht tradebar (kein IPO/Reference)" anzeigen statt "Max 0 $SCOUT".
-- Optional: SellModal Disabled State + Tooltip. Aktuell wirft Service maxPriceExceeded - nicht optimal UX
-- fuer Edge-Case "Multi-League Spieler ohne IPO" (119 von 4285 Spielern, 2.8%).
