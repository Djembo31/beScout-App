-- ============================================================================
-- Bounty System: RPCs + RLS policies
-- Date: 2026-04-04
-- RPCs were previously applied manually — now tracked in migrations.
-- ============================================================================

-- 1) RLS Policies for bounties
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bounties' AND policyname = 'bounties_select_all') THEN
    CREATE POLICY bounties_select_all ON public.bounties
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Admin insert (club-created bounties via direct .insert())
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bounties' AND policyname = 'bounties_admin_insert') THEN
    CREATE POLICY bounties_admin_insert ON public.bounties
      FOR INSERT TO authenticated
      WITH CHECK (
        created_by = auth.uid()
        AND (
          EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND top_role = 'Admin')
          OR EXISTS (
            SELECT 1 FROM club_admins
            WHERE club_admins.user_id = auth.uid()
              AND club_admins.club_id = bounties.club_id
              AND club_admins.role IN ('owner', 'admin')
          )
        )
      );
  END IF;
END $$;

-- Admin update (status changes, etc.)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bounties' AND policyname = 'bounties_admin_update') THEN
    CREATE POLICY bounties_admin_update ON public.bounties
      FOR UPDATE TO authenticated
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND top_role = 'Admin')
        OR EXISTS (
          SELECT 1 FROM club_admins
          WHERE club_admins.user_id = auth.uid()
            AND club_admins.club_id = bounties.club_id
            AND club_admins.role IN ('owner', 'admin')
        )
        OR created_by = auth.uid()
      );
  END IF;
END $$;

-- 2) RLS Policies for bounty_submissions
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bounty_submissions' AND policyname = 'bounty_sub_select') THEN
    CREATE POLICY bounty_sub_select ON public.bounty_submissions
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Users can insert own submissions (actual validation in RPC)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bounty_submissions' AND policyname = 'bounty_sub_insert_own') THEN
    CREATE POLICY bounty_sub_insert_own ON public.bounty_submissions
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Admin can update submissions (approve/reject)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bounty_submissions' AND policyname = 'bounty_sub_admin_update') THEN
    CREATE POLICY bounty_sub_admin_update ON public.bounty_submissions
      FOR UPDATE TO authenticated
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND top_role = 'Admin')
        OR EXISTS (
          SELECT 1 FROM club_admins ca
          JOIN bounties b ON b.club_id = ca.club_id
          WHERE ca.user_id = auth.uid()
            AND b.id = bounty_submissions.bounty_id
            AND ca.role IN ('owner', 'admin')
        )
      );
  END IF;
END $$;

