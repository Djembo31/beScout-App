-- =============================================================================
-- AR-51 (J7, 2026-04-15) — assign_user_missions Security-Break
--
-- PROBLEM:
--   `assign_user_missions(p_user_id uuid)` ist SECURITY DEFINER + GRANTED TO anon,
--   hat aber KEINEN auth.uid()-Guard. anon kann beliebige user_missions Rows
--   fuer beliebige User-IDs erzeugen (DoS + User-Enumeration).
--   Analog zu J4 earn_wildcards Exploit.
--
-- FIX:
--   1. auth.uid() Guard im Body (p_user_id muss matchen)
--   2. REVOKE anon + GRANT authenticated (AR-44 Template)
--   3. REVOKE PUBLIC (defensive)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.assign_user_missions(p_user_id uuid)
 RETURNS SETOF user_missions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_def RECORD;
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
  v_now TIMESTAMPTZ := now();
  v_today DATE := CURRENT_DATE;
  v_dow INT;
  v_user_club_ids UUID[];
BEGIN
  -- AR-51 FIX: auth.uid() Guard verhindert anon-user-enumeration
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  SELECT ARRAY_AGG(club_id) INTO v_user_club_ids FROM club_followers WHERE user_id = p_user_id;
  v_user_club_ids := COALESCE(v_user_club_ids, ARRAY[]::UUID[]);
  UPDATE user_missions SET status = 'expired' WHERE user_id = p_user_id AND status = 'active' AND period_end < v_now;
  FOR v_def IN SELECT id, key, type, target_value, reward_cents FROM mission_definitions WHERE active = true AND (club_id IS NULL OR club_id = ANY(v_user_club_ids))
  LOOP
    IF v_def.type = 'daily' THEN v_period_start := v_today::TIMESTAMPTZ; v_period_end := (v_today + INTERVAL '1 day')::TIMESTAMPTZ;
    ELSIF v_def.type = 'weekly' THEN v_dow := EXTRACT(ISODOW FROM v_today)::INT; v_period_start := (v_today - (v_dow - 1) * INTERVAL '1 day')::TIMESTAMPTZ; v_period_end := v_period_start + INTERVAL '7 days';
    ELSE CONTINUE; END IF;
    INSERT INTO user_missions (user_id, mission_id, period_start, period_end, target_value, reward_cents)
    SELECT p_user_id, v_def.id, v_period_start, v_period_end, v_def.target_value, v_def.reward_cents
    WHERE NOT EXISTS (SELECT 1 FROM user_missions WHERE user_id = p_user_id AND mission_id = v_def.id AND period_start = v_period_start);
  END LOOP;
  RETURN QUERY SELECT * FROM user_missions WHERE user_id = p_user_id AND (period_end > v_now OR (status = 'claimed' AND claimed_at > v_now - INTERVAL '24 hours')) ORDER BY period_start DESC, created_at;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.assign_user_missions(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assign_user_missions(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.assign_user_missions(uuid) TO authenticated;

COMMENT ON FUNCTION public.assign_user_missions(uuid) IS
  'AR-51 (2026-04-15): auth.uid() Guard + REVOKE anon. J4-earn_wildcards-Muster geschlossen.';
