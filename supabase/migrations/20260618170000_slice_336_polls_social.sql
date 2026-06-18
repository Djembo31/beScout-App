-- Slice 336 — Polls P3: Abo-2×-Gewicht bei Paid-Polls + Follower-Notify-Typ.
-- cast_community_poll_vote Body = live pg_get_functiondef 2026-06-18; NUR Gewicht additiv:
--   v_weight (Abo-Port aus cast_vote), Tally +v_weight statt +1, total_votes +v_weight, weight-Insert.
--   Geld-Branches (Wallet-Abzug, Treasury, transactions) BYTE-IDENTISCH (D87/156).

-- ============================================================
-- 1. community_poll_votes.weight (Stimmgewicht; Geld bleibt pro echter Stimme)
-- ============================================================
ALTER TABLE public.community_poll_votes ADD COLUMN IF NOT EXISTS weight smallint NOT NULL DEFAULT 1;
COMMENT ON COLUMN public.community_poll_votes.weight IS
  'Slice 336: Stimmgewicht (2 für aktive club_subscription-Inhaber der Poll-club_id, sonst 1). Wirkt auf Tally/total_votes, NICHT auf Geld.';

-- ============================================================
-- 2. notifications_type_check: +'poll_new' (Follower-Reichweite). Additiv.
-- ============================================================
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type = ANY (ARRAY[
  'research_unlock','research_rating','follow','fantasy_reward','poll_vote','reply','system','trade',
  'bounty_submission','bounty_approved','bounty_rejected','pbt_liquidation','offer_received','offer_accepted',
  'offer_rejected','offer_countered','dpc_of_week','tier_promotion','price_alert','mission_reward',
  'event_starting','event_closing_soon','event_scored','bounty_expiring','new_ipo_available','referral_reward',
  'tip_received','subscription_new','creator_fund_payout','ad_revenue_payout','achievement','level_up',
  'rang_up','rang_down','mastery_level_up','prediction_resolved','post_upvoted','ipo_purchase','report_resolved',
  'poll_new'
]));

-- ============================================================
-- 3. cast_community_poll_vote — +Abo-Gewicht (Tally-only).
-- ============================================================
CREATE OR REPLACE FUNCTION public.cast_community_poll_vote(p_user_id uuid, p_poll_id uuid, p_option_index integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_poll            RECORD;
  v_options         JSONB;
  v_option          JSONB;
  v_cost            BIGINT;
  v_creator_share   BIGINT;
  v_platform_share  BIGINT;
  v_voter_balance   BIGINT;
  v_creator_balance BIGINT;
  v_already         BOOLEAN;
  v_weight          SMALLINT := 1;   -- Slice 336
  v_sub_tier        TEXT;            -- Slice 336
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;
  SELECT * INTO v_poll FROM community_polls WHERE id = p_poll_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Umfrage nicht gefunden'); END IF;
  IF v_poll.status != 'active' THEN RETURN jsonb_build_object('success', false, 'error', 'Umfrage ist nicht aktiv'); END IF;
  IF now() > v_poll.ends_at THEN
    UPDATE community_polls SET status = 'ended' WHERE id = p_poll_id;
    RETURN jsonb_build_object('success', false, 'error', 'Umfrage ist beendet');
  END IF;
  IF v_poll.created_by = p_user_id THEN RETURN jsonb_build_object('success', false, 'error', 'Eigene Umfrage — nicht abstimmbar'); END IF;
  v_options := v_poll.options;
  IF p_option_index < 0 OR p_option_index >= jsonb_array_length(v_options) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ungültige Option');
  END IF;
  SELECT EXISTS(SELECT 1 FROM community_poll_votes WHERE poll_id = p_poll_id AND user_id = p_user_id) INTO v_already;
  IF v_already THEN RETURN jsonb_build_object('success', false, 'error', 'Bereits abgestimmt'); END IF;

  -- Slice 336: Abo-2×-Gewicht (identisch zu cast_vote). Nur wenn Poll einen club_id-Bezug hat.
  IF v_poll.club_id IS NOT NULL THEN
    SELECT cs.tier INTO v_sub_tier FROM club_subscriptions cs
    WHERE cs.user_id = p_user_id AND cs.club_id = v_poll.club_id
      AND cs.status = 'active' AND cs.expires_at > now() LIMIT 1;
    IF v_sub_tier IS NOT NULL THEN v_weight := 2; END IF;
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
    IF v_poll.source = 'club' AND v_poll.club_id IS NOT NULL THEN
      PERFORM public.book_club_treasury(
        v_poll.club_id, 'credit', 'poll_revenue', v_creator_share,
        p_poll_id, 'Umfrage-Einnahme: ' || left(v_poll.question, 50)
      );
      INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description) VALUES
        (p_user_id, 'poll_vote_cost', -v_cost, v_voter_balance - v_cost, p_poll_id, 'Umfrage: ' || left(v_poll.question, 50));
    ELSE
      IF v_poll.source = 'club' THEN
        RAISE EXCEPTION 'club_poll_missing_club_id: Vereins-Umfrage ohne club_id';
      END IF;
      SELECT balance INTO v_creator_balance FROM wallets WHERE user_id = v_poll.created_by FOR UPDATE;
      IF FOUND THEN UPDATE wallets SET balance = balance + v_creator_share, updated_at = now() WHERE user_id = v_poll.created_by; END IF;
      INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description) VALUES
        (p_user_id, 'poll_vote_cost', -v_cost, v_voter_balance - v_cost, p_poll_id, 'Umfrage: ' || left(v_poll.question, 50)),
        (v_poll.created_by, 'poll_earn', v_creator_share, COALESCE(v_creator_balance, 0) + v_creator_share, p_poll_id, 'Umfrage-Einnahme: ' || left(v_poll.question, 50));
    END IF;
  ELSE v_creator_share := 0; v_platform_share := 0; END IF;

  -- Slice 336: weight gespeichert (Tally skaliert, Geld unverändert: amount_paid/creator_share/platform_share = echte Stimme).
  INSERT INTO community_poll_votes (poll_id, user_id, option_index, amount_paid, creator_share, platform_share, weight)
  VALUES (p_poll_id, p_user_id, p_option_index, v_cost, v_creator_share, v_platform_share, v_weight);
  v_option := v_options -> p_option_index;
  v_option := jsonb_set(v_option, '{votes}', to_jsonb(COALESCE((v_option ->> 'votes')::int, 0) + v_weight));
  v_options := jsonb_set(v_options, ARRAY[p_option_index::text], v_option);
  UPDATE community_polls SET options = v_options, total_votes = total_votes + v_weight, creator_earned = creator_earned + v_creator_share WHERE id = p_poll_id;
  RETURN jsonb_build_object('success', true, 'total_votes', v_poll.total_votes + v_weight, 'cost', v_cost, 'creator_share', v_creator_share, 'weight', v_weight);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.cast_community_poll_vote(uuid, uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cast_community_poll_vote(uuid, uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.cast_community_poll_vote(uuid, uuid, integer) TO authenticated;
