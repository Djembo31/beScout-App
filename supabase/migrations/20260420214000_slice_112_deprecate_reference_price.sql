-- Slice 112 — Deprecate reference_price Column + Trigger
--
-- CEO-Approval: Anil 2026-04-20 "beides noch" (+ Option A in Spec 112)
--
-- Root-Cause (Slice 108 Audit):
--   reference_price = MV × 10 cents war als "Cached BeScout reference price" gedacht,
--   aber Formel produziert 0,1% des MV als cents-Wert — inkonsistent mit CEO-Modell.
--   Nur 3 DB-Consumer: get_price_cap (Fallback), recalc_floor_price (Fallback),
--   trg_recalc_floor_on_trade (Fallback). AR-21 hat get_price_cap bereits auf
--   ipo_price*3 als primären Cap umgestellt. reference_price nur noch als
--   uneinheitlicher Legacy-Fallback in allen 3. Droppen.
--
-- Migration-Order (atomisch):
--   1. CREATE OR REPLACE get_price_cap — ohne reference_price
--   2. CREATE OR REPLACE recalc_floor_price — ohne reference_price
--   3. CREATE OR REPLACE trg_recalc_floor_on_trade — ohne reference_price
--   4. DROP TRIGGER trg_player_reference_price
--   5. DROP FUNCTION trg_update_reference_price
--   6. ALTER TABLE players DROP COLUMN reference_price

BEGIN;

-- ─────────────────────────────────────────────────────
-- 1. get_price_cap — ohne reference_price Fallback
--    Cap = ipo_price × 3, bei >=10 Trades auch median × 3 (GREATEST)
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_price_cap(p_player_id uuid)
 RETURNS bigint
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_ipo_price BIGINT;
  v_median_price BIGINT;
  v_trade_count INT;
  v_cap_from_ipo BIGINT;
  v_cap_from_median BIGINT;
BEGIN
  SELECT ipo_price INTO v_ipo_price
  FROM public.players
  WHERE id = p_player_id;

  v_cap_from_ipo := COALESCE(v_ipo_price, 0) * 3;

  SELECT count(*) INTO v_trade_count
  FROM public.trades
  WHERE player_id = p_player_id;

  IF v_trade_count < 10 THEN
    RETURN v_cap_from_ipo;
  END IF;

  SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY price)::BIGINT
  INTO v_median_price
  FROM (
    SELECT price FROM public.trades
    WHERE player_id = p_player_id
    ORDER BY executed_at DESC
    LIMIT 10
  ) recent;

  v_cap_from_median := COALESCE(v_median_price, 0) * 3;

  RETURN GREATEST(v_cap_from_ipo, v_cap_from_median);
END;
$function$;

-- ─────────────────────────────────────────────────────
-- 2. recalc_floor_price — ohne reference_price Fallback
--    Hierarchy: MIN(sell orders) → active IPO → last_price → existing floor_price
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.recalc_floor_price(p_player_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_min_sell BIGINT;
  v_ipo_price BIGINT;
  v_last_price BIGINT;
  v_floor BIGINT;
BEGIN
  SELECT MIN(price) INTO v_min_sell
  FROM public.orders
  WHERE player_id = p_player_id
    AND side = 'sell'
    AND status IN ('open', 'partial')
    AND (expires_at IS NULL OR expires_at > NOW());

  SELECT price INTO v_ipo_price
  FROM public.ipos
  WHERE player_id = p_player_id
    AND status IN ('open', 'early_access')
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT last_price INTO v_last_price
  FROM public.players
  WHERE id = p_player_id;

  IF v_min_sell IS NOT NULL AND v_ipo_price IS NOT NULL THEN
    v_floor := LEAST(v_min_sell, v_ipo_price);
  ELSIF v_min_sell IS NOT NULL THEN
    v_floor := v_min_sell;
  ELSIF v_ipo_price IS NOT NULL THEN
    v_floor := v_ipo_price;
  ELSIF v_last_price IS NOT NULL AND v_last_price > 0 THEN
    v_floor := v_last_price;
  ELSE
    v_floor := NULL;  -- Keep existing floor_price via COALESCE
  END IF;

  UPDATE public.players
  SET floor_price = COALESCE(v_floor, floor_price)
  WHERE id = p_player_id;
END;
$function$;

-- ─────────────────────────────────────────────────────
-- 3. trg_recalc_floor_on_trade — ohne reference_price Fallback
--    Fires on BEFORE UPDATE OF last_price
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_recalc_floor_on_trade()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.last_price IS DISTINCT FROM OLD.last_price THEN
    NEW.floor_price := COALESCE(
      (SELECT MIN(price) FROM public.orders
       WHERE player_id = NEW.id AND side = 'sell'
         AND status IN ('open', 'partial')
         AND (expires_at IS NULL OR expires_at > NOW())),
      (SELECT price FROM public.ipos
       WHERE player_id = NEW.id AND status IN ('open', 'early_access')
       ORDER BY created_at DESC LIMIT 1),
      NEW.last_price,
      NEW.floor_price
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- ─────────────────────────────────────────────────────
-- 4. DROP Trigger
-- ─────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_player_reference_price ON public.players;

-- ─────────────────────────────────────────────────────
-- 5. DROP Trigger Function
-- ─────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.trg_update_reference_price() CASCADE;

-- ─────────────────────────────────────────────────────
-- 6. DROP Column (CASCADE für evtl. Indexe/Views)
-- ─────────────────────────────────────────────────────
ALTER TABLE public.players DROP COLUMN IF EXISTS reference_price CASCADE;

COMMIT;
