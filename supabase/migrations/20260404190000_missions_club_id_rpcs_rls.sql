-- ============================================================================
-- Mission System: club_id support + RPCs + RLS policies
-- Date: 2026-04-04
-- ============================================================================

-- 1) Add club_id to mission_definitions (nullable = global mission)
-- ---------------------------------------------------------------------------
ALTER TABLE public.mission_definitions
  ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.mission_definitions.club_id IS
  'NULL = global mission visible to all users. Set = club-specific mission visible only to club followers.';

-- Index for efficient club-scoped lookups
CREATE INDEX IF NOT EXISTS idx_mission_definitions_club_id
  ON public.mission_definitions (club_id) WHERE club_id IS NOT NULL;

-- 2) RLS Policies
-- ---------------------------------------------------------------------------

-- mission_definitions: authenticated users can read active missions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mission_definitions' AND policyname = 'mission_def_select') THEN
    CREATE POLICY mission_def_select ON public.mission_definitions
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- mission_definitions: only admins can INSERT/UPDATE (via service role or RPC)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mission_definitions' AND policyname = 'mission_def_admin_insert') THEN
    CREATE POLICY mission_def_admin_insert ON public.mission_definitions
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND top_role = 'Admin')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mission_definitions' AND policyname = 'mission_def_admin_update') THEN
    CREATE POLICY mission_def_admin_update ON public.mission_definitions
      FOR UPDATE TO authenticated
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND top_role = 'Admin')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mission_definitions' AND policyname = 'mission_def_admin_delete') THEN
    CREATE POLICY mission_def_admin_delete ON public.mission_definitions
      FOR DELETE TO authenticated
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND top_role = 'Admin')
      );
  END IF;
END $$;

-- user_missions: users can read their own missions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_missions' AND policyname = 'user_missions_select_own') THEN
    CREATE POLICY user_missions_select_own ON public.user_missions
      FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;

-- user_missions: RPCs handle INSERT/UPDATE via SECURITY DEFINER
-- No direct client INSERT/UPDATE needed

