-- ============================================================================
-- Votes & Polls: RPCs + RLS policies
-- Date: 2026-04-04
-- RPCs were previously applied manually — now tracked in migrations.
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- 1) RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

-- ── club_votes ──
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'club_votes' AND policyname = 'club_votes_select') THEN
    CREATE POLICY club_votes_select ON public.club_votes FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'club_votes' AND policyname = 'club_votes_insert') THEN
    CREATE POLICY club_votes_insert ON public.club_votes FOR INSERT TO authenticated
      WITH CHECK (
        created_by = auth.uid()
        AND (
          EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND top_role = 'Admin')
          OR EXISTS (
            SELECT 1 FROM club_admins
            WHERE club_admins.user_id = auth.uid()
              AND club_admins.club_id = club_votes.club_id
              AND club_admins.role IN ('owner', 'admin')
          )
        )
      );
  END IF;
END $$;

-- ── vote_entries ──
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vote_entries' AND policyname = 'vote_entries_select_own') THEN
    CREATE POLICY vote_entries_select_own ON public.vote_entries FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- ── community_polls ──
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_polls' AND policyname = 'community_polls_select') THEN
    CREATE POLICY community_polls_select ON public.community_polls FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_polls' AND policyname = 'community_polls_insert') THEN
    CREATE POLICY community_polls_insert ON public.community_polls FOR INSERT TO authenticated
      WITH CHECK (created_by = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_polls' AND policyname = 'community_polls_update_own') THEN
    CREATE POLICY community_polls_update_own ON public.community_polls FOR UPDATE TO authenticated
      USING (created_by = auth.uid());
  END IF;
END $$;

-- ── community_poll_votes ──
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_poll_votes' AND policyname = 'community_poll_votes_select_own') THEN
    CREATE POLICY community_poll_votes_select_own ON public.community_poll_votes FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- ── post_votes ──
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_votes' AND policyname = 'post_votes_select_own') THEN
    CREATE POLICY post_votes_select_own ON public.post_votes FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2) cast_vote — Club vote with wallet deduction + subscription weight
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.cast_vote(
  p_user_id UUID,
  p_vote_id UUID,
  p_option_index INTEGER
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_vote RECORD;
  v_wallet RECORD;
  v_available BIGINT;
  v_weight SMALLINT := 1;
  v_sub_tier TEXT;
  v_opts JSONB;
BEGIN
  -- Auth guard
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Nicht berechtigt');
  END IF;

  -- Lock vote row
  SELECT * INTO v_vote FROM club_votes WHERE id = p_vote_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Abstimmung nicht gefunden');
  END IF;

  IF v_vote.status != 'active' THEN
    RETURN json_build_object('success', false, 'error', 'Abstimmung nicht mehr aktiv');
  END IF;

  IF v_vote.ends_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'Abstimmung abgelaufen');
  END IF;

  IF p_option_index < 0 OR p_option_index >= jsonb_array_length(v_vote.options) THEN
    RETURN json_build_object('success', false, 'error', 'Ungueltige Option');
  END IF;

  -- Duplicate check
  IF EXISTS (SELECT 1 FROM vote_entries WHERE vote_id = p_vote_id AND user_id = p_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Bereits abgestimmt');
  END IF;

  -- Subscription weight (2x for bronze+ subscribers of this club)
  IF v_vote.club_id IS NOT NULL THEN
    SELECT cs.tier INTO v_sub_tier
    FROM club_subscriptions cs
    WHERE cs.user_id = p_user_id AND cs.club_id = v_vote.club_id
      AND cs.status = 'active' AND cs.expires_at > now()
    LIMIT 1;

    IF v_sub_tier IS NOT NULL THEN
      v_weight := 2;
    END IF;
  END IF;

  -- Wallet deduction (if cost > 0)
  IF v_vote.cost_bsd > 0 THEN
    SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'Wallet nicht gefunden');
    END IF;

    v_available := v_wallet.balance - COALESCE(v_wallet.locked_balance, 0);
    IF v_available < v_vote.cost_bsd THEN
      RETURN json_build_object('success', false, 'error', 'Nicht genug Credits');
    END IF;

    UPDATE wallets SET balance = balance - v_vote.cost_bsd, updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  -- Insert vote entry
  INSERT INTO vote_entries (vote_id, user_id, option_index, amount_paid, weight)
  VALUES (p_vote_id, p_user_id, p_option_index, v_vote.cost_bsd, v_weight);

  -- Update options JSONB + total_votes
  v_opts := v_vote.options;
  v_opts := jsonb_set(
    v_opts,
    ARRAY[p_option_index::TEXT, 'votes'],
    to_jsonb(COALESCE((v_opts -> p_option_index ->> 'votes')::INT, 0) + v_weight)
  );

  UPDATE club_votes
  SET options = v_opts,
      total_votes = total_votes + 1
  WHERE id = p_vote_id;

  RETURN json_build_object(
    'success', true,
    'total_votes', v_vote.total_votes + 1,
    'cost', v_vote.cost_bsd
  );
