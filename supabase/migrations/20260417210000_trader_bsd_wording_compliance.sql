-- Slice 043 — Compliance Wording: Trader → Sammler, BSD → Credits
--
-- Slice 032 Flow 13 entdeckte 2 Compliance-Verstoesse in Notifications:
-- 1. "Trader: Aufstieg zu Silber I!" — "Trader" als Rolle ist in business.md verboten
-- 2. "X hat dir 10 BSD Tipp gesendet" — "BSD" ist legacy, "Credits" ist aktuell
--
-- Beide stammen aus hardcoded DE-Strings in DB-RPCs, die direkt in notifications.title+body
-- geschrieben werden (UI rendert 1:1 ohne Client-i18n-layer).
--
-- Historische Daten werden NICHT umgeschrieben. Nur neue notifications haben korrektes Wording.

-- ============================================================
-- 1. award_dimension_score: 'trader' → 'Sammler'
-- ============================================================

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
    -- Slice 043: 'Trader' → 'Sammler' (business.md Securities-Glossar)
    v_dim_label := CASE p_dimension WHEN 'trader' THEN 'Sammler' WHEN 'manager' THEN 'Manager' ELSE 'Analyst' END;
    BEGIN
      INSERT INTO notifications (user_id, type, title, body)
      VALUES (p_user_id,
        CASE WHEN v_new > v_current THEN 'rang_up' ELSE 'rang_down' END,
        CASE WHEN v_new > v_current THEN v_dim_label || ': Aufstieg zu ' || v_rang_name || '!'
          ELSE v_dim_label || ': Abstieg auf ' || v_rang_name END,
        CASE WHEN v_new > v_current THEN 'Dein ' || v_dim_label || '-Rang ist auf ' || v_rang_name || ' gestiegen. Weiter so!'
          ELSE 'Dein ' || v_dim_label || '-Rang ist auf ' || v_rang_name || ' gefallen.' END
      );
    EXCEPTION WHEN OTHERS THEN RAISE WARNING 'rang notification failed: %', SQLERRM;
    END;
  END IF;

  RETURN jsonb_build_object('ok', true, 'dimension', p_dimension, 'score_before', v_current, 'score_after', v_new, 'delta', v_effective_delta, 'boosted', v_abo_tier = 'gold');
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.award_dimension_score(uuid, text, integer, text, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.award_dimension_score(uuid, text, integer, text, text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.award_dimension_score(uuid, text, integer, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_dimension_score(uuid, text, integer, text, text, jsonb) TO service_role;

COMMENT ON FUNCTION public.award_dimension_score(uuid, text, integer, text, text, jsonb)
IS 'Slice 043: trader-label geaendert zu "Sammler" (business.md Securities-Glossar).';

-- ============================================================
-- 2. send_tip: "BSD" → "Credits"
-- ============================================================

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
  v_receiver_name TEXT;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_sender_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;
  IF p_sender_id = p_receiver_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kein Self-Tipp erlaubt');
  END IF;
  IF p_amount_cents < 1000 OR p_amount_cents > 100000 THEN
    -- Slice 043: "BSD" → "Credits"
    RETURN jsonb_build_object('success', false, 'error', 'Betrag muss zwischen 10 und 1.000 Credits liegen');
  END IF;

  SELECT COUNT(*) INTO v_recent_tips
  FROM tips
  WHERE sender_id = p_sender_id AND created_at > now() - interval '1 hour';
  IF v_recent_tips >= 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Max 5 Tipps pro Stunde');
  END IF;

  SELECT balance, COALESCE(locked_balance, 0) INTO v_sender_balance, v_sender_locked
  FROM wallets WHERE user_id = p_sender_id FOR UPDATE;

  IF v_sender_balance IS NULL OR (v_sender_balance - v_sender_locked) < p_amount_cents THEN
    -- Slice 043: "BSD" → "Credits"
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
  VALUES (p_sender_id, 'tip_send', -p_amount_cents,
    (SELECT balance FROM wallets WHERE user_id = p_sender_id), v_tip_id, 'Scout-Tipp gesendet');

  INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES (p_receiver_id, 'tip_receive', v_receiver_earned,
    (SELECT balance FROM wallets WHERE user_id = p_receiver_id), v_tip_id, 'Scout-Tipp erhalten');

  SELECT COALESCE(display_name, handle) INTO v_receiver_name FROM profiles WHERE id = p_sender_id;
  INSERT INTO notifications (user_id, type, title, body, reference_id, reference_type)
  VALUES (p_receiver_id, 'tip_received', 'Scout-Tipp erhalten!',
    -- Slice 043: "X BSD Tipp gesendet" → "X Credits als Tipp gesendet"
    v_receiver_name || ' hat dir ' || (p_amount_cents / 100) || ' Credits als Tipp gesendet',
    v_tip_id, 'tip');

  RETURN jsonb_build_object(
    'success', true,
    'tip_id', v_tip_id,
    'amount_cents', p_amount_cents,
    'receiver_earned', v_receiver_earned,
    'platform_fee', v_platform_fee
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.send_tip(uuid, uuid, text, uuid, bigint, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.send_tip(uuid, uuid, text, uuid, bigint, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.send_tip(uuid, uuid, text, uuid, bigint, text) TO authenticated;

COMMENT ON FUNCTION public.send_tip(uuid, uuid, text, uuid, bigint, text)
IS 'Slice 043: "BSD" → "Credits" in Error-Messages + Notification-Body (business.md Compliance).';
