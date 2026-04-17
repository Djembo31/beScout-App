-- Slice 035 — Trigger trg_trade_refresh auth_uid_mismatch Fix
--
-- Problem: trg_fn_trade_refresh ruft refresh_airdrop_score(NEW.seller_id) auf.
-- AR-44 hardened guard: `IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN RAISE`.
-- In trigger-context: auth.uid()=buyer, p_user_id=seller → exception → trigger catches WHEN OTHERS
-- → silent WARNING → seller's airdrop_score NIE aktualisiert nach Verkauf.
--
-- Beweis: bot-003 + bot-039 (sellers in Slice 034/038 trades) haben
--   `airdrop_scores.updated_at = NULL` trotz mehrerer Trades.
--
-- Fix:
-- 1. Extract guard-less internal-helper `_refresh_airdrop_score_internal(uuid)`
-- 2. Public wrapper `refresh_airdrop_score(uuid)` behaelt guard, ruft internal
-- 3. Trigger nutzt internal direkt → kein guard-conflict
-- 4. REVOKE internal von anon/authenticated, GRANT nur service_role (trigger als
--    SECURITY DEFINER laeuft als owner und kann internal aufrufen)

-- ============================================================
-- 1. Internal helper (no auth guard)
-- ============================================================
CREATE OR REPLACE FUNCTION public._refresh_airdrop_score_internal(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_active_days INT;
  v_total_trades INT;
  v_research_count INT;
  v_referral_count INT;
  v_is_founding BOOLEAN;
  v_founding_mult NUMERIC;
  v_mastery_score INT;
  v_rang_score INT;
  v_abo_tier TEXT;
  v_abo_mult NUMERIC;
  v_median_score INT;
  v_scores INT[];
  v_activity_component INT;
  v_total INT;
  v_tier TEXT;
BEGIN
  -- NO auth guard — caller responsible (public wrapper guards, trigger uses internal directly).

  SELECT count(DISTINCT DATE(created_at)) INTO v_active_days
  FROM activity_log WHERE user_id = p_user_id AND created_at > now() - INTERVAL '90 days';

  SELECT count(*) INTO v_total_trades FROM trades WHERE buyer_id = p_user_id OR seller_id = p_user_id;
  SELECT count(*) INTO v_research_count FROM research_posts WHERE user_id = p_user_id;
  SELECT count(*) INTO v_referral_count FROM transactions WHERE user_id = p_user_id AND type = 'referral_reward';

  v_activity_component := v_active_days * 2 + v_total_trades + v_research_count * 3 + v_referral_count * 5;

  SELECT ARRAY[COALESCE(trader_score, 500), COALESCE(manager_score, 500), COALESCE(analyst_score, 500)]
  INTO v_scores FROM scout_scores WHERE user_id = p_user_id;

  IF v_scores IS NULL THEN v_scores := ARRAY[500, 500, 500]; END IF;
  SELECT (ARRAY(SELECT unnest(v_scores) ORDER BY 1))[2] INTO v_median_score;

  v_rang_score := CASE
    WHEN v_median_score >= 7000 THEN 25 WHEN v_median_score >= 5000 THEN 18
    WHEN v_median_score >= 4000 THEN 12 WHEN v_median_score >= 2200 THEN 7
    WHEN v_median_score >= 1000 THEN 3 ELSE 1 END;

  SELECT COALESCE(SUM(level) * 2, 0) INTO v_mastery_score FROM dpc_mastery WHERE user_id = p_user_id AND is_frozen = false;

  SELECT EXISTS(SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_key = 'founding_scout') INTO v_is_founding;
  v_founding_mult := CASE WHEN v_is_founding THEN 3.0 ELSE 1.0 END;

  SELECT cs.tier INTO v_abo_tier FROM club_subscriptions cs
  WHERE cs.user_id = p_user_id AND cs.status = 'active' AND cs.expires_at > now()
  ORDER BY CASE cs.tier WHEN 'gold' THEN 3 WHEN 'silber' THEN 2 WHEN 'bronze' THEN 1 END DESC LIMIT 1;
  v_abo_mult := CASE v_abo_tier WHEN 'gold' THEN 1.5 WHEN 'silber' THEN 1.25 WHEN 'bronze' THEN 1.1 ELSE 1.0 END;

  v_total := CEIL((v_activity_component + v_rang_score + v_mastery_score) * v_founding_mult * v_abo_mult);
  v_tier := CASE WHEN v_total >= 1000 THEN 'diamond' WHEN v_total >= 500 THEN 'gold' WHEN v_total >= 200 THEN 'silber' ELSE 'bronze' END;

  INSERT INTO airdrop_scores (user_id, total_score, tier, active_days, referral_count, founding_multiplier, mastery_score, scout_rang_score, abo_multiplier, activity_score, updated_at)
  VALUES (p_user_id, v_total, v_tier, v_active_days, v_referral_count, v_founding_mult, v_mastery_score, v_rang_score, v_abo_mult, v_activity_component, now())
  ON CONFLICT (user_id) DO UPDATE SET
    total_score = EXCLUDED.total_score, tier = EXCLUDED.tier, active_days = EXCLUDED.active_days,
    referral_count = EXCLUDED.referral_count, founding_multiplier = EXCLUDED.founding_multiplier,
    mastery_score = EXCLUDED.mastery_score, scout_rang_score = EXCLUDED.scout_rang_score,
    abo_multiplier = EXCLUDED.abo_multiplier, activity_score = EXCLUDED.activity_score, updated_at = now();

  RETURN jsonb_build_object('ok', true, 'total', v_total, 'tier', v_tier);
END;
$function$;

-- Internal helper: NO public access. Trigger (SECURITY DEFINER as owner) can call directly.
REVOKE ALL ON FUNCTION public._refresh_airdrop_score_internal(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._refresh_airdrop_score_internal(uuid) FROM anon;
REVOKE ALL ON FUNCTION public._refresh_airdrop_score_internal(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public._refresh_airdrop_score_internal(uuid) TO service_role;

COMMENT ON FUNCTION public._refresh_airdrop_score_internal(uuid)
IS 'Slice 035 internal helper. NO auth guard (caller responsibility). Used by trg_fn_trade_refresh + via public wrapper refresh_airdrop_score. Service-role only.';

-- ============================================================
-- 2. Public wrapper (with auth guard) — delegates to internal
-- ============================================================
CREATE OR REPLACE FUNCTION public.refresh_airdrop_score(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- AR-44 guard: authenticated user can only refresh own score
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;
  RETURN public._refresh_airdrop_score_internal(p_user_id);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.refresh_airdrop_score(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refresh_airdrop_score(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.refresh_airdrop_score(uuid) TO authenticated;

COMMENT ON FUNCTION public.refresh_airdrop_score(uuid)
IS 'Slice 035 public wrapper with AR-44 auth guard. For client-driven refresh. Trigger uses _refresh_airdrop_score_internal directly (bypasses guard for cross-user trade-refresh case).';

-- ============================================================
-- 3. Update trigger to use internal helper
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_fn_trade_refresh()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM update_mission_progress(NEW.buyer_id, 'daily_buy_1', 1);
  PERFORM update_mission_progress(NEW.buyer_id, 'daily_trade_2', 1);
  PERFORM update_mission_progress(NEW.buyer_id, 'weekly_trade_5', 1);
  PERFORM refresh_user_stats(NEW.buyer_id);
  -- Slice 035: use internal helper to bypass AR-44 guard for cross-user trade refresh
  PERFORM _refresh_airdrop_score_internal(NEW.buyer_id);
  IF NEW.seller_id IS NOT NULL THEN
    PERFORM refresh_user_stats(NEW.seller_id);
    -- Slice 035: same — seller's score must be refreshable from buyer's auth context
    PERFORM _refresh_airdrop_score_internal(NEW.seller_id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg trade_refresh failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;

-- Trigger functions don't need REVOKE (only invoked via TRIGGER, never directly).
COMMENT ON FUNCTION public.trg_fn_trade_refresh()
IS 'Slice 035 fixed: now uses _refresh_airdrop_score_internal to bypass AR-44 guard for cross-user (buyer triggering seller refresh) case.';