END;
$function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3) cast_community_poll_vote — Paid poll with 70/30 creator/platform split
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.cast_community_poll_vote(
  p_user_id UUID,
  p_poll_id UUID,
  p_option_index INTEGER
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_poll RECORD;
  v_wallet RECORD;
  v_available BIGINT;
  v_creator_share BIGINT;
  v_platform_share BIGINT;
  v_opts JSONB;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Nicht berechtigt');
  END IF;

  -- Lock poll
  SELECT * INTO v_poll FROM community_polls WHERE id = p_poll_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Umfrage nicht gefunden');
  END IF;

  IF v_poll.status != 'active' THEN
    RETURN json_build_object('success', false, 'error', 'Umfrage nicht mehr aktiv');
  END IF;

  IF v_poll.ends_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'Umfrage abgelaufen');
  END IF;

  IF p_option_index < 0 OR p_option_index >= jsonb_array_length(v_poll.options) THEN
    RETURN json_build_object('success', false, 'error', 'Ungueltige Option');
  END IF;

  -- No self-vote
  IF v_poll.created_by = p_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Eigene Umfrage nicht abstimmbar');
  END IF;

  -- Duplicate check
  IF EXISTS (SELECT 1 FROM community_poll_votes WHERE poll_id = p_poll_id AND user_id = p_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Bereits abgestimmt');
  END IF;

  -- Fee split: 70% creator, 30% platform (from business.md: Polls 30% Platform, 70% Creator)
  v_creator_share := (v_poll.cost_bsd * 70) / 100;
  v_platform_share := v_poll.cost_bsd - v_creator_share;

  -- Wallet deduction (if cost > 0)
  IF v_poll.cost_bsd > 0 THEN
    SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'Wallet nicht gefunden');
    END IF;

    v_available := v_wallet.balance - COALESCE(v_wallet.locked_balance, 0);
    IF v_available < v_poll.cost_bsd THEN
      RETURN json_build_object('success', false, 'error', 'Nicht genug Credits');
    END IF;

    UPDATE wallets SET balance = balance - v_poll.cost_bsd, updated_at = now()
    WHERE user_id = p_user_id;

    -- Credit creator
    IF v_creator_share > 0 THEN
      UPDATE wallets SET balance = balance + v_creator_share, updated_at = now()
      WHERE user_id = v_poll.created_by;
    END IF;
  ELSE
    v_creator_share := 0;
    v_platform_share := 0;
  END IF;

  -- Insert poll vote
  INSERT INTO community_poll_votes (poll_id, user_id, option_index, amount_paid, creator_share, platform_share)
  VALUES (p_poll_id, p_user_id, p_option_index, v_poll.cost_bsd, v_creator_share, v_platform_share);

  -- Update options JSONB + total_votes + creator_earned
  v_opts := v_poll.options;
  v_opts := jsonb_set(
    v_opts,
    ARRAY[p_option_index::TEXT, 'votes'],
    to_jsonb(COALESCE((v_opts -> p_option_index ->> 'votes')::INT, 0) + 1)
  );

  UPDATE community_polls
  SET options = v_opts,
      total_votes = total_votes + 1,
      creator_earned = creator_earned + v_creator_share
  WHERE id = p_poll_id;

  RETURN json_build_object(
    'success', true,
    'total_votes', v_poll.total_votes + 1,
    'cost', v_poll.cost_bsd,
    'creator_share', v_creator_share
  );
END;
$function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4) vote_post — Post upvote/downvote (toggle)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.vote_post(
  p_user_id UUID,
  p_post_id UUID,
  p_vote_type SMALLINT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_existing RECORD;
  v_up INT;
  v_down INT;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Nicht berechtigt');
  END IF;

  IF p_vote_type NOT IN (1, -1) THEN
    RETURN json_build_object('success', false, 'error', 'Ungueltiger vote_type');
  END IF;

  -- Check existing vote
  SELECT * INTO v_existing FROM post_votes
  WHERE post_id = p_post_id AND user_id = p_user_id;

  IF FOUND THEN
    IF v_existing.vote_type = p_vote_type THEN
      -- Same vote → remove (toggle off)
      DELETE FROM post_votes WHERE id = v_existing.id;
    ELSE
      -- Different vote → update
      UPDATE post_votes SET vote_type = p_vote_type WHERE id = v_existing.id;
    END IF;
  ELSE
    -- New vote
    INSERT INTO post_votes (post_id, user_id, vote_type)
    VALUES (p_post_id, p_user_id, p_vote_type);
  END IF;

  -- Count current votes
  SELECT
    COUNT(*) FILTER (WHERE vote_type = 1),
    COUNT(*) FILTER (WHERE vote_type = -1)
  INTO v_up, v_down
  FROM post_votes WHERE post_id = p_post_id;

  RETURN json_build_object('upvotes', v_up, 'downvotes', v_down);
END;
$function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5) GRANTS
-- ═══════════════════════════════════════════════════════════════════════════
GRANT EXECUTE ON FUNCTION public.cast_vote(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cast_community_poll_vote(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vote_post(UUID, UUID, SMALLINT) TO authenticated;
