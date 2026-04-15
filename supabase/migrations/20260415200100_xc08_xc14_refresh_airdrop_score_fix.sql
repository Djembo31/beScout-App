-- XC-08 + XC-14 P1 FIX: refresh_airdrop_score hatte 3 Bugs kombiniert:
-- (XC-08a) research_posts.author_id existiert nicht — column ist user_id
-- (XC-08b) referral_rewards table existiert nicht — count via transactions type='referral_reward'
-- (XC-14)  airdrop_scores schema-drift: RPC INSERT auf total_trades + research_count
--          die in Tabelle nicht existieren. Tabelle hat activity_score, referral_count,
--          total_score, tier, founding_multiplier, mastery_score, scout_rang_score,
--          abo_multiplier statt der RPC-erwartet Spalten.
--
-- Fix: Body neu + INSERT/UPDATE nur auf tatsaechlich existierende Columns.

CREATE OR REPLACE FUNCTION public.refresh_airdrop_score(p_user_id uuid)
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
  SELECT count(DISTINCT DATE(created_at)) INTO v_active_days
  FROM activity_log WHERE user_id = p_user_id AND created_at > now() - INTERVAL '90 days';

  SELECT count(*) INTO v_total_trades
  FROM trades WHERE buyer_id = p_user_id OR seller_id = p_user_id;

  -- XC-08a FIX: research_posts.user_id (not author_id)
  SELECT count(*) INTO v_research_count
  FROM research_posts WHERE user_id = p_user_id;

  -- XC-08b FIX: referral_rewards table does not exist, use transactions
  SELECT count(*) INTO v_referral_count
  FROM transactions WHERE user_id = p_user_id AND type = 'referral_reward';

  v_activity_component := v_active_days * 2 + v_total_trades + v_research_count * 3 + v_referral_count * 5;

  SELECT ARRAY[COALESCE(trader_score, 500), COALESCE(manager_score, 500), COALESCE(analyst_score, 500)]
  INTO v_scores FROM scout_scores WHERE user_id = p_user_id;

  IF v_scores IS NULL THEN v_scores := ARRAY[500, 500, 500]; END IF;
  SELECT (ARRAY(SELECT unnest(v_scores) ORDER BY 1))[2] INTO v_median_score;

  v_rang_score := CASE
    WHEN v_median_score >= 7000 THEN 25 WHEN v_median_score >= 5000 THEN 18
    WHEN v_median_score >= 4000 THEN 12 WHEN v_median_score >= 2200 THEN 7
    WHEN v_median_score >= 1000 THEN 3 ELSE 1
  END;

  SELECT COALESCE(SUM(level) * 2, 0) INTO v_mastery_score
  FROM dpc_mastery WHERE user_id = p_user_id AND is_frozen = false;

  SELECT EXISTS(SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_key = 'founding_scout')
  INTO v_is_founding;
  v_founding_mult := CASE WHEN v_is_founding THEN 3.0 ELSE 1.0 END;

  SELECT cs.tier INTO v_abo_tier FROM club_subscriptions cs
  WHERE cs.user_id = p_user_id AND cs.status = 'active' AND cs.expires_at > now()
  ORDER BY CASE cs.tier WHEN 'gold' THEN 3 WHEN 'silber' THEN 2 WHEN 'bronze' THEN 1 END DESC LIMIT 1;
  v_abo_mult := CASE v_abo_tier WHEN 'gold' THEN 1.5 WHEN 'silber' THEN 1.25 WHEN 'bronze' THEN 1.1 ELSE 1.0 END;

  v_total := CEIL((v_activity_component + v_rang_score + v_mastery_score) * v_founding_mult * v_abo_mult);

  v_tier := CASE
    WHEN v_total >= 1000 THEN 'diamond' WHEN v_total >= 500 THEN 'gold'
    WHEN v_total >= 200 THEN 'silber' ELSE 'bronze'
  END;

  -- XC-14 FIX: Align columns to actual schema (drop total_trades, research_count,
  -- map activity_component to activity_score column)
  INSERT INTO airdrop_scores (
    user_id, total_score, tier, active_days, referral_count,
    founding_multiplier, mastery_score, scout_rang_score, abo_multiplier,
    activity_score, updated_at
  ) VALUES (
    p_user_id, v_total, v_tier, v_active_days, v_referral_count,
    v_founding_mult, v_mastery_score, v_rang_score, v_abo_mult,
    v_activity_component, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_score = EXCLUDED.total_score,
    tier = EXCLUDED.tier,
    active_days = EXCLUDED.active_days,
    referral_count = EXCLUDED.referral_count,
    founding_multiplier = EXCLUDED.founding_multiplier,
    mastery_score = EXCLUDED.mastery_score,
    scout_rang_score = EXCLUDED.scout_rang_score,
    abo_multiplier = EXCLUDED.abo_multiplier,
    activity_score = EXCLUDED.activity_score,
    updated_at = now();

  RETURN jsonb_build_object('ok', true, 'total', v_total, 'tier', v_tier);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.refresh_airdrop_score(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refresh_airdrop_score(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.refresh_airdrop_score(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_airdrop_score(uuid) TO postgres;