-- 3) create_user_bounty — user-funded bounty with escrow
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_user_bounty(
  p_user_id UUID,
  p_club_id UUID,
  p_club_name TEXT,
  p_title TEXT,
  p_description TEXT,
  p_reward_cents BIGINT,
  p_deadline_days INTEGER,
  p_max_submissions INTEGER,
  p_player_id UUID DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_wallet RECORD;
  v_available BIGINT;
  v_bounty_id UUID;
BEGIN
  -- Auth guard
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Nicht berechtigt');
  END IF;

  -- Input validation
  IF p_reward_cents < 100 THEN
    RETURN json_build_object('success', false, 'error', 'Mindest-Reward: 1 $SCOUT');
  END IF;
  IF p_reward_cents > 100000000 THEN
    RETURN json_build_object('success', false, 'error', 'Maximum: 1.000.000 $SCOUT');
  END IF;
  IF p_deadline_days < 1 OR p_deadline_days > 90 THEN
    RETURN json_build_object('success', false, 'error', 'Deadline: 1-90 Tage');
  END IF;
  IF p_max_submissions < 1 OR p_max_submissions > 100 THEN
    RETURN json_build_object('success', false, 'error', 'Max Submissions: 1-100');
  END IF;

  -- Lock wallet and check balance
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Wallet nicht gefunden');
  END IF;

  v_available := v_wallet.balance - COALESCE(v_wallet.locked_balance, 0);
  IF v_available < p_reward_cents THEN
    RETURN json_build_object('success', false, 'error', 'Nicht genug Credits');
  END IF;

  -- Escrow: lock funds
  UPDATE wallets
  SET locked_balance = COALESCE(locked_balance, 0) + p_reward_cents,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Create bounty
  INSERT INTO bounties (
    club_id, club_name, created_by, title, description,
    reward_cents, deadline_at, max_submissions, player_id,
    status, is_user_bounty, type
  ) VALUES (
    p_club_id, p_club_name, p_user_id, p_title, p_description,
    p_reward_cents, now() + (p_deadline_days || ' days')::INTERVAL, p_max_submissions, p_player_id,
    'open', true, 'general'
  ) RETURNING id INTO v_bounty_id;

  RETURN json_build_object('success', true, 'bounty_id', v_bounty_id);
END;
$function$;

-- 4) cancel_user_bounty — release escrow
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_user_bounty(
  p_user_id UUID,
  p_bounty_id UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_bounty RECORD;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Nicht berechtigt');
  END IF;

  SELECT * INTO v_bounty FROM bounties
  WHERE id = p_bounty_id AND created_by = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Bounty nicht gefunden');
  END IF;

  IF v_bounty.status != 'open' THEN
    RETURN json_build_object('success', false, 'error', 'Bounty ist nicht mehr offen');
  END IF;

  -- Cancel bounty
  UPDATE bounties SET status = 'cancelled', updated_at = now()
  WHERE id = p_bounty_id;

  -- Release escrow if user-funded
  IF v_bounty.is_user_bounty THEN
    UPDATE wallets
    SET locked_balance = GREATEST(0, COALESCE(locked_balance, 0) - v_bounty.reward_cents),
        updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  RETURN json_build_object('success', true);
END;
$function$;

-- 5) submit_bounty_response — fan submits answer
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_bounty_response(
  p_user_id UUID,
  p_bounty_id UUID,
  p_title TEXT,
  p_content TEXT,
  p_evaluation JSONB DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_bounty RECORD;
  v_existing INT;
  v_submission_id UUID;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Nicht berechtigt');
  END IF;

  -- Lock bounty row
  SELECT * INTO v_bounty FROM bounties WHERE id = p_bounty_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Bounty nicht gefunden');
  END IF;

  IF v_bounty.status != 'open' THEN
    RETURN json_build_object('success', false, 'error', 'Bounty ist geschlossen');
  END IF;

  IF v_bounty.deadline_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'Deadline abgelaufen');
  END IF;

  IF v_bounty.submission_count >= v_bounty.max_submissions THEN
    RETURN json_build_object('success', false, 'error', 'Maximale Einreichungen erreicht');
  END IF;

  -- No self-submission
  IF v_bounty.created_by = p_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Eigene Bounty nicht beantwortbar');
  END IF;

  -- Check duplicate
  SELECT COUNT(*) INTO v_existing
  FROM bounty_submissions
  WHERE bounty_id = p_bounty_id AND user_id = p_user_id;

  IF v_existing > 0 THEN
    RETURN json_build_object('success', false, 'error', 'Bereits eingereicht');
  END IF;

  -- Content min length
  IF length(p_content) < 100 THEN
    RETURN json_build_object('success', false, 'error', 'Mindestens 100 Zeichen');
  END IF;

  -- Insert submission
  INSERT INTO bounty_submissions (
    bounty_id, user_id, title, content, status, evaluation
  ) VALUES (
    p_bounty_id, p_user_id, p_title, p_content, 'pending', p_evaluation
  ) RETURNING id INTO v_submission_id;

  -- Increment count
  UPDATE bounties
  SET submission_count = submission_count + 1, updated_at = now()
  WHERE id = p_bounty_id;

  RETURN json_build_object('success', true, 'submission_id', v_submission_id);
END;
$function$;

