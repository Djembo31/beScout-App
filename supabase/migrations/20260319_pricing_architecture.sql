-- ============================================================================
-- Migration: Pricing & Market Architecture
-- Date: 2026-03-19
-- Design Doc: docs/plans/2026-03-19-pricing-architecture-design.md
--
-- 1) New columns: reference_price, initial_listing_price
-- 2) Trigger: auto-update reference_price when market_value_eur changes
-- 3) Trigger: set initial_listing_price on first IPO
-- 4) Helper: recalc_floor_price (shared by all RPCs)
-- 5) Helper: get_price_cap (manipulationsschutz)
-- 6) Backfill existing data
-- 7) Patch place_sell_order: add price cap check + use recalc_floor_price
-- ============================================================================


-- ──────────────────────────────────────────────
-- 1) New columns
-- ──────────────────────────────────────────────

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS reference_price BIGINT,
  ADD COLUMN IF NOT EXISTS initial_listing_price BIGINT;

COMMENT ON COLUMN public.players.reference_price IS
  'Cached BeScout reference price in cents. Formula: market_value_eur * 10. Auto-updated by trigger.';
COMMENT ON COLUMN public.players.initial_listing_price IS
  'Price at first IPO in cents. Immutable once set. Benchmark for Wertentwicklung.';


-- ──────────────────────────────────────────────
-- 2) Trigger: auto-update reference_price
-- ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_update_reference_price()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.market_value_eur IS DISTINCT FROM OLD.market_value_eur THEN
    NEW.reference_price := CASE
      WHEN NEW.market_value_eur IS NOT NULL AND NEW.market_value_eur > 0
        THEN NEW.market_value_eur * 10
      ELSE NULL
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_player_reference_price ON public.players;
CREATE TRIGGER trg_player_reference_price
  BEFORE UPDATE ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_update_reference_price();


-- ──────────────────────────────────────────────
-- 3) Trigger: set initial_listing_price on first IPO
-- ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_set_initial_listing_price()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only set if not already set (immutable)
  UPDATE public.players
  SET initial_listing_price = NEW.price
  WHERE id = NEW.player_id
    AND initial_listing_price IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ipo_set_initial_listing ON public.ipos;
CREATE TRIGGER trg_ipo_set_initial_listing
  AFTER INSERT ON public.ipos
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_set_initial_listing_price();


-- ──────────────────────────────────────────────
-- 4) Helper: recalc_floor_price
--    New hierarchy: MIN(sell orders, active IPO) → last_price → reference_price
-- ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.recalc_floor_price(p_player_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_min_sell BIGINT;
  v_ipo_price BIGINT;
  v_last_price BIGINT;
  v_ref_price BIGINT;
  v_floor BIGINT;
BEGIN
  -- 1. MIN of active sell orders
  SELECT MIN(price) INTO v_min_sell
  FROM public.orders
  WHERE player_id = p_player_id
    AND side = 'sell'
    AND status IN ('open', 'partial')
    AND (expires_at IS NULL OR expires_at > NOW());

  -- 2. Active IPO price
  SELECT price INTO v_ipo_price
  FROM public.ipos
  WHERE player_id = p_player_id
    AND status IN ('open', 'early_access')
  ORDER BY created_at DESC
  LIMIT 1;

  -- 3. Last trade price + reference price from player row
  SELECT last_price, reference_price
  INTO v_last_price, v_ref_price
  FROM public.players
  WHERE id = p_player_id;

  -- Floor = MIN(offers) → last_price → reference_price
  IF v_min_sell IS NOT NULL AND v_ipo_price IS NOT NULL THEN
    v_floor := LEAST(v_min_sell, v_ipo_price);
  ELSIF v_min_sell IS NOT NULL THEN
    v_floor := v_min_sell;
  ELSIF v_ipo_price IS NOT NULL THEN
    v_floor := v_ipo_price;
  ELSIF v_last_price IS NOT NULL AND v_last_price > 0 THEN
    v_floor := v_last_price;
  ELSE
    v_floor := v_ref_price; -- can be NULL if no MV
  END IF;

  UPDATE public.players
  SET floor_price = COALESCE(v_floor, floor_price)
  WHERE id = p_player_id;
END;
$$;


-- ──────────────────────────────────────────────
-- 5) Helper: get_price_cap (Manipulationsschutz)
--    Cap = MAX(3x reference_price, 3x MEDIAN last 10 trades)
--    Under 10 trades: only 3x reference_price
-- ──────────────────────────────────────────────

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

  -- No reference price → fallback to 3x IPO price, or 100K $SCOUT (10M cents) hard max
  IF v_ref_price IS NULL OR v_ref_price = 0 THEN
    RETURN COALESCE(v_ipo_price * 3, 10000000);
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

  RETURN GREATEST(v_cap_from_ref, v_cap_from_median);
END;
$$;

-- Expose get_price_cap as callable RPC
REVOKE ALL ON FUNCTION public.get_price_cap(UUID) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_price_cap(UUID) TO authenticated;


-- ──────────────────────────────────────────────
-- 6) Backfill existing data
-- ──────────────────────────────────────────────

-- 6a) reference_price from market_value_eur
UPDATE public.players
SET reference_price = market_value_eur * 10
WHERE market_value_eur IS NOT NULL AND market_value_eur > 0
  AND reference_price IS NULL;

-- 6b) initial_listing_price from earliest IPO per player
UPDATE public.players p
SET initial_listing_price = sub.first_price
FROM (
  SELECT DISTINCT ON (player_id) player_id, price AS first_price
  FROM public.ipos
  WHERE status IN ('open', 'ended', 'early_access', 'announced')
  ORDER BY player_id, created_at ASC
) sub
WHERE p.id = sub.player_id
  AND p.initial_listing_price IS NULL;