-- 3) update_mission_progress — internal, called by DB triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_mission_progress(
  p_user_id UUID,
  p_mission_key TEXT,
  p_increment INTEGER DEFAULT 1
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mission RECORD;
BEGIN
  -- Find active user_missions where the linked definition matches the key
  FOR v_mission IN
    SELECT um.id, um.progress, um.target_value, um.status
    FROM user_missions um
    JOIN mission_definitions md ON md.id = um.mission_id
    WHERE um.user_id = p_user_id
      AND md.key = p_mission_key
      AND um.status = 'active'
      AND um.period_end > now()
  LOOP
    UPDATE user_missions
    SET progress = LEAST(v_mission.progress + p_increment, v_mission.target_value),
        status = CASE
          WHEN v_mission.progress + p_increment >= v_mission.target_value THEN 'completed'
          ELSE 'active'
        END,
        completed_at = CASE
          WHEN v_mission.progress + p_increment >= v_mission.target_value AND completed_at IS NULL THEN now()
          ELSE completed_at
        END
    WHERE id = v_mission.id;
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'update_mission_progress failed for user=%, key=%: %', p_user_id, p_mission_key, SQLERRM;
END;
$function$;

-- 4) track_my_mission_progress — client wrapper using auth.uid()
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.track_my_mission_progress(
  p_mission_key TEXT,
  p_increment INTEGER DEFAULT 1
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid UUID;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RETURN; END IF;
  PERFORM update_mission_progress(v_uid, p_mission_key, p_increment);
END;
$function$;

-- 5) assign_user_missions — idempotent, creates missing missions for current period
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_user_missions(
  p_user_id UUID
) RETURNS SETOF user_missions
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
  -- Collect user's followed club IDs
  SELECT ARRAY_AGG(club_id) INTO v_user_club_ids
  FROM club_followers
  WHERE user_id = p_user_id;

  -- Default to empty array if no clubs
  v_user_club_ids := COALESCE(v_user_club_ids, ARRAY[]::UUID[]);

  -- Expire old active missions whose period has passed
  UPDATE user_missions
  SET status = 'expired'
  WHERE user_id = p_user_id
    AND status = 'active'
    AND period_end < v_now;

  -- For each active mission definition (global + user's clubs)
  FOR v_def IN
    SELECT id, key, type, target_value, reward_cents
    FROM mission_definitions
    WHERE active = true
      AND (club_id IS NULL OR club_id = ANY(v_user_club_ids))
  LOOP
    -- Calculate period
    IF v_def.type = 'daily' THEN
      v_period_start := v_today::TIMESTAMPTZ;
      v_period_end := (v_today + INTERVAL '1 day')::TIMESTAMPTZ;
    ELSIF v_def.type = 'weekly' THEN
      v_dow := EXTRACT(ISODOW FROM v_today)::INT; -- 1=Monday
      v_period_start := (v_today - (v_dow - 1) * INTERVAL '1 day')::TIMESTAMPTZ;
      v_period_end := v_period_start + INTERVAL '7 days';
    ELSE
      -- Unknown type, skip
      CONTINUE;
    END IF;

    -- Insert if not exists for this period
    INSERT INTO user_missions (user_id, mission_id, period_start, period_end, target_value, reward_cents)
    SELECT p_user_id, v_def.id, v_period_start, v_period_end, v_def.target_value, v_def.reward_cents
    WHERE NOT EXISTS (
      SELECT 1 FROM user_missions
      WHERE user_id = p_user_id
        AND mission_id = v_def.id
        AND period_start = v_period_start
    );
  END LOOP;

  -- Return all non-expired missions (current period + recently completed/claimed)
  RETURN QUERY
    SELECT *
    FROM user_missions
    WHERE user_id = p_user_id
      AND (
        -- Current period (active or completed/claimed within period)
        period_end > v_now
        -- Or claimed in the last 24h (so user sees their recent claims)
        OR (status = 'claimed' AND claimed_at > v_now - INTERVAL '24 hours')
      )
    ORDER BY period_start DESC, created_at;
END;
$function$;

-- 6) claim_mission_reward — credit wallet + update status
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_mission_reward(
  p_user_id UUID,
  p_mission_id UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mission RECORD;
  v_new_balance BIGINT;
BEGIN
  -- Auth guard
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Nicht berechtigt');
  END IF;

  -- Find the completed mission
  SELECT * INTO v_mission
  FROM user_missions
  WHERE id = p_mission_id
    AND user_id = p_user_id
    AND status = 'completed'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Mission nicht gefunden oder bereits beansprucht');
  END IF;

  -- Credit wallet
  UPDATE wallets
  SET balance = balance + v_mission.reward_cents,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Wallet nicht gefunden');
  END IF;

  -- Mark as claimed
  UPDATE user_missions
  SET status = 'claimed',
      claimed_at = now()
  WHERE id = p_mission_id;

  -- Log transaction
  INSERT INTO transactions (user_id, type, amount, balance_after, description)
  VALUES (p_user_id, 'mission_reward', v_mission.reward_cents, v_new_balance,
          'Mission-Belohnung: ' || v_mission.reward_cents || ' Cents');

  RETURN json_build_object(
    'success', true,
    'reward_cents', v_mission.reward_cents,
    'new_balance', v_new_balance
  );
END;
$function$;

-- 7) Grant/Revoke
-- ---------------------------------------------------------------------------
-- update_mission_progress: only callable by other DB functions (triggers)
REVOKE ALL ON FUNCTION public.update_mission_progress(UUID, TEXT, INTEGER) FROM PUBLIC, authenticated, anon;

-- track_my_mission_progress: callable by authenticated users
GRANT EXECUTE ON FUNCTION public.track_my_mission_progress(TEXT, INTEGER) TO authenticated;

-- assign_user_missions: callable by authenticated users
GRANT EXECUTE ON FUNCTION public.assign_user_missions(UUID) TO authenticated;

-- claim_mission_reward: callable by authenticated users
GRANT EXECUTE ON FUNCTION public.claim_mission_reward(UUID, UUID) TO authenticated;
