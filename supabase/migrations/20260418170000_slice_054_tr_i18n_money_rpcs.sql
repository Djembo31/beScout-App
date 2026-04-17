-- Slice 054 — TR-i18n Money-Path RPCs (048b)
-- Migriert 4 RPCs auf structured i18n_key + i18n_params Pattern (Slice 048 Foundation).
-- RPCs: award_dimension_score, send_tip, calculate_ad_revenue_share, calculate_creator_fund_payout
-- Date: 2026-04-18
--
-- Pattern: RPC schreibt title + body (DE-Fallback) + i18n_key + i18n_params.
-- Frontend-Resolver bevorzugt i18n_key wenn vorhanden (siehe Slice 048 NotificationDropdown.tsx).

-- =========================================================================
-- BLOCK 1: award_dimension_score mit rangUp/rangDown i18n
-- =========================================================================
CREATE OR REPLACE FUNCTION public.award_dimension_score(p_user_id uuid, p_dimension text, p_delta integer, p_event_type text, p_source_id text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current INT; v_new INT; v_peak INT;
  v_abo_tier TEXT; v_effective_delta INT;
  v_rang_before INT; v_rang_after INT; v_rang_name TEXT; v_dim_label TEXT;
  v_is_up BOOLEAN;
  v_i18n_key TEXT;
BEGIN
  IF p_dimension NOT IN ('trader', 'manager', 'analyst') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid dimension: ' || p_dimension);
  END IF;
  IF p_delta = 0 THEN RETURN jsonb_build_object('ok', true, 'delta', 0, 'skipped', true); END IF;
  INSERT INTO scout_scores (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
  v_effective_delta := p_delta;
  IF p_delta > 0 THEN
    SELECT cs.tier INTO v_abo_tier FROM club_subscriptions cs
    WHERE cs.user_id = p_user_id AND cs.status = 'active' AND cs.expires_at > now()
    ORDER BY CASE cs.tier WHEN 'gold' THEN 3 WHEN 'silber' THEN 2 WHEN 'bronze' THEN 1 END DESC LIMIT 1;
    IF v_abo_tier = 'gold' THEN v_effective_delta := CEIL(p_delta * 1.2); END IF;
  END IF;
  IF p_dimension = 'trader' THEN
    SELECT trader_score, trader_peak INTO v_current, v_peak FROM scout_scores WHERE user_id = p_user_id;
  ELSIF p_dimension = 'manager' THEN
    SELECT manager_score, manager_peak INTO v_current, v_peak FROM scout_scores WHERE user_id = p_user_id;
  ELSE
    SELECT analyst_score, analyst_peak INTO v_current, v_peak FROM scout_scores WHERE user_id = p_user_id;
  END IF;
  v_new := GREATEST(0, v_current + v_effective_delta);
  IF p_dimension = 'trader' THEN
    UPDATE scout_scores SET trader_score = v_new, trader_peak = GREATEST(trader_peak, v_new), updated_at = now() WHERE user_id = p_user_id;
  ELSIF p_dimension = 'manager' THEN
    UPDATE scout_scores SET manager_score = v_new, manager_peak = GREATEST(manager_peak, v_new), updated_at = now() WHERE user_id = p_user_id;
  ELSE
    UPDATE scout_scores SET analyst_score = v_new, analyst_peak = GREATEST(analyst_peak, v_new), updated_at = now() WHERE user_id = p_user_id;
  END IF;
  INSERT INTO score_history (user_id, dimension, delta, score_before, score_after, event_type, source_id, metadata)
  VALUES (p_user_id, p_dimension, v_effective_delta, v_current, v_new, p_event_type, p_source_id, p_metadata);
  v_rang_before := fn_get_rang_id_dynamic(v_current);
  v_rang_after := fn_get_rang_id_dynamic(v_new);
  IF v_rang_before IS DISTINCT FROM v_rang_after THEN
    v_rang_name := fn_get_rang_name_dynamic(v_new);
    v_dim_label := CASE p_dimension WHEN 'trader' THEN 'Sammler' WHEN 'manager' THEN 'Manager' ELSE 'Analyst' END;
    v_is_up := (v_new > v_current);
    v_i18n_key := CASE WHEN v_is_up THEN 'rangUp' ELSE 'rangDown' END;
    BEGIN
      INSERT INTO notifications (user_id, type, title, body, i18n_key, i18n_params)
      VALUES (p_user_id,
        CASE WHEN v_is_up THEN 'rang_up' ELSE 'rang_down' END,
        CASE WHEN v_is_up THEN v_dim_label || ': Aufstieg zu ' || v_rang_name || '!'
          ELSE v_dim_label || ': Abstieg auf ' || v_rang_name END,
        CASE WHEN v_is_up THEN 'Dein ' || v_dim_label || '-Rang ist auf ' || v_rang_name || ' gestiegen. Weiter so!'
          ELSE 'Dein ' || v_dim_label || '-Rang ist auf ' || v_rang_name || ' gefallen.' END,
        v_i18n_key,
        jsonb_build_object('dim', v_dim_label, 'rang', v_rang_name)
      );
    EXCEPTION WHEN OTHERS THEN RAISE WARNING 'rang notification failed: %', SQLERRM;
    END;
  END IF;
  RETURN jsonb_build_object('ok', true, 'dimension', p_dimension, 'score_before', v_current, 'score_after', v_new, 'delta', v_effective_delta, 'boosted', v_abo_tier = 'gold');
END;
$function$;

COMMENT ON FUNCTION public.award_dimension_score(uuid, text, integer, text, text, jsonb) IS
  'Slice 044: REVOKED authenticated. Slice 054: schreibt i18n_key (rangUp/rangDown) + params (dim, rang).';

-- =========================================================================
-- BLOCK 2: send_tip mit tipReceivedNotif i18n
-- =========================================================================
CREATE OR REPLACE FUNCTION public.send_tip(p_sender_id uuid, p_receiver_id uuid, p_content_type text, p_content_id uuid, p_amount_cents bigint, p_message text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_sender_balance BIGINT;
  v_sender_locked BIGINT;
  v_platform_fee BIGINT;
  v_receiver_earned BIGINT;
  v_tip_id UUID;
  v_recent_tips INT;
  v_sender_name TEXT;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_sender_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;
  IF p_sender_id = p_receiver_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kein Self-Tipp erlaubt');
  END IF;
  IF p_amount_cents < 1000 OR p_amount_cents > 100000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Betrag muss zwischen 10 und 1.000 Credits liegen');
  END IF;
  SELECT COUNT(*) INTO v_recent_tips FROM tips WHERE sender_id = p_sender_id AND created_at > now() - interval '1 hour';
  IF v_recent_tips >= 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Max 5 Tipps pro Stunde');
  END IF;
  SELECT balance, COALESCE(locked_balance, 0) INTO v_sender_balance, v_sender_locked
  FROM wallets WHERE user_id = p_sender_id FOR UPDATE;
  IF v_sender_balance IS NULL OR (v_sender_balance - v_sender_locked) < p_amount_cents THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nicht genug Credits');
  END IF;
  v_platform_fee := (p_amount_cents * 5) / 100;
  v_receiver_earned := p_amount_cents - v_platform_fee;
  UPDATE wallets SET balance = balance - p_amount_cents, updated_at = now() WHERE user_id = p_sender_id;
  UPDATE wallets SET balance = balance + v_receiver_earned, updated_at = now() WHERE user_id = p_receiver_id;
  INSERT INTO tips (sender_id, receiver_id, content_type, content_id, amount_cents, platform_fee_cents, receiver_earned_cents, message)
  VALUES (p_sender_id, p_receiver_id, p_content_type, p_content_id, p_amount_cents, v_platform_fee, v_receiver_earned, p_message)
  RETURNING id INTO v_tip_id;
  INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES (p_sender_id, 'tip_send', -p_amount_cents, (SELECT balance FROM wallets WHERE user_id = p_sender_id), v_tip_id, 'Scout-Tipp gesendet');
  INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES (p_receiver_id, 'tip_receive', v_receiver_earned, (SELECT balance FROM wallets WHERE user_id = p_receiver_id), v_tip_id, 'Scout-Tipp erhalten');

  -- Slice 054: Sender-Name fuer Notification (Bug-Fix: war vorher fälschlich = receiver via p_sender_id)
  SELECT COALESCE(display_name, handle) INTO v_sender_name FROM profiles WHERE id = p_sender_id;
  INSERT INTO notifications (user_id, type, title, body, reference_id, reference_type, i18n_key, i18n_params)
  VALUES (p_receiver_id, 'tip_received',
    'Scout-Tipp erhalten!',
    v_sender_name || ' hat dir ' || (p_amount_cents / 100) || ' Credits als Tipp gesendet',
    v_tip_id, 'tip',
    'tipReceivedNotif',
    jsonb_build_object('senderName', COALESCE(v_sender_name, 'Jemand'), 'amount', (p_amount_cents / 100))
  );

  RETURN jsonb_build_object('success', true, 'tip_id', v_tip_id, 'amount_cents', p_amount_cents, 'receiver_earned', v_receiver_earned, 'platform_fee', v_platform_fee);
END;
$function$;

COMMENT ON FUNCTION public.send_tip(uuid, uuid, text, uuid, bigint, text) IS
  'Slice 054: i18n_key=tipReceivedNotif mit senderName+amount. Bug-Fix: v_sender_name korrekt von sender_id (vorher falsch).';

-- =========================================================================
-- BLOCK 3: calculate_ad_revenue_share mit adRevenuePayout i18n
-- =========================================================================
CREATE OR REPLACE FUNCTION public.calculate_ad_revenue_share(p_admin_id uuid, p_period_start date, p_period_end date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_share_pct INT;
  v_min_payout BIGINT;
  v_total_revenue BIGINT := 0;
  v_pool BIGINT;
  v_paid_count INT := 0;
  v_total_paid BIGINT := 0;
  v_author_shares JSONB := '{}';
  v_total_author_impressions BIGINT := 0;
  r RECORD;
  a RECORD;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM platform_admins WHERE user_id = p_admin_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nicht autorisiert');
  END IF;

  SELECT COALESCE((value#>>'{}')::INT, 20) INTO v_share_pct
  FROM creator_config WHERE key = 'ad_revenue_share_pct';
  SELECT COALESCE((value#>>'{}')::BIGINT, 5000) INTO v_min_payout
  FROM creator_config WHERE key = 'ad_revenue_share_min_payout_cents';

  FOR r IN
    SELECT si.sponsor_id, s.revenue_cents_per_impression, COUNT(*) AS imp_count,
           ARRAY_AGG(DISTINCT unnested_author) AS all_authors
    FROM sponsor_impressions si
    JOIN sponsors s ON s.id = si.sponsor_id
    CROSS JOIN LATERAL unnest(si.context_author_ids) AS unnested_author
    WHERE si.created_at >= p_period_start AND si.created_at < p_period_end::TIMESTAMPTZ + interval '1 day'
      AND s.revenue_cents_per_impression IS NOT NULL
      AND array_length(si.context_author_ids, 1) > 0
    GROUP BY si.sponsor_id, s.revenue_cents_per_impression
  LOOP
    v_total_revenue := v_total_revenue + (r.imp_count * r.revenue_cents_per_impression);
  END LOOP;

  v_pool := (v_total_revenue * v_share_pct) / 100;

  IF v_pool <= 0 THEN
    RETURN jsonb_build_object('success', true, 'total_revenue_cents', v_total_revenue, 'pool_cents', 0, 'paid_count', 0, 'total_paid_cents', 0);
  END IF;

  FOR a IN
    SELECT unnested_author AS author_id, COUNT(*) AS author_imp_count
    FROM sponsor_impressions si
    CROSS JOIN LATERAL unnest(si.context_author_ids) AS unnested_author
    WHERE si.created_at >= p_period_start AND si.created_at < p_period_end::TIMESTAMPTZ + interval '1 day'
    GROUP BY unnested_author
  LOOP
    v_total_author_impressions := v_total_author_impressions + a.author_imp_count;
  END LOOP;

  IF v_total_author_impressions = 0 THEN
    RETURN jsonb_build_object('success', true, 'total_revenue_cents', v_total_revenue, 'pool_cents', v_pool, 'paid_count', 0, 'total_paid_cents', 0);
  END IF;

  FOR a IN
    SELECT unnested_author AS author_id, COUNT(*) AS author_imp_count
    FROM sponsor_impressions si
    CROSS JOIN LATERAL unnest(si.context_author_ids) AS unnested_author
    WHERE si.created_at >= p_period_start AND si.created_at < p_period_end::TIMESTAMPTZ + interval '1 day'
    GROUP BY unnested_author
  LOOP
    DECLARE
      v_payout BIGINT;
      v_pct NUMERIC(5,2);
      v_status TEXT;
    BEGIN
      v_pct := (a.author_imp_count::NUMERIC / v_total_author_impressions::NUMERIC) * 100;
      v_payout := (v_pool * a.author_imp_count) / v_total_author_impressions;

      IF v_payout < v_min_payout THEN
        v_status := 'rolled_over';
      ELSE
        v_status := 'paid';
        v_paid_count := v_paid_count + 1;
        v_total_paid := v_total_paid + v_payout;

        UPDATE wallets SET balance = balance + v_payout, updated_at = now()
        WHERE user_id = a.author_id;

        INSERT INTO transactions (user_id, type, amount, balance_after, description)
        VALUES (
          a.author_id, 'ad_revenue_payout', v_payout,
          (SELECT balance FROM wallets WHERE user_id = a.author_id),
          'Werbeanteil Auszahlung (' || p_period_start || ' - ' || p_period_end || ')'
        );

        -- Slice 054: structured i18n + BSD→Credits wording fix
        INSERT INTO notifications (user_id, type, title, body, i18n_key, i18n_params)
        VALUES (
          a.author_id, 'ad_revenue_payout',
          'Werbeanteil erhalten!',
          'Du hast ' || (v_payout / 100) || ' Credits Werbeanteil erhalten',
          'adRevenuePayout',
          jsonb_build_object('amount', (v_payout / 100))
        );
      END IF;

      INSERT INTO creator_fund_payouts (user_id, payout_type, period_start, period_end, impression_count, impression_share_pct, pool_total_cents, payout_cents, status)
      VALUES (a.author_id, 'ad_revenue_share', p_period_start, p_period_end, a.author_imp_count, v_pct, v_pool, v_payout, v_status);
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total_revenue_cents', v_total_revenue,
    'pool_cents', v_pool,
    'paid_count', v_paid_count,
    'total_paid_cents', v_total_paid
  );
END;
$function$;

COMMENT ON FUNCTION public.calculate_ad_revenue_share(uuid, date, date) IS
  'Slice 054: structured i18n (adRevenuePayout key + amount param). BSD→Credits wording gleichzeitig gefixt.';

-- =========================================================================
-- BLOCK 4: calculate_creator_fund_payout mit creatorFundPayout i18n
-- =========================================================================
CREATE OR REPLACE FUNCTION public.calculate_creator_fund_payout(p_admin_id uuid, p_period_start date, p_period_end date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_impressions BIGINT;
  v_platform_cut INT;
  v_min_payout BIGINT;
  v_min_level INT;
  v_pool_total BIGINT;
  v_paid_count INT := 0;
  v_rolled_count INT := 0;
  v_total_paid BIGINT := 0;
  r RECORD;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM platform_admins WHERE user_id = p_admin_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nicht autorisiert');
  END IF;

  SELECT COALESCE((value#>>'{}')::INT, 30) INTO v_platform_cut
  FROM creator_config WHERE key = 'creator_fund_platform_cut_pct';
  SELECT COALESCE((value#>>'{}')::BIGINT, 10000) INTO v_min_payout
  FROM creator_config WHERE key = 'creator_fund_min_payout_cents';
  SELECT COALESCE((value#>>'{}')::INT, 5) INTO v_min_level
  FROM creator_config WHERE key = 'creator_fund_min_level';

  SELECT COUNT(*) INTO v_total_impressions
  FROM content_impressions
  WHERE impression_date >= p_period_start AND impression_date <= p_period_end;

  IF v_total_impressions = 0 THEN
    RETURN jsonb_build_object('success', true, 'total_impressions', 0, 'paid_count', 0, 'total_paid_cents', 0);
  END IF;

  SELECT COALESCE(SUM(s.revenue_cents_per_impression), 0) * v_total_impressions INTO v_pool_total
  FROM sponsors s
  WHERE s.is_active = true AND s.revenue_cents_per_impression IS NOT NULL;

  v_pool_total := (v_pool_total * (100 - v_platform_cut)) / 100;

  IF v_pool_total <= 0 THEN
    RETURN jsonb_build_object('success', true, 'total_impressions', v_total_impressions, 'pool_cents', 0, 'paid_count', 0);
  END IF;

  FOR r IN
    SELECT ci.author_id, COUNT(*) AS author_impressions
    FROM content_impressions ci
    JOIN profiles p ON p.id = ci.author_id
    WHERE ci.impression_date >= p_period_start AND ci.impression_date <= p_period_end
      AND p.level >= v_min_level
    GROUP BY ci.author_id
  LOOP
    DECLARE
      v_share_pct NUMERIC(5,2);
      v_payout BIGINT;
      v_status TEXT;
    BEGIN
      v_share_pct := (r.author_impressions::NUMERIC / v_total_impressions::NUMERIC) * 100;
      v_payout := (v_pool_total * r.author_impressions) / v_total_impressions;

      IF v_payout < v_min_payout THEN
        v_status := 'rolled_over';
        v_rolled_count := v_rolled_count + 1;
      ELSE
        v_status := 'paid';
        v_paid_count := v_paid_count + 1;
        v_total_paid := v_total_paid + v_payout;

        UPDATE wallets SET balance = balance + v_payout, updated_at = now()
        WHERE user_id = r.author_id;

        INSERT INTO transactions (user_id, type, amount, balance_after, description)
        VALUES (
          r.author_id, 'creator_fund_payout', v_payout,
          (SELECT balance FROM wallets WHERE user_id = r.author_id),
          'Creator Fund Auszahlung (' || p_period_start || ' - ' || p_period_end || ')'
        );

        -- Slice 054: structured i18n + BSD→Credits wording fix
        INSERT INTO notifications (user_id, type, title, body, i18n_key, i18n_params)
        VALUES (
          r.author_id, 'creator_fund_payout',
          'Creator Fund Auszahlung!',
          'Du hast ' || (v_payout / 100) || ' Credits aus dem Creator Fund erhalten',
          'creatorFundPayout',
          jsonb_build_object('amount', (v_payout / 100))
        );
      END IF;

      INSERT INTO creator_fund_payouts (user_id, payout_type, period_start, period_end, impression_count, impression_share_pct, pool_total_cents, payout_cents, status)
      VALUES (r.author_id, 'creator_fund', p_period_start, p_period_end, r.author_impressions, v_share_pct, v_pool_total, v_payout, v_status);
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total_impressions', v_total_impressions,
    'pool_cents', v_pool_total,
    'paid_count', v_paid_count,
    'rolled_count', v_rolled_count,
    'total_paid_cents', v_total_paid
  );
END;
$function$;

COMMENT ON FUNCTION public.calculate_creator_fund_payout(uuid, date, date) IS
  'Slice 054: structured i18n (creatorFundPayout key + amount param). BSD→Credits wording gleichzeitig gefixt.';