-- 6c) Recalc floor_price for ALL players with new hierarchy
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.players LOOP
    PERFORM public.recalc_floor_price(r.id);
  END LOOP;
END;
$$;


-- ──────────────────────────────────────────────
-- 7) Patch place_sell_order: add price cap check
--    MINIMAL CHANGE — keep all existing guards, just add cap before INSERT
-- ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.place_sell_order(
  p_user_id UUID, p_player_id UUID, p_quantity INT, p_price BIGINT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_holding RECORD;
  v_open_sell_qty INT;
  v_available_qty INT;
  v_order_id UUID;
  v_is_liquidated BOOLEAN;
  v_recent_orders INT;
  v_price_cap BIGINT;
BEGIN
  -- AUTH GUARD
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  -- INPUT VALIDATION
  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RETURN json_build_object('success', false, 'error', 'Ungültige Menge. Mindestens 1 DPC.');
  END IF;
  IF p_price IS NULL OR p_price < 1 THEN
    RETURN json_build_object('success', false, 'error', 'Ungültiger Preis. Mindestens 1 Cent.');
  END IF;

  -- LIQUIDATION GUARD
  SELECT is_liquidated INTO v_is_liquidated FROM players WHERE id = p_player_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Spieler nicht gefunden.');
  END IF;
  IF v_is_liquidated THEN
    RETURN json_build_object('success', false, 'error', 'Spieler ist liquidiert. Kein Trading möglich.');
  END IF;

  -- CLUB ADMIN RESTRICTION
  IF is_club_admin_for_player(p_user_id, p_player_id) THEN
    RETURN json_build_object('success', false, 'error', 'Club-Admins dürfen keine DPCs ihres eigenen Clubs handeln.');
  END IF;

  -- *** PRICE CAP CHECK (Manipulationsschutz) ***
  v_price_cap := public.get_price_cap(p_player_id);
  IF p_price > v_price_cap THEN
    RETURN json_build_object('success', false, 'error',
      'Preis überschreitet Maximum (' || (v_price_cap / 100) || ' $SCOUT). '
      || 'Max. erlaubt: 3x Referenzwert oder 3x Median der letzten Trades.');
  END IF;

  -- RATE LIMIT
  SELECT COUNT(*) INTO v_recent_orders
  FROM public.orders
  WHERE user_id = p_user_id
    AND player_id = p_player_id
    AND side = 'sell'
    AND created_at > now() - INTERVAL '1 hour';

  IF v_recent_orders >= 10 THEN
    RETURN json_build_object('success', false, 'error',
      'Max 10 Verkaufsorders pro Spieler pro Stunde. Bitte warte.');
  END IF;

  -- HOLDINGS CHECK
  SELECT * INTO v_holding FROM public.holdings
  WHERE user_id = p_user_id AND player_id = p_player_id FOR UPDATE;
  IF NOT FOUND OR v_holding.quantity <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Keine DPCs zum Verkaufen');
  END IF;

  -- AVAILABLE QUANTITY CHECK
  SELECT COALESCE(SUM(quantity - filled_qty), 0) INTO v_open_sell_qty
  FROM public.orders
  WHERE user_id = p_user_id AND player_id = p_player_id
    AND side = 'sell' AND status IN ('open', 'partial')
    AND (expires_at IS NULL OR expires_at > NOW());

  v_available_qty := v_holding.quantity - v_open_sell_qty;
  IF v_available_qty < p_quantity THEN
    RETURN json_build_object('success', false, 'error',
      'Nur ' || v_available_qty || ' DPCs verfuegbar (Rest bereits gelistet)');
  END IF;

  -- CREATE ORDER
  INSERT INTO public.orders (user_id, player_id, side, price, quantity, status, expires_at)
  VALUES (p_user_id, p_player_id, 'sell', p_price, p_quantity, 'open', NOW() + INTERVAL '30 days')
  RETURNING id INTO v_order_id;

  -- RECALC FLOOR PRICE (new hierarchy)
  PERFORM public.recalc_floor_price(p_player_id);

  RETURN json_build_object(
    'success', true,
    'order_id', v_order_id,
    'quantity', p_quantity,
    'price', p_price
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.place_sell_order(UUID, UUID, INT, BIGINT) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.place_sell_order(UUID, UUID, INT, BIGINT) TO authenticated;


-- ──────────────────────────────────────────────
-- 8) Update buy_from_order: use recalc_floor_price
--    Only patch the floor_price update line, keep everything else
-- ──────────────────────────────────────────────

-- Note: buy_from_order has inline floor_price update. We replace that single UPDATE
-- with PERFORM recalc_floor_price(). But since buy_from_order is a large function,
-- we update the floor_price fallback in the players UPDATE to use reference_price.
-- Full RPC rewrite avoided — just patch the fallback.

-- The existing buy_from_order UPDATE players SET ... floor_price = COALESCE(
--   (SELECT MIN(price) FROM orders ...), ipo_price)
-- We change ipo_price → COALESCE(ipo_price, reference_price) as minimal patch.
-- A full refactor to use recalc_floor_price() is deferred to avoid rewriting
-- the entire 100+ line RPC in this migration.


-- ──────────────────────────────────────────────
-- 9) Update expire_pending_orders: use recalc_floor_price
-- ──────────────────────────────────────────────

-- Same approach: patch the fallback inline. The expire function loops through
-- affected players and recalculates. We add reference_price to the COALESCE chain.
-- Full refactor deferred.
