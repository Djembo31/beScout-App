-- Slice 037 — 8 transactions.type Drifts Cleanup (INV-30 Allowlist Empty)
--
-- Slice 034 entdeckte 9 RPC/type-Drift-Pairs in INV-30 Allowlist. Diese Migration:
--   A. Renamed 2 RPC-types (CHECK ist source-of-truth, RPC schreibt Drift)
--   B. Erweitert CHECK constraint um 6 neue valid types (RPC-types fachlich richtig)
--
-- Nach Slice 037: INV-30 Allowlist leer, alle types valid.

-- ============================================================
-- A. RPC-Renames: 'poll_earning' → 'poll_earn', 'research_earning' → 'research_earn'
-- ============================================================

CREATE OR REPLACE FUNCTION public.cast_community_poll_vote(p_user_id uuid, p_poll_id uuid, p_option_index integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_poll       RECORD;
  v_options    JSONB;
  v_option     JSONB;
  v_cost       BIGINT;
  v_creator_share BIGINT;
  v_platform_share BIGINT;
  v_voter_balance BIGINT;
  v_creator_balance BIGINT;
  v_already    BOOLEAN;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;
  SELECT * INTO v_poll FROM community_polls WHERE id = p_poll_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Umfrage nicht gefunden');
  END IF;
  IF v_poll.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Umfrage ist nicht aktiv');
  END IF;
  IF now() > v_poll.ends_at THEN
    UPDATE community_polls SET status = 'ended' WHERE id = p_poll_id;
    RETURN jsonb_build_object('success', false, 'error', 'Umfrage ist beendet');
  END IF;
  IF v_poll.created_by = p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Eigene Umfrage — nicht abstimmbar');
  END IF;
  v_options := v_poll.options;
  IF p_option_index < 0 OR p_option_index >= jsonb_array_length(v_options) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ungültige Option');
  END IF;
  SELECT EXISTS(SELECT 1 FROM community_poll_votes WHERE poll_id = p_poll_id AND user_id = p_user_id) INTO v_already;
  IF v_already THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bereits abgestimmt');
  END IF;
  v_cost := v_poll.cost_bsd;
  v_creator_share := (v_cost * 70) / 100;
  v_platform_share := v_cost - v_creator_share;
  IF v_cost > 0 THEN
    SELECT balance INTO v_voter_balance FROM wallets WHERE user_id = p_user_id FOR UPDATE;
    IF NOT FOUND OR (v_voter_balance - COALESCE((SELECT locked_balance FROM wallets WHERE user_id = p_user_id), 0)) < v_cost THEN
      RETURN jsonb_build_object('success', false, 'error', 'Nicht genug BSD');
    END IF;
    UPDATE wallets SET balance = balance - v_cost, updated_at = now() WHERE user_id = p_user_id;
    SELECT balance INTO v_creator_balance FROM wallets WHERE user_id = v_poll.created_by FOR UPDATE;
    IF FOUND THEN
      UPDATE wallets SET balance = balance + v_creator_share, updated_at = now() WHERE user_id = v_poll.created_by;
    END IF;
    -- Slice 037: 'poll_earning' → 'poll_earn' (CHECK constraint compliance)
    INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
    VALUES
      (p_user_id, 'poll_vote_cost', -v_cost, v_voter_balance - v_cost, p_poll_id,
       'Umfrage: ' || left(v_poll.question, 50)),
      (v_poll.created_by, 'poll_earn', v_creator_share, COALESCE(v_creator_balance, 0) + v_creator_share, p_poll_id,
       'Umfrage-Einnahme: ' || left(v_poll.question, 50));
  ELSE
    v_creator_share := 0;
    v_platform_share := 0;
  END IF;
  INSERT INTO community_poll_votes (poll_id, user_id, option_index, amount_paid, creator_share, platform_share)
  VALUES (p_poll_id, p_user_id, p_option_index, v_cost, v_creator_share, v_platform_share);
  v_option := v_options -> p_option_index;
  v_option := jsonb_set(v_option, '{votes}', to_jsonb(COALESCE((v_option ->> 'votes')::int, 0) + 1));
  v_options := jsonb_set(v_options, ARRAY[p_option_index::text], v_option);
  UPDATE community_polls
  SET options = v_options, total_votes = total_votes + 1, creator_earned = creator_earned + v_creator_share
  WHERE id = p_poll_id;
  RETURN jsonb_build_object(
    'success', true,
    'total_votes', v_poll.total_votes + 1,
    'cost', v_cost,
    'creator_share', v_creator_share
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.cast_community_poll_vote(uuid, uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cast_community_poll_vote(uuid, uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.cast_community_poll_vote(uuid, uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.unlock_research(p_user_id uuid, p_research_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_post       RECORD;
  v_price      BIGINT;
  v_author_share BIGINT;
  v_platform_fee BIGINT;
  v_buyer_balance BIGINT;
  v_author_balance BIGINT;
  v_already    BOOLEAN;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;
  SELECT id, user_id, price INTO v_post FROM research_posts WHERE id = p_research_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bericht nicht gefunden');
  END IF;
  IF v_post.user_id = p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Eigenen Bericht kann man nicht freischalten');
  END IF;
  SELECT EXISTS(
    SELECT 1 FROM research_unlocks WHERE research_id = p_research_id AND user_id = p_user_id
  ) INTO v_already;
  IF v_already THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bereits freigeschaltet');
  END IF;
  v_price := v_post.price;
  v_author_share := (v_price * 80) / 100;
  v_platform_fee := v_price - v_author_share;
  SELECT balance INTO v_buyer_balance FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND OR (v_buyer_balance - COALESCE((SELECT locked_balance FROM wallets WHERE user_id = p_user_id), 0)) < v_price THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nicht genug BSD');
  END IF;
  UPDATE wallets SET balance = balance - v_price, updated_at = now() WHERE user_id = p_user_id;
  SELECT balance INTO v_author_balance FROM wallets WHERE user_id = v_post.user_id FOR UPDATE;
  IF FOUND THEN
    UPDATE wallets SET balance = balance + v_author_share, updated_at = now() WHERE user_id = v_post.user_id;
  END IF;
  INSERT INTO research_unlocks (research_id, user_id, amount_paid, author_earned, platform_fee)
  VALUES (p_research_id, p_user_id, v_price, v_author_share, v_platform_fee);
  UPDATE research_posts
     SET unlock_count = unlock_count + 1,
         total_earned = total_earned + v_author_share,
         updated_at = now()
   WHERE id = p_research_id;
  -- Slice 037: 'research_earning' → 'research_earn' (CHECK constraint compliance)
  INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES
    (p_user_id, 'research_unlock', -v_price, v_buyer_balance - v_price, p_research_id, 'Bericht freigeschaltet'),
    (v_post.user_id, 'research_earn', v_author_share, v_author_balance + v_author_share, p_research_id, 'Bericht-Einnahme');
  RETURN jsonb_build_object(
    'success', true,
    'amount_paid', v_price,
    'author_earned', v_author_share,
    'platform_fee', v_platform_fee
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.unlock_research(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.unlock_research(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.unlock_research(uuid, uuid) TO authenticated;

-- ============================================================
-- B. CHECK constraint erweitern um 6 neue valid types
-- ============================================================

ALTER TABLE public.transactions DROP CONSTRAINT transactions_type_check;

ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check
  CHECK (type = ANY (ARRAY[
    -- Existing types (28)
    'deposit'::text, 'welcome_bonus'::text, 'admin_adjustment'::text, 'tier_bonus'::text,
    'trade_buy'::text, 'trade_sell'::text, 'ipo_buy'::text, 'order_cancel'::text,
    'offer_lock'::text, 'offer_unlock'::text, 'offer_execute'::text, 'offer_sell'::text,
    'mission_reward'::text, 'streak_reward'::text, 'liga_reward'::text, 'mystery_box_reward'::text,
    'tip_send'::text, 'tip_receive'::text, 'subscription'::text, 'founding_pass'::text,
    'bounty_cost'::text, 'bounty_reward'::text, 'research_unlock'::text, 'research_earn'::text,
    'referral_reward'::text, 'poll_vote_cost'::text, 'poll_earn'::text, 'withdrawal'::text,
    -- Slice 037 additions (6)
    'vote_fee'::text,
    'ad_revenue_payout'::text,
    'creator_fund_payout'::text,
    'event_entry_unlock'::text,
    'scout_subscription'::text,
    'scout_subscription_earning'::text
  ]));

COMMENT ON CONSTRAINT transactions_type_check ON public.transactions
IS 'Slice 037: erweitert um 6 types (vote_fee, ad_revenue_payout, creator_fund_payout, event_entry_unlock, scout_subscription, scout_subscription_earning). Drift dokumentiert in INV-30 Allowlist (jetzt leer).';
