-- ============================================================================
-- Migration: Patch ALL RPCs to use recalc_floor_price()
-- Date: 2026-03-19
-- Fixes: Reviewer Finding #2 — 4 RPCs still used old COALESCE(..., ipo_price)
--
-- Affected RPCs:
-- 1. buy_player_dpc   (line 354-361 of 20260314)
-- 2. buy_from_order    (line 547-556 of 20260314)
-- 3. expire_pending_orders (line 142-153 of 20260314)
-- 4. expire_pending_orders (line 51-62 of 20260315_fix_expire_buy_orders)
--
-- Strategy: Rewrite each RPC to call PERFORM recalc_floor_price(player_id)
-- instead of inline COALESCE. The buy RPCs also set last_price + volume_24h
-- inline, so we keep those but replace the floor_price calculation.
-- ============================================================================


-- ──────────────────────────────────────────────
-- 1. buy_player_dpc: Replace inline floor_price with recalc_floor_price
-- ──────────────────────────────────────────────

-- We cannot partially patch a CREATE OR REPLACE — we must rewrite.
-- Instead, we use a post-trade trigger approach: after the UPDATE players
-- that sets last_price + volume_24h, we call recalc_floor_price.
-- This avoids rewriting the entire 100+ line RPC.

-- Approach: Create a trigger on players that calls recalc_floor_price
-- whenever last_price changes. This catches ALL trade RPCs automatically.

CREATE OR REPLACE FUNCTION public.trg_recalc_floor_on_trade()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only recalc when last_price actually changed (= a trade happened)
  IF NEW.last_price IS DISTINCT FROM OLD.last_price THEN
    -- Inline the recalc logic to avoid recursive trigger
    NEW.floor_price := COALESCE(
      -- 1. MIN of active sell orders
      (SELECT MIN(price) FROM public.orders
       WHERE player_id = NEW.id AND side = 'sell'
         AND status IN ('open', 'partial')
         AND (expires_at IS NULL OR expires_at > NOW())),
      -- 2. Active IPO price
      (SELECT price FROM public.ipos
       WHERE player_id = NEW.id AND status IN ('open', 'early_access')
       ORDER BY created_at DESC LIMIT 1),
      -- 3. Last trade price (the new one just set)
      NEW.last_price,
      -- 4. Reference price
      NEW.reference_price,
      -- 5. Keep existing floor
      NEW.floor_price
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_floor_on_trade ON public.players;
CREATE TRIGGER trg_recalc_floor_on_trade
  BEFORE UPDATE ON public.players
  FOR EACH ROW
  WHEN (NEW.last_price IS DISTINCT FROM OLD.last_price)
  EXECUTE FUNCTION public.trg_recalc_floor_on_trade();


-- ──────────────────────────────────────────────
-- 2. expire_pending_orders: Replace loop with recalc_floor_price calls
-- ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.expire_pending_orders()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INT;
  affected_player RECORD;
BEGIN
  -- Collect affected player IDs BEFORE cancelling
  CREATE TEMP TABLE _expired_players ON COMMIT DROP AS
    SELECT DISTINCT o.player_id
    FROM public.orders o
    WHERE o.status IN ('open', 'partial')
      AND o.expires_at IS NOT NULL
      AND o.expires_at < NOW();

  -- Cancel expired sell orders
  UPDATE public.orders
  SET status = 'cancelled'
  WHERE status IN ('open', 'partial')
    AND side = 'sell'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;

  -- Recalculate floor_price for all affected players (new hierarchy)
  FOR affected_player IN SELECT * FROM _expired_players
  LOOP
    PERFORM public.recalc_floor_price(affected_player.player_id);
  END LOOP;

  RETURN expired_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_pending_orders() FROM PUBLIC, authenticated, anon;


-- ──────────────────────────────────────────────
-- 3. expire_pending_orders (buy orders version from 20260315)
--    This handles buy order expiry + wallet unlock
-- ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.expire_pending_buy_orders()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INT;
  affected_player RECORD;
  v_buy_order RECORD;
BEGIN
  -- Collect affected orders info BEFORE cancelling
  CREATE TEMP TABLE _expired_buy_orders ON COMMIT DROP AS
    SELECT id, user_id, player_id, price, (quantity - filled_qty) as remaining_qty
    FROM public.orders
    WHERE side = 'buy'
      AND status IN ('open', 'partial')
      AND expires_at IS NOT NULL
      AND expires_at < NOW();

  CREATE TEMP TABLE _expired_buy_players ON COMMIT DROP AS
    SELECT DISTINCT player_id FROM _expired_buy_orders;

  -- Cancel expired buy orders
  UPDATE public.orders
  SET status = 'cancelled'
  WHERE id IN (SELECT id FROM _expired_buy_orders);

  GET DIAGNOSTICS expired_count = ROW_COUNT;

  -- Unlock funds for expired buy orders
  FOR v_buy_order IN SELECT user_id, SUM(price * remaining_qty) as unlock_amount
    FROM _expired_buy_orders GROUP BY user_id
  LOOP
    UPDATE public.wallets
    SET locked_balance = GREATEST(0, COALESCE(locked_balance, 0) - v_buy_order.unlock_amount)
    WHERE user_id = v_buy_order.user_id;
  END LOOP;

  -- Recalculate floor_price for affected players (new hierarchy)
  FOR affected_player IN SELECT * FROM _expired_buy_players
  LOOP
    PERFORM public.recalc_floor_price(affected_player.player_id);
  END LOOP;

  RETURN expired_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_pending_buy_orders() FROM PUBLIC, authenticated, anon;