-- 6) approve_bounty_submission — admin approves + pays reward
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_bounty_submission(
  p_admin_id UUID,
  p_submission_id UUID,
  p_feedback TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sub RECORD;
  v_bounty RECORD;
  v_new_balance BIGINT;
BEGIN
  -- Fetch submission
  SELECT * INTO v_sub FROM bounty_submissions
  WHERE id = p_submission_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Submission nicht gefunden');
  END IF;

  IF v_sub.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Bereits bearbeitet');
  END IF;

  -- Fetch bounty
  SELECT * INTO v_bounty FROM bounties WHERE id = v_sub.bounty_id;

  -- Verify admin role for this club
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_admin_id AND top_role = 'Admin'
  ) AND NOT EXISTS (
    SELECT 1 FROM club_admins
    WHERE user_id = p_admin_id AND club_id = v_bounty.club_id
      AND role IN ('owner', 'admin')
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Keine Berechtigung');
  END IF;

  -- Update submission
  UPDATE bounty_submissions
  SET status = 'approved',
      reviewed_by = p_admin_id,
      reviewed_at = now(),
      admin_feedback = p_feedback,
      reward_paid = v_bounty.reward_cents,
      updated_at = now()
  WHERE id = p_submission_id;

  -- Pay reward to submitter
  UPDATE wallets
  SET balance = balance + v_bounty.reward_cents,
      updated_at = now()
  WHERE user_id = v_sub.user_id
  RETURNING balance INTO v_new_balance;

  -- Release escrow if user-funded bounty
  IF v_bounty.is_user_bounty THEN
    UPDATE wallets
    SET locked_balance = GREATEST(0, COALESCE(locked_balance, 0) - v_bounty.reward_cents),
        updated_at = now()
    WHERE user_id = v_bounty.created_by;
  END IF;

  -- Log transaction
  INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES (v_sub.user_id, 'bounty_reward', v_bounty.reward_cents, v_new_balance,
          v_sub.bounty_id, 'Bounty-Belohnung: ' || v_bounty.title);

  RETURN json_build_object('success', true, 'reward', v_bounty.reward_cents);
END;
$function$;

-- 7) reject_bounty_submission — admin rejects
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_bounty_submission(
  p_admin_id UUID,
  p_submission_id UUID,
  p_feedback TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sub RECORD;
  v_bounty RECORD;
BEGIN
  SELECT * INTO v_sub FROM bounty_submissions
  WHERE id = p_submission_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Submission nicht gefunden');
  END IF;

  IF v_sub.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Bereits bearbeitet');
  END IF;

  SELECT * INTO v_bounty FROM bounties WHERE id = v_sub.bounty_id;

  -- Verify admin role
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_admin_id AND top_role = 'Admin'
  ) AND NOT EXISTS (
    SELECT 1 FROM club_admins
    WHERE user_id = p_admin_id AND club_id = v_bounty.club_id
      AND role IN ('owner', 'admin')
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Keine Berechtigung');
  END IF;

  UPDATE bounty_submissions
  SET status = 'rejected',
      reviewed_by = p_admin_id,
      reviewed_at = now(),
      admin_feedback = p_feedback,
      updated_at = now()
  WHERE id = p_submission_id;

  RETURN json_build_object('success', true);
END;
$function$;

-- 8) close_expired_bounties — cron helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.close_expired_bounties()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count INTEGER;
  v_bounty RECORD;
BEGIN
  -- Close expired open bounties
  UPDATE bounties
  SET status = 'closed', updated_at = now()
  WHERE status = 'open' AND deadline_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Release escrow for expired user-bounties with no approved submissions
  FOR v_bounty IN
    SELECT b.id, b.created_by, b.reward_cents
    FROM bounties b
    WHERE b.status = 'closed'
      AND b.is_user_bounty = true
      AND b.updated_at > now() - INTERVAL '1 minute'
      AND NOT EXISTS (
        SELECT 1 FROM bounty_submissions bs
        WHERE bs.bounty_id = b.id AND bs.status = 'approved'
      )
  LOOP
    UPDATE wallets
    SET locked_balance = GREATEST(0, COALESCE(locked_balance, 0) - v_bounty.reward_cents),
        updated_at = now()
    WHERE user_id = v_bounty.created_by;
  END LOOP;

  RETURN v_count;
END;
$function$;

-- 9) Grants
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.create_user_bounty(UUID, UUID, TEXT, TEXT, TEXT, BIGINT, INTEGER, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_user_bounty(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_bounty_response(UUID, UUID, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_bounty_submission(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_bounty_submission(UUID, UUID, TEXT) TO authenticated;

-- close_expired_bounties: only service_role (cron)
REVOKE ALL ON FUNCTION public.close_expired_bounties() FROM PUBLIC, authenticated, anon;
